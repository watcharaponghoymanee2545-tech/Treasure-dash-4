export type CardKind = "Attack" | "Defense" | "Equipment" | "Support" | "Trap";
export type Card = { id:string; name:string; kind:CardKind; cost:number; text:string; effect:"damage"|"shield"|"heal"|"draw"|"mana"|"equip"|"trap"|"pierce"|"burn"|"weakness"|"counter"|"teamShield"; value:number; rarity:"Common"|"Rare"|"Epic" };

export const cardPool: Card[] = [
  {id:"fireball",name:"Fireball",kind:"Attack",cost:2,text:"สร้างความเสียหาย 4",effect:"damage",value:4,rarity:"Common"},
  {id:"thunder",name:"Thunder Strike",kind:"Attack",cost:3,text:"สร้างความเสียหาย 6",effect:"damage",value:6,rarity:"Rare"},
  {id:"flame-slash",name:"Flame Slash",kind:"Attack",cost:2,text:"สร้างความเสียหาย 3 และเผา 1",effect:"burn",value:3,rarity:"Common"},
  {id:"shadow-cut",name:"Shadow Cut",kind:"Attack",cost:2,text:"สร้างความเสียหาย 3; เป้าหมาย HP ต่ำกว่า 50% เพิ่มอีก 2",effect:"damage",value:3,rarity:"Rare"},
  {id:"ice-spear",name:"Ice Spear",kind:"Attack",cost:2,text:"สร้างความเสียหาย 3 และลด ATK 1 ในเทิร์นถัดไป",effect:"weakness",value:3,rarity:"Common"},
  {id:"piercing-arrow",name:"Piercing Arrow",kind:"Attack",cost:3,text:"สร้างความเสียหาย 5 ทะลุ DEF",effect:"pierce",value:5,rarity:"Rare"},
  {id:"arcane-burst",name:"Arcane Burst",kind:"Attack",cost:4,text:"สร้างความเสียหาย 7",effect:"damage",value:7,rarity:"Epic"},
  {id:"magic-shield",name:"Magic Shield",kind:"Defense",cost:1,text:"ได้รับโล่ 4",effect:"shield",value:4,rarity:"Common"},
  {id:"holy-barrier",name:"Holy Barrier",kind:"Defense",cost:3,text:"ได้รับโล่ 7",effect:"shield",value:7,rarity:"Rare"},
  {id:"counter-spell",name:"Counter Spell",kind:"Defense",cost:2,text:"ต้นแบบ: ยกเลิกเวทมนตร์ที่เลือกได้เมื่อระบบตอบโต้พร้อมใช้งาน",effect:"counter",value:0,rarity:"Epic"},
  {id:"last-stand",name:"Last Stand",kind:"Defense",cost:3,text:"ได้รับโล่ 5",effect:"shield",value:5,rarity:"Rare"},
  {id:"flame-sword",name:"Flame Sword",kind:"Equipment",cost:3,text:"ติดตั้ง: ATK +2",effect:"equip",value:2,rarity:"Rare"},
  {id:"guardian-armor",name:"Guardian Armor",kind:"Equipment",cost:3,text:"ติดตั้ง: DEF +2",effect:"equip",value:2,rarity:"Rare"},
  {id:"mana-amulet",name:"Mana Amulet",kind:"Equipment",cost:2,text:"ติดตั้ง: เริ่มเทิร์นได้รับโล่ 1",effect:"equip",value:1,rarity:"Common"},
  {id:"healing-light",name:"Healing Light",kind:"Support",cost:2,text:"ฟื้นฟู HP 5",effect:"heal",value:5,rarity:"Common"},
  {id:"mana-gift",name:"Mana Gift",kind:"Support",cost:1,text:"ได้รับมานา 2 ทันที",effect:"mana",value:2,rarity:"Common"},
  {id:"tactical-draw",name:"Tactical Draw",kind:"Support",cost:2,text:"จั่ว 2 ใบ",effect:"draw",value:2,rarity:"Rare"},
  {id:"team-blessing",name:"Team Blessing",kind:"Support",cost:3,text:"คุณและเพื่อนได้รับโล่คนละ 3",effect:"teamShield",value:3,rarity:"Epic"},
  {id:"rune-trap",name:"Rune Trap",kind:"Trap",cost:2,text:"กับดัก: เมื่อศัตรูใช้การ์ดโจมตีครั้งถัดไป สร้างความเสียหายกลับ 3",effect:"trap",value:3,rarity:"Rare"},
  {id:"frost-trap",name:"Frost Trap",kind:"Trap",cost:2,text:"กับดัก: เมื่อศัตรูใช้ Active Skill ครั้งถัดไป เพิ่มค่ามานาสกิล 2",effect:"trap",value:2,rarity:"Rare"}
];

export function starterDeck(): Card[] {
  const counts: Record<string, number> = {};
  const result: Card[] = [];
  for (const card of cardPool) {
    const count = Math.min(card.kind === "Attack" ? 1 : 1, 1);
    for (let i=0;i<count;i++) result.push(card);
  }
  return result.slice(0,20);
}
