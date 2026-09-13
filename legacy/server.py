#!/usr/bin/env python3
"""Local reference backend. Python 3.12+. Read README before deployment."""
import hashlib, hmac, json, os, re, secrets, sqlite3, threading, time
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parent
DB=Path(os.environ.get('ERM_DB',str(ROOT/'academy.sqlite3')))
BIND=os.environ.get('ERM_BIND','127.0.0.1')
PORT=int(os.environ.get('ERM_PORT','8000'))
ORIGIN=os.environ.get('ERM_ORIGIN',f'http://127.0.0.1:{PORT}').rstrip('/')
SECURE=os.environ.get('ERM_SECURE_COOKIE','0')=='1'
COOKIE='__Host-erm_session' if SECURE else 'erm_session'
SETUP_KEY=os.environ.get('ERM_OWNER_SETUP_KEY') or secrets.token_urlsafe(32)
ITERATIONS=600_000
SESSION_AGE=8*60*60
IDS={'triage', 'ransomresponse', 'identity', 'ecs', 'tuning', 'entra', 'disposition', 'linuxaudit', 'coverage', 'visibility', 'evidence', 'soc', 'persistence', 'eql', 'esql', 'm365', 'network', 'cim', 'process', 'windows', 'kql', 'rulelife', 'networkdeep', 'spl', 'cloudlogs', 'shift', 'privacy', 'telemetry', 'splunk', 'linux'}
CASES={'cloudupdate', 'bruteforce', 'phishing', 'mfadisabled', 'configstop', 'webshell', 'systemdtimer', 'cloudstop', 'forwarding', 'registrydump', 'ransomware', 'wmipersist', 'shadowcopy', 'runkeys', 'persistence', 'logclear', 's3logstop', 'dns', 'storedcreds', 'cron', 'sudoers', 'systemdservice', 'delegation', 'scriptchain', 'transportrule', 'bedrocklog', 'msbuild', 'powershell', 'cloudselectors', 'portscan', 'egress', 'lsass', 'psengine', 'sshkeys', 'shellprofile', 'beacon', 'clouddelete', 'psdownload', 'remoteservice', 'injection'}
RATE_LOCK=threading.Lock()
ATTEMPTS={}
GATE=threading.BoundedSemaphore(12)
def utc(): return datetime.now(timezone.utc).isoformat(timespec='seconds')
def digest(value): return hashlib.sha256(value.encode()).hexdigest()
def password_hash(password,salt=None):
    salt=salt or secrets.token_hex(16)
    value=hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),ITERATIONS).hex()
    return salt+':'+value
def password_matches(password,encoded):
    return hmac.compare_digest(password_hash(password,encoded.split(':')[0]),encoded)
DUMMY_HASH=password_hash(secrets.token_urlsafe(32))
def connect():
    db=sqlite3.connect(DB,timeout=15); db.row_factory=sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON'); return db
def init_db():
    DB.parent.mkdir(parents=True,exist_ok=True)
    with connect() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.executescript('''
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('superadmin','editor','member')),active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),created TEXT NOT NULL);
        CREATE UNIQUE INDEX IF NOT EXISTS one_owner ON users(role) WHERE role='superadmin';
        CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS progress(user_id INTEGER PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL DEFAULT '[]');
        CREATE TABLE IF NOT EXISTS notes(user_id INTEGER NOT NULL REFERENCES users(id),case_id TEXT NOT NULL,data TEXT NOT NULL,updated TEXT NOT NULL,PRIMARY KEY(user_id,case_id));
        CREATE TABLE IF NOT EXISTS articles(id TEXT PRIMARY KEY,title_fa TEXT NOT NULL,title_en TEXT NOT NULL,body_fa TEXT NOT NULL,body_en TEXT NOT NULL,category TEXT NOT NULL,published INTEGER NOT NULL,updated TEXT NOT NULL,author_id INTEGER NOT NULL REFERENCES users(id));
        CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,created TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL);
        ''')
        db.execute("INSERT OR IGNORE INTO settings VALUES ('invite_hash',?)",(digest(os.environ.get('ERM_INVITE_CODE','ermanian')),))
        db.execute("INSERT OR IGNORE INTO settings VALUES ('registration_open','1')")
    try: os.chmod(DB,0o600)
    except OSError: pass
