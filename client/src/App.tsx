import { useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { heroes } from "./data/heroes";
import { cardPool, Card } from "./data/cards";

type Player = { id:string; name:string; team:0|1; heroId:string|null; hp:number; shield:number; mana:number; deck?:Card[]; hand?:Card[]; };
type GameMode = "1v1" | "2v2";
const API = import.meta.env.VITE_SERVER_URL || window.location.origin;

export default function App() {
  const [screen,setScreen] = useState<"home"|"lobby"|"hero"|"battle">("home");
  const [name,setName] = useState("Player");
  const [roomCode,setRoomCode] = useState("");
  const [mode,setMode] = useState<GameMode>("2v2");
  const [room,setRoom] = useState("");
  const [status,setStatus] = useState("พร้อมเริ่มการผจญภัย");
  const [heroId,setHeroId] = useState("paladin");
  const [socket,setSocket] = useState<Socket|null>(null);
  const [players,setPlayers] = useState<Player[]>([]);
  const [currentTurn,setCurrentTurn] = useState(0);
  const [selected,setSelected] = useState<string|null>(null);
  const [demo,setDemo] = useState(false);
  const [mana,setMana] = useState(3);
  const [hp,setHp] = useState(30);
  const [shield,setShield] = useState(0);
  const [hand,setHand] = useState<Card[]>(cardPool.slice(0,5));
  const [log,setLog] = useState<string[]>(["ยินดีต้อนรับสู่ Fantasy Realms"]);
  const [deckCount,setDeckCount] = useState(15);

  const chosenHero = useMemo(()=>heroes.find(h=>h.id===heroId)!,[heroId]);

  function connect() {
    const s = io(API,{ transports:["websocket","polling"] });
    s.on("connect",()=>setStatus("เชื่อมต่อเซิร์ฟเวอร์แล้ว"));
    s.on("connect_error",()=>setStatus("เชื่อมต่อไม่ได้ กรุณาตรวจสอบเซิร์ฟเวอร์"));
    s.on("room:update",(data:{code:string;mode:GameMode;players:Player[]})=>{setRoom(data.code);setMode(data.mode);setPlayers(data.players);setScreen("lobby");});
    s.on("matchmaking:status",(message:string)=>setStatus(message));
    s.on("game:update",(data:{currentTurn:number;mode:GameMode;players:Player[]})=>{setMode(data.mode);setCurrentTurn(data.currentTurn);setPlayers(data.players);setScreen("battle");});
    s.on("game:log",(message:string)=>setLog(old=>[message,...old].slice(0,8)));
    setSocket(s);
    return s;
  }
  function createRoom() {
    const s=connect();
    s.emit("room:create",{name,heroId,mode},(r:{ok:boolean;code?:string;error?:string})=>{if(!r.ok)setStatus(r.error||"สร้างห้องไม่สำเร็จ");else setRoom(r.code||"");});
  }
  function joinRoom() {
    const s=connect();
    s.emit("room:join",{code:roomCode.trim().toUpperCase(),name,heroId,mode},(r:{ok:boolean;error?:string})=>{if(!r.ok)setStatus(r.error||"เข้าห้องไม่สำเร็จ");});
  }
  function quickMatch() {
    const s=connect();
    setStatus(`กำลังค้นหาผู้เล่นโหมด ${mode}...`);
    s.emit("matchmaking:join",{name,heroId,mode},(r:{ok:boolean;error?:string})=>{
      if(!r.ok)setStatus(r.error||"เข้าคิวจับคู่ไม่สำเร็จ");
      else setStatus("เข้าคิวแล้ว กำลังรอผู้เล่นคนอื่น...");
    });
  }
  function startDemo() {
    setDemo(true); setScreen("battle"); setMana(3); setHp(chosenHero.hp); setShield(0);
    setLog(["เริ่มโหมดทดลอง — ที่นั่งอื่นเป็นคู่ต่อสู้จำลอง","เลือกการ์ดเพื่อทดสอบระบบ"]);
  }
  function playCard(card:Card) {
    if(mana<card.cost){setStatus("มานาไม่เพียงพอ");return;}
    if(card.kind==="Attack" && !selected){setStatus("เลือกฮีโร่ฝ่ายตรงข้ามก่อน");return;}
    setMana(m=>m-card.cost);
    setHand(h=>h.filter(c=>c.id!==card.id));
    setLog(old=>[`${name} ใช้ ${card.name}`, ...old].slice(0,8));
    if(card.effect==="shield")setShield(s=>s+card.value);
    if(card.effect==="heal")setHp(h=>Math.min(chosenHero.hp,h+card.value));
    if(card.effect==="mana")setMana(m=>Math.min(10,m+card.value));
    if(card.effect==="draw"){setHand(h=>[...h,...cardPool.slice(0,card.value)] .slice(0,8));}
    if(card.effect==="teamShield")setShield(s=>s+card.value);
    if(card.effect==="counter")setStatus("Counter Spell: ระบบตอบโต้จะเปิดใช้ในรุ่นถัดไป");
    if(card.effect==="equip")setStatus(`${card.name} ติดตั้งในโหมดต้นแบบ`);
    if(card.effect==="trap")setStatus(`${card.name} ถูกวางไว้ (เอฟเฟกต์กับดักกำลังพัฒนา)`);
    if(card.effect==="damage"||card.effect==="burn"||card.effect==="pierce"||card.effect==="weakness")setStatus(`${card.name}: เลือกเป้าหมาย ${selected||"ฝ่ายตรงข้าม"}`);
    if(socket&&!demo)socket.emit("game:play-card",{cardId:card.id,targetId:selected});
    setSelected(null);
  }
  function endTurn() {
    if(demo){setMana( Math.min(10,mana+2));setHand(h=>[...h,...cardPool.slice(deckCount%cardPool.length,deckCount%cardPool.length+1)].slice(0,8));setDeckCount(d=>Math.max(0,d-1));setLog(old=>["จบเทิร์น — เทิร์นถัดไปเริ่มแล้ว",...old].slice(0,8));}
    else socket?.emit("game:end-turn");
  }

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">✦</div><div><div className="brand">FANTASY REALMS</div><div className="tagline">HEROES · MAGIC · ALLIANCE</div></div><span className="online-pill">● PROTOTYPE</span></header>
    {screen==="home"&&<section className="hero-screen">
      <div className="hero-copy"><p className="eyebrow">1V1 DUEL · 2V2 TEAM BATTLE</p><h1>ตำนานของคุณ<br/><em>เริ่มต้นที่นี่</em></h1><p className="intro">เลือกโหมด รวมทีมกับสหาย หรือท้าดวลตัวต่อตัวในโลกแฟนตาซี</p>
      <label>ชื่อนักผจญภัย<input value={name} onChange={e=>setName(e.target.value)} maxLength={18}/></label>
      <div className="mode-picker"><button className={mode==="1v1"?"mode-option active":"mode-option"} onClick={()=>setMode("1v1")}><strong>1v1</strong><span>DUEL</span><small>ผู้เล่น 2 คน</small></button><button className={mode==="2v2"?"mode-option active":"mode-option"} onClick={()=>setMode("2v2")}><strong>2v2</strong><span>TEAM BATTLE</span><small>ผู้เล่น 4 คน</small></button></div>
      <div className="actions"><button className="primary" onClick={()=>setScreen("hero")}>เลือกฮีโร่ <span>→</span></button><button className="secondary" onClick={()=>setScreen("lobby")}>สร้าง / เข้าห้อง</button></div>
      <button className="text-button" onClick={quickMatch}>จับคู่อัตโนมัติ · {mode}</button><br/><button className="text-button" onClick={startDemo}>ทดลองสนามรบ (Demo)</button>
      </div><div className="hero-art"><div className="magic-ring">✧</div><div className="hero-sigil">⚔</div><div className="art-caption">THE REALMS AWAIT</div></div>
    </section>}
    {screen==="hero"&&<section className="page"><div className="page-heading"><p className="eyebrow">CHOOSE YOUR DESTINY</p><h2>เลือกฮีโร่</h2><p>ฮีโร่แต่ละคนมีจุดเด่นและความสามารถเฉพาะตัว</p></div><div className="hero-grid">{heroes.map(h=><button key={h.id} className={`hero-card ${heroId===h.id?"chosen":""}`} style={{"--accent":h.accent} as React.CSSProperties} onClick={()=>setHeroId(h.id)}><div className="hero-symbol">{h.symbol}</div><span className="role">{h.role}</span><h3>{h.name}</h3><div className="stats"><span>♥ {h.hp} HP</span><span>⚔ {h.atk} ATK</span><span>◈ {h.def} DEF</span></div><p>{h.passive}</p><small>ACTIVE · {h.activeCost} MANA</small><p>{h.active}</p></button>)}</div><div className="actions centered"><button className="primary" onClick={()=>setScreen("lobby")}>เลือกฮีโร่นี้ →</button><button className="secondary" onClick={()=>setScreen("home")}>กลับ</button></div></section>}
    {screen==="lobby"&&<section className="page lobby-page"><div className="page-heading"><p className="eyebrow">GATHER YOUR ALLIES</p><h2>ห้องต่อสู้ · {mode}</h2><p>{status}</p></div><div className="lobby-box"><label>ชื่อผู้เล่น<input value={name} onChange={e=>setName(e.target.value)}/></label><div className="mode-picker compact"><button className={mode==="1v1"?"mode-option active":"mode-option"} onClick={()=>setMode("1v1")}><strong>1v1</strong><span>2 คน</span></button><button className={mode==="2v2"?"mode-option active":"mode-option"} onClick={()=>setMode("2v2")}><strong>2v2</strong><span>4 คน</span></button></div><div className="actions"><button className="primary" onClick={createRoom}>สร้างห้อง {mode}</button><button className="secondary" onClick={quickMatch}>จับคู่อัตโนมัติ</button></div><div className="join-row"><input placeholder="ใส่รหัสห้อง เช่น ABC123" value={roomCode} onChange={e=>setRoomCode(e.target.value)}/><button className="secondary" onClick={joinRoom}>เข้าร่วม</button></div>{room&&<div className="room-code">ROOM CODE <strong>{room}</strong><small>{mode} · {players.length}/{mode==="1v1"?2:4} PLAYERS</small></div>}{players.length>0&&<div className="seat-grid">{players.map((p,i)=><div className="seat" key={p.id||i}>ทีม {p.team===0?"A":"B"} · ผู้เล่น {i+1}<strong>{p.name}</strong></div>)}</div>}<button className="primary" disabled={players.length!==(mode==="1v1"?2:4)} onClick={()=>socket?.emit("room:ready-start",(r:{ok:boolean;error?:string})=>setStatus(r.ok?"กำลังเริ่มเกม":(r.error||"เริ่มเกมไม่ได้")))}>เริ่มเกม ({mode==="1v1"?2:4} คน)</button></div><button className="text-button" onClick={()=>setScreen("home")}>กลับหน้าหลัก</button></section>}
    {screen==="battle"&&<section className="battle-page">
      <div className="battle-top"><div><p className="eyebrow">THE ARENA OF REALMS</p><h2>สนามแห่งตำนาน</h2></div><div className="turn-pill">{demo?"DEMO MATCH":`TURN ${currentTurn+1}`}</div></div>
      <div className="enemy-row">{(mode==="1v1"?[0]:[0,1]).map((n)=><button key={n} className={`combatant enemy ${selected===`enemy-${n}`?"targeted":""}`} onClick={()=>setSelected(`enemy-${n}`)}><span className="avatar">♜</span><div><strong>{n===0?"Shadowblade":"Frostcaller"}</strong><small>ENEMY · TEAM B</small><div className="hpbar"><i style={{width:`${n===0?72:88}%`}}/></div><small>HP {n===0?19:25}/28</small></div></button>)}</div>
      <div className="arena"><div className="arena-rune">✧</div><span>VS</span><p>เลือกเป้าหมายฝ่ายตรงข้าม หรือเล่นการ์ดสนับสนุน</p></div>
      <div className="ally-row"><div className="combatant"><span className="avatar">✦</span><div><strong>{chosenHero.name}</strong><small>YOU · TEAM A</small><div className="hpbar"><i style={{width:`${hp/chosenHero.hp*100}%`}}/></div><small>HP {hp}/{chosenHero.hp} · SHIELD {shield}</small></div></div>{mode==="2v2"&&<div className="combatant"><span className="avatar">✧</span><div><strong>Ally</strong><small>TEAM A · ALLY</small><div className="hpbar"><i style={{width:"85%"}}/></div><small>HP 25/30</small></div></div>}</div>
      <div className="resource-row"><span>◈ MANA <b>{mana}/10</b></span><span>▤ DECK <b>{deckCount}</b></span><span>♧ HAND <b>{hand.length}/8</b></span><button className="end-turn" onClick={endTurn}>จบเทิร์น →</button></div>
      <div className="hand-area"><div className="hand-title">YOUR HAND <small>เลือกการ์ดเพื่อเล่น</small></div><div className="hand">{hand.map((c,i)=><button key={`${c.id}-${i}`} className={`playing-card ${c.kind.toLowerCase()}`} onClick={()=>playCard(c)}><span className="card-cost">{c.cost}</span><span className="card-kind">{c.kind}</span><strong>{c.name}</strong><span className="card-art">{c.kind==="Attack"?"✹":c.kind==="Defense"?"◈":c.kind==="Equipment"?"⚔":c.kind==="Support"?"✧":"⌘"}</span><small>{c.text}</small></button>)}</div></div>
      <div className="battle-log"><strong>COMBAT LOG</strong>{log.map((l,i)=><p key={i}>{l}</p>)}</div>
      <button className="text-button" onClick={()=>setScreen("home")}>ออกจากสนาม</button>
    </section>}
    <footer>FANTASY REALMS · PROTOTYPE V1.0 <span>Craft your legend.</span></footer>
  </main>;
}
