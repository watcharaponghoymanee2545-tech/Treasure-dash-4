const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 6;
const WIN_SCORE = 15;
const rooms = new Map();
const server = http.createServer((req,res)=>{
  if(req.url==='/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,rooms:rooms.size}));}
  const requested = (req.url || '/').split('?')[0];
  const file = requested === '/' ? path.join(__dirname,'public','index.html') : path.join(__dirname,'public',path.basename(requested));
  if (!file.startsWith(path.join(__dirname,'public'))) {res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});return res.end('Not found');}
    const ext=path.extname(file); const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'};
    res.writeHead(200,{'content-type':types[ext]||'application/octet-stream','cache-control':'no-store'});res.end(data);
  });
});
const wss = new WebSocketServer({server});
const cards = [
 ['🏅','เด็คกูเทียร์ B'],['🧂','กูเกลือ'],['🧲','ตูนดูดดวงง'],['🥷','บิด'],['🥽','กูติ๋ม'],
 ['🎰','Gacha Time!'],['👊','ตบพวกติ๋ม'],['💸','ยืมตังหน่อยย'],['🪙','โปรยเศษเงิน'],['🚫','Negate!'],
 ['💦','สาดไปสมาชิก'],['🥀','กูจน'],['🤑','พวกบ้านรวย'],['🪞','Mirror Force'],['👑','บ่าวเทียร์ S']
];
const rand = n => crypto.randomInt(n);
const code = () => crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();
function send(ws,obj){if(ws.readyState===1)ws.send(JSON.stringify(obj));}
function pubPlayers(r){return r.players.map(p=>({id:p.id,name:p.name,stars:p.stars,shield:p.shield,skip:p.skip}));}
function privateHand(r,p){return r.hands[p.id]||[];}
function state(r){for(const p of r.players)send(p.ws,{type:'state',players:pubPlayers(r),turn:r.turn,started:r.started,logLines:r.logLines,hand:privateHand(r,p)});}
function lobby(r){for(const p of r.players)send(p.ws,{type:'lobby',players:pubPlayers(r)});}
function deal(r,id){let a=[];while(a.length<3){let n=rand(cards.length);if(!a.includes(n))a.push(n);}r.hands[id]=a;}
function topPlayers(r,me){const others=r.players.filter(p=>p.id!==me.id);if(!others.length)return [];const max=Math.max(...others.map(p=>p.stars));return others.filter(p=>p.stars===max);}
function steal(r,me,target,amount,notes,{pierce=false}={}){
 if(!target)return 0;
 if(target.shield&&!pierce){target.shield=false;notes.push('โล่ของ '+target.name+' ป้องกันการโจมตีและถูกใช้ไป');return 0;}
 if(target.shield&&pierce){target.shield=false;notes.push('ทะลุและทำลายโล่ของ '+target.name);}
 const n=Math.min(amount,target.stars);target.stars-=n;me.stars+=n;return n;
}
function removePoint(target,notes){if(target.shield){target.shield=false;notes.push('โล่ของ '+target.name+' ป้องกันการโจมตี');return 0;}if(target.stars>0){target.stars--;return 1;}return 0;}
function finish(r){r.started=false;for(const p of r.players)send(p.ws,{type:'ended',players:pubPlayers(r),logLines:r.logLines});}
function checkWin(r){if(r.players.some(p=>p.stars>=WIN_SCORE)){finish(r);return true;}return false;}
function advance(r){if(checkWin(r))return;r.turn=(r.turn+1)%r.players.length;deal(r,r.players[r.turn].id);state(r);}
function applyCard(r,p,slot){
 const h=r.hands[p.id]||[];if(!Number.isInteger(slot)||slot<0||slot>=h.length)return;
 const idx=h[slot], notes=[];
 // A skipped player may only use Negate! to cancel the pending skip; any other card is discarded and the turn is lost.
 if(p.skip){
   if(idx===9){p.skip=false;p.stars++;notes.push(p.name+' ใช้ Negate! ยกเลิกการข้ามเทิร์น และได้รับ 1 แต้ม');}
   else {p.skip=false;notes.push(p.name+' ถูกข้ามเทิร์น การ์ดที่เลือกถูกทิ้ง');}
   r.logLines.unshift(notes.join(' '));r.logLines=r.logLines.slice(0,30);advance(r);return;
 }
 const leaders=topPlayers(r,p);
 switch(idx){
  case 0:p.stars+=2;break;
  case 1:{const target=r.players[rand(r.players.length)];const delta=rand(2)===0?-2:2;if(delta>0)target.stars+=2;else target.stars=Math.max(0,target.stars-2);notes.push('สุ่มโดน '+target.name+' ผล '+(delta>0?'+2':'-2')+' แต้ม');break;}
  case 2:p.stars++;if(leaders.length)steal(r,p,leaders[rand(leaders.length)],1,notes);break;
  case 3:if(leaders.length)steal(r,p,leaders[rand(leaders.length)],1,notes);break;
  case 4:p.stars++;p.shield=true;break;
  case 5:{const n=rand(4);p.stars+=n;notes.push('สุ่มได้รับ '+n+' แต้ม');break;}
  case 6:{const targets=r.players.filter(x=>x.id!==p.id);if(targets.length){const target=targets[rand(targets.length)];const n=steal(r,p,target,1,notes,{pierce:true});if(n===1)notes.push('แย่งได้ 1 แต้มจาก '+target.name);else if(n===0)notes.push('ไม่มีแต้มให้แย่งจาก '+target.name);}break;}
  case 7:{if(leaders.length)steal(r,p,leaders[rand(leaders.length)],1,notes);break;}
  case 8:{const n=2+rand(2);p.stars+=n;r.players.filter(x=>x.id!==p.id).forEach(x=>x.stars++);notes.push('คุณได้ '+n+' แต้ม ผู้เล่นอื่นทุกคนได้คนละ 1 แต้ม');break;}
  case 9:p.stars++;p.skip=false;break;
  case 10:r.players.filter(x=>x.id!==p.id).forEach(x=>{if(removePoint(x,notes))notes.push(x.name+' เสีย 1 แต้ม');});break;
  case 11:{p.stars+=2;const min=Math.min(...r.players.map(x=>x.stars));if(p.stars-2===min)p.stars++;break;}
  case 12:{const targets=r.players.filter(x=>x.id!==p.id&&x.stars>p.stars);targets.forEach(x=>removePoint(x,notes));p.stars++;break;}
  case 13:{const targets=r.players.filter(x=>x.id!==p.id);if(targets.length){const target=targets[rand(targets.length)];removePoint(target,notes);notes.push('สุ่มโจมตี '+target.name);}p.shield=true;break;}
  case 14:p.stars+=3;p.skip=true;break;
 }
 notes.unshift(p.name+' ใช้ '+cards[idx][1]);r.logLines.unshift(notes.join(' '));r.logLines=r.logLines.slice(0,30);
 if(checkWin(r))return;
 advance(r);
}
function removePlayer(r,p){const oldIndex=r.players.indexOf(p);r.players=r.players.filter(x=>x!==p);delete r.hands[p.id];if(!r.players.length){rooms.delete(r.code);return;}
 if(r.hostId===p.id){for(const x of r.players)send(x.ws,{type:'room-closed',message:'เจ้าของห้องออกจากเกม ห้องถูกปิด'});rooms.delete(r.code);return;}
 if(r.turn>oldIndex)r.turn--;if(r.turn>=r.players.length)r.turn=0;
 if(r.started){if(r.players.length<2)finish(r);else state(r);}else lobby(r);
}
wss.on('connection',ws=>{
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw.toString());}catch{return;}
  if(m.action==='create'){
   if(ws.roomCode)return;let c;do{c=code();}while(rooms.has(c));
   const p={id:crypto.randomUUID(),name:String(m.name||'ผู้เล่น').slice(0,14),stars:0,shield:false,skip:false,ws};
   const r={code:c,hostId:p.id,players:[p],hands:{},turn:0,started:false,logLines:[]};rooms.set(c,r);ws.roomCode=c;ws.playerId=p.id;
   send(ws,{type:'created',room:c,playerId:p.id,isHost:true,players:pubPlayers(r),message:'สร้างห้องสำเร็จ ส่งรหัสให้เพื่อนได้เลย'});return;
  }
  if(m.action==='join'){
   const r=rooms.get(String(m.room||'').toUpperCase());if(!r)return send(ws,{type:'error',message:'ไม่พบห้องนี้ หรือเจ้าของห้องออกจากเกมแล้ว'});
   if(r.started)return send(ws,{type:'error',message:'เกมเริ่มไปแล้ว ไม่สามารถเข้าร่วมระหว่างเกมได้'});
   if(r.players.length>=MAX_PLAYERS)return send(ws,{type:'error',message:'ห้องเต็มแล้ว (สูงสุด 6 คน)'});
   const p={id:crypto.randomUUID(),name:String(m.name||'ผู้เล่น').slice(0,14),stars:0,shield:false,skip:false,ws};r.players.push(p);ws.roomCode=r.code;ws.playerId=p.id;
   send(ws,{type:'joined',room:r.code,playerId:p.id,isHost:false,players:pubPlayers(r),message:'เข้าห้องสำเร็จ'});lobby(r);return;
  }
  const r=rooms.get(ws.roomCode);if(!r)return;const p=r.players.find(x=>x.id===ws.playerId);if(!p)return;
  if(m.action==='start'&&p.id===r.hostId&&!r.started&&r.players.length>=2){r.started=true;r.turn=0;r.logLines=['เริ่มการผจญภัย!'];for(const x of r.players){x.stars=0;x.shield=false;x.skip=false;deal(r,x.id);}state(r);return;}
  if(m.action==='play'&&r.started&&r.players[r.turn]?.id===p.id){applyCard(r,p,m.slot);return;}
  if(m.action==='leave')removePlayer(r,p);
 });
 ws.on('close',()=>{const r=rooms.get(ws.roomCode);if(r){const p=r.players.find(x=>x.id===ws.playerId);if(p)removePlayer(r,p);}});
});
server.listen(PORT,()=>console.log(`TREASURE DASH listening on ${PORT}`));
