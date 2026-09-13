"""V2 regression tests. Temporary database only. python test_v2.py"""
import json, tempfile, threading, unittest
from pathlib import Path
import test_server as t
app=t.app
ROOT=Path(__file__).resolve().parent
class V2Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory();app.DB=Path(cls.temp.name)/'v2.sqlite3';app.init_db()
        cls.http=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler);t.PORT=cls.http.server_address[1];app.ORIGIN=f'http://127.0.0.1:{t.PORT}'
        cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start()
        cls.owner=t.Client();cls.member=t.Client();cls.guest=t.Client()
        for c,name,key in [(cls.owner,'owner',app.SETUP_KEY),(cls.member,'member','')]:
            status,d=c.call('/api/register','POST',{'email':name+'@example.test','name':name,'password':'Synthetic-training-passphrase-2026','invite':'ermanian','setup_key':key})
            assert status==200,(status,d)
        cls.catalog=json.loads((ROOT/'catalog.json').read_text())
    @classmethod
    def tearDownClass(cls):cls.http.shutdown();cls.http.server_close();cls.temp.cleanup()
    def test_01_catalog_allowlists(self):
        self.assertEqual({x['id'] for x in self.catalog['lessons']},app.IDS)
        self.assertEqual({x['id'] for x in self.catalog['playbooks']},app.CASES)
        self.assertEqual(len(app.IDS),30);self.assertEqual(len(app.CASES),40)
    def test_02_all_lesson_progress(self):
        ids=sorted(app.IDS)
        self.assertEqual(self.member.call('/api/progress','POST',{'progress':ids})[0],200)
        self.assertEqual(self.member.call('/api/me')[1]['progress'],ids)
        self.assertEqual(self.owner.call('/api/me')[1]['progress'],[])
        for bad in [ids+['unknown'],['unknown'],[1],{'soc':True},['soc']*31]:
            self.assertEqual(self.member.call('/api/progress','POST',{'progress':bad})[0],400)
    def test_03_all_case_notes_and_isolation(self):
        for case in sorted(app.CASES):
            note={'notes':f'Synthetic training evidence for {case}. No real confidential data.','checks':[False]*4,'verdict':'inconclusive'}
            self.assertEqual(self.member.call('/api/notes/'+case,'POST',note)[0],200,case)
            self.assertEqual(self.member.call('/api/notes/'+case)[1]['note'],note)
            self.assertIsNone(self.owner.call('/api/notes/'+case)[1]['note'])
            self.assertEqual(self.guest.call('/api/notes/'+case)[0],401)
        self.assertEqual(self.member.call('/api/notes/notacase')[0],404)
    def test_04_new_case_closure_validation(self):
        note={'notes':'Synthetic evidence to test closure guards.','checks':[False]*4,'verdict':'fp'}
        self.assertEqual(self.member.call('/api/notes/cloudstop','POST',note)[0],400)
        note['checks']=[True]*4
        self.assertEqual(self.member.call('/api/notes/cloudstop','POST',note)[0],200)
        note['verdict']='execute-isolation'
        self.assertEqual(self.member.call('/api/notes/cloudstop','POST',note)[0],400)
    def test_05_static_serving_and_private_files(self):
        status,html=self.guest.call('/');self.assertEqual(status,200)
        self.assertIn('FIELD NOTES / VOL. 01'.encode(),html)
        for path in ['/server.py','/catalog.json','/academy.sqlite3','/test_v2.py']:
            self.assertEqual(self.guest.call(path)[0],404)
if __name__=='__main__':unittest.main(verbosity=2)
