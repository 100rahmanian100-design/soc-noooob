/**
 * Handler regression tests (local backend, isolated via SOC_DATA_DIR — see package.json).
 * Run:  npm run test:handlers
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.AUTH_SECRET = 'handler-test-secret-0123456789abcdef';
process.env.STORAGE_BACKEND = 'local';

const core = await import('../api/_lib/core.ts');
const handlers = await import('../api/_lib/handlers.ts');

function ctx(body, cookies = {}) {
  return { body, cookies, isSecure: false };
}

async function loginAs(username, password) {
  const r = await handlers.handleAuth(ctx({ action: 'login', username, password }));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return { [core.SESSION_COOKIE]: r.setCookie.value };
}

describe('auth flow', () => {
  it('first register -> superadmin; closed; login/me/status', async () => {
    const reg = await handlers.handleAuth(
      ctx({ action: 'register', username: 'rootadmin', password: 'password-123', inviteCode: 'soc-noooob' }),
    );
    assert.equal(reg.status, 200, JSON.stringify(reg.body));
    const cookies = { [core.SESSION_COOKIE]: reg.setCookie.value };
    const me = await handlers.handleAuth(ctx({ action: 'me' }, cookies));
    assert.equal(me.status, 200);
    assert.equal(me.body.account.role, 'superadmin');
    const status = await handlers.handleAuth(ctx({ action: 'status' }));
    assert.equal(status.body.firstRegisterOpen, false);
    const closed = await handlers.handleAuth(
      ctx({ action: 'register', username: 'someone', password: 'password-123', inviteCode: 'soc-noooob' }),
    );
    assert.equal(closed.status, 403);
    const bad = await handlers.handleAuth(ctx({ action: 'login', username: 'rootadmin', password: 'nope-nope-nope' }));
    assert.equal(bad.status, 401);
  });
});

describe('data handlers (progress/content/comments/chat/users)', () => {
  it('progress:get/set round-trip', async () => {
    const cookies = await loginAs('rootadmin', 'password-123');
    const g0 = await handlers.handleData(ctx({ action: 'progress:get' }, cookies));
    assert.equal(g0.status, 200);
    const s = await handlers.handleData(ctx({ action: 'progress:set', progress: { 'p1-x': true } }, cookies));
    assert.equal(s.status, 200);
    const g1 = await handlers.handleData(ctx({ action: 'progress:get' }, cookies));
    assert.deepEqual(g1.body.progress, { 'p1-x': true });
  });

  it('content:set/get/reset', async () => {
    const cookies = await loginAs('rootadmin', 'password-123');
    const g0 = await handlers.handleData(ctx({ action: 'content:get' }, cookies));
    assert.equal(g0.status, 200);
    assert.equal(g0.body.content, null);
    const content = {
      menus: { home: 'Home', 'phase-1': 'P1', 'phase-2': 'P2', 'phase-3': 'P3', 'phase-4': 'P4', appendix: 'App' },
      pages: Object.fromEntries(
        ['home', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'appendix'].map((p) => [
          p, { headerTitle: p, blocks: [{ type: 'paragraph', text: 'hello' }] },
        ]),
      ),
    };
    const setR = await handlers.handleData(ctx({ action: 'content:set', content }, cookies));
    assert.equal(setR.status, 200, JSON.stringify(setR.body));
    const g1 = await handlers.handleData(ctx({ action: 'content:get' }, cookies));
    assert.equal(g1.body.isCustom, true);
    const reset = await handlers.handleData(ctx({ action: 'content:reset' }, cookies));
    assert.equal(reset.status, 200);
    const g2 = await handlers.handleData(ctx({ action: 'content:get' }, cookies));
    assert.equal(g2.body.content, null);
  });

  it('create user; comment thread; notifications; chat; inspect; rename', async () => {
    const admin = await loginAs('rootadmin', 'password-123');
    const created = await handlers.handleData(
      ctx({ action: 'users:create', username: 'learner1', password: 'password-123', role: 'user' }, admin),
    );
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const user = await loginAs('learner1', 'password-123');
    const post = await handlers.handleData(
      ctx({ action: 'comments:post', phase: 'phase-1', text: 'question text here' }, user),
    );
    assert.equal(post.status, 200, JSON.stringify(post.body));
    const reply = await handlers.handleData(
      ctx({ action: 'comments:post', phase: 'phase-1', text: 'admin reply here', parentId: post.body.comment.id }, admin),
    );
    assert.equal(reply.status, 200, JSON.stringify(reply.body));
    const notifs = await handlers.handleData(ctx({ action: 'notifications:list' }, user));
    assert.equal(notifs.status, 200);
    assert.ok(notifs.body.notifications.length >= 1);
    const mark = await handlers.handleData(ctx({ action: 'notifications:markRead', all: true }, user));
    assert.equal(mark.status, 200);
    const sent = await handlers.handleData(ctx({ action: 'chat:send', targetUsername: 'rootadmin', text: 'hi there' }, user));
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    const msgs = await handlers.handleData(ctx({ action: 'chat:messages', targetUsername: 'learner1' }, admin));
    assert.equal(msgs.status, 200);
    assert.equal(msgs.body.messages.length, 1);
    const contacts = await handlers.handleData(ctx({ action: 'chat:contacts' }, admin));
    assert.equal(contacts.status, 200);
    const list = await handlers.handleData(ctx({ action: 'users:list' }, admin));
    assert.equal(list.status, 200);
    const prog = await handlers.handleData(ctx({ action: 'users:progress' }, admin));
    assert.equal(prog.status, 200);
    const insp = await handlers.handleData(ctx({ action: 'users:inspect', username: 'learner1' }, admin));
    assert.equal(insp.status, 200);
    const rn = await handlers.handleData(ctx({ action: 'users:renameSelf', newUsername: 'learner1b' }, user));
    assert.equal(rn.status, 200, JSON.stringify(rn.body));
  });

  it('unauthenticated -> 401; invalid action -> 400', async () => {
    const noAuth = await handlers.handleData(ctx({ action: 'progress:get' }));
    assert.equal(noAuth.status, 401);
    const admin = await loginAs('rootadmin', 'password-123');
    const bad = await handlers.handleData(ctx({ action: 'nope' }, admin));
    assert.equal(bad.status, 400);
  });
});

