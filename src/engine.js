// Pure, serializable no-limit Hold'em engine. No DOM or private opponent data in AI views.
export const RANKS = '23456789TJQKA';
export const SUITS = ['♠','♥','♣','♦'];
export const STREETS = ['preflop','flop','turn','river'];
export const HAND_NAMES = ['하이카드','원페어','투페어','트리플','스트레이트','플러시','풀하우스','포카드','스트레이트 플러시'];
export const rank = c => c % 13 + 2;
export const suit = c => Math.floor(c / 13);
export const cardName = c => RANKS[c % 13] + SUITS[suit(c)];
export function parseCards(text) { return text.trim().split(/\s+/).map(x => { const s=SUITS.indexOf(x.slice(-1)),r=RANKS.indexOf(x.slice(0,-1).replace('10','T')); if(s<0||r<0)throw Error('Invalid card'); return s*13+r; }); }
export function seeded(seed = 1) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function shuffle(cards, rng = Math.random) { const a = [...cards]; for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
export const freshDeck = (rng = Math.random) => shuffle(Array.from({length:52},(_,i)=>i),rng);
export function drawProbability(outs,unseen,draws) {if(!Number.isInteger(outs)||outs<0||outs>unseen||!Number.isInteger(draws)||draws<0||draws>unseen)throw Error('Invalid probability inputs');let miss=1;for(let i=0;i<draws;i++)miss*=Math.max(0,unseen-outs-i)/(unseen-i);return 1-miss;}
function straight(values) { const v = new Set(values); if(v.has(14))v.add(1); for(let top=14;top>=5;top--)if([0,1,2,3,4].every(d=>v.has(top-d)))return top; return 0; }
export function evaluate(cards) {
  if(cards.length<5||cards.length>7)throw Error('Evaluation requires 5–7 cards');
  const ordered=[...cards].sort((a,b)=>rank(b)-rank(a)), counts=new Map(), suits=[[],[],[],[]];
  for(const c of ordered){counts.set(rank(c),(counts.get(rank(c))||0)+1);suits[suit(c)].push(c);}
  const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]), flush=suits.find(a=>a.length>=5), sf=flush&&straight(flush.map(rank)), st=straight([...counts.keys()]);
  let category, kickers;
  const pairs=groups.filter(g=>g[1]>=2).map(g=>g[0]).sort((a,b)=>b-a);
  if(sf){category=8;kickers=[sf];}
  else if(groups[0][1]===4){category=7;kickers=[groups[0][0],...ordered.filter(c=>rank(c)!==groups[0][0]).slice(0,1).map(rank)];}
  else if(groups[0][1]>=3&&pairs.some(v=>v!==groups[0][0])){category=6;kickers=[groups[0][0],pairs.find(v=>v!==groups[0][0])];}
  else if(flush){category=5;kickers=flush.slice(0,5).map(rank);}
  else if(st){category=4;kickers=[st];}
  else if(groups[0][1]===3){category=3;kickers=[groups[0][0],...ordered.filter(c=>rank(c)!==groups[0][0]).slice(0,2).map(rank)];}
  else if(pairs.length>=2){category=2;kickers=[...pairs.slice(0,2),rank(ordered.find(c=>!pairs.slice(0,2).includes(rank(c))))];}
  else if(pairs.length===1){category=1;kickers=[pairs[0],...ordered.filter(c=>rank(c)!==pairs[0]).slice(0,3).map(rank)];}
  else{category=0;kickers=ordered.slice(0,5).map(rank);}
  let best;
  if(category===8||category===4){const pool=category===8?flush:ordered;best=Array.from({length:5},(_,i)=>pool.find(c=>rank(c)===(kickers[0]-i===1?14:kickers[0]-i)));}
  else if(category===5)best=flush.slice(0,5);
  else{const qty=category===7?[4,1]:category===6?[3,2]:category===3?[3,1,1]:category===2?[2,2,1]:category===1?[2,1,1,1]:[1,1,1,1,1];best=kickers.flatMap((v,i)=>ordered.filter(c=>rank(c)===v).slice(0,qty[i]));}
  let score=category;for(let i=0;i<5;i++)score=score*15+(kickers[i]||0);
  return {category,score,kickers,cards:best,name:category===8&&sf===14?'로열 플러시':HAND_NAMES[category]};
}
export function handLabel(cards) { const [a,b]=[...cards].sort((x,y)=>rank(y)-rank(x));return RANKS[a%13]+RANKS[b%13]+(rank(a)===rank(b)?'':suit(a)===suit(b)?'s':'o'); }
export function preflopScore(cards) {
  const [a,b]=cards.map(rank).sort((x,y)=>y-x), suited=suit(cards[0])===suit(cards[1]), gap=a-b;
  if(a===b)return 42+a*3.8;
  return Math.min(96,a*3.2+b*1.65+(suited?7:0)-(gap>1?(gap-1)*2:0)+(a===14?5:0)+(gap===1?3:0));
}
export function estimateEquity(cards, board, opponents=1, samples=250, rng=Math.random) {
  const known=new Set([...cards,...board]);const available=Array.from({length:52},(_,i)=>i).filter(c=>!known.has(c));
  let total=0; opponents=Math.max(1,Math.min(5,opponents));
  for(let n=0;n<samples;n++){
    const pool=[...available]; const draw=()=>{const j=Math.floor(rng()*pool.length);const c=pool[j];pool[j]=pool[pool.length-1];pool.pop();return c;};
    const runout=[...board];while(runout.length<5)runout.push(draw());const hero=evaluate([...cards,...runout]).score;
    let tie=1,loses=false;for(let j=0;j<opponents;j++){const val=evaluate([draw(),draw(),...runout]).score;if(val>hero)loses=true;else if(val===hero)tie++;}
    if(!loses)total+=1/tie;
  }
  return total/samples;
}
export const PERSONAS = [
  {name:'나',style:'hero',avatar:'나',color:'gold'},
  {name:'민수',style:'tight',avatar:'민',color:'blue',label:'신중한 전략가'},
  {name:'서연',style:'loose',avatar:'서',color:'rose',label:'과감한 공격수'},
  {name:'지훈',style:'caller',avatar:'지',color:'mint',label:'끈질긴 추격자'},
  {name:'하린',style:'balanced',avatar:'하',color:'purple',label:'균형 잡힌 승부사'},
  {name:'도윤',style:'tricky',avatar:'도',color:'orange',label:'변칙적인 도전자'}
];
export class Table {
  constructor({count=4,mode='practice',stack=2000,rng=Math.random}={}) {
    this.rng=rng; this.s={version:3,mode,count,handNumber:0,dealer:count-1,bb:20,sb:10,players:PERSONAS.slice(0,count).map((p,i)=>({...p,id:i,stack,cards:[],folded:false,round:0,committed:0,actedAt:-1,last:''})),over:true,board:[],pot:0,actor:-1,events:[],result:null};
  }
  static restore(snapshot) {
    if(!snapshot||snapshot.version!==3||![2,4,6].includes(snapshot.count)||snapshot.players?.length!==snapshot.count)throw Error('Invalid saved game');
    const t=new Table({count:snapshot.count});t.s=structuredClone(snapshot);t.assert();
    const cards=[...(t.s.deck||[]),...t.s.board,...t.s.players.flatMap(p=>p.cards),...(t.s.burned||[])];
    if(cards.some(c=>!Number.isInteger(c)||c<0||c>51)||new Set(cards).size!==cards.length)throw Error('Invalid deck');
    if(!t.s.over && (!STREETS.includes(t.s.street)||(!Number.isInteger(t.s.actor))||t.s.actor< -1||t.s.actor>=t.s.count))throw Error('Invalid turn');
    return t;
  }
  nextSeat(from,filter=p=>!p.out) {for(let d=1;d<=this.s.count;d++){const i=(from+d)%this.s.count;if(filter(this.s.players[i]))return i;}return -1;}
  start() {
    const s=this.s;if(!s.over)throw Error('Finish the current hand first');
    if(s.mode!=='tournament')s.players.forEach(p=>{if(p.stack<=0)p.stack=2000;});
    s.players.forEach(p=>p.out=p.stack<=0);
    if(s.players[0].out||s.players.filter(p=>!p.out).length<2){s.tournamentOver=true;return false;}
    s.handNumber++;s.bb=s.mode==='tournament'?[20,30,40,60,80,120,160,200,300,400,600,800][Math.min(11,Math.floor((s.handNumber-1)/8))]:20;s.sb=s.bb/2;
    s.dealer=this.nextSeat(s.dealer);const alive=s.players.filter(p=>!p.out).length;
    s.sbSeat=alive===2?s.dealer:this.nextSeat(s.dealer);s.bbSeat=this.nextSeat(s.sbSeat);
    s.board=[];s.burned=[];s.deck=freshDeck(this.rng);s.pot=0;s.street='preflop';s.over=false;s.readyDeal=false;s.result=null;s.events=[];s.currentBet=s.bb;s.lastRaise=s.bb;s.chipTotal=s.players.reduce((a,p)=>a+p.stack,0);
    for(const p of s.players){p.cards=[];p.folded=p.out;p.round=0;p.committed=0;p.actedAt=-1;p.reopenAt=0;p.last=p.out?'탈락':'대기';p.startStack=p.stack;}
    for(let pass=0;pass<2;pass++){let i=s.dealer;for(let n=0;n<alive;n++){i=this.nextSeat(i);s.players[i].cards.push(s.deck.pop());}}
    this.pay(s.sbSeat,s.sb);this.pay(s.bbSeat,s.bb);s.players[s.sbSeat].last='스몰 블라인드';s.players[s.bbSeat].last='빅 블라인드';
    this.log({type:'street',text:`핸드 ${s.handNumber} · 블라인드 ${s.sb}/${s.bb}`});
    this.choose(s.bbSeat);this.assert();return true;
  }
  pay(i,amount) {const p=this.s.players[i];const actual=Math.min(p.stack,Math.max(0,Math.floor(amount)));p.stack-=actual;p.round+=actual;p.committed+=actual;this.s.pot+=actual;return actual;}
  log(event) {this.s.events.push({...event,street:this.s.street,board:[...this.s.board]});}
  legal(i=this.s.actor) {
    const s=this.s,p=s.players[i];if(s.over||!p||i!==s.actor||p.folded||p.stack<=0)return {actions:[]};
    const otherCanBet=s.players.some(q=>q.id!==i&&!q.folded&&q.stack>0);
    const effectiveBet=otherCanBet?s.currentBet:Math.max(0,...s.players.filter(q=>q.id!==i&&!q.folded).map(q=>q.round));
    const call=Math.min(p.stack,Math.max(0,effectiveBet-p.round));
    const reopened=p.actedAt<0||s.currentBet>=p.reopenAt;
    const canRaise=otherCanBet&&reopened&&p.round+p.stack>s.currentBet;
    return {actions:['fold',...(call>0?['call']:['check']),...(canRaise?['raise']:[])],call,toCall:Math.max(0,effectiveBet-p.round),minRaise:s.currentBet+s.lastRaise,maxRaise:p.round+p.stack,canRaise};
  }
  act(i,action,total=0) {
    const s=this.s,p=s.players[i],legal=this.legal(i);if(!legal.actions.includes(action))throw Error('Illegal action: '+action);
    if(action==='raise'&&(!Number.isInteger(total)||total<=s.currentBet||total>legal.maxRaise||(total<legal.minRaise&&total!==legal.maxRaise)))throw Error('Invalid raise amount');
    let amount=0;
    if(action==='fold')p.folded=true;
    if(action==='call')amount=this.pay(i,legal.call);
    if(action==='raise'){const before=s.currentBet;amount=this.pay(i,total-p.round);s.currentBet=p.round;if(s.currentBet-before>=s.lastRaise)s.lastRaise=s.currentBet-before;}
    p.actedAt=s.currentBet;p.reopenAt=s.currentBet+s.lastRaise;
    const label={fold:'폴드',check:'체크',call:'콜',raise:s.currentBet===total&&total===amount?'베팅':'레이즈'}[action];
    p.last=p.stack===0&&!p.folded?'올인':label;
    this.log({type:'action',player:i,name:p.name,action,amount,total:p.round,text:`${p.name} · ${p.last}${amount?' '+amount:''}`});
    this.choose(i);this.assert();return {action,amount,total:p.round};
  }
  choose(from) {
    const s=this.s,alive=s.players.filter(p=>!p.folded);
    if(alive.length===1){this.finish(false);return;}
    const betting=alive.filter(p=>p.stack>0);
    const otherActualBet=betting.length===1?Math.max(0,...alive.filter(p=>p.id!==betting[0].id).map(p=>p.round)):s.currentBet;
    if(betting.length<=1&&(!betting.length||betting[0].round>=otherActualBet)){s.actor=-1;s.readyDeal=true;return;}
    s.actor=this.nextSeat(from,p=>!p.folded&&p.stack>0&&(p.actedAt<0||p.round<s.currentBet));
    s.readyDeal=s.actor===-1;
  }
  refund() {
    const s=this.s,ordered=[...s.players].sort((a,b)=>b.committed-a.committed),amount=ordered[0].committed-ordered[1].committed;
    if(amount>0){const p=ordered[0];p.committed-=amount;p.round=Math.max(0,p.round-amount);p.stack+=amount;s.pot-=amount;this.log({type:'refund',player:p.id,amount,text:`${p.name} · 매칭되지 않은 ${amount} 반환`});}
  }
  advance() {
    const s=this.s;if(s.over||!s.readyDeal)throw Error('Betting is not complete');this.refund();
    if(s.street==='river'){this.finish(true);return;}
    s.street=STREETS[STREETS.indexOf(s.street)+1];s.burned.push(s.deck.pop());for(let i=0;i<(s.street==='flop'?3:1);i++)s.board.push(s.deck.pop());
    s.currentBet=0;s.lastRaise=s.bb;for(const p of s.players){p.round=0;p.actedAt=-1;p.reopenAt=0;if(!p.folded)p.last=p.stack===0?'올인':'대기';}
    this.log({type:'street',text:{flop:'플랍 · 카드 3장 공개',turn:'턴 · 네 번째 카드',river:'리버 · 마지막 카드'}[s.street]});
    this.choose(s.dealer);this.assert();
  }
  finish(showdown) {
    const s=this.s;this.refund();
    const pots=settlePots(s.players,s.board,s.dealer),totalPot=s.pot,won=s.players.map(()=>0);
    for(const pot of pots)for(const award of pot.awards){s.players[award.player].stack+=award.amount;won[award.player]+=award.amount;}
    s.result={showdown,pots,won,totalPot,net:s.players.map(p=>p.stack-p.startStack),hands:showdown?s.players.map(p=>!p.folded?evaluate([...p.cards,...s.board]):null):[]};
    s.pot=0;s.over=true;s.actor=-1;s.readyDeal=false;
    this.log({type:'result',text:won.map((v,i)=>v?`${s.players[i].name} ${v} 획득`:null).filter(Boolean).join(' · ')});
  }
  position(i) {
    const s=this.s;if(s.players[i].out)return 'OUT';if(i===s.dealer)return s.sbSeat===i?'BTN/SB':'BTN';if(i===s.sbSeat)return 'SB';if(i===s.bbSeat)return 'BB';
    const rest=[];let j=s.bbSeat;for(let n=0;n<s.count;n++){j=this.nextSeat(j);if(j===s.dealer)break;rest.push(j);}
    return (rest.length===3?['UTG','HJ','CO']:rest.length===2?['HJ','CO']:['CO'])[rest.indexOf(i)]||'CO';
  }
  view(i) {const s=this.s,p=s.players[i];return {id:i,cards:[...p.cards],board:[...s.board],stack:p.stack,round:p.round,committed:p.committed,position:this.position(i),style:p.style,street:s.street,pot:s.pot,bb:s.bb,currentBet:s.currentBet,players:s.players.map(q=>({id:q.id,stack:q.stack,committed:q.committed,round:q.round,folded:q.folded,out:q.out,style:q.style,last:q.last})),legal:this.legal(i),events:s.events.map(e=>({...e}))};}
  assert() {
    const s=this.s;for(const p of s.players)if(!Number.isInteger(p.stack)||p.stack<0||!Number.isInteger(p.committed)||p.committed<0)throw Error('Invalid chips');
    if(s.chipTotal!=null&&s.players.reduce((a,p)=>a+p.stack,0)+s.pot!==s.chipTotal)throw Error('Chips not conserved');
    if(!s.over&&s.players.reduce((a,p)=>a+p.committed,0)!==s.pot)throw Error('Pot mismatch');
  }
}
export function settlePots(players,board,dealer) {
  const levels=[...new Set(players.map(p=>p.committed).filter(x=>x>0))].sort((a,b)=>a-b),pots=[];let previous=0;
  for(const level of levels){
    const contributors=players.filter(p=>p.committed>=level),amount=(level-previous)*contributors.length;previous=level;
    const eligible=contributors.filter(p=>!p.folded);if(!eligible.length)throw Error('Pot has no eligible player');
    let winners=eligible;
    if(eligible.length>1){const values=eligible.map(p=>({p,score:evaluate([...p.cards,...board]).score})),best=Math.max(...values.map(v=>v.score));winners=values.filter(v=>v.score===best).map(v=>v.p);}
    const order=[...winners].sort((a,b)=>((a.id-dealer+players.length-1)%players.length)-((b.id-dealer+players.length-1)%players.length));
    const share=Math.floor(amount/winners.length),remainder=amount%winners.length;
    pots.push({amount,eligible:eligible.map(p=>p.id),awards:order.map((p,i)=>({player:p.id,amount:share+(i<remainder?1:0)}))});
  }return pots;
}
export function drawInfo(cards,board) {
  if(board.length<3||board.length>=5)return {flush:0,straight:0,cards:[]};
  const all=[...cards,...board],known=new Set(all),suitCounts=SUITS.map((_,s)=>all.filter(c=>suit(c)===s).length);
  const outs=[];let fl=0,st=0;const made=evaluate(all);
  for(let c=0;c<52;c++){if(known.has(c))continue;const ev=evaluate([...all,c]);const flush=suitCounts[suit(c)]===4&&made.category<5&&(ev.category===5||ev.category===8);const run=made.category<4&&(ev.category===4||ev.category===8);if(flush)fl++;if(run)st++;if(flush||run)outs.push(c);}
  return {flush:fl,straight:st,cards:outs};
}
export function analyze(view,{samples=240,rng=Math.random}={}) {
  const {cards,board,position,legal,pot,bb,stack,players}=view,opponents=players.filter(p=>!p.folded&&p.id!==view.id).length,need=legal.call||0;
  const cap=view.committed+need;const contestable=players.reduce((sum,p)=>sum+Math.min(p.committed,cap),0)+need;
  const odds=need?need/Math.max(1,contestable):0,made=board.length>=3?evaluate([...cards,...board]):null,draws=drawInfo(cards,board);
  let suggested=need?'call':'check',why='',equity=null;
  if(!board.length){
    const score=preflopScore(cards),late=['BTN','BTN/SB','CO'].includes(position),raised=view.currentBet>bb;
    const threshold=opponents===1?42:late?53:61;
    if(!raised&&score>=threshold&&legal.canRaise){suggested='raise';why=`${position}에서 ${handLabel(cards)}는 먼저 레이즈해 볼 만한 시작 패입니다. 보통 2.5–3BB로 시작하고 뒤의 반응을 보세요.`;}
    else if(need===0){suggested=score>83&&legal.canRaise?'raise':'check';why=suggested==='raise'?'강한 패로 가치를 받는 레이즈를 고려하세요.':'추가 비용이 없습니다. 체크로 플랍을 볼 수 있습니다.';}
    else if(score<(raised?67:threshold-7)||(need>stack*.3&&score<85)){suggested='fold';why=`${handLabel(cards)}로 이 가격을 따라가면 더 좋은 패에 지배되기 쉽습니다. 다음 기회를 기다리는 폴드를 고려하세요.`;}
    else if(score>88&&legal.canRaise){suggested='raise';why='프리미엄 시작 패입니다. 상대의 레이즈 크기와 유효 스택을 보고 가치를 받으세요.';}
    else {suggested='call';why='참여할 수 있는 패지만 자동 콜은 아닙니다. 뒤에 행동할 상대와 추가 레이즈 가능성을 확인하세요.';}
  }else{
    equity=estimateEquity(cards,board,opponents,samples,rng);
    if(need&&equity<odds+.06){suggested='fold';why=`콜 비용은 ${need}, 경쟁 가능한 팟 기준 필요 지분은 약 ${Math.round(odds*100)}%입니다. 상대가 강한 범위로 베팅했다면 폴드를 우선 검토하세요.`;}
    else if(legal.canRaise&&equity>(opponents>1?.68:.72)&&made.category>=1){suggested='raise';why=`현재 ${made.name}. 약한 패에서도 콜을 받을 수 있는 크기로 밸류 베팅을 고려하세요. 보드 전체로 만든 족보라면 내 카드의 기여도를 다시 확인하세요.`;}
    else if(need){suggested='call';why=`콜 가격을 먼저 보세요. 필요한 팟 지분은 약 ${Math.round(odds*100)}%입니다. 추정치는 무작위 상대 기준이므로 큰 베팅에는 상대 범위를 더 강하게 잡아야 합니다.`;}
    else {suggested='check';why=draws.cards.length?'드로우가 있습니다. 체크로 무료 카드를 보거나, 상대를 접게 할 근거가 있을 때 세미블러프를 검토하세요.':'체크로 팟을 조절할 수 있습니다. 상대가 어떤 더 약한 패로 콜할지 떠오르지 않으면 무리하게 키우지 마세요.';}
  }
  if(!legal.actions.includes(suggested))suggested=need?'call':'check';
  return {suggested,why,odds,equity,made,draws,opponents,contestable,method:'휴리스틱 코칭 · GTO 정답 아님'};
}
export function decide(view,rng=Math.random,difficulty='standard') {
  const l=view.legal;if(!l.actions.length)throw Error('No legal AI action');
  const opponents=view.players.filter(p=>!p.folded&&p.id!==view.id).length,style=view.style,need=l.call||0;
  let strength=view.board.length?estimateEquity(view.cards,view.board,opponents,difficulty==='gentle'?45:100,rng):Math.max(.08,(preflopScore(view.cards)-22)/85);
  const cost=need/Math.max(1,view.pot+need),pressure=need/Math.max(1,view.stack+view.round),loose=style==='loose'||style==='tricky',caller=style==='caller';
  const noise=(rng()-.5)*(difficulty==='gentle'?.25:.1);strength+=noise;
  const threshold=view.board.length?cost+(style==='tight'?.13:caller?-.04:.04):(.30+pressure*.55+(style==='tight'?.10:caller?-.08:0));
  if(need&&strength<threshold&&rng()>(caller?.25:.05))return {action:'fold'};
  const bluff=!need&&loose&&rng()<.13;
  const raiseChance=caller?.18:loose?.70:.5;
  if(l.canRaise&&(strength>(view.board.length?.67:.70)||bluff)&&rng()<raiseChance){
    const target=view.currentBet>view.bb?view.currentBet*2.6:view.board.length?view.currentBet+Math.max(view.bb,Math.round((view.pot+need)*(loose?.7:.5))):view.bb*(loose?3:2.5);
    const total=Math.min(l.maxRaise,Math.max(l.minRaise,Math.round(target)));
    return {action:'raise',total};
  }
  return {action:need?'call':'check'};
}
