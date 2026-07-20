# Contributing

ขอบคุณที่สนใจพัฒนา OPT Shipping Work Plan โปรดอ่าน [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) และเอกสารออกแบบก่อนเริ่มงาน

## Before opening a change

- Use an issue or approved design-change proposal for schema, workflow, security or UX changes that materially affect users.
- Keep each pull request focused on one outcome.
- Do not include real customer, employee, vehicle, credential or delivery-proof data.
- Do not remove existing capabilities without prior Product Owner/System Designer approval.

## Pull request checklist

- [ ] Scope and business reason are explained.
- [ ] Role and branch-isolation impacts were reviewed.
- [ ] Database migration is additive or destructive risk is explicitly approved.
- [ ] Unit/integration/E2E evidence is proportional to the change.
- [ ] `npm run check` passes.
- [ ] `npm run build` passes.
- [ ] User and developer documentation is current.
- [ ] `TestEvidence.md` contains only tests actually executed.
- [ ] No secrets, personal data, dumps or generated artifacts are included.
- [ ] Rollout, feature flag, migration and rollback/compensation notes are included where relevant.

## Commit and review guidance

Use clear commits such as `feat: add allocation preview`, `fix: release allocation once`, or `docs: clarify local setup`. Reviewers should prioritize correctness of business invariants, authorization, branch isolation, transaction boundaries, auditability and migration safety.

Report vulnerabilities privately as described in [SECURITY.md](./SECURITY.md), not in a public issue.

