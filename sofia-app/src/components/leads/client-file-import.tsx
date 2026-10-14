"use client";

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  ShieldCheckIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { cn } from "cn";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClientFileError,
  decodeFileBytes,
  guessMapping,
  IMPORT_FIELDS,
  IMPORT_MAX_BYTES,
  IMPORT_WARNING_LABELS,
  parseClientFile,
  type ImportMapping,
  type ImportWarning,
  type ParsedTable,
} from "@/lib/client-file";
import { IMPORT_DECLARATION } from "@/lib/contacts";

type Step = "file" | "mapping" | "review" | "done";

interface Report {
  totalRows: number;
  toCreate: number;
  toUpdate: number;
  rejected: Array<{ line: number; reason: string }>;
  rejectedCount: number;
  warnings: Partial<Record<ImportWarning, number>>;
  withoutLastVisit: number;
  consentGranted: number;
  consentDenied: number;
}

const SKIP = "__skip";

const TEMPLATE = [
  "N° client;Prénom;Nom;Téléphone;Email;Date de dernière visite;Nombre de visites;Total dépensé;Consentement marketing",
  "C-1001;Emma;Bernard;06 12 34 56 78;emma.bernard@example.com;15/03/2026;4;380,00;oui",
  "C-1002;Lina;Roux;06 98 76 54 32;;02/11/2025;1;95,00;non",
].join("\r\n");

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob(["﻿" + TEMPLATE], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: "modele-fichier-clients.csv" });
  link.click();
  URL.revokeObjectURL(url);
}

const STEPS: Array<{ key: Step; label: string }> = [
  { key: "file", label: "Fichier" },
  { key: "mapping", label: "Colonnes" },
  { key: "review", label: "Vérification" },
  { key: "done", label: "Import" },
];

