/**
 * Storage tests: node --test (no external deps, no network).
 * Run:  npm run test:storage
 * Env:  AUTH_SECRET=test-secret-0123456789 (set by the npm script)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// NOTE: SOC_DATA_DIR must be set BEFORE this file is loaded (see package.json
// test scripts) because core.ts computes DATA_DIR at import time.
process.env.AUTH_SECRET ??= 'test-secret-0123456789abcdefgh';

const core = await import('../api/_lib/core.ts');
const d1 = await import('../api/_lib/d1.ts');

describe('key allowlist', () => {
  it('accepts the 5 fixed keys', () => {
    for (const k of [
      'accounts.json.enc',
      'comments.json.enc',
      'notifications.json.enc',
      'chat.json.enc',
      'contents.json.enc',
    ]) {
      assert.equal(d1.isAllowedStorageKey(k), true, k);
    }
  });
  it('accepts encoded usernames', () => {
    assert.equal(d1.isAllowedStorageKey('user-data/alice.json.enc'), true);
    assert.equal(core.storageKeyForUser('Bob_99'), 'user-data/Bob_99.json.enc');
    assert.equal(d1.isAllowedStorageKey(core.storageKeyForUser('Bob_99')), true);
  });
  it('rejects traversal and garbage', () => {
    for (const k of [
      '',
      'accounts.json',
      '../accounts.json.enc',
      'user-data/../x.json.enc',
      'user-data/a/b.json.enc',
      'user-data/%2e%2e.json.enc',
      'user-data/%ZZ.json.enc',
      'evil',
    ]) {
      assert.equal(d1.isAllowedStorageKey(k), false, k);
    }
  });
});

describe('encryption compatibility (AES-256-GCM unchanged)', () => {
  it('round-trips JSON through the existing format', () => {
    const value = { accounts: [{ username: 'alice' }] };
    const raw = core.__encryptForTest(value);
    const box = JSON.parse(raw);
    assert.equal(box.v, 1);
    assert.match(box.iv, /^[0-9a-f]+$/);
    assert.match(box.tag, /^[0-9a-f]+$/);
    assert.deepEqual(core.__decryptForTest(raw), value);
  });
  it('wrong secret does not decrypt (returns null, like production)', () => {
    const raw = core.__encryptForTest({ a: 1 });
    assert.equal(JSON.parse(raw).v, 1);
    // decryptJSON with the same SECRET works; garbage does not
    assert.equal(core.__decryptForTest('not-json'), null);
    assert.equal(core.__decryptForTest('{"iv":"00","tag":"00","d":"AA=="}'), null);
  });
});

describe('backend selection (no silent fallback)', () => {
  it('defaults to blob when token present, local otherwise', () => {
    assert.equal(d1.storageBackend(), 'local');
    assert.equal(core.activeBackend(), 'local');
  });
});

describe('local filesystem behavior + cache', () => {
  it('readJSON/writeJSON round-trip with deep-copy + invalidation', async () => {
    process.env.STORAGE_BACKEND = 'local';
    core.clearDocCache();
    await core.saveAccounts({ accounts: [] });
    const a = await core.getAccounts();
    assert.deepEqual(a, { accounts: [] });
    // mutate the returned copy — cache must not be polluted
    a.accounts.push({ username: 'x', passHash: 'y', role: 'user', createdBy: null, active: true, createdAt: 't' });
    const b = await core.getAccounts();
    assert.deepEqual(b, { accounts: [] });
    // write invalidates cache
    await core.saveComments({ comments: [] });
    const c1 = await core.getComments();
    c1.comments.push({ id: '1', phase: 'phase-1', author: 'a', authorRole: 'user', targetAdmin: null, parentId: null, text: 't', createdAt: 't', answered: false });
    const c2 = await core.getComments();
    assert.deepEqual(c2, { comments: [] });
    delete process.env.STORAGE_BACKEND;
    core.clearDocCache();
  });
  it('repeated reads are served consistently', async () => {
    process.env.STORAGE_BACKEND = 'local';
    core.clearDocCache();
    await core.saveChat({ messages: [] });
    const [r1, r2] = await Promise.all([core.getChat(), core.getChat()]);
    assert.deepEqual(r1, { messages: [] });
    assert.deepEqual(r2, { messages: [] });
    delete process.env.STORAGE_BACKEND;
    core.clearDocCache();
  });
});

describe('d1 client guards (no network)', () => {
  it('missing env throws a helpful error', async () => {
    delete process.env.STORAGE_API_URL;
    delete process.env.STORAGE_API_TOKEN;
    await assert.rejects(() => d1.d1Get('accounts.json.enc'), /not configured/);
    await assert.rejects(() => d1.d1Put('accounts.json.enc', 'x'), /not configured/);
  });
  it('disallowed keys throw before any fetch', async () => {
    process.env.STORAGE_API_URL = 'https://example.workers.dev';
    process.env.STORAGE_API_TOKEN = 't';
    await assert.rejects(() => d1.d1Get('../x'), /disallowed/);
    await assert.rejects(() => d1.d1Put('evil', 'x'), /disallowed/);
    delete process.env.STORAGE_API_URL;
    delete process.env.STORAGE_API_TOKEN;
  });
  it('oversized PUT is rejected client-side', async () => {
    process.env.STORAGE_API_URL = 'https://example.workers.dev';
    process.env.STORAGE_API_TOKEN = 't';
    const big = 'x'.repeat(d1.D1_MAX_VALUE_BYTES + 1);
    await assert.rejects(() => d1.d1Put('accounts.json.enc', big), /too large/);
    delete process.env.STORAGE_API_URL;
    delete process.env.STORAGE_API_TOKEN;
  });
  it('http:// base URL is rejected', async () => {
    process.env.STORAGE_API_URL = 'http://insecure.example';
    process.env.STORAGE_API_TOKEN = 't';
    await assert.rejects(() => d1.d1Get('accounts.json.enc'), /https/);
    delete process.env.STORAGE_API_URL;
    delete process.env.STORAGE_API_TOKEN;
  });
});
