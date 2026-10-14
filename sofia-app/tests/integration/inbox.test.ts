import { asc, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { withSystem, withTenant } from "@/server/db/context";
import { conversations, leads, messages, organizations } from "@/server/db/schema";
import { getInboxCounters, releaseConversation, sendManualReply, takeOverConversation } from "@/server/services/inbox";

import { addMember, createEstablishment, meta, tenantContextFor } from "./helpers";

let contacts = 0;

async function openConversation(organizationId: string, options: { humanRequested?: boolean } = {}) {
  return withTenant(organizationId, async (tx) => {
    const now = new Date();
    // Fictional numbers (+33 6 39 98 …): one per contact, phones are unique per establishment.
    const phone = `+336399800${String((contacts += 1)).padStart(2, "0")}`;
    const [lead] = await tx.insert(leads).values({ organizationId, firstName: "Héloïse", phone, source: "WHATSAPP", channel: "WHATSAPP" }).returning({ id: leads.id });
    const [conversation] = await tx
      .insert(conversations)
      .values({
        organizationId,
        leadId: lead!.id,
        channel: "WHATSAPP",
        unreadCount: 1,
        lastMessageAt: now,
        lastInboundAt: now,
        lastMessagePreview: "Bonjour, je suis enceinte, puis-je faire un peeling ?",
        humanRequestedAt: options.humanRequested ? now : null,
      })
      .returning({ id: conversations.id });
    await tx.insert(messages).values({
      organizationId,
      conversationId: conversation!.id,
      direction: "INBOUND",
      authorType: "CONTACT",
      body: "Bonjour, je suis enceinte, puis-je faire un peeling ?",
      status: "RECEIVED",
      createdAt: now,
    });
    return conversation!.id;
  });
}

const thread = (organizationId: string, conversationId: string) =>
  withTenant(organizationId, (tx) =>
    tx
      .select({ authorType: messages.authorType, direction: messages.direction, body: messages.body, status: messages.status })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt)),
  );

describe("inbox and human handoff", () => {
  let owner: Awaited<ReturnType<typeof createEstablishment>>;
  let staff: Awaited<ReturnType<typeof addMember>>;

  beforeAll(async () => {
    owner = await createEstablishment("Institut Inbox");
    staff = await addMember(owner.organizationId, "STAFF", "Léa Martin");
  });

  it("never lets SOFIA and the team answer at the same time", async () => {
    const conversationId = await openConversation(owner.organizationId, { humanRequested: true });
    await expect(sendManualReply(staff.ctx, { conversationId, body: "Bonjour" }, meta)).rejects.toMatchObject({ code: "VALIDATION" });

    expect((await withTenant(owner.organizationId, (tx) => getInboxCounters(tx, owner.organizationId))).human).toBe(1);
    await takeOverConversation(staff.ctx, conversationId, meta);
    const [taken] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.id, conversationId)));
    expect(taken).toMatchObject({ handlingMode: "HUMAN_ACTIVE", takenOverByUserId: staff.userId });
    expect((await withTenant(owner.organizationId, (tx) => getInboxCounters(tx, owner.organizationId))).human).toBe(0);

    // A real establishment: the channel is not connected yet, nothing pretends to be sent.
    await expect(sendManualReply(staff.ctx, { conversationId, body: "Je regarde avec la docteure." }, meta)).rejects.toThrow(/doit être connecté/);

    await releaseConversation(staff.ctx, conversationId, meta);
    const [released] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.id, conversationId)));
    expect(released?.handlingMode).toBe("AI_ACTIVE");
    const system = (await thread(owner.organizationId, conversationId)).filter((message) => message.authorType === "SYSTEM").map((message) => message.body);
    expect(system).toEqual(["Léa Martin a pris la conversation. SOFIA ne répond plus automatiquement.", "Léa Martin a rendu la conversation à SOFIA."]);
    expect(released?.humanRequestedAt).toBeNull();
  });

  it("records replies in a demonstration establishment without sending anything", async () => {
    await withSystem((tx) => tx.update(organizations).set({ isDemo: true }).where(eq(organizations.id, owner.organizationId)));
    const ctx = await tenantContextFor(staff.userId, owner.organizationId);
    const conversationId = await openConversation(owner.organizationId);
    await takeOverConversation(ctx, conversationId, meta);
    const result = await sendManualReply(ctx, { conversationId, body: "Par prudence, nous attendrons après votre grossesse." }, meta);
    expect(result.simulated).toBe(true);
    const reply = (await thread(owner.organizationId, conversationId)).find((message) => message.authorType === "USER");
    expect(reply).toMatchObject({ direction: "OUTBOUND", body: "Par prudence, nous attendrons après votre grossesse." });
  });
});
