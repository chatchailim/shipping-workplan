# DCP-002 — Document Intake, PO Revision, ERP Queue and Delivery Approval

## Status

Implemented as an additive workflow foundation on 22 July 2026. External Gmail, LINE OA, Central Drive and ERP adapters remain disabled until their contracts and credentials are approved.

## Business flow covered

1. CS registers an inbound PO/Shipping Plan from Gmail, LINE OA or manual upload metadata.
2. The extracted/human-entered draft is compared with the current PO.
3. A new PO creates a Draft Order; an identical PO is recorded as a no-change duplicate.
4. A changed PO creates a numbered Revision with field/line differences for CS review.
5. CS may accept or reject the Revision. Acceptance is blocked when the PO has confirmed or active Orders.
6. Approved PO data can be placed in an idempotent ERP submission queue. It remains `ManualReview` until an ERP contract exists.
7. Delivery Runs remain editable only while their approval is `Draft`. Logistics confirmation is required before Warehouse can begin loading.

## Added data

- `InboundDocument`: source, file/reference metadata, checksum and processing status.
- `PurchaseOrderRevision`: immutable proposed snapshot, change set and CS decision.
- `ShippingRun.approvalStatus`, `approvedById`, `approvedAt`.
- `ErpSubmission`: idempotency key, request/response, attempts and resulting SO number.

## Safety decisions

- AI/external connector output never auto-approves a PO.
- An identical source document does not mutate operational data.
- A Revision cannot overwrite confirmed/in-transit/delivered work.
- ERP submission is idempotent and cannot claim success before the external system responds.
- A Delivery Plan cannot enter Loading before Logistics approval.

## Remaining integration gates

- Gmail mailbox/label and OAuth/service-account policy.
- LINE Official Account webhook, signature verification and attachment retrieval.
- Central Drive provider, folder permissions, retention, checksum and malware scanning.
- ERP API or import template, authentication, error codes and SO reconciliation.
- AI extraction schema, confidence thresholds, supported customer templates and evaluation set.
- Route/load optimization constraints and human override policy.

## Verification

Run `npm run check` and `npm run build`. Formal UAT must cover new, duplicate, accepted revision, rejected revision, locked revision, ERP duplicate submission and Logistics approval scenarios.
