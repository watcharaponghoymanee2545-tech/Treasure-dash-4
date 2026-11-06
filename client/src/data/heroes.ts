export type Hero = {
  id: string; name: string; role: string; hp: number; atk: number; def: number;
  passive: string; active: string; activeCost: number; accent: string; symbol: string;
};

export const heroes: Hero[] = [
  { id:"paladin", name:"Paladin", role:"Tank", hp:36, atk:4, def:4, passive:"ลดความเสียหายจากการโจมตีครั้งแรกในแต่ละรอบ 1", active:"รับความเสียหายแทนเพื่อนครั้งถัดไป 5", activeCost:2, accent:"#d7ae58", symbol:"✦" },
  { id:"pyromancer", name:"Pyromancer", role:"Mage", hp:26, atk:7, def:1, passive:"การ์ดโจมตีไฟสร้างความเสียหายเพิ่ม 1", active:"สร้างความเสียหายไฟ 4", activeCost:2, accent:"#e56b48", symbol:"火" },
  { id:"shadowblade", name:"Shadowblade", role:"Assassin", hp:27, atk:8, def:1, passive:"โจมตีเป้าหมาย HP ต่ำกว่า 50% เพิ่มความเสียหาย 1", active:"สร้างความเสียหาย 3 และได้รับโล่ 2", activeCost:2, accent:"#a78bd4", symbol:"☾" },
  { id:"windranger", name:"Windranger", role:"Ranger", hp:29, atk:6, def:2, passive:"เมื่อเล่นการ์ดโจมตีใบแรกในเทิร์น มีโอกาสจั่วเพิ่มตามเอฟเฟกต์", active:"สร้างความเสียหาย 3 และลด ATK เป้าหมาย 1 ในเทิร์นถัดไป", activeCost:2, accent:"#76b78c", symbol:"➶" },
  { id:"oracle", name:"Oracle", role:"Support", hp:30, atk:3, def:3, passive:"การ์ดรักษาฟื้นฟูเพิ่ม 1", active:"รักษาเพื่อนร่วมทีม 5 HP", activeCost:2, accent:"#7bb8d8", symbol:"✧" },
  { id:"frostcaller", name:"Frostcaller", role:"Control", hp:28, atk:5, def:2, passive:"เอฟเฟกต์แช่แข็งมีประสิทธิภาพตามข้อความการ์ด", active:"สร้างความเสียหาย 2 และลดมานาศัตรู 1 ในเทิร์นถัดไป", activeCost:2, accent:"#72c6d1", symbol:"❄" }
];
