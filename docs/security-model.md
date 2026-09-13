# Security model

## Authentication

- Local: mock identities behind `AUTH_PROVIDER=mock`
- Production-ready: `AUTH_PROVIDER=entra` with Microsoft Entra ID (authorization code + PKCE)
- Sessions: httpOnly, Secure, SameSite=Lax cookies; idle timeout via `SESSION_IDLE_MINUTES`
- No passwords, tokens, or raw Authorization headers in logs

## Roles (server-enforced)

| Role | Field JRB | Controlled libraries | Audit | Reports |
|------|-----------|---------------------|-------|---------|
| Field Team Member | Create/update assigned JRBs; Stop Work; acknowledge | Read published | Own events | No |
| Employee in Charge | Full briefing on assigned JRBs; release | Read published | Own JRBs | No |
| Supervisor | Review Alternative Controls; assigned JRBs | Read published | Assigned | Operating area |
| Safety Reviewer | Read/comment; cannot publish libraries | Read | Yes | Yes |
| EEI Task Library Administrator | No field write | Publish/retire EEI tasks and synonyms | Import events | No |
| Direct Control Library Administrator | No field write | Publish/retire DC inventory | Import events | No |
| Alternative Control Administrator | No field write | Publish/retire AC catalog | Import events | No |
| Regulatory Content Administrator | No field write | Regulatory tables | Import events | No |
| Application Administrator | User/role admin | Configuration, retention | Yes | Yes |
| Read-Only Analyst | Read de-identified operational data | Read published | No | Yes — no employee rankings |

Field users cannot change controlled libraries. Only library administrators may publish, retire, or supersede.

## Controls

- Zod validation on all mutations
- Prisma parameterized queries
- React text rendering (no `dangerouslySetInnerHTML` for user content)
- CSRF: same-origin cookie + `Origin` check on mutating API routes
- Uploads: MIME allow-list, size cap, random storage names, malware-scan hook (`MALWARE_SCAN_PROVIDER`)
- Rate limits: speech and AI endpoints
- Helmet-style headers in `next.config.ts` (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)
- Encryption in transit (TLS in Azure); encryption at rest via Azure PostgreSQL/Blob
- Secrets from environment / Key Vault — never committed
- Audit log: append-only; app role should not DELETE
- Error responses: generic message to client; correlation id server-side
- Dependency monitoring: `npm audit` in CI guidance

## Privacy

Log user id and JRB id, not crew home addresses or unnecessary GPS. Strip EXIF GPS unless `RETAIN_PHOTO_LOCATION_METADATA=true`.
