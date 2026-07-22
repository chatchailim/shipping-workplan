# คู่มือเจ้าหน้าที่ทดสอบระบบ (UAT Tester Guide)

| รายการ | ค่า |
|---|---|
| ระบบ | OPT Shipping Work Plan v2 |
| ขอบเขต | Docker/UAT ด้วยข้อมูลสังเคราะห์ |
| URL เริ่มต้น | `http://localhost:3000/login` |
| สาขาทดสอบ | `UAT — Synthetic UAT Branch` |
| เอกสารอ้างอิง | `README.md`, `TestSpec.md`, `INITIAL_DATA_GUIDE.md`, `DOCKER.md` |

> ห้ามบันทึกรหัสผ่านจริงใน Git หรือเอกสารสาธารณะ รหัสผ่านของบัญชีด้านล่างคือค่าที่ผู้ดูแลกำหนดผ่าน `UAT_USER_PASSWORD` ตอนรัน seed และต้องส่งให้ Tester ผ่านช่องทางส่วนตัว

## 1. บัญชี บทบาท และหน้าที่

| User | Password | บทบาท | หน้าที่และขอบเขตทดสอบหลัก |
|---|---|---|---|
| `branch-admin@uat.example.invalid` | `<UAT_USER_PASSWORD>` | Branch Admin | ดูแลข้อมูลและงานทุกกระบวนการภายในสาขา UAT; ใช้ตรวจ flow ข้ามโมดูลและสิทธิ์ระดับสาขา |
| `cs@uat.example.invalid` | `<UAT_USER_PASSWORD>` | CS | Customer, Product, PO และ Order; ตรวจ Draft, Confirm, FIFO allocation และ Cancel |
| `purchasing@uat.example.invalid` | `<UAT_USER_PASSWORD>` | Purchasing | ตรวจและสร้าง PO/PO Item รวมถึงยอด Contracted, Released และ Balance |
| `logistics@uat.example.invalid` | `<UAT_USER_PASSWORD>` | Logistics | Fleet, Schedule, Delivery Run, Stop, Dispatch, POD/Delivery Failed |
| `warehouse@uat.example.invalid` | `<UAT_USER_PASSWORD>` | Warehouse | Stock Movement, Loading, Inventory, Return receiving และ resolution |
| `driver@uat.example.invalid` | `<UAT_USER_PASSWORD>` | Driver | ตรวจเที่ยวรถที่ได้รับมอบหมาย บันทึก POD หรือ Delivery Failed |

บัญชี `SUPER_ADMIN` ไม่ได้สร้างโดย UAT seed และต้องกำหนดแยกผ่าน `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` เฉพาะผู้ดูแลระบบ ส่วนบทบาท `PRODUCTION` มีในโมเดลสิทธิ์แต่ยังไม่มีบัญชีหรือ workflow เฉพาะในชุด UAT ปัจจุบัน

### ตารางสิทธิ์ที่ต้องตรวจ

| งาน | Branch Admin | CS | Purchasing | Logistics | Warehouse | Driver |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Customer/Product create-edit | ✓ | ✓ | ดู | ดู | ดู | ดู |
| PO create/add item | ✓ | ✓ | ✓ | ดู | ดู | ดู |
| Order create/amend/confirm/cancel | ✓ | ✓ | ดู | ดู | ดู | ดู |
| Fleet/Schedule manage | ✓ | ดู | ดู | ✓ | ดู | ดู |
| Delivery Run/Stop manage | ✓ | ดู | ดู | ✓ | บางขั้นตอน | เฉพาะงานที่มอบหมาย |
| Begin loading/advance run | ✓ | — | — | หลัง loading | ✓ | — |
| POD/Delivery Failed | ✓ | — | — | ✓ | — | ✓ เฉพาะ run ที่มอบหมาย |
| Stock Movement/Return resolution | ✓ | ดู | ดู | ดู | ✓ | ดู |

`ดู` หมายถึงเข้าดูข้อมูลได้แต่ไม่มีปุ่มหรือคำสั่งแก้ไข และ `—` หมายถึงต้องถูกปฏิเสธโดยระบบ

