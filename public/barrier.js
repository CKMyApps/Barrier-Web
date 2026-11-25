'use strict';
const $=id=>document.getElementById(id),R=globalThis.BarrierRules;
const screens=['home','guide','prefs','lobby','arena'];
let mode='',screen='home',audio,sound=true,game,scores=[0,0],round=0,startAt=0,nextAt=0;
let room,token,epoch=0,polling=false,joining=false,turnBusy=false,queued=null,lastFrame='',onlineOverlay='',onlineMessage='';
try{sound=localStorage.getItem('ck.barrier.sound')!=='off'}catch{}
function soundLabel(){$('sound').textContent='Sound '+(sound?'ON':'OFF');$('sound').setAttribute('aria-pressed',sound)}soundLabel();
function unlock(){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{})}catch{}}
function beep(end=false){if(!sound||!audio)return;const a=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;a.type='square';a.frequency.setValueAtTime(end?200:540,t);a.frequency.exponentialRampToValueAtTime(end?65:410,t+.09);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.0001,t+.12);a.connect(g).connect(audio.destination);a.start(t);a.stop(t+.13)}
function show(id){screen=id;screens.forEach(n=>$(n).hidden=n!==id);$('back').hidden=id==='home';if(id==='arena')$('field').focus({preventScroll:true});if(id==='home')requestAnimationFrame(poster)}
function poster(){
 const c=$('poster'),rect=c.getBoundingClientRect();if(rect.width<1)return;
 const scale=Math.min(devicePixelRatio||1,2),w=c.width=Math.round(rect.width*scale),h=c.height=Math.round(rect.height*scale),ctx=c.getContext('2d');
 const p=(x,y,z=0)=>[w*.50+(x-y)*w*.032,h*.24+(x+y)*h*.019-z*h*.018];
 function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
 function cell(x,y,z,top,right,left){poly([p(x,y+1,z),p(x+1,y+1,z),p(x+1,y+1),p(x,y+1)],left);poly([p(x+1,y,z),p(x+1,y+1,z),p(x+1,y+1),p(x+1,y)],right);poly([p(x,y,z),p(x+1,y,z),p(x+1,y+1,z),p(x,y+1,z)],top)}
 ctx.clearRect(0,0,w,h);poly([p(0,0),p(15,0),p(15,15),p(0,15)],'#263a32');
 for(let i=0;i<=15;i++){ctx.strokeStyle='#496054';ctx.lineWidth=Math.max(1,w*.0015);ctx.beginPath();ctx.moveTo(...p(i,0));ctx.lineTo(...p(i,15));ctx.moveTo(...p(0,i));ctx.lineTo(...p(15,i));ctx.stroke()}
 const pieces=[];function trail(points,type){points.forEach(([x,y],i)=>{const end=i===points.length-1;pieces.push([x,y,end?2:.78,...(type?['#b1edf1','#4f949f','#356970']:['#ffcc79','#d18d43','#9a6535'])])})}
 trail([[1,12],[2,12],[3,12],[4,12],[4,11],[4,10],[4,9],[5,9],[6,9],[7,9],[8,9],[8,8],[8,7],[8,6]],0);
 trail([[13,2],[12,2],[11,2],[10,2],[10,3],[10,4],[9,4],[8,4],[7,4],[6,4],[6,5],[6,6]],1);
 for(const [x,y] of [[2,4],[3,4],[4,4],[11,9],[11,10],[11,11],[11,12]])pieces.push([x,y,1.1,'#879583','#5b6c60','#49594d']);
 pieces.sort((a,b)=>a[0]+a[1]-b[0]-b[1]).forEach(args=>cell(...args));
}
window.addEventListener('resize',poster);requestAnimationFrame(poster);
$('how').onclick=()=>show('guide');$('settings').onclick=()=>show('prefs');$('sound').onclick=()=>{sound=!sound;soundLabel();try{localStorage.setItem('ck.barrier.sound',sound?'on':'off')}catch{}if(sound){unlock();beep()}};
function boardDraw(b){if(!b)return;const ctx=$('field').getContext('2d'),sz=24;
 ctx.fillStyle='#192720';ctx.fillRect(0,0,864,576);
 const pal=['','#f7b65e','#89cfd8','#536354'];
 for(let i=0;i<b.cells.length;i++){const x=(i%R.cols)*sz,y=Math.floor(i/R.cols)*sz,k=b.cells[i];ctx.fillStyle=k?pal[k]:'#223329';ctx.fillRect(x+1,y+1,sz-2,sz-2);if(k===3){ctx.fillStyle='#778573';ctx.fillRect(x+3,y+3,sz-6,2)}}
 b.riders.forEach(({x,y,d},i)=>{const a=ctx; a.save();a.translate((x+.5)*sz,(y+.5)*sz);a.rotate(d*Math.PI/2);a.fillStyle=i?'#e1fcff':'#fff0ca';a.fillRect(-10,-10,20,20);a.fillStyle='#22332a';a.beginPath();a.moveTo(0,-7);a.lineTo(6,5);a.lineTo(-6,5);a.closePath();a.fill();a.restore()})
}
function overlay(text){$('overlay').hidden=!text;$('overlay').textContent=text}
function scoreboard(){const a=mode==='solo'?'You':'P1',b=mode==='solo'?'CPU':'P2';$('aScore').textContent=a+' · '+scores[0];$('bScore').textContent=b+' · '+scores[1]}
function result(b,seat){return b.winner===-1?'Draw':b.winner===seat?'You win':mode==='solo'?'CPU wins':'Opponent wins'}
function newSolo(){mode='solo';round++;game=R.board();startAt=performance.now()+2200;nextAt=startAt+R.tick;
 $('match').textContent='1 vs CPU';$('outcome').textContent='Round '+round+' · You are amber';$('again').hidden=true;show('arena');scoreboard();boardDraw(game);overlay('Ready');}