def setting(db,key): return db.execute('SELECT value FROM settings WHERE key=?',(key,)).fetchone()['value']
def audit(db,actor,action,target=''):
    db.execute('INSERT INTO audit(created,actor,action,target) VALUES (?,?,?,?)',(utc(),str(actor),action,str(target)))
def public_user(row): return {k:row[k] for k in ('id','name','email','role','active')}
def throttle(ip,email):
    now=time.monotonic(); keys=('ip:'+ip,'email:'+digest(email))
    with RATE_LOCK:
        for key in list(ATTEMPTS):
            ATTEMPTS[key]=[x for x in ATTEMPTS[key] if now-x<600]
            if not ATTEMPTS[key]: del ATTEMPTS[key]
        if len(ATTEMPTS.get(keys[0],[]))>=30 or len(ATTEMPTS.get(keys[1],[]))>=8: return False
        for key in keys: ATTEMPTS.setdefault(key,[]).append(now)
        return True
class RequestError(Exception):
    def __init__(self,status,en,fa): self.status,self.en,self.fa=status,en,fa
def reject(status,en,fa): raise RequestError(status,en,fa)
def field(data,name,minimum=0,maximum=200):
    value=data.get(name,'')
    if not isinstance(value,str) or not minimum<=len(value)<=maximum:
        reject(400,f'Invalid {name}.',f'مقدار {name} معتبر نیست.')
    return value
