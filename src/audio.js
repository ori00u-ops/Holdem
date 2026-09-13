// Procedural, local sound design: no audio downloads, tracking or licensed samples.
export class DojoAudio {
  constructor(){this.context=null;this.master=null;this.volume=.35;this.enabled=true;this.unlocked=false;}
  configure(enabled,volume){this.enabled=!!enabled;this.volume=Math.max(0,Math.min(1,Number(volume)/100||0));if(this.master&&this.context)this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.015);}
  unlock(){
    if(!this.enabled)return;
    try{this.context??=new (window.AudioContext||window.webkitAudioContext)();if(!this.master){this.master=this.context.createGain();this.master.gain.value=this.volume;this.master.connect(this.context.destination);}this.unlocked=true;if(this.context.state==='suspended')this.context.resume().catch(()=>{});}catch{}
  }
  pause(){if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
  play(kind){if(!this.enabled||!this.unlocked||!this.context||this.context.state!=='running'||document.hidden)return;this.render(this.context,this.master,kind,this.context.currentTime+.008);}
  render(ctx,target,kind,at=0){
    const tone=(freq,delay,duration,level=.12,type='sine',end=freq)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,at+delay);o.frequency.exponentialRampToValueAtTime(end,at+delay+duration);g.gain.setValueAtTime(0,at+delay);g.gain.linearRampToValueAtTime(level,at+delay+.004);g.gain.exponentialRampToValueAtTime(.0001,at+delay+duration);o.connect(g);g.connect(target);o.onended=()=>{o.disconnect();g.disconnect();};o.start(at+delay);o.stop(at+delay+duration+.01);};
    const paper=(delay,duration,level,frequency)=>{const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/d.length);const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();source.buffer=b;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;g.gain.value=level;source.connect(filter);filter.connect(g);g.connect(target);source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect();};source.start(at+delay);};
    if(kind==='deal'){[0,.075,.15].forEach(t=>{paper(t,.08,.25,2400);tone(700,t+.045,.025,.06,'triangle',340);});}
    else if(kind==='fold'){paper(0,.16,.18,1000);}
    else if(kind==='check'){tone(190,0,.075,.18,'sine',110);tone(205,.1,.065,.12,'sine',120);}
    else if(kind==='chip'||kind==='call'||kind==='raise'){const count=kind==='raise'?4:2;for(let i=0;i<count;i++){tone(2100+i*270,i*.045,.045,.075,'triangle',1400);tone(670,i*.045,.06,.06);}}
    else if(kind==='turn'){tone(784,0,.15,.09);tone(1047,.1,.2,.065);}
    else if(kind==='correct'){[523,659,784].forEach((f,i)=>tone(f,i*.09,.24,.095));}
    else if(kind==='win'){[392,523,659].forEach((f,i)=>tone(f,i*.09,.32,.08));}
    else if(kind==='complete'){tone(440,0,.16,.08);tone(523,.11,.21,.07);}
    else if(kind==='retry'){tone(330,0,.13,.07);tone(294,.09,.13,.05);}
  }
}