## 2. เตรียมระบบและนำเข้าข้อมูลตั้งต้น

### 2.1 เตรียม `.env`

คัดลอก `.env.example` เป็น `.env` แล้วเปลี่ยนค่าลับทั้งหมด ห้ามใช้ค่าตัวอย่างกับระบบจริง:

```dotenv
DATABASE_URL="postgresql://shipping:<development-db-password>@postgres:5432/shipping_workplan?schema=public"
AUTH_SECRET="<random-value-at-least-32-characters>"
SEED_ADMIN_EMAIL="<admin-email>"
SEED_ADMIN_PASSWORD="<unique-admin-password>"
```

### 2.2 เริ่ม Docker

```powershell
docker compose up -d --build
docker compose ps
```

คาดหวังว่า `app` และ `postgres` อยู่ในสถานะ healthy จากนั้นตรวจ `http://localhost:3000/api/health` ต้องได้ `status=ok` และ `database=ok`

### 2.3 นำเข้าชุดข้อมูล UAT ที่รองรับจริง

ตั้งรหัสผ่านเฉพาะ UAT อย่างน้อย 12 ตัวอักษร แล้วรัน:

```powershell
docker compose exec -e ALLOW_SYNTHETIC_UAT_SEED=true -e UAT_USER_PASSWORD='<unique-uat-password>' app npm run db:seed:uat
```

คำสั่งเป็นแบบ idempotent: รันซ้ำได้โดยไม่ตั้งใจสร้าง master/reference เดิมซ้ำ และจะอัปเดตรหัสผ่านของบัญชี UAT ทั้ง 6 บัญชี ระบบจะปฏิเสธเมื่อไม่กำหนด safety flag หรือใช้รหัสผ่านสั้น/placeholder

### 2.4 ข้อมูลที่ต้องพบหลังนำเข้า

| Entity | Baseline |
|---|---|
| Branch | `UAT` |
| Customer | `UAT-CUST-001` |
| Products | `UAT-FG-001`, `UAT-FG-002` |
| Fleet | `UAT-DEMO-01`, `Synthetic Driver` |
| PO | `UAT-PO-001`, `UAT-PO-002`, `UAT-PO-003` |
| Orders | `UAT-CPO-DRAFT`, `UAT-CPO-FIFO`, `UAT-CPO-READY` |
| FIFO | Order 70 หน่วย allocation จาก PO-001 = 60 และ PO-002 = 10 |
| Inventory | FG-001 On Hand 80/Reserved 70/Available 10; FG-002 20/15/5 |
| Delivery | `DP-UAT-0001` วันที่รัน seed + 2 วัน มี 1 stop |

ไฟล์ใน `samples/initial-data/*.csv` เป็นแม่แบบเตรียมและตรวจคุณภาพข้อมูลเท่านั้น เวอร์ชันปัจจุบันยังไม่มี generic CSV upload/import UI ห้ามรายงานว่าอัปโหลด CSV ผ่านหน้าเว็บได้

## 3. ขั้นตอนทดสอบตามบทบาท

1. เปิด `/login` และเข้าสู่ระบบด้วยบัญชีตามบทบาท
2. ยืนยันว่าสาขาด้านบนเป็น `UAT — Synthetic UAT Branch`
3. ตรวจ Dashboard แล้วเปิด Help เพื่อยืนยันว่าเอกสารแสดงผลได้
4. CS ตรวจ Customer/Product/PO/Order และยืนยัน FIFO refs เป็น `UAT-PO-001 + UAT-PO-002`
5. Purchasing ตรวจ PO 3 รายการและยอด `60/60/0`, `50/10/40`, `30/15/15`
6. Warehouse ตรวจ Inventory และ Stock Movement; บันทึก movement ใหม่ด้วย reference ที่ไม่ซ้ำสำหรับกรณีทดสอบเขียนข้อมูล
7. Logistics เปิด Delivery โดยเลือกวันที่รัน seed + 2 วัน ตรวจ `DP-UAT-0001` แล้วทดสอบลำดับ Planned → Loading → Dispatched ตามสิทธิ์
8. Driver เข้าด้วยบัญชี Driver และต้องทำ POD/Failed ได้เฉพาะ run ที่มอบหมายและอยู่สถานะ Dispatched
9. Warehouse ตรวจ Return จากกรณี Delivery Failed และทดสอบ Pending → Received → Resolved
10. ตรวจ Exceptions, ยอด PO, Order และ Inventory หลัง workflow จบ
11. ออกจากระบบก่อนเปลี่ยนบัญชี และบันทึกหลักฐานทุกกรณี

