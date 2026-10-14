import { z } from "zod";

import { ROLES } from "@/lib/auth/roles";

/**
 * Form schemas shared by server actions and tests. Messages are shown to the
 * user as-is, in French.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

// Most common passwords in French-speaking leaks, plus generic ones. NIST
// 800-63B recommends rejecting known-compromised passwords rather than
// imposing composition rules.
const COMMON_PASSWORDS = new Set([
  "1234567890",
  "123456789a",
  "azertyuiop",
  "azerty1234",
  "azerty123456",
  "qwertyuiop",
  "password12",
  "password123",
  "motdepasse",
  "motdepasse1",
  "motdepasse123",
  "0123456789",
  "1111111111",
  "abcdefghij",
  "iloveyou12",
  "bonjour123",
  "soleil1234",
  "doudou1234",
  "chouchou12",
  "loulou1234",
  "marseille13",
  "jetaime1234",
  "sofia12345",
  "botflow123",
  "welcome123",
  "admin12345",
  "changeme123",
]);

export function passwordProblems(password: string, context: { email?: string; name?: string } = {}): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`Au moins ${PASSWORD_MIN_LENGTH} caractères.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    problems.push(`Au maximum ${PASSWORD_MAX_LENGTH} caractères.`);
  }
  if (password.trim().length === 0 || /^(.)\1+$/.test(password)) {
    problems.push("Ce mot de passe est trop simple.");
  } else if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    problems.push("Ce mot de passe est trop courant, choisissez-en un autre.");
  }
  const emailLocalPart = context.email?.split("@")[0]?.toLowerCase();
  if (emailLocalPart && emailLocalPart.length >= 4 && password.toLowerCase().includes(emailLocalPart)) {
    problems.push("Le mot de passe ne doit pas contenir votre adresse email.");
  }
  return problems;
}

export const emailSchema = z
  .string({ error: "L'adresse email est requise." })
  .trim()
  .toLowerCase()
  .min(1, { error: "L'adresse email est requise." })
  .max(254, { error: "Adresse email trop longue." })
  .pipe(z.email({ error: "Adresse email invalide." }));

const nameSchema = z
  .string({ error: "Le nom est requis." })
  .trim()
  .min(2, { error: "Indiquez au moins 2 caractères." })
  .max(80, { error: "80 caractères maximum." });

const passwordField = z
  .string({ error: "Le mot de passe est requis." })
  .min(1, { error: "Le mot de passe est requis." });

export const signUpSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordField,
    organizationName: z
      .string({ error: "Le nom de l'établissement est requis." })
      .trim()
      .min(2, { error: "Indiquez au moins 2 caractères." })
      .max(80, { error: "80 caractères maximum." }),
    acceptTerms: z.literal("on", { error: "Vous devez accepter les conditions d'utilisation." }),
  })
  .superRefine((value, ctx) => {
    for (const problem of passwordProblems(value.password, { email: value.email, name: value.name })) {
      ctx.addIssue({ code: "custom", path: ["password"], message: problem });
    }
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordField.max(PASSWORD_MAX_LENGTH, { error: "Email ou mot de passe incorrect." }),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, { error: "Lien invalide." }).max(200, { error: "Lien invalide." }),
    password: passwordField,
    confirmPassword: passwordField,
  })
  .superRefine((value, ctx) => {
    for (const problem of passwordProblems(value.password)) {
      ctx.addIssue({ code: "custom", path: ["password"], message: problem });
    }
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Les deux mots de passe ne correspondent pas." });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: passwordField,
    newPassword: passwordField,
    confirmPassword: passwordField,
  })
  .superRefine((value, ctx) => {
    for (const problem of passwordProblems(value.newPassword)) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: problem });
    }
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Les deux mots de passe ne correspondent pas." });
    }
    if (value.newPassword === value.currentPassword) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Choisissez un mot de passe différent de l'actuel." });
    }
  });

export const updateProfileSchema = z.object({ name: nameSchema });

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(ROLES, { error: "Rôle invalide." }).refine((role) => role !== "OWNER", {
    error: "La propriété ne se transmet qu'à un membre existant.",
  }),
});

export const acceptInvitationNewAccountSchema = z
  .object({
    token: z.string().min(20).max(200),
    name: nameSchema,
    password: passwordField,
    acceptTerms: z.literal("on", { error: "Vous devez accepter les conditions d'utilisation." }),
  })
  .superRefine((value, ctx) => {
    for (const problem of passwordProblems(value.password, { name: value.name })) {
      ctx.addIssue({ code: "custom", path: ["password"], message: problem });
    }
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
