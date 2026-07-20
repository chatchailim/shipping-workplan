# Security Policy

## Supported versions

This project is currently in development/BB pilot. No version is certified for production use. Security fixes are applied to the current default branch unless maintainers announce a supported release line.

## Reporting a vulnerability

Do not publish exploitable details, credentials, personal data or proof-of-concept attacks in a public issue. Use GitHub Private Vulnerability Reporting when enabled. If it is unavailable, contact the repository owner through a private channel listed in the GitHub organization/profile and request a secure reporting path.

Include the affected revision, impact, reproduction conditions and a safe minimal proof. Remove real credentials and personal/customer data. Maintainers should acknowledge the report, assess severity, coordinate remediation and publish a sanitized advisory when appropriate.

## Security boundaries

High-risk areas include authentication/session handling, RBAC, branch isolation, allocation concurrency, uploads/POD data, WMS/ERP integrations, exports and database migrations. A passing CI build is not a penetration test or production security approval.

