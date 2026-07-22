# Test Execution Evidence & Delivery Record

## 1. Document control

| Field | Value |
|---|---|
| Project | Shipping Work Plan |
| Evidence date | 20 July 2026 (Asia/Bangkok) |
| Tested revision | `57dfa4f7cfa63c9b7fa541bb9861265ef1fe4f3c` |
| Branch | `main` |
| Test basis | `TestSpec.md`, `designspec.md`, `README.md` |
| Environment | Local development/integration: Next.js 15.5.20, PostgreSQL 16, Prisma 6.19.3 |
| Test data | Synthetic BB-branch data only; no production customer or POD data |
| Executor | Codex automated checks and browser-assisted smoke execution |
| Overall result | **PASS for the implemented structural scope described in section 4; NOT a full TestSpec or production acceptance** |

This record is evidence of tests actually executed. A case is marked PASS only where observable evidence exists. TestSpec cases for features that have not been implemented or whose production environment/contract is unavailable remain NOT RUN or BLOCKED and must not be represented as passed.

## 2. Immutable source and CI evidence

- Tested commit: `57dfa4f7cfa63c9b7fa541bb9861265ef1fe4f3c`
- GitHub Actions run: [CI run 29735179942](https://github.com/chatchailim/shipping-workplan/actions/runs/29735179942)
- CI job: [verify job 88328714744](https://github.com/chatchailim/shipping-workplan/actions/runs/29735179942/job/88328714744)
- CI conclusion: `success`
- CI started: `2026-07-20T10:28:29Z`
- CI completed: `2026-07-20T10:30:06Z`

CI step results:

| Step | Result |
|---|---|
| Clean dependency install (`npm ci`) | PASS |
| ESLint | PASS |
| TypeScript typecheck | PASS |
| Prisma schema validation | PASS |
| Vitest | PASS |
| Next.js production build | PASS |

## 3. Final local delivery gate

The delivery gate was executed again on 20 July 2026 after the latest commit:

```text
npm run lint              PASS
npm run typecheck         PASS
npm run prisma:validate   PASS
npm test                  PASS — 6 files, 20 tests
npm run build             PASS — 15 application routes
git diff --check          PASS
```

Automated unit coverage confirmed:

- role and authorization policy helpers;
- branch scoping;
- order and delivery-run transitions;
- PO balance lower bound;
- order split quantity and child-total constraints;
- Daily, Rotation and Custom fleet schedules;
- recurring-run slot selection;
- Return transition and inventory-impact rules.

## 4. Executed TestSpec traceability

### 4.1 Authentication, branch and master data

| TestSpec area/case | Result | Evidence |
|---|---|---|
| AUTH login/protected route/logout baseline | PASS | Authenticated browser journey reached protected dashboard and modules; unauthenticated session redirected to Login |
| Branch context and branch-scoped queries | PASS | BB branch selected; unit branch-scope tests passed; created data remained in BB scope |
| UC-04 Customer create/list | PASS | Synthetic customer `CUST-SMOKE-001` created and used by downstream workflow |
| UC-05 Product create/edit and ERP uniqueness baseline | PASS | `SMOKE-PROD-20260720` created; price changed 125→130; immutable price log recorded with source |
| UC-06 Fleet/license compatibility baseline | PASS | Driver/vehicle created; expiry and Vehicle Class checks executed by actions |

### 4.2 PO and Order

| TestSpec area/case | Result | Evidence |
|---|---|---|
| PO create and auto Draft | PASS | `PO-SMOKE-20260720` created with Draft Order |
| Multi-line PO | PASS | `PO-MULTI-20260720` contracted quantity increased 5→8; second line generated Draft Order quantity 3 |
| Contracted/Released/Balance | PASS | After split-child confirmation, values observed as 8/1/7 |
| SP numbering | PASS | Sequential numbers `SP-260720-0001` to `SP-260720-0003` observed without duplication |
| Draft amendment baseline | PASS | Action/type/build validation completed and UI exposed only for Draft status |
| Split Order | PASS | Quantity 3 split into child quantities 1+2 with source status `Split-shipping` and parent/root linkage |
| Split integrity | PASS | Unit tests reject invalid split and child totals exceeding source quantity |
| Cancel eligibility baseline | PASS | Cancel action restricted to declared states and rejects orders assigned to a run |
| PO balance guard | PASS | Serializable confirmation calculation excludes Draft, Cancelled, Split source and Delivery Failed |

### 4.3 Fleet scheduling and Delivery Day Board

| TestSpec area/case | Result | Evidence |
|---|---|---|
| UC-11 recurring schedule | PASS | Daily schedule with two runs created; unit tests cover Daily/Rotation/Custom rules |
| Schedule override | PASS | Off override on 24 July produced `Created 0; skipped 2` |
| Idempotent run generation | PASS | 23 July generation produced only `DP-260723-0001/0002`; repeated generation created no duplicates |
| DP numbering | PASS | Sequential DP numbers observed and issued inside Serializable transactions |
| UC-12/13 Run and Stop assignment | PASS | Confirmed/Ready Order assigned to planned run and shown as stop #1 |
| Stop reorder baseline | PASS | Up/down controls limited to Planned run; transactional sequence swap implemented |
| UC-14 Loading/Dispatch | PASS | Planned→Loading→Dispatched performed; Order cascaded to In Transit |
| Completion gate | PASS | Run completion requires every stop to be Delivered or Delivery Failed |

### 4.4 POD, Delivery Failed, Return and Inventory

| TestSpec area/case | Result | Evidence |
|---|---|---|
| POD metadata submission | PASS | Recipient `Smoke Recipient` recorded; Order changed to Delivered; POD badge displayed |
| POD double-submit protection | PASS | Database unique constraint on `DeliveryProof.runOrderId`; migration applied and schema validated |
| Cross-driver authorization baseline | PASS | Driver-only submission requires matching `ShippingRunDriver`; privileged roles retain operational access |
| Delivery Failed | PASS | `SP-260720-0003` changed to Delivery Failed with reason `Customer site closed` |
| RET-001 automatic Return | PASS | Exactly one Pending Return created for quantity 2 and linked Order |
| Return lifecycle | PASS | Pending→Received→Resolved executed |
| Return resolution | PASS | Resolution `Restock` stored with inspection note |
| Return-to-inventory | PASS | Inventory on-hand increased to 2 and one `Return-In` movement with Return reference was recorded |
| Inventory negative-stock guard | PASS | Outbound/Adjustment-Out action rejects quantity greater than current on-hand |

## 5. Evidence data ledger

| Entity | Test identifier/result |
|---|---|
| Branch | `BB — Ban Bung HQ` |
| Customer | `CUST-SMOKE-001` |
| Product | `SMOKE-PROD-20260720`; current test price 130 |
| Vehicle | `SMK-2026` |
| Driver | `Smoke Driver`; synthetic licence valid through 2030-12-31 |
| Fulfilled PO | `PO-SMOKE-20260720` |
| Multi-line PO | `PO-MULTI-20260720` |
| Successful delivery | `SP-260720-0002` on `DP-260723-0001`; Delivered with POD |
| Failed delivery | `SP-260720-0003` on `DP-260723-0002`; Delivery Failed |
| Return | Quantity 2; Resolved/Restock |
| Inventory | `SMOKE-PROD-20260720`; on-hand 2; `Return-In` ledger entry |

All entries are synthetic local test data and may be removed or reseeded before formal UAT.

## 6. TestSpec items not passed or not executed

The following areas remain outside this PASS statement:

| Area | Status | Reason/evidence required |
|---|---|---|
| Full user/role administration and every RBAC matrix permutation | NOT RUN | Admin UI and dedicated accounts per role are incomplete |
| CSV/XLSX import preview, reject file and conflict workflow | NOT IMPLEMENTED | Import module is not present |
| FIFO allocation across multiple POs and bulk Order operations | PARTIAL | Canonical multi-PO calculator, persisted allocation and Browser UAT fixture passed; concurrent PostgreSQL and bulk-operation tests remain open |
| Drag-and-drop Day Board and mobile-only Driver view | NOT IMPLEMENTED | Current stop ordering uses accessible up/down controls |
| POD image/signature upload, MIME/size validation and private storage | NOT IMPLEMENTED | Current POD stores metadata only |
| Production Plan and production-to-stock workflow | NOT IMPLEMENTED | P4 remaining scope |
| WMS sync, ERP export and RM mapping | BLOCKED/NOT RUN | External contracts, samples and credentials are unavailable |
| PDF/report generation | NOT IMPLEMENTED | Reporting phase pending |
| Load, soak, failover, backup/restore and disaster recovery | NOT RUN | Production-like infrastructure and approved targets required |
| Penetration test, PDPA/legal retention and security sign-off | NOT RUN | Independent review and policy decisions required |
| Cross-browser/mobile device matrix and accessibility audit | NOT RUN | Formal device lab and accessibility execution pending |
| UAT by CS, Purchasing, Warehouse, Logistics, Driver and Product Owner | AWAITING SIGN-OFF | Requires named human representatives |

## 7. Delivery decision

| Decision | Status |
|---|---|
| Structural development/integration test environment | **ACCEPTABLE FOR CONTINUED UAT** |
| All implemented vertical-slice cases listed in section 4 | **PASS** |
| Full TestSpec completion | **NOT ACHIEVED** |
| Production Go-Live | **NO-GO at this time** |

Production release remains conditional on completing section 6, resolving open decisions in `designspec.md`, executing formal role-based UAT and obtaining Product Owner/IT/Legal approvals where applicable.

## 9. DCP-001 approved pilot evidence — 20 July 2026

| Gate | Result | Evidence |
|---|---|---|
| Additive migration | PASS | Four migrations applied; Prisma reports database schema up to date |
| Legacy allocation reconciliation dry-run | PASS | 2 candidate Orders, 2 allocation rows, 1 location row, 0 conflicts |
| BB pilot apply | PASS | Allocation/location backfill applied and `DCP001_FIFO` enabled only for BB |
| Idempotency check | PASS | Post-apply dry-run reports 0 allocation rows, 0 location rows, 0 conflicts |
| Canonical FIFO/status/availability/freshness unit tests | PASS | `npm run check`: 7 test files, 25 tests passed |
| Static/type/schema quality gates | PASS | ESLint, TypeScript and Prisma validation passed |
| Production build | PASS | Next.js optimized build completed; `/exceptions`, `/inventory`, `/orders`, and `/purchase-orders` compiled |
| Production activation | NOT AUTHORIZED | This is a branch-scoped BB pilot; formal UAT, concurrency, security and operational gates remain open |

## 10. Docker installation evidence — 20 July 2026

| Gate | Result | Evidence |
|---|---|---|
| Multi-stage image build | PASS | Node.js 24 Bookworm slim image built with Prisma Client, OpenSSL and optimized Next.js output |
| Existing database preservation | PASS | Compose reused the existing `shipping_pgdata` volume; no volume deletion/recreation command was used |
| Migration startup gate | PASS | App startup found 4 migrations and reported no pending migrations |
| Idempotent seed | PASS | Master/admin seed command completed before application startup |
| Container health | PASS | `app` and `postgres` reported healthy through Docker Compose |
| Runtime database health | PASS | `GET /api/health` returned HTTP 200 with `status=ok` and `database=ok` |
| Public Docker instructions | PASS | `DOCKER.md` covers install, update, logs, port override, backup and production hardening |
| Production certification | NOT ACHIEVED | Current Compose credentials/network defaults are for development/demo/UAT; production hardening gates remain open |

## 11. Synthetic initial-data/UAT evidence — 20 July 2026

| Gate | Result | Evidence |
|---|---|---|
| Safety flag and password guard | PASS | Seed refuses execution unless explicitly enabled and requires a non-placeholder password of at least 12 characters |
| First import | PASS | Created isolated `UAT` Branch with 6 role users, 1 customer, 2 products, fleet/schedule, 3 POs, 3 scenario Orders, inventory/WMS and 1 Run |
| Multi-PO FIFO fixture | PASS | `UAT-CPO-FIFO` has 3 persisted allocation rows across the complete scenario set, including 60+10 allocation across `UAT-PO-001/002` |
| Idempotent rerun | PASS | Second execution retained exactly 1 Branch, 6 users, 1 customer, 2 products, 3 POs, 3 Orders, 3 allocations and 1 Run |
| Synthetic-data isolation | PASS | All scenario transactions use Branch `UAT`, reserved `UAT-*` codes and `.example.invalid` email addresses |
| CSV preparation templates | PASS | Six UTF-8 templates document Branch, Customer, Product, Fleet, PO and Inventory mappings; templates are explicitly not presented as an implemented UI importer |

## 12. Dashboard and WMS freshness regression — 20 July 2026

| Gate | Result | Evidence |
|---|---|---|
| Dashboard readiness copy | PASS | Browser shows implemented Customer/Product/Fleet/PO/Order/Inventory/Delivery vertical slices and no longer claims PO/Order/Delivery are future work |
| Readiness copy regression | PASS | Automated test prevents the obsolete `ลำดับพัฒนาถัดไป` wording from returning |
| Synthetic WMS refresh | PASS | Idempotent UAT seed updates the existing synthetic sync timestamp without creating a duplicate log |
| Inventory freshness detail | PASS | Browser shows `WMS freshness: Fresh` and the last successful sync timestamp |
| Exception reconciliation | PASS | WMS exception shows `Fresh`, count `0`, severity `Clear` immediately after the controlled UAT seed |
| Inventory reconciliation | PASS | Browser retained FG-001 `80/70/10/0` and FG-002 `20/15/5/0` for On Hand/Reserved/Available/Shortage |
| Browser console | PASS | No console errors were recorded on the tested Dashboard, Inventory and Exceptions flow |
| Automated quality gate | PASS | ESLint, TypeScript, Prisma validation and 26 tests across 8 files passed |
| Docker regression | PASS | Optimized image rebuilt; app and PostgreSQL containers reported healthy |

## 8. Human acceptance

| Role | Name | Decision/signature | Date |
|---|---|---|---|
| Product Owner / Human Lead |  |  |  |
| Process Owner — CS/Purchasing |  |  |  |
| Process Owner — Warehouse |  |  |  |
| Process Owner — Logistics |  |  |  |
| IT/Security |  |  |  |

Suggested acceptance statement:

> I acknowledge that the implemented structural scope and evidence in section 4 passed, that section 6 remains open, and that this document does not authorize production Go-Live.

## 13. DCP-002 workflow foundation — 22 July 2026

| Gate | Status | Evidence |
|---|---|---|
| Inbound document register | IMPLEMENTED | Gmail/LINE OA/manual source metadata, checksum and processing status are persisted; live connectors remain pending |
| PO duplicate detection | IMPLEMENTED | Same branch/PO is compared as a candidate Revision; identical data records `DuplicateNoChange` |
| PO Revision diff and decision | IMPLEMENTED | Header and line Added/Removed/Changed differences, CS accept/reject and audit history |
| Operational overwrite protection | IMPLEMENTED | Revision acceptance is blocked when linked Orders are beyond Draft/Cancelled |
| ERP submission control | FOUNDATION | Idempotent `ManualReview` queue is implemented; live ERP execution remains blocked on contract and credentials |
| Logistics approval | IMPLEMENTED | Draft Delivery Plan remains editable; Logistics confirmation is required before Loading |
| Live Gmail/LINE/Drive/ERP and AI extraction | NOT CONNECTED | Adapter contracts, credentials, security policy and representative files are still required |
