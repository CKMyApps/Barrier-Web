const {board,step,steer,tick}=globalThis.BarrierRules;
const ttl=2*60*60*1000;
function error(status,message){throw Object.assign(new Error(message),{status})}
function reply(value,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}})}
function nextRound(r,now){r.board=board();r.phase='play';r.round++;r.start=now+3000;r.next=r.start+tick}
function finish(r){r.phase='end';if(r.board.winner>=0)r.scores[r.board.winner]++}
function advance(r,now){
 while(r.phase==='play'&&now>=r.next){step(r.board);r.next+=tick;if(r.board.over)finish(r)}
}
function view(r,seat,token){return {version:r.version||0,code:r.code,phase:r.phase,count:r.keys.filter(Boolean).length,seat,round:r.round,scores:r.scores,board:r.board,start:r.start,now:Date.now(),token}}
async function api(req,store){
 try{
  const path=new URL(req.url).pathname,m=path.match(/^\/api\/rooms(?:\/([A-F0-9]{12})(?:\/(join|start|turn|leave))?)?$/);
  if(!m)error(404,'Room not found.');const [,code,action]=m,method=req.method;
  if(method!==(!code||action?'POST':'GET'))error(405,'Method unavailable.');
  const auth=req.headers.get('Authorization')?.replace(/^Bearer /,'');
  const now=Date.now();
  if(!code){
   await store.cleanup(now-ttl);for(let i=0;i<4;i++){
    const code=crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase(),token=crypto.randomUUID();
    const r={code,phase:'lobby',keys:[token,null],round:0,start:0,next:0,board:null,scores:[0,0]};
    if(await store.create(code,r,now))return reply(view(r,0,token),201)
   }error(503,'Try creating a room again.');
  }
  let input;if(action==='turn'){try{input=await req.json()}catch{error(400,'Invalid direction.')}if(!Number.isInteger(input?.d)||input.d<0||input.d>3)error(400,'Invalid direction.')}
  for(let attempt=0;attempt<10;attempt++){
   const row=await store.get(code);if(!row||row.time<now-ttl)error(404,'Room has expired or does not exist.');
   const r=JSON.parse(row.data);let seat=auth?r.keys.indexOf(auth):-1,token;
   if(seat<0&&action!=='join')error(403,'Join the room first.');
   if(action==='join'&&seat<0){
    if(r.phase==='closed')error(410,'Room closed.');if(r.keys[1])error(409,'This room is full.');
    seat=1;token=crypto.randomUUID();r.keys[1]=token;
   }
   const at=Date.now(),previousPhase=r.phase;advance(r,at);
   if(action==='start'){
    if(seat!==0||!r.keys[1]||!['lobby','end'].includes(r.phase))error(409,'Both players must be ready.');nextRound(r,at);
   }
   if(action==='turn'&&r.phase==='play'&&input.round===r.round)steer(r.board,seat,input.d);
   if(action==='leave')r.phase='closed';
   // A read can replay ticks from the last committed input without writing every frame.
   if(!action&&previousPhase===r.phase)return reply(view(r,seat));
   r.version=row.rev+1;
   if(await store.save(code,row.rev,r,at))return reply(view(r,seat,token));
  }error(409,'Room busy. Try again.');
 }catch(e){return reply({error:e.status?e.message:'Room service is unavailable.'},e.status||503)}
}
export {api};
