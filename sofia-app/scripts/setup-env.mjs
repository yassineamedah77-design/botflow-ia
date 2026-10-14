#!/usr/bin/env node
/**
 * Creates .env.local from .env.example with freshly generated secrets.
 * Refuses to overwrite an existing .env.local.
 *
 *   npm run setup:env
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, ".env.local");

if (existsSync(target)) {
  console.log("✓ .env.local already exists, nothing changed.");
  process.exit(0);
}

const template = readFileSync(path.join(root, ".env.example"), "utf8");
const secret = () => randomBytes(32).toString("base64");

const output = template.replace(/^ENCRYPTION_KEY=$/m, `ENCRYPTION_KEY=${secret()}`);

writeFileSync(target, output, { mode: 0o600 });
console.log("✓ .env.local created with a new ENCRYPTION_KEY. Review DATABASE_URL and email settings.");
