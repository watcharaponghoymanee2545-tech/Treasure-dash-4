# Fantasy Realms — Prototype V1.0

เว็บเกมการ์ดแฟนตาซี 2v2 แบบ Turn-Based

## ข้อกำหนด
- Node.js 20+ (แนะนำ Node 22)
- npm

## เริ่มใช้งานในเครื่อง
1. ติดตั้ง dependencies: `npm install`
2. เปิดโหมดพัฒนา: `npm run dev`
3. เปิดเว็บที่ Vite แสดงใน terminal (ปกติคือ http://localhost:5173)

## Deploy บน Render
1. Push โปรเจกต์นี้ขึ้น GitHub
2. ใน Render เลือก New > Web Service
3. เชื่อม GitHub repository
4. Render จะอ่าน `render.yaml` หรือกำหนดค่า:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/health`
5. Deploy

## ขอบเขตของ Starter
นี่คือโครงเริ่มต้นสำหรับพัฒนา ไม่ใช่เกมออนไลน์ที่สมบูรณ์:
- หน้าเมนู, เลือกฮีโร่, Lobby และหน้าสนามรบเบื้องต้น
- เซิร์ฟเวอร์ Socket.IO มีการสร้าง/เข้าห้องและเปลี่ยนเทิร์น
- การประมวลผลการ์ดบางส่วนในหน้า Demo ยังเป็นการจำลองฝั่งหน้าจอ
- ต้องพัฒนาการตรวจสอบการ์ด, เป้าหมาย, HP, สถานะ, การชนะ, การซิงก์มือการ์ดแบบส่วนตัว และการกลับเข้าห้องบนเซิร์ฟเวอร์ก่อนเปิดให้แข่งขันจริง

## หมายเหตุ
อย่าใส่รหัสผ่านหรือ secret key ลงใน GitHub หากเพิ่มบริการภายนอก ให้ใช้ Environment Variables บน Render
