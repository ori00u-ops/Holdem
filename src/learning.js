export function dueQuestions(questions,answers,now=Date.now()){
  return questions.filter(q=>answers[q.id]?.dueAt>0&&answers[q.id].dueAt<=now).sort((a,b)=>answers[a.id].dueAt-answers[b.id].dueAt);
}
export function updateRecall(previous,correct,now=Date.now()){
  const a={attempts:0,correct:0,mastered:false,...previous};
  // Repeated clicks or same-day repeats do not move a card through several intervals.
  const freshDay=!a.lastCorrectAt||new Date(a.lastCorrectAt).toDateString()!==new Date(now).toDateString();
  a.attempts++;a.lastAttemptAt=now;
  if(correct){a.correct++;a.mastered=true;if(freshDay)a.recallLevel=Math.min(4,(a.recallLevel||0)+1);a.lastCorrectAt=now;a.dueAt=now+[1,3,7,14][Math.max(0,(a.recallLevel||1)-1)]*86400000;}
  else{a.recallLevel=0;a.dueAt=now+600000;}
  return a;
}
export function topicStats(questions,answers){
  const groups=new Map();for(const q of questions){const g=groups.get(q.cat)||{name:q.cat,total:0,seen:0,attempts:0,correct:0,mastered:0};g.total++;const a=answers[q.id];if(a){g.seen++;g.attempts+=a.attempts||0;g.correct+=a.correct||0;if(a.mastered)g.mastered++;}groups.set(q.cat,g);}return [...groups.values()].sort((a,b)=>(a.attempts?a.correct/a.attempts:2)-(b.attempts?b.correct/b.attempts:2));
}