class Handler(BaseHTTPRequestHandler):
    server_version='ErmanianLocal'; sys_version=''; protocol_version='HTTP/1.0'
    def log_message(self,fmt,*args): pass
    def setup(self):
        super().setup(); self.connection.settimeout(15)
    def reply(self,status,payload,cookie=None,content_type='application/json; charset=utf-8'):
        raw=payload if isinstance(payload,bytes) else json.dumps(payload,ensure_ascii=False).encode()
        self.send_response(status)
        for k,v in {'Content-Type':content_type,'Content-Length':str(len(raw)),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}.items(): self.send_header(k,v)
        if SECURE: self.send_header('Strict-Transport-Security','max-age=31536000')
        if cookie: self.send_header('Set-Cookie',cookie)
        self.end_headers(); self.wfile.write(raw)
    def cookie_value(self):
        try:
            cookies=SimpleCookie(); cookies.load(self.headers.get('Cookie',''))
            token=cookies[COOKIE].value if COOKIE in cookies else ''
            return token if re.fullmatch(r'[A-Za-z0-9_-]{40,64}',token) else ''
        except Exception: return ''
    def cookie_header(self,token,age=SESSION_AGE):
        return f'{COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={age}'+('; Secure' if SECURE else '')
    def current_user(self,db):
        token=self.cookie_value()
        if not token: return None
        return db.execute('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',(digest(token),int(time.time()))).fetchone()
    def require(self,db,roles=None):
        user=self.current_user(db)
        if not user: reject(401,'Sign in again.','دوباره وارد حساب شو.')
        if roles and user['role'] not in roles: reject(403,'Access denied.','دسترسی مجاز نیست.')
        return user
    def new_session(self,db,user_id):
        old=self.cookie_value()
        if old: db.execute('DELETE FROM sessions WHERE token_hash=?',(digest(old),))
        db.execute('DELETE FROM sessions WHERE expires<=?',(int(time.time()),))
        token=secrets.token_urlsafe(32)
        db.execute('INSERT INTO sessions VALUES (?,?,?)',(digest(token),user_id,int(time.time())+SESSION_AGE))
        return self.cookie_header(token)
    def read_body(self):
        if self.headers.get('Origin','')!=ORIGIN: reject(403,'Origin rejected. Open the exact configured URL.','آدرس مبدأ مجاز نیست؛ آدرس دقیق تنظیم‌شده را باز کن.')
        if self.headers.get('X-Ermanian-Request')!='1': reject(403,'Request verification failed.','اعتبارسنجی درخواست ناموفق بود.')
        if self.headers.get('Content-Type','').split(';')[0].strip()!='application/json': reject(415,'JSON required.','بدنه JSON لازم است.')
        try: length=int(self.headers.get('Content-Length','-1'))
        except ValueError: length=-1
        if not 0<=length<=400_000: reject(413,'Invalid or oversized request.','درخواست نامعتبر یا بیش از حد بزرگ است.')
        try: data=json.loads(self.rfile.read(length))
        except (ValueError,UnicodeError): reject(400,'Invalid JSON.','ساختار درخواست معتبر نیست.')
        if not isinstance(data,dict): reject(400,'An object is required.','ساختار درخواست باید آبجکت باشد.')
        return data
    def do_GET(self): self.handle_request('GET')
    def do_POST(self): self.handle_request('POST')
    def handle_request(self,method):
        if not GATE.acquire(blocking=False):
            self.reply(503,{'error':'Server busy; retry shortly.','error_fa':'سرور مشغول است؛ کمی بعد تلاش کن.'}); return
        try:
            if self.headers.get('Host')!=urlsplit(ORIGIN).netloc: reject(403,'Invalid host. Use the configured URL.','آدرس میزبان معتبر نیست؛ آدرس تنظیم‌شده را باز کن.')
            path=urlsplit(self.path).path
            if method=='GET' and path in ('/','/index.html'):
                self.reply(200,(ROOT/'index.html').read_bytes(),content_type='text/html; charset=utf-8'); return
            if method=='GET' and path=='/api/health': self.reply(200,{'app':'ermanian-soc'}); return
            data=self.read_body() if method=='POST' else {}
            with connect() as db: result,cookie=self.route(db,method,path,data)
            self.reply(200,result,cookie)
        except RequestError as e: self.reply(e.status,{'error':e.en,'error_fa':e.fa})
        except (ConnectionError,TimeoutError): pass
        except Exception as e:
            print(f'Request failed ({type(e).__name__}); inspect locally.',flush=True)
            try: self.reply(500,{'error':'Server error; retry later.','error_fa':'درخواست انجام نشد؛ دوباره تلاش کن.'})
            except ConnectionError: pass
        finally: GATE.release()
    def route(self,db,method,path,data):
        if method=='POST' and path in ('/api/login','/api/register'):
            email=field(data,'email',3,254).strip().casefold(); password=field(data,'password',1,128)
            if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+',email): reject(400,'Invalid email.','ایمیل معتبر نیست.')
            if not throttle(self.client_address[0],email): reject(429,'Too many attempts. Wait 10 minutes.','تلاش بیش از حد؛ ۱۰ دقیقه صبر کن.')
            if path=='/api/register':
                if len(password)<12: reject(400,'Use a password of at least 12 characters.','رمز باید حداقل ۱۲ نویسه داشته باشد.')
                name=field(data,'name',1,80).strip()
                if not name: reject(400,'A name is required.','نام لازم است.')
                invite=field(data,'invite',1,128); setup=field(data,'setup_key',0,256)
                encoded=password_hash(password)
                db.execute('BEGIN IMMEDIATE')
                if setting(db,'registration_open')!='1': reject(403,'Registration is closed.','ثبت‌نام بسته است.')
                if not hmac.compare_digest(digest(invite),setting(db,'invite_hash')): reject(403,'Invitation code is invalid.','کد دعوت معتبر نیست.')
                first=db.execute('SELECT count(*) FROM users').fetchone()[0]==0
                if first and not hmac.compare_digest(digest(setup),digest(SETUP_KEY)): reject(403,'The server owner setup key is required for the first account.','اولین حساب به کلید راه‌اندازی مالک از ترمینال سرور نیاز دارد.')
                if db.execute('SELECT id FROM users WHERE email=?',(email,)).fetchone(): reject(409,'Registration unavailable for this email. Try signing in.','ثبت‌نام برای این ایمیل ممکن نیست؛ ورود را امتحان کن.')
                role='superadmin' if first else 'member'
                cur=db.execute('INSERT INTO users(email,name,password,role,created) VALUES (?,?,?,?,?)',(email,name,encoded,role,utc()))
                user=db.execute('SELECT * FROM users WHERE id=?',(cur.lastrowid,)).fetchone(); audit(db,email,'register',role)
            else:
                user=db.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
                valid=password_matches(password,user['password'] if user else DUMMY_HASH)
                if not user or not valid or not user['active']:
                    audit(db,'unauthenticated','login_failed',digest(email)[:12]); db.commit()
                    reject(401,'Email or password is incorrect.','ایمیل یا رمز عبور نادرست است.')
                audit(db,email,'login')
            return {'user':public_user(user)},self.new_session(db,user['id'])
        if path=='/api/me' and method=='GET':
            user=self.current_user(db); progress=[]
            if user:
                row=db.execute('SELECT data FROM progress WHERE user_id=?',(user['id'],)).fetchone()
                progress=json.loads(row['data']) if row else []
            return {'user':public_user(user) if user else None,'progress':progress},None
        if path=='/api/logout' and method=='POST':
            user=self.current_user(db)
            db.execute('DELETE FROM sessions WHERE token_hash=?',(digest(self.cookie_value()),))
            if user: audit(db,user['email'],'logout')
            return {'ok':True},self.cookie_header('',0)
        if path=='/api/articles' and method=='GET':
            user=self.current_user(db); editor=user and user['role'] in ('editor','superadmin')
            rows=db.execute('SELECT * FROM articles'+('' if editor else ' WHERE published=1')+' ORDER BY updated DESC').fetchall()
            return {'articles':[{'id':r['id'],'title':{'fa':r['title_fa'],'en':r['title_en']},'body':{'fa':r['body_fa'],'en':r['body_en']},'category':r['category'],'published':bool(r['published']),'updated':r['updated']} for r in rows]},None
        if path=='/api/articles' and method=='POST':
            user=self.require(db,('editor','superadmin'))
            article_id=field(data,'id',0,80) or 'article-'+secrets.token_hex(12)
            if not re.fullmatch(r'[a-z0-9-]{1,80}',article_id): reject(400,'Invalid article ID.','شناسه مقاله معتبر نیست.')
            values=[field(data,'title_fa',1,200),field(data,'title_en',1,200),field(data,'body_fa',1,50_000),field(data,'body_en',1,50_000),field(data,'category',0,80)]
            if type(data.get('published')) is not bool: reject(400,'Invalid publication state.','وضعیت انتشار معتبر نیست.')
            db.execute('''INSERT INTO articles VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title_fa=excluded.title_fa,title_en=excluded.title_en,body_fa=excluded.body_fa,body_en=excluded.body_en,category=excluded.category,published=excluded.published,updated=excluded.updated,author_id=excluded.author_id''',(article_id,*values,int(data['published']),utc(),user['id']))
            audit(db,user['email'],'article_saved',article_id); return {'ok':True,'id':article_id},None
        if path=='/api/progress' and method=='POST':
            user=self.require(db); progress=data.get('progress')
            if not isinstance(progress,list) or len(progress)>len(IDS) or any(not isinstance(x,str) or x not in IDS for x in progress): reject(400,'Invalid progress.','داده پیشرفت معتبر نیست.')
            progress=list(dict.fromkeys(progress))
            db.execute('INSERT INTO progress VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data',(user['id'],json.dumps(progress)))
            audit(db,user['email'],'progress_saved',len(progress)); return {'ok':True},None
        match=re.fullmatch(r'/api/notes/([a-z][a-z0-9]*)',path)
        if match and match[1] in CASES:
            user=self.require(db); case_id=match[1]
            if method=='GET':
                row=db.execute('SELECT data FROM notes WHERE user_id=? AND case_id=?',(user['id'],case_id)).fetchone()
                return {'note':json.loads(row['data']) if row else None},None
            note=field(data,'notes',20,20_000); verdict=data.get('verdict'); checks=data.get('checks')
            if verdict not in ('inconclusive','escalate','btp','fp') or not isinstance(checks,list) or len(checks)!=4 or any(type(x) is not bool for x in checks): reject(400,'Invalid worksheet.','فرم بررسی معتبر نیست.')
            if verdict in ('btp','fp') and not all(checks): reject(400,'Complete the investigation checks first.','ابتدا چک‌های بررسی را کامل کن.')
            clean={'notes':note,'verdict':verdict,'checks':checks}
            db.execute('INSERT INTO notes VALUES (?,?,?,?) ON CONFLICT(user_id,case_id) DO UPDATE SET data=excluded.data,updated=excluded.updated',(user['id'],case_id,json.dumps(clean,ensure_ascii=False),utc()))
            audit(db,user['email'],'notes_saved',case_id); return {'ok':True},None
        if path=='/api/users' and method=='GET':
            self.require(db,('superadmin',))
            rows=db.execute('SELECT u.*,p.data FROM users u LEFT JOIN progress p ON p.user_id=u.id ORDER BY u.id').fetchall()
            return {'users':[dict(public_user(r),progress_count=len(json.loads(r['data'] or '[]'))) for r in rows]},None
        match=re.fullmatch(r'/api/users/(\d+)/notes',path)
        if match and method=='GET':
            user=self.require(db,('superadmin',)); rows=db.execute('SELECT case_id,data,updated FROM notes WHERE user_id=?',(int(match[1]),)).fetchall()
            audit(db,user['email'],'member_notes_viewed',match[1])
            return {'notes':[{'case_id':r['case_id'],'data':json.loads(r['data']),'updated':r['updated']} for r in rows]},None
        match=re.fullmatch(r'/api/users/(\d+)',path)
        if match and method=='POST':
            actor=self.require(db,('superadmin',)); user=db.execute('SELECT * FROM users WHERE id=?',(int(match[1]),)).fetchone()
            if not user: reject(404,'Member not found.','عضو پیدا نشد.')
            if user['role']=='superadmin': reject(403,'The owner is protected.','حساب مالک محافظت شده است.')
            role,active=data.get('role'),data.get('active')
            if role not in ('member','editor') or type(active) is not bool: reject(400,'Invalid role or status.','نقش یا وضعیت معتبر نیست.')
            db.execute('UPDATE users SET role=?,active=? WHERE id=?',(role,int(active),user['id']))
            db.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
            audit(db,actor['email'],'member_updated',f"{user['id']}:{role}:{int(active)}"); return {'ok':True},None
        if path=='/api/audit' and method=='GET':
            self.require(db,('superadmin',)); rows=db.execute('SELECT created,actor,action,target FROM audit ORDER BY id DESC LIMIT 100').fetchall()
            return {'audit':[dict(r) for r in rows]},None
        if path=='/api/settings':
            user=self.require(db,('superadmin',))
            if method=='GET': return {'registration_open':setting(db,'registration_open')=='1'},None
            new_invite=field(data,'invite_code',0,128); opened=data.get('registration_open')
            if type(opened) is not bool or (new_invite and len(new_invite)<8): reject(400,'Invalid settings; invite codes need 8 characters.','تنظیمات معتبر نیست؛ کد دعوت حداقل ۸ نویسه لازم دارد.')
            if new_invite: db.execute("UPDATE settings SET value=? WHERE key='invite_hash'",(digest(new_invite),))
            db.execute("UPDATE settings SET value=? WHERE key='registration_open'",('1' if opened else '0',))
            audit(db,user['email'],'settings_updated','invite_rotated' if new_invite else 'registration'); return {'ok':True},None
        reject(404,'Not found.','مسیر پیدا نشد.')