$('solo').onclick=()=>{unlock();scores=[0,0];round=0;newSolo()};
setInterval(()=>{if(screen!=='arena')return;
 if(mode==='online'){if(room?.phase==='play'&&!onlineOverlay)overlay(performance.now()<startAt?String(Math.max(1,Math.ceil((startAt-performance.now())/1000))):'');return}
 if(mode!=='solo'||game.over)return;const now=performance.now();overlay(now<startAt?String(Math.ceil((startAt-now)/1000)):'');
 if(now<nextAt)return;nextAt=now+R.tick;R.steer(game,1,R.cpu(game));R.step(game);boardDraw(game);
 if(game.over){if(game.winner>=0)scores[game.winner]++;scoreboard();overlay(result(game,0));$('outcome').textContent='Round '+round+' complete';$('again').hidden=false;beep(true)}
},45);
async function request(path,method='GET',body,auth=token){
 if(location.protocol==='file:')throw Error('Open the hosted game, or run the included room server to play online.');
 const headers={};if(auth)headers.Authorization='Bearer '+auth;if(body)headers['Content-Type']='application/json';
 const res=await fetch('./api/rooms'+path,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(8000)});
 let data;try{data=await res.json()}catch{throw Error('Room service unavailable on this host. Use the server included with Barrier.')};if(!res.ok)throw Error(data.error||'Room request failed.');return data;
}
function credentials(code,value){try{const key='ck.barrier.room.'+code;if(value)sessionStorage.setItem(key,value);return sessionStorage.getItem(key)}catch{return null}}
function setURL(code){const u=new URL(location.href);if(code)u.searchParams.set('room',code);else u.searchParams.delete('room');try{history.replaceState(null,'',u)}catch{}return u.href}
function onlineLobby(){mode='online';onlineMessage='';$('entry').hidden=false;$('waiting').hidden=true;$('message').textContent='';show('lobby')}
$('online').onclick=onlineLobby;
function drawRoom(r){
 if(room&&(r.version<room.version||(r.version===room.version&&r.now<room.now)))return;
 const prev=room;room=r;if(r.token){token=r.token;credentials(r.code,token)}const seat=r.seat;
 if(r.phase==='closed'){game=null;show('lobby');$('entry').hidden=false;$('waiting').hidden=true;$('message').textContent='Room closed. Create or join another room.';room=null;token=null;setURL(null);return}
 if(r.phase==='lobby'){
  show('lobby');$('entry').hidden=true;$('waiting').hidden=false;$('seat').textContent=r.code+' · You are P'+(seat+1)+' · '+r.count+'/2 players';
  $('invite').value=setURL(r.code);$('start').hidden=seat!==0;$('start').disabled=r.count!==2||joining;
  $('message').textContent=onlineMessage||(r.count<2?'Waiting for your opponent…':seat?'Waiting for the host to start.':'Both players are here.');return;
 }
 const changed=screen!=='arena';if(changed){show('arena');setURL(r.code)}mode='online';game=r.board;scores=r.scores;scoreboard();
 $('match').textContent='Online duel';const frame=r.round+':'+game.riders.map(p=>p.x+','+p.y).join('/')+':'+r.now;
 if(lastFrame!==frame){boardDraw(game);lastFrame=frame}
 startAt=performance.now()+r.start-r.now;
 $('again').hidden=r.phase!=='end'||seat!==0;$('again').disabled=joining;
 $('outcome').textContent='Round '+r.round+' · You are '+(seat?'blue':'amber')+(r.phase==='end'&&seat?' · Waiting for host':'');
 onlineOverlay=r.phase==='end'?result(game,seat):'';overlay(onlineOverlay||(r.start>r.now?String(Math.ceil((r.start-r.now)/1000)):''));
 if(r.phase==='end'&&prev?.phase==='play')beep(true);
}
function issue(e){if(screen==='arena')$('outcome').textContent=e.message;else $('message').textContent=e.message}
async function change(path,auth=token){if(joining)return;joining=true;const id=epoch;onlineMessage='';$('create').disabled=true;$('join').querySelector('button').disabled=true;
 try{unlock();const r=await request(path,'POST',null,auth);if(id===epoch){joining=false;drawRoom(r)}}catch(e){if(id===epoch)issue(e)}finally{if(id===epoch){joining=false;$('create').disabled=false;$('join').querySelector('button').disabled=false}}}