สำหรับการทดสอบที่เปลี่ยนข้อมูล ให้สร้างรายการใหม่ที่มี prefix เช่น `TEST-<วันที่>-<ลำดับ>` อย่าแก้ baseline ทั้งหมดพร้อมกัน เพราะ Tester คนถัดไปต้องใช้ baseline เปรียบเทียบ

## 4. แบบบันทึกผลทดสอบ

| Field | วิธีบันทึก |
|---|---|
| Test Case ID | อ้างอิง `TestSpec.md` หรือกำหนด `UAT-<MODULE>-NNN` |
| วันเวลา/ผู้ทดสอบ | ISO 8601 พร้อม timezone และชื่อผู้ทดสอบ |
| Environment | URL, branch, commit SHA/image tag และ browser version |
| Account/Role | บันทึก user และ role แต่ห้ามบันทึกรหัสผ่านในภาพหรือ log |
| Steps/Input | ขั้นตอนและค่าที่กรอกโดยไม่ใส่ secret/PII |
| Expected/Actual | ผลคาดหวังและผลจริง |
| Result | PASS, FAIL, BLOCKED หรือ NOT RUN |
| Evidence | Screenshot, console/network error, record ID และ log ที่ผ่านการลบข้อมูลลับ |
| Defect | Severity, ขั้นตอนทำซ้ำ, owner และลิงก์ issue |

ห้ามบันทึกว่า “ผ่านทุกข้อ” หากไม่ได้รันจริง หากพบ blocker ให้ระบุสาเหตุและขอบเขตที่ยังไม่ได้ทดสอบ

## 5. การส่งออกและสำรองข้อมูล

ระบบปัจจุบันยังไม่มีปุ่ม export CSV/Excel ใน UI การส่งออกที่รองรับสำหรับส่งมอบ environment คือ PostgreSQL custom-format backup:

```powershell
docker compose exec -T postgres pg_dump -U shipping -d shipping_workplan -Fc > shipping_workplan.dump
Get-FileHash -Algorithm SHA256 .\shipping_workplan.dump
```

เก็บไฟล์ `.dump`, checksum, commit SHA, วันที่สร้าง และชื่อ environment ร่วมกัน ห้ามนำ dump ที่มีข้อมูลจริงขึ้น public GitHub

การ restore เป็นการเปลี่ยนข้อมูลและต้องทดสอบใน environment แยก ห้าม restore ทับ UAT/Production โดยไม่ได้รับอนุมัติ ดูข้อกำหนดเพิ่มเติมใน `DOCKER.md`

หากต้องส่งออกผลทดสอบ ให้คัดลอกตารางจากหัวข้อ 4 เป็น CSV/PDF พร้อมแนบภาพที่ redacted แล้วตั้งชื่อ `UAT-Test-Result-YYYYMMDD` ข้อมูล credentials ต้องแยกจากหลักฐานทดสอบและส่งผ่านช่องทางที่ควบคุมสิทธิ์

## 6. เกณฑ์ปิดรอบทดสอบ

- Functional/RBAC cases ที่อยู่ใน scope ต้อง PASS หรือมี waiver ที่ระบุ owner
- ไม่พบ Critical/High defect ที่ยังเปิดอยู่
- `/api/health` และ browser console ไม่มี error ที่กระทบ workflow
- ยอด PO/Order/Inventory reconciliation ตรงกับผลธุรกรรม
- มี backup และ checksum ที่ตรวจอ่านได้
- Test lead, Product Owner และ System Owner ลงชื่อรับรองผล