function Stepper({ step }: { step: Step }) {
  const current = STEPS.findIndex((item) => item.key === step);
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-sm" aria-label="Étapes de l'import">
      {STEPS.map((item, index) => (
        <li key={item.key} className="flex items-center gap-2" aria-current={index === current ? "step" : undefined}>
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full border text-xs font-semibold tabular",
              index < current && "border-success bg-success text-white",
              index === current && "border-primary bg-primary text-primary-foreground",
              index > current && "border-border text-muted-foreground",
            )}
          >
            {index < current ? <CheckCircle2Icon className="size-3.5" aria-hidden /> : index + 1}
          </span>
          <span className={cn(index === current ? "font-medium" : "text-muted-foreground")}>{item.label}</span>
          {index < STEPS.length - 1 ? <span className="mx-1 h-px w-6 bg-border" aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}

async function send(file: File, mapping: ImportMapping, mode: "preview" | "import"): Promise<Report & { importId?: string }> {
  const body = new FormData();
  body.set("file", file);
  body.set("mapping", JSON.stringify(mapping));
  body.set("mode", mode);
  if (mode === "import") body.set("declaration", "accepted");
  const response = await fetch("/api/leads/import", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as (Report & { error?: string }) | null;
  if (!response.ok || !payload) throw new Error(payload?.error ?? "Le serveur n'a pas pu traiter le fichier. Réessayez.");
  return payload;
}

export function ClientFileImport() {
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [report, setReport] = useState<Report | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = async (selected: File | undefined) => {
    setError(null);
    if (!selected) return;
    if (selected.size > IMPORT_MAX_BYTES) {
      setError("Le fichier dépasse 4 Mo. Découpez-le en plusieurs fichiers.");
      return;
    }
    if (/\.(xlsx?|ods|numbers)$/i.test(selected.name)) {
      setError("Ce fichier est au format tableur. Ouvrez-le puis « Enregistrer sous » au format CSV, et importez le fichier CSV.");
      return;
    }
    try {
      const parsed = parseClientFile(decodeFileBytes(new Uint8Array(await selected.arrayBuffer())));
      setFile(selected);
      setTable(parsed);
      setMapping(guessMapping(parsed.headers));
      setStep("mapping");
    } catch (caught) {
      setError(caught instanceof ClientFileError ? caught.message : "Ce fichier n'a pas pu être lu. Vérifiez qu'il s'agit bien d'un fichier CSV.");
    }
  };

  const run = async (mode: "preview" | "import") => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await send(file, mapping, mode);
      setReport(result);
      setStep(mode === "preview" ? "review" : "done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const samples = (header: string | undefined) => {
    if (!table || !header) return [];
    const index = table.headers.indexOf(header);
    return table.rows
      .map((row) => (row[index] ?? "").trim())
      .filter(Boolean)
      .slice(0, 3);
  };

  return (
    <div className="max-w-4xl">
      <Stepper step={step} />
      {error ? (
        <Alert variant="destructive" className="mb-6" aria-live="assertive">
          <AlertTriangleIcon aria-hidden />
          <AlertDescription className="text-destructive">{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === "file" ? (
        <div className="grid gap-6">
          <label
            htmlFor="client-file"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void choose(event.dataTransfer.files[0]);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-input bg-card px-6 py-14 text-center transition-colors hover:border-sofia/50 hover:bg-sofia-soft/30"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-sand">
              <FileSpreadsheetIcon className="size-6 text-foreground/70" aria-hidden />
            </span>
            <span className="font-medium">Déposez votre fichier clients ici, ou cliquez pour le choisir</span>
            <span className="text-sm text-muted-foreground">Format CSV, 4 Mo et 20 000 clientes maximum</span>
            <input
              ref={inputRef}
              id="client-file"
              type="file"
              accept=".csv,text/csv,.txt"
              className="sr-only"
              onChange={(event) => void choose(event.target.files?.[0])}
            />
          </label>
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-semibold">Où trouver ce fichier ?</h2>
              <p className="text-muted-foreground">
                Dans votre logiciel de réservation ou de caisse, cherchez l&apos;export du fichier clients au format CSV. Depuis Excel : Fichier,
                Enregistrer sous, puis le format CSV.
              </p>
              <Button variant="link" className="mt-1 h-auto px-0" onClick={downloadTemplate}>
                <DownloadIcon aria-hidden />
                Télécharger un modèle
              </Button>
            </div>
            <div>
              <h2 className="mb-2 font-semibold">Ce qui est importé</h2>
              <p className="text-muted-foreground">
                Nom, téléphone, email, dates de visite, nombre de visites, total dépensé et consentement marketing. Les notes libres ne sont jamais
                importées : elles contiennent souvent des informations de santé, des données sensibles au sens du RGPD.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {step === "mapping" && table ? (
        <div className="grid gap-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{file?.name}</span> · {table.rows.length.toLocaleString("fr-FR")} ligne
            {table.rows.length > 1 ? "s" : ""}. SOFIA a proposé une correspondance à partir des titres de colonnes : vérifiez-la.
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {IMPORT_FIELDS.map((field) => {
                const header = mapping[field.key];
                const examples = samples(header);
                return (
                  <li key={field.key} className="grid gap-3 px-5 py-4 sm:grid-cols-[13rem_15rem_minmax(0,1fr)] sm:items-center">
                    <div>
                      <p className="text-sm font-medium" id={`field-${field.key}`}>
                        {field.label}
                      </p>
                      {field.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{field.hint}</p> : null}
                    </div>
                    <Select
                      value={header ?? SKIP}
                      onValueChange={(value) => setMapping((current) => ({ ...current, [field.key]: value === SKIP ? undefined : value }))}
                    >
                      <SelectTrigger className="h-10 w-full bg-card" aria-labelledby={`field-${field.key}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP}>Ne pas importer</SelectItem>
                        {table.headers.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="truncate text-xs text-muted-foreground">{examples.length ? `Ex. : ${examples.join(" · ")}` : null}</p>
                  </li>
                );
              })}
            </ul>
          </div>
          {!mapping.lastVisitAt ? (
            <Alert variant="warning">
              <AlertTriangleIcon aria-hidden />
              <AlertDescription>
                Sans date de dernière visite, SOFIA ne pourra pas repérer les clientes inactives à réactiver.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep("file")}>
              <ArrowLeftIcon aria-hidden />
              Changer de fichier
            </Button>
            <Button onClick={() => void run("preview")} disabled={busy || (!mapping.phone && !mapping.email)}>
              {busy ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
              Vérifier le fichier
            </Button>
          </div>
          {!mapping.phone && !mapping.email ? (
            <p className="text-right text-sm text-destructive">Associez au moins la colonne du téléphone ou celle de l&apos;email.</p>
          ) : null}
        </div>
      ) : null}

      {step === "review" && report ? (
        <div className="grid gap-6">
          <dl className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Lignes lues", value: report.totalRows },
              { label: "Nouveaux contacts", value: report.toCreate },
              { label: "Contacts complétés", value: report.toUpdate },
              { label: "Lignes écartées", value: report.rejectedCount },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-card px-5 py-4">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 font-heading text-2xl font-semibold tabular">{item.value.toLocaleString("fr-FR")}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <p>
              Consentement marketing : {report.consentGranted.toLocaleString("fr-FR")} accepté{report.consentGranted > 1 ? "s" : ""},{" "}
              {report.consentDenied.toLocaleString("fr-FR")} refusé{report.consentDenied > 1 ? "s" : ""}, les autres non renseignés.
            </p>
            {report.withoutLastVisit > 0 ? (
              <p>{report.withoutLastVisit.toLocaleString("fr-FR")} contact(s) sans date de dernière visite ne pourront pas être ciblés par inactivité.</p>
            ) : null}
            {Object.entries(report.warnings).map(([warning, count]) => (
              <p key={warning}>
                {count} ligne(s) : {IMPORT_WARNING_LABELS[warning as ImportWarning]}, le reste de la ligne est importé.
              </p>
            ))}
          </div>
          {report.rejected.length > 0 ? (
            <details className="rounded-2xl border border-border bg-card px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium">Voir les lignes écartées ({report.rejectedCount})</summary>
              <ul className="mt-3 grid gap-1 text-sm text-muted-foreground">
                {report.rejected.map((row) => (
                  <li key={`${row.line}-${row.reason}`}>
                    Ligne {row.line} : {row.reason}
                  </li>
                ))}
                {report.rejectedCount > report.rejected.length ? <li>…et {report.rejectedCount - report.rejected.length} autres.</li> : null}
              </ul>
            </details>
          ) : null}
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
            <Checkbox id="declaration" checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} className="mt-0.5" />
            <label htmlFor="declaration" className="text-sm leading-relaxed">
              <span className="mb-1 flex items-center gap-1.5 font-medium">
                <ShieldCheckIcon className="size-4 text-success" aria-hidden />
                Origine des données
              </span>
              {IMPORT_DECLARATION}
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep("mapping")} disabled={busy}>
              <ArrowLeftIcon aria-hidden />
              Modifier les colonnes
            </Button>
            <Button onClick={() => void run("import")} disabled={busy || !accepted || report.toCreate + report.toUpdate === 0}>
              {busy ? <Loader2Icon className="animate-spin" aria-hidden /> : <UploadIcon aria-hidden />}
              Importer {(report.toCreate + report.toUpdate).toLocaleString("fr-FR")} contact{report.toCreate + report.toUpdate > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "done" && report ? (
        <div className="grid gap-6 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success-soft">
              <CheckCircle2Icon className="size-6 text-success" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Fichier importé</h2>
              <p className="mt-1 text-sm text-muted-foreground" role="status">
                {report.toCreate.toLocaleString("fr-FR")} contact{report.toCreate > 1 ? "s" : ""} ajouté{report.toCreate > 1 ? "s" : ""},{" "}
                {report.toUpdate.toLocaleString("fr-FR")} complété{report.toUpdate > 1 ? "s" : ""}, {report.rejectedCount.toLocaleString("fr-FR")}{" "}
                ligne{report.rejectedCount > 1 ? "s" : ""} écartée{report.rejectedCount > 1 ? "s" : ""}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/reactivation">Voir les clientes à réactiver</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/leads?source=IMPORT">Voir les contacts importés</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