$('create').onclick=()=>change('',null);
$('join').onsubmit=e=>{e.preventDefault();const code=$('code').value.trim().toUpperCase();if(/^[A-F0-9]{12}$/.test(code))change('/'+code+'/join',credentials(code))};
$('start').onclick=()=>room&&change('/'+room.code+'/start');$('again').onclick=()=>mode==='solo'?newSolo():room&&change('/'+room.code+'/start');
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('invite').value);onlineMessage='Invite link copied.'}catch{$('invite').select();onlineMessage='Select and copy the invite link.'}$('message').textContent=onlineMessage};
setInterval(async()=>{if(!room||polling||joining||document.hidden)return;const id=epoch;polling=true;try{const r=await request('/'+room.code);if(id===epoch&&!joining)drawRoom(r)}catch(e){if(id===epoch)issue(e)}finally{if(id===epoch)polling=false}},200);
async function sendTurns(){if(turnBusy)return;const id=epoch;turnBusy=true;try{while(queued!==null&&room&&id===epoch){const d=queued;queued=null;const r=await request('/'+room.code+'/turn','POST',{d,round:room.round});if(id===epoch)drawRoom(r)}}catch(e){if(id===epoch)issue(e)}finally{if(id===epoch)turnBusy=false}}
function steer(d){if(screen!=='arena'||!game||game.over)return;unlock();if(mode==='solo'){R.steer(game,0,d);beep()}else if(room?.phase==='play'){queued=d;sendTurns();beep()}}
document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>steer(Number(b.dataset.d)));
document.addEventListener('keydown',e=>{const d={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3,w:0,d:1,s:2,a:3}[e.key];if(d!==undefined&&screen==='arena'){e.preventDefault();if(!e.repeat)steer(d)}});
let touch;const field=$('field');field.onpointerdown=e=>{touch=[e.clientX,e.clientY];field.setPointerCapture(e.pointerId)};field.onpointercancel=()=>touch=null;
field.onpointerup=e=>{if(!touch)return;const x=e.clientX-touch[0],y=e.clientY-touch[1];touch=null;if(Math.max(Math.abs(x),Math.abs(y))>=12)steer(Math.abs(x)>Math.abs(y)?(x>0?1:3):(y>0?2:0))};
$('back').onclick=()=>{if(room)request('/'+room.code+'/leave','POST').catch(()=>{});epoch++;joining=polling=turnBusy=false;queued=null;game=room=token=null;mode='';$('create').disabled=false;$('join').querySelector('button').disabled=false;setURL(null);show('home')};
const invited=new URL(location.href).searchParams.get('room');if(invited){onlineLobby();$('code').value=invited.toUpperCase();const saved=credentials($('code').value);if(saved)change('/'+$('code').value+'/join',saved)}
