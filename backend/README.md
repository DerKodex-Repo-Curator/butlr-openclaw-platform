# 🦞 Butlr Backend

Backend API for [Butlr Cloud](https://butlr.cloud) — Your Personal AI Butler.

## Stack

- **Framework**: FastAPI (Python 3.12)
- **Database**: PostgreSQL + SQLAlchemy (async)
- **Auth**: JWT + Stripe billing
- **VM Management**: SSH-based provisioning & control
- **Memory**: Qdrant vector store + OpenAI embeddings (mem0)

## Structure

```
api/            # Route handlers
models/         # SQLAlchemy models
scripts/        # Cron jobs & utilities
main.py         # App entry point
```

## Key APIs

| Endpoint | Description |
|----------|-------------|
| `/api/auth` | JWT login, token refresh |
| `/api/customers` | Customer CRUD |
| `/api/dashboard` | Dashboard stats & VM data |
| `/api/memory` | Memory addon (activate/deactivate/list) |
| `/api/skills` | Skill marketplace |
| `/api/souls` | SoulVault personalities |
| `/api/support` | Ticket system |
| `/api/usage` | Usage tracking |
| `/api/updates` | Changelog |

## Deployment

Runs via PM2 on management server. Proxied through Caddy.

```bash
pm2 start main.py --name butlr-api --interpreter python3
```

---
Private repository. © 2026 Butlr Cloud.
