import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

assert.match(source, /<meta name="app-version" content="2\.1\.0">/);
assert.doesNotMatch(source, /sponsor-banner\.jpg|묣|초볏|걶|핧|본러스|�/);
for (const file of ['manifest.webmanifest', 'icon.svg', 'sw.js', 'og-holdem.png']) {
  assert.ok(fs.existsSync(path.join(root, file)), `missing asset: ${file}`);
}
for (const fn of ['aiDecide', 'postBet_ai', 'aiCallOrFoldAllIn', 'runAIUntilHero', 'saveTournamentState']) {
  assert.match(source, new RegExp(`function ${fn}\\(`), `missing function: ${fn}`);
}

const executableScripts = [...source.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi)];
for (const [index, match] of executableScripts.entries()) {
  assert.doesNotThrow(() => new Function(match[1]), `script ${index} has a syntax error`);
}

const hook = `
window.__holdemTest={
  bestHand:bestHand,
  cmpHand:cmpHand,
  buildSidePots:buildSidePots,
  awardPots:awardPots,
  quizCount:function(){return QUIZZES.length;},
  setState:function(nextPlayers,nextBoard,nextDealer){
    players=nextPlayers;
    board=nextBoard||[];
    dealer=nextDealer||0;
    eliminatedPlayers=[];
    pot=nextPlayers.reduce(function(sum,p){return sum+(p.committed||0);},0);
  },
  getState:function(){
    return{players:players,board:board,street:street,pot:pot,currentBet:currentBet,handOver:handOver,gameMode:gameMode};
  }
};
`;
const instrumented = source.replace(
  /\n\}\)\(\);\n<\/script>\n<script type="application\/ld\+json">/,
  `${hook}\n})();\n</script>\n<script type="application/ld+json">`
);
assert.notEqual(instrumented, source, 'test hook injection failed');

const runtimeErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => runtimeErrors.push(error));
virtualConsole.on('error', (error) => runtimeErrors.push(error));

const dom = new JSDOM(instrumented, {
  url: 'https://holdem-brown.vercel.app/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    window.confirm = () => false;
    window.alert = () => {};
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} }
    });
    window.localStorage.setItem('hd_sound', 'false');
    window.localStorage.setItem('holdem_dojo_v8', JSON.stringify({
      xp: 0,
      hands: 0,
      wins: 0,
      correct: 0,
      quizTotal: 0,
      tableWins: 0,
      reviews: [],
      tutDone: true,
      sawLearn: 0,
      streak: 0,
      maxStreak: 0
    }));
  }
});

await wait(1800);
const { document, __holdemTest } = dom.window;
assert.ok(__holdemTest, 'game test hook did not load');
assert.equal(runtimeErrors.length, 0, runtimeErrors.map((error) => error.message).join('\n'));
assert.equal(document.querySelectorAll('#opponents .opp').length, 5, '6-max opponents did not render');
assert.equal(document.querySelectorAll('#heroCards .card').length, 2, 'hero cards did not render');
assert.equal(document.querySelectorAll('#boardCards .board-slot').length, 5, 'empty board slots did not render');
assert.equal(document.querySelectorAll('body > .loading-text, body > .loading-sub').length, 0, 'orphan loading nodes remain');
assert.ok(__holdemTest.quizCount() >= 90, 'quiz bank was unexpectedly truncated');

const saved6Max = JSON.parse(dom.window.localStorage.getItem('holdem_tourney_state'));
assert.equal(saved6Max.version, 2);
assert.equal(saved6Max.players.length, 6);
assert.equal(saved6Max.gameMode, '6max');

document.getElementById('foldBtn').click();
await wait(80);
assert.equal(__holdemTest.getState().handOver, true, 'fold did not finish the hand');
assert.ok(document.getElementById('resultOverlay').classList.contains('show'), 'result overlay did not open');
assert.equal(runtimeErrors.length, 0, runtimeErrors.map((error) => error.message).join('\n'));

document.getElementById('resultNextBtn').click();
await wait(80);
assert.equal(document.querySelectorAll('#heroCards .card').length, 2, 'next hand did not deal hero cards');

dom.window.toggle1v1Mode();
await wait(80);
assert.equal(document.querySelectorAll('#opponents .opp').length, 1, 'heads-up mode did not render one opponent');
const savedHeadsUp = JSON.parse(dom.window.localStorage.getItem('holdem_tourney_state'));
assert.equal(savedHeadsUp.gameMode, '1v1');
assert.equal(savedHeadsUp.players.length, 2);
const savedHeadsUpRaw = JSON.stringify(savedHeadsUp);

