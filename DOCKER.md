# Docker Installation Guide

คู่มือนี้ติดตั้ง OPT Shipping Work Plan พร้อม PostgreSQL ด้วย Docker Compose เหมาะสำหรับ development, demo และ UAT ภายในองค์กร สถานะปัจจุบันยังไม่ใช่ production-certified deployment

## Requirements

- Docker Engine/Desktop รุ่นที่รองรับ Compose v2
- RAM ว่างอย่างน้อย 2 GB
- พอร์ต 3000 สำหรับเว็บและ 5433 สำหรับ PostgreSQL หรือกำหนด `APP_PORT` ใหม่

## First installation

1. Clone repository และเข้าโฟลเดอร์โครงการ

   ```bash
   git clone https://github.com/chatchailim/shipping-workplan.git
   cd shipping-workplan
   ```

2. สร้าง environment file

   Linux/macOS:

   ```bash
   cp .env.example .env
   ```

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. แก้ `.env` ก่อนเริ่มระบบ

   - เปลี่ยน `AUTH_SECRET` เป็นค่าสุ่มอย่างน้อย 32 ตัวอักษร
   - กำหนด `SEED_ADMIN_EMAIL`
   - กำหนด `SEED_ADMIN_PASSWORD` ที่แข็งแรงและใช้เฉพาะ environment นี้
   - `DATABASE_URL` ในไฟล์ใช้สำหรับคำสั่งที่รันจาก host; container จะใช้ connection ภายใน Compose

   ตัวอย่างสร้าง secret:

   ```bash
   openssl rand -base64 48
   ```

4. Build และเริ่มระบบ

   ```bash
   docker compose up -d --build
   ```

   Container `app` จะรอ PostgreSQL, รัน `prisma migrate deploy`, seed master data/admin แบบ idempotent แล้วจึงเริ่ม Next.js

5. ตรวจสถานะ

   ```bash
   docker compose ps
   docker compose logs app --tail 100
   ```

   เปิดเว็บที่ <http://localhost:3000> และ health endpoint ที่ <http://localhost:3000/api/health>

6. หากต้องการชุดข้อมูลสังเคราะห์สำหรับทดสอบเหมือนจริง ให้ทำตาม [INITIAL_DATA_GUIDE.md](./INITIAL_DATA_GUIDE.md)

## Daily commands

```bash
docker compose up -d
docker compose logs -f app
docker compose restart app
docker compose down
```

`docker compose down` หยุดและลบ container/network แต่เก็บข้อมูลใน named volume ไว้ ห้ามใช้ `docker compose down -v` หากต้องการรักษาฐานข้อมูล

## Update application

```bash
git pull --ff-only
docker compose up -d --build
docker compose ps
```

Migration จะทำงานก่อน web server ทุกครั้งและจะ apply เฉพาะ migration ที่ยังไม่เคยใช้

## Change web port

เพิ่มใน `.env`:

```dotenv
APP_PORT=8080
```

แล้วเปิด <http://localhost:8080>

## Backup and restore

สร้าง backup โดยไม่พิมพ์รหัสผ่านลง command history:

```bash
docker compose exec -T postgres pg_dump -U shipping -d shipping_workplan -Fc > shipping_workplan.dump
```

ทดสอบ restore ใน environment แยกเสมอ การ restore ทับฐานข้อมูลเดิมเป็น destructive operationและไม่ได้ทำอัตโนมัติในคู่มือนี้

## Troubleshooting

| อาการ | วิธีตรวจ |
|---|---|
| `AUTH_SECRET` required | สร้าง `.env` และกำหนด secret อย่างน้อย 32 ตัวอักษร |
| App restart loop | `docker compose logs app --tail 200` และตรวจ migration/database |
| Port already allocated | กำหนด `APP_PORT` หรือหยุด service ที่ใช้พอร์ตนั้น |
| Database unhealthy | `docker compose logs postgres --tail 100` |
| Login ไม่ได้ | ตรวจว่า seed ไม่ถูกข้ามเพราะใช้รหัสผ่าน placeholder |
| Prisma types/build ผิด | `docker compose build --no-cache app` |

## Production hardening required

ก่อน production ต้องเปลี่ยน development database password, ใช้ external secret manager, TLS/reverse proxy, private database network, image registry/digest pinning, backup/restore drill, monitoring/alerts, resource limits, vulnerability scanning และ formal security/UAT sign-off ตาม [TestEvidence.md](./TestEvidence.md)
