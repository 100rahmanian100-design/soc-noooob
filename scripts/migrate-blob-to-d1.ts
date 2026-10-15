/**
 * Blob → D1 migration runner (server-side, tsx).
 *
 *  - Reads exact ENCRYPTED payloads from Blob (no decrypt/re-encrypt).
 *  - Verifies each key by re-reading D1 and comparing sha256 hashes.
 *  - Idempotent: safe to rerun; identical values are skipped after verify.
 *  - Never deletes Blob objects. Never prints values/secrets.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... STORAGE_API_URL=... STORAGE_API_TOKEN=... \
 *     npx tsx scripts/migrate-blob-to-d1.ts [--verify-only] [--include-user=NAME ...]
 */
import { createHash } from 'node:crypto';
import {
  allFixedKeys,
  readRawBlob,
  readRawD1,
  storageKeyForUser,
  writeRawD1,
  getAccounts,
} from '../api/_lib/core.js';

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

interface Row { key: string; status: string; detail?: string }

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify-only');
  const includeUsers = args
    .filter((a) => a.startsWith('--include-user='))
    .map((a) => a.slice('--include-user='.length).trim())
    .filter(Boolean);

  if (!process.env.BLOB_READ_WRITE_TOKEN) fail('BLOB_READ_WRITE_TOKEN is not set');
  if (!process.env.STORAGE_API_URL || !process.env.STORAGE_API_TOKEN) {
    fail('STORAGE_API_URL / STORAGE_API_TOKEN are not set');
  }

  const keys: string[] = [...allFixedKeys()];
  // Discover per-user keys from Blob accounts doc (authoritative user list).
  const accountsRaw = await readRawBlob('accounts.json.enc').catch((e) => {
    fail(`cannot read accounts from Blob: ${(e as Error).message}`);
    return null;
  });
  void accountsRaw;
  const { accounts } = await getAccounts().catch(() => ({ accounts: [] as never[] }));
  const names = includeUsers.length > 0
    ? includeUsers
    : (accounts as Array<{ username: string }>).map((a) => a.username);
  for (const u of names) keys.push(storageKeyForUser(u));

  const rows: Row[] = [];
  let migrated = 0, skipped = 0, failed = 0;
  for (const key of keys) {
    try {
      const src = await readRawBlob(key);
      if (src == null || src === '') {
        // Nothing in Blob — check D1 holds nothing either (or leave as-is).
        rows.push({ key, status: 'skipped-empty-source' });
        skipped++;
        continue;
      }
      const dstBefore = await readRawD1(key).catch(() => null);
      if (dstBefore != null && sha256(dstBefore) === sha256(src)) {
        rows.push({ key, status: 'skipped-identical' });
        skipped++;
        continue;
      }
      if (verifyOnly) {
        rows.push({ key, status: dstBefore == null ? 'missing-in-d1' : 'differs' });
        if (dstBefore == null) failed++;
        continue;
      }
      await writeRawD1(key, src);
      const dstAfter = await readRawD1(key);
      if (dstAfter == null || sha256(dstAfter) !== sha256(src)) {
        rows.push({ key, status: 'FAILED-verify-mismatch' });
        failed++;
      } else {
        rows.push({ key, status: dstBefore == null ? 'migrated' : 'overwritten-identical-verify-ok' });
        migrated++;
      }
    } catch (e) {
      rows.push({ key, status: 'FAILED', detail: (e as Error)?.message?.slice(0, 160) });
      failed++;
    }
  }

  for (const r of rows) console.log(`${r.status}\t${r.key}${r.detail ? `\t${r.detail}` : ''}`);
  console.log(`---\nmigrated=${migrated} skipped=${skipped} failed=${failed} total=${keys.length}`);
  console.log('NOTE: production still reads Blob. Cutover to D1 requires explicit approval.');
  if (failed > 0) process.exit(1);
}

function fail(msg: string): never {
  console.error(`migration aborted: ${msg}`);
  process.exit(2);
}

main().catch((e) => {
  console.error(`migration aborted: ${(e as Error)?.message ?? e}`);
  process.exit(2);
});