def main():
    if not (ROOT/'index.html').exists(): raise SystemExit('index.html is missing. Extract the full project first.')
    if SECURE and not ORIGIN.startswith('https://'): raise SystemExit('Secure cookies require an https ERM_ORIGIN.')
    if not SECURE and not ORIGIN.startswith('http://127.0.0.1:'): raise SystemExit('Non-local deployments require HTTPS and ERM_SECURE_COOKIE=1.')
    if BIND not in ('127.0.0.1','localhost'): raise SystemExit('This reference server only binds to loopback. Use a reviewed reverse proxy.')
    init_db()
    with connect() as db: first=db.execute('SELECT count(*) FROM users').fetchone()[0]==0
    print(f'\nErmanian SOC Academy: {ORIGIN}\nLocal reference server, not a production service.',flush=True)
    if first: print(f'\nOWNER SETUP KEY (first registration only):\n{SETUP_KEY}\n\nInitial invitation: ermanian (unless configured differently).\nKeep the setup key private; register the owner before sharing access.\n',flush=True)
    server=ThreadingHTTPServer((BIND,PORT),Handler); server.daemon_threads=True
    try: server.serve_forever()
    except KeyboardInterrupt: print('\nStopped.')
    finally: server.server_close()
if __name__=='__main__': main()
