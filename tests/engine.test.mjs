import test from 'node:test';
import assert from 'node:assert/strict';
import {Table,evaluate,parseCards,settlePots,seeded,decide,estimateEquity,drawInfo,drawProbability} from '../src/engine.js';
const ev=s=>evaluate(parseCards(s));
test('probability lab distinguishes one card, two cards, and no cards',()=>{assert.ok(Math.abs(drawProbability(9,47,1)-9/47)<1e-12);assert.ok(Math.abs(drawProbability(9,47,2)-(1-38*37/(47*46)))<1e-12);assert.equal(drawProbability(9,46,0),0);assert.equal(drawProbability(0,47,2),0);});
test('all hand categories, wheel, double trips, kickers and board ties',()=>{
 const hands=['A♠ J♥ 9♣ 6♦ 3♠','A♠ A♥ Q♣ 9♦ 4♠','T♠ T♥ 6♣ 6♦ A♠','J♠ J♥ J♣ 8♦ 3♠','8♠ 7♥ 6♣ 5♦ 4♠','A♣ J♣ 8♣ 5♣ 2♣','Q♠ Q♥ Q♣ 7♦ 7♠','K♠ K♥ K♣ K♦ 9♠','9♥ 8♥ 7♥ 6♥ 5♥'];
 hands.forEach((s,i)=>{assert.equal(ev(s).category,i);assert.equal(ev(s).cards.length,5);if(i)assert.ok(ev(s).score>ev(hands[i-1]).score);});
 assert.equal(ev('A♠ 2♥ 3♣ 4♦ 5♠ K♥ Q♣').kickers[0],5);
 assert.deepEqual(ev('A♠ A♥ A♣ K♦ K♠ K♥ Q♣').kickers,[14,13]);
 assert.ok(ev('A♠ A♥ K♣ 9♦ 4♠').score>ev('A♣ A♦ Q♣ 9♥ 4♣').score);
 assert.equal(ev('A♠ K♦ Q♣ J♥ T♠ 2♣ 3♦').score,ev('A♠ K♦ Q♣ J♥ T♠ 8♥ 8♦').score);
 assert.equal(ev('Q♠ K♦ A♣ 2♥ 3♠').category,0);
});
test('side pots, folded contributions and odd-chip order preserve every chip',()=>{
 const ps=[{id:0,committed:50,folded:false,cards:parseCards('A♠ A♥')},{id:1,committed:100,folded:false,cards:parseCards('K♠ K♥')},{id:2,committed:100,folded:false,cards:parseCards('Q♠ Q♥')}];
 const pots=settlePots(ps,parseCards('2♠ 4♦ 7♣ 9♥ J♠'),0);
 assert.deepEqual(pots.map(p=>p.amount),[150,100]);assert.deepEqual(pots.map(p=>p.awards[0].player),[0,1]);
 ps.forEach(p=>p.committed=5);ps[2].folded=true;
 const split=settlePots(ps,parseCards('2♣ 3♣ 4♣ 5♣ 6♣'),0);
 assert.deepEqual(split[0].awards,[{player:1,amount:8},{player:0,amount:7}]);
});
test('actual preflop action order and big blind option',()=>{
 const t=new Table({count:4,rng:seeded(1)});t.start();assert.equal(t.s.dealer,0);assert.equal(t.s.actor,3);
 for(const i of [3,0,1]){assert.equal(t.s.actor,i);t.act(i,'call');}
 assert.equal(t.s.actor,2);assert.ok(t.legal().actions.includes('check'));t.act(2,'check');assert.equal(t.s.actor,-1);t.advance();assert.equal(t.s.actor,1);assert.equal(t.s.board.length,3);
});
test('heads up: button is small blind and first preflop, last postflop',()=>{const t=new Table({count:2});t.start();assert.equal(t.s.dealer,t.s.sbSeat);assert.equal(t.s.actor,t.s.dealer);t.act(t.s.actor,'call');t.act(t.s.actor,'check');t.advance();assert.equal(t.s.actor,t.s.bbSeat);});
test('short all-in big blind never asks the covering small blind for a pointless call',()=>{const t=new Table({count:2,mode:'tournament'});t.s.players[1].stack=5;t.start();assert.equal(t.s.actor,-1);t.advance();assert.equal(t.s.players[0].committed,5);assert.equal(t.s.pot,10);while(!t.s.over)t.advance();t.assert();});
test('minimum raise and short all-in reopening, including cumulative short raises',()=>{
 const t=new Table({count:4});t.start();const s=t.s;s.players.forEach(p=>{p.stack=1000;p.round=0;p.committed=0;p.actedAt=-1;p.reopenAt=0;});s.players[1].stack=150;s.players[3].stack=200;s.pot=0;s.currentBet=0;s.lastRaise=20;s.actor=0;s.chipTotal=2350;
 t.act(0,'raise',100);assert.equal(t.legal().minRaise,200);assert.throws(()=>t.act(1,'raise',130));t.act(1,'raise',150);t.act(2,'call');t.act(3,'raise',200);
 assert.equal(t.s.actor,0);assert.equal(t.legal().canRaise,true);assert.equal(t.legal().minRaise,300);t.act(0,'call');assert.equal(t.s.actor,2);assert.equal(t.legal().canRaise,false);assert.throws(()=>t.act(2,'raise',300));t.act(2,'call');
});
test('folding hero does not skip remaining actions or streets',()=>{
 const t=new Table({count:4});t.start();t.act(3,'call');t.act(0,'fold');assert.equal(t.s.over,false);t.act(1,'call');t.act(2,'check');t.advance();assert.equal(t.s.actor,1);assert.equal(t.s.board.length,3);assert.equal(t.s.players[0].folded,true);
});
test('all-in hero does not freeze opponent side-pot betting',()=>{
 const t=new Table({count:4});t.start();t.s.players[0].stack=20;t.s.players[0].startStack=20;t.s.chipTotal-=1980;t.act(3,'call');t.act(0,'call');t.act(1,'call');t.act(2,'check');t.advance();assert.equal(t.s.actor,1);assert.ok(t.legal().canRaise);t.act(1,'raise',100);assert.equal(t.s.currentBet,100);assert.equal(t.s.players[0].stack,0);
});
test('no betting into a dry side pot and unmatched excess returned',()=>{
 const t=new Table({count:2});t.start();t.s.players[1].stack=30;t.s.players[1].startStack=50;t.s.chipTotal=2050;t.act(0,'raise',200);assert.equal(t.legal().canRaise,false);t.act(1,'call');assert.equal(t.s.actor,-1);t.advance();assert.equal(t.s.players[0].committed,50);assert.equal(t.s.pot,100);while(!t.s.over)t.advance();assert.equal(t.s.players.reduce((n,p)=>n+p.stack,0),2050);
});
test('AI has no deck or other players cards; private opponent changes cannot affect decision',()=>{
 const t=new Table({count:4});t.start();const v=t.view(t.s.actor);assert.equal(v.deck,undefined);assert.ok(v.players.every(p=>p.cards===undefined));const a=decide(v,seeded(99));t.s.players[0].cards=parseCards('A♠ A♥');const b=decide(t.view(t.s.actor),seeded(99));assert.deepEqual(a,b);
});
test('draws avoid double-counting and river draws vanish',()=>{const d=drawInfo(parseCards('8♥ 7♥'),parseCards('6♥ 5♥ K♣'));assert.equal(d.flush,9);assert.equal(d.straight,8);assert.equal(d.cards.length,15);assert.equal(drawInfo(parseCards('8♥ 7♥'),parseCards('6♥ 5♥ K♣ A♦ Q♠')).cards.length,0);});
test('Monte Carlo equity is plausible and deterministic with seed',()=>{const a=estimateEquity(parseCards('A♠ A♥'),[],1,1800,seeded(2));assert.ok(a>.79&&a<.89);assert.ok(Math.abs(estimateEquity(parseCards('2♠ 3♥'),parseCards('A♣ K♣ Q♣ J♣ T♣'),2,100,seeded(1))-1/3)<1e-12);});
test('600 randomized full hands: legal flow terminates, cards stay unique, chips conserved, restore works',()=>{
 for(let n=1;n<=600;n++){
  const rng=seeded(n),count=[2,4,6][n%3],t=new Table({count,stack:100+rng()*0|0,rng});t.start();let steps=0;
  while(!t.s.over){assert.ok(++steps<250,`hand ${n} stalled`);if(t.s.actor<0)t.advance();else{const l=t.legal(),r=rng();if(l.canRaise&&r<.26)t.act(t.s.actor,'raise',rng()<.35?l.maxRaise:Math.min(l.maxRaise,l.minRaise+Math.floor(rng()*100)));else if(r<.40&&l.call)t.act(t.s.actor,'fold');else t.act(t.s.actor,l.call?'call':'check');}t.assert();}
  const used=[...t.s.board,...t.s.players.flatMap(p=>p.cards),...t.s.deck,...t.s.burned];assert.equal(new Set(used).size,52);assert.equal(used.length,52);assert.equal(t.s.players.reduce((n,p)=>n+p.stack,0),count*100);assert.deepEqual(Table.restore(t.s).s,t.s);
 }
});
