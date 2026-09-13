"""Repeatable API tests; temporary database only. python test_server.py"""
import concurrent.futures
import http.client
import importlib.util
import json
import tempfile
import threading
import unittest
from pathlib import Path

HERE=Path(__file__).resolve().parent
SERVER_FILE=HERE/'server.py'
if (HERE/'server_release.py').exists(): SERVER_FILE=HERE/'server_release.py'
spec=importlib.util.spec_from_file_location('academy',SERVER_FILE)
app=importlib.util.module_from_spec(spec); spec.loader.exec_module(app)

class Client:
    def __init__(self): self.cookie=''; self.last_headers={}
    def call(self,path,method='GET',body=None,origin=None,custom=True):
        c=http.client.HTTPConnection('127.0.0.1',PORT,timeout=20)
        headers={'Content-Type':'application/json','Origin':origin or app.ORIGIN}
        if custom: headers['X-Ermanian-Request']='1'
        if self.cookie: headers['Cookie']=self.cookie
        raw=json.dumps(body).encode() if body is not None else None
        c.request(method,path,body=raw,headers=headers); r=c.getresponse()
        self.last_headers=dict(r.getheaders())
        if r.getheader('Set-Cookie') is not None: self.cookie=r.getheader('Set-Cookie').split(';')[0]
        payload=r.read(); status=r.status; c.close()
        try: payload=json.loads(payload)
        except ValueError: pass
        return status,payload

class AcademyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        global PORT
        cls.temp=tempfile.TemporaryDirectory()
        app.DB=Path(cls.temp.name)/'test.sqlite3'; app.init_db()
        cls.http=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        PORT=cls.http.server_address[1]; app.ORIGIN=f'http://127.0.0.1:{PORT}'
        cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True); cls.thread.start()
        cls.guest=Client(); cls.owner=None; cls.member=None; cls.member_id=None
    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown(); cls.http.server_close(); cls.temp.cleanup()
    def setUp(self):
        with app.RATE_LOCK: app.ATTEMPTS.clear()
    def register(self,c,email,setup='',invite='ermanian',role='superadmin'):
        return c.call('/api/register','POST',{'email':email,'name':'Test <img src=x onerror=alert(1)>','password':'A-unique-passphrase-2026','invite':invite,'setup_key':setup,'role':role})
    def test_01_bootstrap_and_concurrency(self):
        self.assertEqual(self.guest.call('/api/health')[1]['app'],'ermanian-soc')
        self.assertEqual(self.register(Client(),'bad@example.test',invite='wrong')[0],403)
        self.assertEqual(self.register(Client(),'bad@example.test')[0],403)
        clients=[Client(),Client()]
        def run(i): return clients[i],f'user{i}@example.test',self.register(clients[i],f'user{i}@example.test',app.SETUP_KEY)
        with concurrent.futures.ThreadPoolExecutor(2) as pool: results=list(pool.map(run,range(2)))
        self.assertEqual(sorted(r[2][1]['user']['role'] for r in results),['member','superadmin'])
        for c,email,(status,data) in results:
            self.assertEqual(status,200)
            self.assertNotIn('password',data['user'])
            self.assertIn('HttpOnly',c.last_headers['Set-Cookie'])
            self.assertIn('SameSite=Strict',c.last_headers['Set-Cookie'])
            if data['user']['role']=='superadmin':
                type(self).owner=c; type(self).owner_id=data['user']['id']
            else:
                type(self).member=c; type(self).member_id=data['user']['id']; type(self).member_email=email
        with app.connect() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM users WHERE role='superadmin'").fetchone()[0],1)
            self.assertNotEqual(db.execute('SELECT password FROM users LIMIT 1').fetchone()[0],'A-unique-passphrase-2026')
            self.assertNotEqual(db.execute('SELECT token_hash FROM sessions LIMIT 1').fetchone()[0],self.owner.cookie.split('=')[1])
    def test_02_authorization_and_csrf(self):
        for path in ('/api/users','/api/audit','/api/settings'):
            self.assertEqual(self.guest.call(path)[0],401)
            self.assertEqual(self.member.call(path)[0],403)
            self.assertEqual(self.owner.call(path)[0],200)
        self.assertEqual(self.owner.call('/api/settings','POST',{'registration_open':False},origin='https://evil.example')[0],403)
        self.assertEqual(self.owner.call('/api/settings','POST',{},custom=False)[0],403)
        self.assertEqual(self.guest.call('/server.py')[0],404)
        self.assertEqual(self.guest.call('/academy.sqlite3')[0],404)
        self.assertEqual(self.guest.call('/../server.py')[0],404)
        c=http.client.HTTPConnection('127.0.0.1',PORT)
        c.request('GET','/api/health',headers={'Host':'evil.example'}); r=c.getresponse()
        self.assertEqual(r.status,403); r.read(); c.close()
    def test_03_content_and_xss_payload_storage(self):
        data={'id':'test-article','title_fa':'آموزش','title_en':'Lesson','body_fa':'<script>alert(1)</script>','body_en':'Testing plain text.','category':'SOC','published':False}
        self.assertEqual(self.member.call('/api/articles','POST',data)[0],403)
        self.assertEqual(self.owner.call('/api/articles','POST',data)[0],200)
        self.assertEqual(self.guest.call('/api/articles')[1]['articles'],[])
        self.assertEqual(len(self.owner.call('/api/articles')[1]['articles']),1)
        data['published']=True
        self.assertEqual(self.owner.call('/api/articles','POST',data)[0],200)
        self.assertEqual(self.guest.call('/api/articles')[1]['articles'][0]['body']['fa'],data['body_fa'])
        data['id']="x'); DROP TABLE users;--"
        self.assertEqual(self.owner.call('/api/articles','POST',data)[0],400)
        self.assertEqual(len(self.owner.call('/api/users')[1]['users']),2)
    def test_04_progress_and_notes_isolation(self):
        self.assertEqual(self.member.call('/api/progress','POST',{'progress':['soc','telemetry']})[0],200)
        self.assertEqual(self.member.call('/api/me')[1]['progress'],['soc','telemetry'])
        self.assertEqual(self.owner.call('/api/me')[1]['progress'],[])
        self.assertEqual(self.member.call('/api/progress','POST',{'progress':['not-a-lesson']})[0],400)
        note={'notes':'Synthetic evidence with clear limitations, for training only.','verdict':'fp','checks':[False]*4}
        self.assertEqual(self.member.call('/api/notes/powershell','POST',note)[0],400)
        note['verdict']='inconclusive'
        self.assertEqual(self.member.call('/api/notes/powershell','POST',note)[0],200)
        self.assertEqual(self.member.call('/api/notes/powershell')[1]['note'],note)
        self.assertIsNone(self.owner.call('/api/notes/powershell')[1]['note'])
        self.assertEqual(len(self.owner.call(f'/api/users/{self.member_id}/notes')[1]['notes']),1)
        self.assertEqual(self.member.call(f'/api/users/{self.owner_id}/notes')[0],403)
    def test_05_roles_revoke_sessions_and_protect_owner(self):
        self.assertEqual(self.owner.call(f'/api/users/{self.owner_id}','POST',{'role':'member','active':False})[0],403)
        self.assertEqual(self.owner.call(f'/api/users/{self.member_id}','POST',{'role':'superadmin','active':True})[0],400)
        self.assertEqual(self.owner.call(f'/api/users/{self.member_id}','POST',{'role':'editor','active':True})[0],200)
        self.assertIsNone(self.member.call('/api/me')[1]['user'])
        self.assertEqual(self.member.call('/api/login','POST',{'email':self.member_email,'password':'A-unique-passphrase-2026'})[1]['user']['role'],'editor')
        self.assertEqual(self.member.call('/api/users')[0],403)
        self.assertEqual(self.member.call('/api/articles','POST',{'id':'editor-article','title_fa':'تست','title_en':'Test','body_fa':'بدنه','body_en':'Body','category':'SOC','published':False})[0],200)
        self.assertEqual(self.owner.call(f'/api/users/{self.member_id}','POST',{'role':'member','active':False})[0],200)
        self.assertIsNone(self.member.call('/api/me')[1]['user'])
        self.assertEqual(self.member.call('/api/login','POST',{'email':self.member_email,'password':'A-unique-passphrase-2026'})[0],401)
    def test_06_invite_rotation_and_registration_switch(self):
        self.assertEqual(self.owner.call('/api/settings','POST',{'invite_code':'new-long-invite-code','registration_open':True})[0],200)
        self.assertEqual(self.register(Client(),'new@example.test')[0],403)
        self.assertEqual(self.register(Client(),'new@example.test',invite='new-long-invite-code')[1]['user']['role'],'member')
        self.assertEqual(self.owner.call('/api/settings','POST',{'registration_open':False})[0],200)
        self.assertEqual(self.register(Client(),'closed@example.test',invite='new-long-invite-code')[0],403)
        settings=self.owner.call('/api/settings')[1]
        self.assertNotIn('invite_code',settings); self.assertFalse(settings['registration_open'])
    def test_07_login_throttle(self):
        c=Client()
        for i in range(8): self.assertEqual(c.call('/api/login','POST',{'email':'unknown@example.test','password':'wrong'})[0],401)
        self.assertEqual(c.call('/api/login','POST',{'email':'unknown@example.test','password':'wrong'})[0],429)
    def test_08_audit_expiry_and_logout(self):
        actions={a['action'] for a in self.owner.call('/api/audit')[1]['audit']}
        for action in ('register','article_saved','member_updated','member_notes_viewed','notes_saved','settings_updated','login_failed'): self.assertIn(action,actions)
        self.assertEqual(self.owner.call('/api/logout','POST',{})[0],200)
        self.assertIsNone(self.owner.call('/api/me')[1]['user'])
        with app.connect() as db:
            token=app.secrets.token_urlsafe(32)
            db.execute('INSERT INTO sessions VALUES (?,?,?)',(app.digest(token),self.owner_id,1))
        c=Client(); c.cookie=app.COOKIE+'='+token
        self.assertIsNone(c.call('/api/me')[1]['user'])
if __name__=='__main__': unittest.main(verbosity=2)