for (let step = 0; step < 12; step += 1) {
  if (document.getElementById('resultOverlay').classList.contains('show')) {
    document.getElementById('resultNextBtn').click();
  } else if (!document.getElementById('callBtn').disabled) {
    document.getElementById('callBtn').click();
  } else if (!document.getElementById('checkBtn').disabled) {
    document.getElementById('checkBtn').click();
  } else if (!document.getElementById('foldBtn').disabled) {
    document.getElementById('foldBtn').click();
  }
  await wait(25);
  assert.equal(runtimeErrors.length, 0, runtimeErrors.map((error) => error.message).join('\n'));
}

const card = (rank, suit, value) => ({ r: rank, s: suit, v: value });
const royal = __holdemTest.bestHand([
  card('A', '♠', 14), card('K', '♠', 13), card('Q', '♠', 12),
  card('J', '♠', 11), card('T', '♠', 10), card('2', '♦', 2), card('3', '♣', 3)
]);
assert.equal(royal.rank, 8);
assert.equal(royal.t[0], 14);

const wheel = __holdemTest.bestHand([
  card('A', '♠', 14), card('2', '♥', 2), card('3', '♦', 3),
  card('4', '♣', 4), card('5', '♠', 5), card('K', '♦', 13), card('Q', '♣', 12)
]);
assert.equal(wheel.rank, 4);
assert.equal(wheel.t[0], 5);

const sidePotPlayers = [
  { cards: [card('A', '♠', 14), card('A', '♥', 14)], stack: 0, committed: 100, folded: false },
  { cards: [card('K', '♠', 13), card('K', '♥', 13)], stack: 0, committed: 300, folded: false },
  { cards: [card('Q', '♠', 12), card('T', '♥', 10)], stack: 0, committed: 300, folded: false }
];
__holdemTest.setState(sidePotPlayers, [
  card('2', '♣', 2), card('3', '♦', 3), card('7', '♥', 7),
  card('9', '♠', 9), card('J', '♣', 11)
], 2);
__holdemTest.awardPots();
assert.deepEqual(sidePotPlayers.map((player) => player.stack), [300, 400, 0]);
assert.equal(sidePotPlayers.reduce((sum, player) => sum + player.stack, 0), 700);

const splitPlayers = [
  { cards: [card('2', '♣', 2), card('3', '♦', 3)], stack: 0, committed: 101, folded: false },
  { cards: [card('4', '♣', 4), card('5', '♦', 5)], stack: 0, committed: 101, folded: false },
  { cards: [card('6', '♣', 6), card('7', '♦', 7)], stack: 0, committed: 101, folded: true }
];
__holdemTest.setState(splitPlayers, [
  card('A', '♠', 14), card('K', '♠', 13), card('Q', '♠', 12),
  card('J', '♠', 11), card('T', '♠', 10)
], 2);
__holdemTest.awardPots();
assert.deepEqual(splitPlayers.map((player) => player.stack), [152, 151, 0]);
assert.equal(splitPlayers.reduce((sum, player) => sum + player.stack, 0), 303);

assert.equal(runtimeErrors.length, 0, runtimeErrors.map((error) => error.message).join('\n'));
dom.window.close();

const restoreErrors = [];
const restoreConsole = new VirtualConsole();
restoreConsole.on('jsdomError', (error) => restoreErrors.push(error));
restoreConsole.on('error', (error) => restoreErrors.push(error));
const restoredDom = new JSDOM(instrumented, {
  url: 'https://holdem-brown.vercel.app/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: restoreConsole,
  beforeParse(window) {
    window.confirm = () => true;
    window.alert = () => {};
    window.localStorage.setItem('hd_sound', 'false');
    window.localStorage.setItem('holdem_tourney_state', savedHeadsUpRaw);
  }
});
await wait(1800);
assert.equal(restoreErrors.length, 0, restoreErrors.map((error) => error.message).join('\n'));
assert.equal(restoredDom.window.__holdemTest.getState().gameMode, '1v1');
assert.equal(restoredDom.window.document.querySelectorAll('#opponents .opp').length, 1);
assert.equal(restoredDom.window.document.querySelectorAll('#heroCards .card').length, 2);
restoredDom.window.close();
console.log('Holdem smoke tests passed');
