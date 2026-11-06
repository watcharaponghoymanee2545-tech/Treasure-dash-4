import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Seat = { id:string; name:string; team:0|1; heroId:string; connected:boolean; hp:number; shield:number; mana:number; };
type GameMode = "1v1" | "2v2";
type Room = { code:string; mode:GameMode; hostId:string; players:Seat[]; currentTurn:number; started:boolean; createdAt:number; };
const app=express();
app.use(cors({origin:true}));
app.use(express.json());
const httpServer=createServer(app);
const io=new Server(httpServer,{cors:{origin:true,methods:["GET","POST"]}});
const rooms=new Map<string,Room>();
const matchmakingQueues: Record<GameMode, Array<{socketId:string;name:string;heroId:string}>> = {"1v1": [], "2v2": []};

app.get("/health",(_req,res)=>res.json({ok:true,service:"fantasy-realms"}));
app.get("/api/status",(_req,res)=>res.json({rooms:rooms.size,online:true}));

function code(){return randomBytes(3).toString("hex").toUpperCase();}
function publicRoom(room:Room){return {code:room.code,mode:room.mode,started:room.started,currentTurn:room.currentTurn,players:room.players.map(p=>({...p}))};}
function emitRoom(room:Room){io.to(room.code).emit("room:update",publicRoom(room));}
function emitGame(room:Room){io.to(room.code).emit("game:update",publicRoom(room));}

io.on("connection",(socket)=>{
  socket.on("room:create",(data:{name?:string;heroId?:string;mode?:GameMode},ack?:(r:any)=>void)=>{
    const mode:GameMode=data.mode==="1v1"?"1v1":"2v2";
    let roomCode=code(); while(rooms.has(roomCode)) roomCode=code();
    const player:Seat={id:socket.id,name:(data.name||"Player").slice(0,18),team:0,heroId:data.heroId||"paladin",connected:true,hp:30,shield:0,mana:3};
    const room:Room={code:roomCode,mode,hostId:socket.id,players:[player],currentTurn:0,started:false,createdAt:Date.now()};
    rooms.set(roomCode,room); socket.join(roomCode); ack?.({ok:true,code:roomCode}); emitRoom(room);
  });
  socket.on("room:join",(data:{code:string;name?:string;heroId?:string;mode?:GameMode},ack?:(r:any)=>void)=>{
    const room=rooms.get((data.code||"").toUpperCase());
    if(!room){ack?.({ok:false,error:"ไม่พบห้องนี้"});return;}
    if(data.mode && data.mode!==room.mode){ack?.({ok:false,error:`ห้องนี้เป็นโหมด ${room.mode}`});return;}
    if(room.started){ack?.({ok:false,error:"เกมเริ่มแล้ว"});return;}
    const capacity=room.mode==="1v1"?2:4;
    if(room.players.length>=capacity){ack?.({ok:false,error:"ห้องเต็มแล้ว"});return;}
    const seatIndex=room.players.length;
    const team=(room.mode==="1v1"?seatIndex:seatIndex%2) as 0|1;
    const player:Seat={id:socket.id,name:(data.name||"Player").slice(0,18),team,heroId:data.heroId||"paladin",connected:true,hp:30,shield:0,mana:3};
    room.players.push(player); socket.join(room.code); ack?.({ok:true}); emitRoom(room);
  });
  socket.on("matchmaking:join",(data:{name?:string;heroId?:string;mode?:GameMode},ack?:(r:any)=>void)=>{
    const mode:GameMode=data.mode==="1v1"?"1v1":"2v2";
    const queue=matchmakingQueues[mode];
    if(queue.some(q=>q.socketId===socket.id)){ack?.({ok:true});return;}
    queue.push({socketId:socket.id,name:(data.name||"Player").slice(0,18),heroId:data.heroId||"paladin"});
    socket.emit("matchmaking:status",`เข้าคิว ${mode} แล้ว (${queue.length}/${mode==="1v1"?2:4})`);
    ack?.({ok:true});
    const needed=mode==="1v1"?2:4;
    if(queue.length>=needed){
      const group=queue.splice(0,needed);
      let roomCode=code(); while(rooms.has(roomCode)) roomCode=code();
      const players:Seat[]=group.map((q,i)=>({id:q.socketId,name:q.name,team:(mode==="1v1"?i:i%2) as 0|1,heroId:q.heroId,connected:true,hp:30,shield:0,mana:3}));
      const room:Room={code:roomCode,mode,hostId:players[0].id,players,currentTurn:0,started:false,createdAt:Date.now()};
      rooms.set(roomCode,room);
      for(const q of group){const peer=io.sockets.sockets.get(q.socketId);if(peer){peer.join(roomCode);peer.emit("matchmaking:status","พบคู่แข่งแล้ว! ห้องกำลังเตรียมพร้อม");}}
      emitRoom(room);
      io.to(roomCode).emit("game:log",`จับคู่สำเร็จ โหมด ${mode}`);
    }
  });
  socket.on("room:ready-start",(ack?:(r:any)=>void)=>{
    const room=[...rooms.values()].find(r=>r.players.some(p=>p.id===socket.id));
    if(!room){ack?.({ok:false,error:"ไม่พบห้อง"});return;}
    if(room.hostId!==socket.id){ack?.({ok:false,error:"เฉพาะหัวหน้าห้องเท่านั้นที่เริ่มเกมได้"});return;}
    const required=room.mode==="1v1"?2:4;
    if(room.players.length!==required){ack?.({ok:false,error:`ต้องมีผู้เล่นครบ ${required} คน`});return;}
    room.started=true; room.currentTurn=0;
    room.players.forEach((p)=>{p.hp=30;p.mana=3;p.shield=0;});
    ack?.({ok:true}); emitGame(room); io.to(room.code).emit("game:log","เกมเริ่มแล้ว!");
  });
  socket.on("game:end-turn",()=>{
    const room=[...rooms.values()].find(r=>r.started&&r.players.some(p=>p.id===socket.id));
    if(!room)return;
    const active=room.players[room.currentTurn%4];
    if(active.id!==socket.id)return;
    room.currentTurn=(room.currentTurn+1)%4;
    const next=room.players[room.currentTurn];
    next.mana=Math.min(10,next.mana+2);
    emitGame(room);
    io.to(room.code).emit("game:log",`ถึงเทิร์นของ ${next.name}`);
  });
  socket.on("disconnect",()=>{
    for(const mode of ["1v1","2v2"] as GameMode[]){
      matchmakingQueues[mode]=matchmakingQueues[mode].filter(q=>q.socketId!==socket.id);
    }
    for(const room of rooms.values()){
      const player=room.players.find(p=>p.id===socket.id);
      if(player){player.connected=false;emitRoom(room);if(room.started)emitGame(room);}
    }
  });
});
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const clientDist=path.resolve(__dirname,"../dist");
app.use(express.static(clientDist));
app.get("*",(req,res,next)=>{if(req.path.startsWith("/api")||req.path==="/health")return next();res.sendFile(path.join(clientDist,"index.html"),err=>{if(err)next();});});
const port=Number(process.env.PORT||3000);
httpServer.listen(port,"0.0.0.0",()=>console.log(`Fantasy Realms listening on ${port}`));
