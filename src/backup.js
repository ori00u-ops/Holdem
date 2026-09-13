import {Table,STREETS,PERSONAS,evaluate} from './engine.js';
import {LESSONS,QUESTIONS} from './content.js';

export function readBackup(text){
  const fail=()=>{throw Error('올바른 홀덤 도장 3 백업 파일이 아닙니다.');};
  if(typeof text!=='string'||text.length>5*1024*1024)fail();
  let data;try{data=JSON.parse(text);}catch{fail();}
  let nodes=0;
  const walk=(v,depth=0)=>{if(++nodes>150000||depth>16)fail();if(typeof v==='string'&&(v.length>10000||/[<>\u0000]/.test(v)))fail();if(typeof v==='number'&&!Number.isFinite(v))fail();if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))fail();walk(x,depth+1);}};walk(data);
  const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),number=(v,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
  const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v),string=v=>typeof v==='string';
  const cards=v=>Array.isArray(v)&&v.length<=7&&v.every(c=>number(c,51))&&new Set(v).size===v.length;
  const events=v=>Array.isArray(v)&&v.length<=2000&&v.every(e=>object(e)&&string(e.text)&&string(e.type));
  const notes=v=>Array.isArray(v)&&v.length<=500&&v.every(n=>object(n)&&STREETS.includes(n.street)&&['fold','check','call','raise'].includes(n.action)&&cards(n.board)&&number(n.pot)&&object(n.advice)&&string(n.advice.why)&&['fold','check','call','raise'].includes(n.advice.suggested)&&Number.isFinite(n.advice.odds)&&n.advice.odds>=0&&n.advice.odds<=1&&(n.advice.equity===null||(Number.isFinite(n.advice.equity)&&n.advice.equity>=0&&n.advice.equity<=1)));
  if(!object(data)||data.version!==3||!object(data.progress))fail();const p=data.progress;
  if(!['xp','hands','wins','trophies'].every(k=>number(p[k])))fail();
  if(!Array.isArray(p.lessons)||!p.lessons.every(x=>LESSONS.some(l=>l.id===x))||!Array.isArray(p.missed)||!p.missed.every(x=>QUESTIONS.some(q=>q.id===x)))fail();
  if(!object(p.answers)||!Object.entries(p.answers).every(([k,a])=>QUESTIONS.some(q=>q.id===k)&&object(a)&&number(a.attempts)&&number(a.correct)&&a.correct<=a.attempts&&typeof a.mastered==='boolean'&&['dueAt','lastAttemptAt','lastCorrectAt','recallLevel'].every(key=>a[key]===undefined||number(a[key]))))fail();
  if(!object(p.daily)||Object.keys(p.daily).length>366||!Object.entries(p.daily).every(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&object(v)&&['xp','hands','questions','reviews'].every(key=>number(v[key]))))fail();
  if(!Array.isArray(p.reviewed)||!p.reviewed.every(id)||!Array.isArray(p.history)||p.history.length>40)fail();
  for(const h of p.history){if(!object(h)||!id(h.id)||!number(h.time)||!number(h.number)||!cards(h.cards)||h.cards.length!==2||!cards(h.board)||!string(h.position)||!Number.isSafeInteger(h.net)||!notes(h.notes)||!events(h.events)||!Array.isArray(h.names)||!h.names.every(string)||!Array.isArray(h.pots))fail();for(const pot of h.pots)if(!object(pot)||!number(pot.amount)||!Array.isArray(pot.awards)||!pot.awards.every(a=>object(a)&&number(a.player,h.names.length-1)&&number(a.amount)))fail();}
  if(!object(p.settings))fail();const st=p.settings;
  if(!['sound','hints','fourColor'].every(k=>typeof st[k]==='boolean')||!['slow','normal','fast'].includes(st.speed)||!['gentle','standard'].includes(st.difficulty)||(st.volume!==undefined&&!number(st.volume,100)))fail();
  if(!object(data.table)||!notes(data.notes))fail();let table;try{table=Table.restore(data.table);}catch{fail();}const s=table.s;
  if(!['practice','tournament','heads-up'].includes(s.mode)||!id(s.handId)||!number(s.dealer,s.count-1)||!number(s.handNumber)||!number(s.bb)||s.bb<1||!events(s.events)||!cards(s.board)||!number(s.currentBet)||!number(s.lastRaise)||s.lastRaise<1)fail();
  if(!Array.isArray(s.deck)||!Array.isArray(s.burned)||s.deck.length+s.burned.length+s.board.length+s.players.reduce((n,q)=>n+q.cards.length,0)!==52)fail();
  if(!s.players.every((q,i)=>q.id===i&&cards(q.cards)&&string(q.name)&&string(q.style)&&string(q.last)&&number(q.round)&&number(q.committed)&&number(q.startStack)))fail();
  if(s.over&&(!object(s.result)||!Array.isArray(s.result.net)||s.result.net.length!==s.count||!s.result.net.every(Number.isSafeInteger)||!Array.isArray(s.result.pots)))fail();
  // Presentation fields come from the app, never from an imported HTML attribute.
  s.players.forEach((q,i)=>Object.assign(q,PERSONAS[i]));
  if(s.over){const r=s.result;if(!r.pots.every(pot=>object(pot)&&number(pot.amount)&&Array.isArray(pot.awards)&&pot.awards.every(a=>object(a)&&number(a.player,s.count-1)&&number(a.amount))))fail();if(r.showdown&&s.board.length!==5)fail();const won=s.players.map(()=>0);for(const pot of r.pots)for(const a of pot.awards)won[a.player]+=a.amount;s.result={showdown:!!r.showdown,pots:r.pots,won,totalPot:r.pots.reduce((n,pot)=>n+pot.amount,0),net:r.net,hands:r.showdown?s.players.map(q=>!q.folded?evaluate([...q.cards,...s.board]):null):[]};}
  p.reviewsCompleted=Math.max(number(p.reviewsCompleted)?p.reviewsCompleted:0,p.reviewed.length);
  return {version:3,progress:p,table:s,notes:data.notes};
}
