import "server-only";

import { hash, parseOptions, verify } from "@node-rs/argon2";

/**
 * Password hashing with argon2id, OWASP minimum parameters (19 MiB memory,
 * 2 iterations, 1 lane). The parameters are stored in each hash (PHC string),
 * so they can be raised later: `needsRehash` flags old hashes, which are
 * upgraded transparently at the next successful login.
 */

const PARAMETERS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
// @node-rs/argon2 `Algorithm.Argon2id` (a const enum, unusable with isolatedModules).
const ARGON2ID = 2;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, PARAMETERS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // Malformed hash in the database: treat as a failed verification.
    return false;
  }
}

export function needsRehash(passwordHash: string): boolean {
  try {
    const options = parseOptions(passwordHash);
    return (
      (options.algorithm as number) !== ARGON2ID ||
      options.memoryCost < PARAMETERS.memoryCost ||
      options.timeCost < PARAMETERS.timeCost
    );
  } catch {
    return true;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burns the same CPU time as a real verification when the account does not
 * exist, so response times do not reveal which emails are registered.
 */
export async function verifyAgainstDummyHash(password: string): Promise<false> {
  dummyHash ??= hashPassword("sofia-timing-equalizer-password");
  await verifyPassword(await dummyHash, password);
  return false;
}
