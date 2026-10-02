import { relations } from "drizzle-orm";

import { appointments } from "./appointments";
import { automations, campaignRecipients, campaigns, followups } from "./automation";
import { conversations, messages } from "./conversations";
import { consentRecords, leadNotes, leadStatusChanges, leads } from "./crm";
import { invitations, memberships, organizations, sessions, users } from "./identity";
import { integrations } from "./integrations";
import { businessHours, businessProfiles, faqs, practitioners, services } from "./knowledge";
import { revenueAttributions } from "./revenue";

// Relations power Drizzle's relational query API (`db.query.x.findMany({ with })`).
// They are metadata only and do not change the database.

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  sessions: many(sessions),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  profile: one(businessProfiles, {
    fields: [organizations.id],
    references: [businessProfiles.organizationId],
  }),
  memberships: many(memberships),
  invitations: many(invitations),
  integrations: many(integrations),
  services: many(services),
  businessHours: many(businessHours),
  automations: many(automations),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  activeOrganization: one(organizations, {
    fields: [sessions.activeOrganizationId],
    references: [organizations.id],
  }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, { fields: [memberships.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, { fields: [invitations.organizationId], references: [organizations.id] }),
  invitedBy: one(users, { fields: [invitations.invitedByUserId], references: [users.id] }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  faqs: many(faqs),
}));

export const faqsRelations = relations(faqs, ({ one }) => ({
  service: one(services, { fields: [faqs.serviceId], references: [services.id] }),
}));

export const practitionersRelations = relations(practitioners, ({ many }) => ({
  appointments: many(appointments),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  interestedService: one(services, { fields: [leads.interestedServiceId], references: [services.id] }),
  assignedTo: one(users, { fields: [leads.assignedToUserId], references: [users.id] }),
  notes: many(leadNotes),
  statusChanges: many(leadStatusChanges),
  consents: many(consentRecords),
  conversations: many(conversations),
  appointments: many(appointments),
  revenue: many(revenueAttributions),
}));

export const leadNotesRelations = relations(leadNotes, ({ one }) => ({
  lead: one(leads, { fields: [leadNotes.leadId], references: [leads.id] }),
  author: one(users, { fields: [leadNotes.authorUserId], references: [users.id] }),
}));

export const leadStatusChangesRelations = relations(leadStatusChanges, ({ one }) => ({
  lead: one(leads, { fields: [leadStatusChanges.leadId], references: [leads.id] }),
}));

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  lead: one(leads, { fields: [consentRecords.leadId], references: [leads.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  lead: one(leads, { fields: [conversations.leadId], references: [leads.id] }),
  integration: one(integrations, { fields: [conversations.integrationId], references: [integrations.id] }),
  assignedTo: one(users, { fields: [conversations.assignedToUserId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  author: one(users, { fields: [messages.authorUserId], references: [users.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  lead: one(leads, { fields: [appointments.leadId], references: [leads.id] }),
  service: one(services, { fields: [appointments.serviceId], references: [services.id] }),
  practitioner: one(practitioners, { fields: [appointments.practitionerId], references: [practitioners.id] }),
  conversation: one(conversations, { fields: [appointments.conversationId], references: [conversations.id] }),
  revenue: many(revenueAttributions),
}));

export const followupsRelations = relations(followups, ({ one }) => ({
  lead: one(leads, { fields: [followups.leadId], references: [leads.id] }),
  appointment: one(appointments, { fields: [followups.appointmentId], references: [appointments.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  recipients: many(campaignRecipients),
}));

export const campaignRecipientsRelations = relations(campaignRecipients, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignRecipients.campaignId], references: [campaigns.id] }),
  lead: one(leads, { fields: [campaignRecipients.leadId], references: [leads.id] }),
}));

export const revenueAttributionsRelations = relations(revenueAttributions, ({ one }) => ({
  lead: one(leads, { fields: [revenueAttributions.leadId], references: [leads.id] }),
  appointment: one(appointments, { fields: [revenueAttributions.appointmentId], references: [appointments.id] }),
}));
