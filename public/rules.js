/* Shared fixed-step rules, used by both the server and the solo game. */
globalThis.BarrierRules=(()=>{
 const cols=36,rows=24,tick=230,vectors=[[0,-1],[1,0],[0,1],[-1,0]];
 function board(random=Math.random){
  const cells=Array(cols*rows).fill(0);
  for(let i=0;i<3;i++){
   const x=9+Math.floor(random()*7),y=2+Math.floor(random()*7),n=2+Math.floor(random()*4),v=i%2===1;
   for(let j=0;j<n;j++){const a=x+(v?0:j),b=y+(v?j:0);cells[b*cols+a]=3;cells[(rows-b-1)*cols+cols-a-1]=3}
  }
  const riders=[{x:5,y:12,d:1},{x:cols-6,y:12,d:3}];
  riders.forEach((p,i)=>cells[p.y*cols+p.x]=i+1);
  return {cells,riders,turns:[null,null],over:false,winner:null};
 }
 function target(p,d){return [p.x+vectors[d][0],p.y+vectors[d][1]]}
 function free(cells,x,y){return x>=0&&x<cols&&y>=0&&y<rows&&cells[y*cols+x]===0}
 function steer(b,i,d){if(!Number.isInteger(d)||d<0||d>3||b.over)return;
  if((b.riders[i].d+2)%4!==d)b.turns[i]=d}
 function step(b){
  if(b.over)return;
  const next=b.riders.map((p,i)=>{p.d=b.turns[i]??p.d;b.turns[i]=null;return target(p,p.d)});
  const crash=next.map(([x,y])=>!free(b.cells,x,y));
  if(next[0][0]===next[1][0]&&next[0][1]===next[1][1])crash.fill(true);
  if(crash[0]||crash[1]){b.over=true;b.winner=crash[0]===crash[1]?-1:crash[0]?1:0;return}
  next.forEach(([x,y],i)=>{Object.assign(b.riders[i],{x,y});b.cells[y*cols+x]=i+1});
 }
 function cpu(b){
  const p=b.riders[1];let best=p.d,score=-1;
  for(const d of [p.d,(p.d+1)%4,(p.d+3)%4]){
   const [x,y]=target(p,d);if(!free(b.cells,x,y))continue;
   const seen=new Set([y*cols+x]),queue=[[x,y]];for(let k=0;k<queue.length&&k<60;k++){
    const [a,c]=queue[k];for(const [dx,dy] of vectors){const xx=a+dx,yy=c+dy,id=yy*cols+xx;
     if(free(b.cells,xx,yy)&&!seen.has(id)){seen.add(id);queue.push([xx,yy])}}}
   let ahead=0;while(ahead<8&&free(b.cells,x+vectors[d][0]*ahead,y+vectors[d][1]*ahead))ahead++;
   const rank=Math.min(seen.size,60)+ahead*.8+Math.random()*4;if(rank>score){score=rank;best=d}
  }return best;
 }
 return {cols,rows,tick,board,steer,step,cpu};
})();
