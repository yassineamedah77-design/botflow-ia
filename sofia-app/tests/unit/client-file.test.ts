import { describe, expect, it } from "vitest";

import {
  analyzeClientFile,
  ClientFileError,
  decodeFileBytes,
  guessMapping,
  parseClientFile,
  parseConsent,
  parseDate,
  splitFullName,
} from "@/lib/client-file";
import { parseAmountToCents } from "@/lib/money";

const windows1252 = (text: string) => Uint8Array.from([...text].map((char) => (char === "é" ? 0xe9 : char === "É" ? 0xc9 : char.charCodeAt(0))));

describe("client file decoding and parsing", () => {
  it("reads UTF-8 (with BOM) and falls back to Windows-1252 for Excel exports", () => {
    expect(decodeFileBytes(new TextEncoder().encode("﻿Prénom;Nom"))).toBe("Prénom;Nom");
    expect(decodeFileBytes(windows1252("Prénom;Hélène"))).toBe("Prénom;Hélène");
  });

  it("detects the delimiter, names unnamed and duplicate columns, and keeps rows as text", () => {
    const table = parseClientFile("Prénom;Nom;;Téléphone;Téléphone\nEmma;Bernard;x;0639980001;06 39 98 00 02\n\n");
    expect(table.headers).toEqual(["Prénom", "Nom", "Colonne 3", "Téléphone", "Téléphone (2)"]);
    expect(table.rows).toEqual([["Emma", "Bernard", "x", "0639980001", "06 39 98 00 02"]]);
    expect(parseClientFile("first name,phone\nGrace,+33639980003").rows).toEqual([["Grace", "+33639980003"]]);
  });

  it("refuses empty files and files without rows", () => {
    expect(() => parseClientFile("")).toThrow(ClientFileError);
    expect(() => parseClientFile("Prénom;Nom\n")).toThrow(/aucune cliente/);
  });
});

describe("column detection", () => {
  it("maps French, Portuguese and English headers to SOFIA fields", () => {
    expect(
      guessMapping(["N° client", "Prénom", "NOM", "Tél. portable", "E-mail", "Dernière visite", "Nb visites", "CA total", "Accepte SMS/email"]),
    ).toEqual({
      externalId: "N° client",
      firstName: "Prénom",
      lastName: "NOM",
      phone: "Tél. portable",
      email: "E-mail",
      lastVisitAt: "Dernière visite",
      visitCount: "Nb visites",
      lifetimeValue: "CA total",
      marketingConsent: "Accepte SMS/email",
    });
    expect(guessMapping(["Nome completo", "Telemóvel", "Última visita"])).toEqual({
      fullName: "Nome completo",
      phone: "Telemóvel",
      lastVisitAt: "Última visita",
    });
  });
});

describe("value parsing", () => {
  it("reads day-first and ISO dates and rejects impossible ones", () => {
    expect(parseDate("15/03/2025")?.toISOString()).toBe("2025-03-15T12:00:00.000Z");
    expect(parseDate("15.03.25")?.toISOString()).toBe("2025-03-15T12:00:00.000Z");
    expect(parseDate("2025-03-15 14:30")?.toISOString()).toBe("2025-03-15T12:00:00.000Z");
    expect(parseDate("31/02/2025")).toBeNull();
    expect(parseDate("03/15/2025")).toBeNull();
    expect(parseDate("hier")).toBeNull();
  });

  it("reads consent answers in French, Portuguese and English", () => {
    expect(["oui", "Oui", "x", "1", "sim", "yes", "✓"].map(parseConsent)).toEqual(Array(7).fill("GRANTED"));
    expect(["non", "0", "não", "no", "refusé"].map(parseConsent)).toEqual(Array(5).fill("DENIED"));
    expect(parseConsent("")).toBe("UNKNOWN");
    expect(parseConsent("peut-être")).toBe("UNKNOWN");
  });

  it("splits full names, including the LASTNAME Firstname style", () => {
    expect(splitFullName("BERNARD Emma")).toEqual({ firstName: "Emma", lastName: "Bernard" });
    expect(splitFullName("Emma Bernard")).toEqual({ firstName: "Emma", lastName: "Bernard" });
    expect(splitFullName("DE LA FONTAINE Marie-Claire")).toEqual({ firstName: "Marie-Claire", lastName: "De La Fontaine" });
    expect(splitFullName("Inês")).toEqual({ firstName: "Inês", lastName: null });
  });

  it("parses amounts in every common format", () => {
    expect(parseAmountToCents("180")).toBe(18000);
    expect(parseAmountToCents("95,50 €")).toBe(9550);
    expect(parseAmountToCents("1 234,56")).toBe(123456);
    expect(parseAmountToCents("1.234,56")).toBe(123456);
    expect(parseAmountToCents("1,234.56")).toBe(123456);
    expect(parseAmountToCents("1.234")).toBe(123400);
    expect(parseAmountToCents("€95")).toBe(9500);
    expect(parseAmountToCents("gratuit")).toBeNull();
  });
});

describe("client file analysis", () => {
  const table = parseClientFile(
    [
      "N° client;Nom complet;Portable;Email;Dernière visite;Nb visites;CA total;Accepte SMS/email",
      "C1;BERNARD Emma;612345678;EMMA@EXAMPLE.COM;12/01/2026;4;360,00;oui",
      "C2;Lina Roux;06 39 98 00 01;;31/02/2025;;;non",
      "C3;Sans Contact;;;01/01/2026;1;;",
      "C4;Doublon Tel;+33 6 12 34 56 78;autre@example.com;;;;",
      "C5;Tel Faux;123;rose@example.com;2025-11-02;2;abc;",
    ].join("\n"),
  );
  const result = analyzeClientFile(table, guessMapping(table.headers), "FR");

  it("normalises the rows it keeps", () => {
    expect(result.contacts.map((contact) => contact.line)).toEqual([2, 3, 6]);
    expect(result.contacts[0]).toMatchObject({
      externalId: "C1",
      firstName: "Emma",
      lastName: "Bernard",
      phone: "+33612345678",
      email: "emma@example.com",
      visitCount: 4,
      lifetimeValueCents: 36000,
      marketingConsent: "GRANTED",
    });
    expect(result.contacts[0]!.lastVisitAt?.toISOString()).toBe("2026-01-12T12:00:00.000Z");
    expect(result.contacts[1]).toMatchObject({ phone: "+33639980001", lastVisitAt: null, marketingConsent: "DENIED" });
    expect(result.contacts[2]).toMatchObject({ phone: null, email: "rose@example.com", visitCount: 2, lifetimeValueCents: null });
  });

  it("explains every row left out and counts warnings", () => {
    expect(result.rejected).toEqual([
      { line: 4, reason: "Ni téléphone ni email" },
      { line: 5, reason: "Doublon dans le fichier (même téléphone que la ligne 2)" },
    ]);
    expect(result.warnings).toEqual({ unreadable_date: 1, invalid_phone: 1, unreadable_number: 1 });
    expect(result.withoutLastVisit).toBe(1);
  });
});
