/* Structural/render smoke tests with a DOM stub. NOT a real-browser test. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
assert.equal(scripts.length,1,'Standalone one-script HTML');new vm.Script(scripts[0]);
const main=scripts[0].split('\nrender();\n(async()=>')[0];
const elements=new Map(),storage=new Map();
function el(id){if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',checked:false,dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},querySelectorAll(){return[]},querySelector(){return el('child')},insertAdjacentHTML(_,h){this.innerHTML+=h},focus(){}});return elements.get(id)}
const context={console,URL,Blob,setTimeout,clearTimeout,AbortController,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:el,querySelector:el,querySelectorAll:()=>[],documentElement:{dataset:{}}},window:{scrollTo(){},print(){}},navigator:{},location:{protocol:'file:'}};
vm.createContext(context);vm.runInContext(main,context);
function run(s){return vm.runInContext(s,context)}
assert.equal(run('lessons.length'),30);assert.equal(run('playbooks.length'),40);assert.equal(run('samples.length'),12);assert.equal(run('glossary.length'),40);assert.equal(run('Object.keys(SR).length'),36);
assert(run('new Set(playbooks.map(p=>p.id)).size===playbooks.length'));assert(run('new Set(lessons.map(p=>p.id)).size===lessons.length'));
assert(run('playbooks.every(p=>p.query&&p.elastic&&p.blind.fa&&p.blind.en&&p.sourceIds.every(id=>SR[id])&&p.steps.length>=4)'));
assert(run('lessons.every(l=>l.title.fa&&l.title.en&&l.sections.length>=3&&l.answer>=0&&l.answer<l.options.length)'));
assert(run('samples.every(s=>playbooks.some(p=>p.id===s.p)&&s.rows.every(r=>r.length===s.headers.length)&&s.answer<s.choices.length)'));
assert(run(`Object.values(SR).every(s=>['research.splunk.com','help.splunk.com','www.elastic.co','learn.microsoft.com','www.cisa.gov'].includes(new URL(s.url).hostname))`));
let count=0;
for(const lang of ['fa','en']){
 run(`state.lang='${lang}'`);
 for(const page of ['home','courses','playbooks','lab','glossary','sources','tools','coverage','auth','admin']){
  run(`state.page='${page}';render()`);let out=el('app').innerHTML;assert(out.length>100,page);assert(!out.includes('[object Object]'),page);count++;
 }
 for(const id of JSON.parse(run('JSON.stringify(playbooks.map(p=>p.id))'))){run(`state.page='playbook';state.playbook='${id}';render()`);let out=el('app').innerHTML;assert(out.includes('q-body'),id);assert(out.includes('reference-section'),id);assert(!out.includes('undefined'),id);run(`switchQuery('${id}','elastic')`);assert(el('q-body').innerHTML.includes('AUTHORED TRIAGE'));count++}
 for(const id of JSON.parse(run('JSON.stringify(lessons.map(l=>l.id))'))){run(`state.page='lesson';state.lesson='${id}';render()`);assert(!el('app').innerHTML.includes('[object Object]'));count++}
 for(let i=0;i<12;i++){run(`state.page='lab';state.lab=${i};render();showSample();labAnswer(0)`);assert(el('app').innerHTML.includes('SYNTHETIC DATA'));count++}
 run('globalSearch("CloudTrail")');assert(el('app').innerHTML.includes('CloudTrail'));
}
run('state.bookCat="cloud"');assert.equal(run('filterBooks().length'),7);
run('state.bookSearch="this-does-not-exist"');assert.equal(run('filterBooks().length'),0);
run('state.bookSearch="";state.bookCat="all";state.onlySaved=true');assert.equal(run('filterBooks().length'),0);
run('bookmark("cloudstop",document.getElementById("bookmark"))');assert.equal(run('filterBooks().length'),1);
run('state.lang="en";state.page="tools";render()');el('tp').value='8';el('fp').value='2';el('fn').value='';run('qualityCalc()');assert(el('quality-output').textContent.includes('80.0%'));assert(el('quality-output').textContent.includes('unknown'));
el('tp').value='0';el('fp').value='0';el('fn').value='0';run('qualityCalc()');assert(el('quality-output').textContent.includes('zero denominator'));
el('tp').value='-1';run('qualityCalc()');assert(el('quality-output').textContent.includes('non-negative'));
run('state.lang="fa";state.page="playbook";state.playbook="cloudstop";render()');el('notes').value='Existing evidence';run('switchQuery("cloudstop","elastic")');assert.equal(el('notes').value,'Existing evidence');run('noteTemplate()');assert(el('notes').value.startsWith('Existing evidence'));
run('globalSearch("<img src=x onerror=alert(1)>")');assert(!el('app').innerHTML.includes('<img src=x'));
const cat=JSON.parse(fs.readFileSync(__dirname+'/catalog.json','utf8'));assert.deepEqual(cat.lessons.map(x=>x.id),JSON.parse(run('JSON.stringify(lessons.map(x=>x.id))')));assert.deepEqual(cat.playbooks.map(x=>x.id),JSON.parse(run('JSON.stringify(playbooks.map(x=>x.id))')));
console.log(`PASS: ${count} bilingual page renders; 40 playbooks, 30 lessons, 12 labs, 40 terms, 36 references; filters, search escaping, bookmarks, query tabs, notes preservation and metric edge cases. DOM stub only, no real browser or SIEM execution.`);
