
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const server = http.createServer((req,res)=>{
  if(req.url==='/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,rooms:rooms.size}));}
  const requested = (req.url || '/').split('?')[0];
  const file = requested === '/' ? path.join(__dirname,'public','index.html') : path.join(__dirname,'public',path.basename(requested));
  if (!file.startsWith(path.join(__dirname,'public'))) {res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});return res.end('Not found');}
    const ext=path.extname(file);
    const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'};
    res.writeHead(200,{'content-type':types[ext]||'application/octet-stream','cache-control':'no-store'});
    res.end(data);
  });
});
const wss = new WebSocketServer({server});
const deckNames = ['แร่ดวงดี','ใบโคลเวอร์','แม่เหล็กดูดดวง','แรคคูนมือไว','เกราะคุ้มดวง','ลูกเต๋าป่วน','พายุส่งต่อ','กับดักเหนียวหนึบ','กล่องเซอร์ไพรส์','วาร์ปหนี','ถุงมือจอมฉก','สายรุ้งนำโชค','ประทัดป่วน','คาถาคุ้มครอง','ดาวหางเสี่ยงโชค'];
const rand = n => crypto.randomInt(n);
const code = () => crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();
function send(ws,obj){if(ws.readyState===1)ws.send(JSON.stringify(obj))}
function pubPlayers(r){return r.players.map(p=>({id:p.id,name:p.name,stars:p.stars,shield:p.shield,skip:p.skip}))}
function privateHand(r,p){return r.hands[p.id]||[]}
function state(r){for(const p of r.players){send(p.ws,{type:'state',players:pubPlayers(r),turn:r.turn,seconds:r.seconds,started:r.started,logLines:r.logLines,hand:privateHand(r,p)})}}
function lobby(r){for(const p of r.players)send(p.ws,{type:'lobby',players:pubPlayers(r)})}
function deal(r,id){let a=[];while(a.length<3){let n=rand(deckNames.length);if(!a.includes(n))a.push(n)}r.hands[id]=a}
function leader(r,me){return r.players.filter(p=>p.id!==me.id).sort((a,b)=>b.stars-a.stars)[0]||null}
function transfer(r,me,target,amount,note){if(target.shield){target.shield=false;note.push('โล่ของ '+target.name+' ป้องกันการโจมตี!');return}const x=Math.min(amount,target.stars);target.stars-=x;me.stars+=x}
function applyCard(r,p,slot){
 const h=r.hands[p.id]||[];if(!Number.isInteger(slot)||slot<0||slot>=h.length)return;
 const idx=h[slot], notes=[];if(p.skip){p.skip=false;notes.push(p.name+' เสียเทิร์นจากผลการ์ดก่อนหน้า')}
 else{
  const top=leader(r,p); const all=r.players;
  switch(idx){
   case 0:case 1:p.stars+=2;break;
   case 2:p.stars++;if(top&&top.stars>0)transfer(r,p,top,1,notes);break;
   case 3:if(top&&top.stars>0)transfer(r,p,top,1,notes);break;
   case 4:p.stars++;p.shield=true;break;
   case 5:{const n=rand(4);p.stars+=n;notes.push('ได้ '+n+' แต้ม');break}
   case 6:{const gains=all.map(x=>x.stars>0?1:0);all.forEach((x,i)=>{x.stars-=gains[i];all[(i+1)%all.length].stars+=gains[i]});break}
   case 7:if(top&&top.stars>0)transfer(r,p,top,1,notes);p.stars++;break;
   case 8:p.stars+=1+rand(3);break;
   case 9:p.stars++;p.skip=false;break;
   case 10:if(top)transfer(r,p,top,2,notes);break;
   case 11:p.stars+=2;if(all.filter(x=>x.id!==p.id).every(x=>x.stars>=p.stars-2))p.stars++;break;
   case 12:all.filter(x=>x.id!==p.id&&x.stars>p.stars).forEach(x=>transfer(r,p,x,1,notes));p.stars++;break;
   case 13:p.stars++;p.shield=true;break;
   case 14:p.stars+=3;p.skip=true;break;
  }
  notes.unshift(p.name+' ใช้ '+deckNames[idx]);
 }
 r.logLines.unshift(notes.join(' '));r.logLines=r.logLines.slice(0,30);
 if(p.stars>=15){finish(r);return}
 r.turn=(r.turn+1)%r.players.length;deal(r,r.players[r.turn].id);state(r);
}
function finish(r){r.started=false;if(r.timer)clearInterval(r.timer);r.timer=null;for(const p of r.players)send(p.ws,{type:'ended',players:pubPlayers(r),logLines:r.logLines})}
function removePlayer(r,p){r.players=r.players.filter(x=>x!==p);delete r.hands[p.id];if(!r.players.length){if(r.timer)clearInterval(r.timer);rooms.delete(r.code);return}
 if(r.hostId===p.id){for(const x of r.players)send(x.ws,{type:'room-closed',message:'เจ้าของห้องออกจากเกม ห้องถูกปิด'});if(r.timer)clearInterval(r.timer);rooms.delete(r.code);return}
 if(r.turn>=r.players.length)r.turn=0;if(r.started){if(r.players.length<2)finish(r);else state(r)}else lobby(r);
}
wss.on('connection',ws=>{
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw.toString())}catch{return}
  if(m.action==='create'){
   if(ws.roomCode)return;let c;do{c=code()}while(rooms.has(c));
   const p={id:crypto.randomUUID(),name:String(m.name||'ผู้เล่น').slice(0,14),stars:0,shield:false,skip:false,ws};
   const r={code:c,hostId:p.id,players:[p],hands:{},turn:0,seconds:300,started:false,logLines:[],timer:null};rooms.set(c,r);ws.roomCode=c;ws.playerId=p.id;
   send(ws,{type:'created',room:c,playerId:p.id,isHost:true,players:pubPlayers(r),message:'สร้างห้องสำเร็จ ส่งรหัสให้เพื่อนได้เลย'});return;
  }
  if(m.action==='join'){
   const r=rooms.get(String(m.room||'').toUpperCase());if(!r)return send(ws,{type:'error',message:'ไม่พบห้องนี้ หรือเจ้าของห้องออกจากเกมแล้ว'});
   if(r.started)return send(ws,{type:'error',message:'เกมเริ่มไปแล้ว ไม่สามารถเข้าร่วมระหว่างเกมได้'});
   if(r.players.length>=4)return send(ws,{type:'error',message:'ห้องเต็มแล้ว (สูงสุด 4 คน)'});
   const p={id:crypto.randomUUID(),name:String(m.name||'ผู้เล่น').slice(0,14),stars:0,shield:false,skip:false,ws};r.players.push(p);ws.roomCode=r.code;ws.playerId=p.id;
   send(ws,{type:'joined',room:r.code,playerId:p.id,isHost:false,players:pubPlayers(r),message:'เข้าห้องสำเร็จ'});lobby(r);return;
  }
  const r=rooms.get(ws.roomCode);if(!r)return;
  const p=r.players.find(x=>x.id===ws.playerId);if(!p)return;
  if(m.action==='start'&&p.id===r.hostId&&!r.started&&r.players.length>=2){
   r.started=true;r.seconds=300;r.turn=0;r.logLines=['เริ่มการผจญภัย!'];for(const x of r.players){x.stars=0;x.shield=false;x.skip=false;deal(r,x.id)}
   state(r);r.timer=setInterval(()=>{if(!r.started)return;r.seconds--;if(r.seconds<=0)finish(r);else state(r)},1000);return;
  }
  if(m.action==='play'&&r.started&&r.players[r.turn]?.id===p.id){applyCard(r,p,m.slot);return}
  if(m.action==='leave')removePlayer(r,p);
 });
 ws.on('close',()=>{const r=rooms.get(ws.roomCode);if(r){const p=r.players.find(x=>x.id===ws.playerId);if(p)removePlayer(r,p)}});
});
server.listen(PORT,()=>console.log(`TREASURE DASH V4 listening on ${PORT}`));
