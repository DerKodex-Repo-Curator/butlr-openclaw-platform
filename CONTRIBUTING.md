# Contributing to Butlr

Thanks for your interest in contributing to Butlr! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/butlr.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Follow the [Getting Started](#getting-started) guide in README.md to set up your dev environment

## Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your local dev values
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Project Structure

- **`backend/api/`** — FastAPI route handlers. Each file maps to a feature area.
- **`backend/models/`** — SQLAlchemy ORM models (async).
- **`backend/services/`** — Business logic and external service integrations (Stripe, Hetzner, Resend).
- **`backend/utils/`** — Shared helpers (encryption, LLM routing).
- **`frontend/src/app/`** — Next.js App Router pages organized by route groups.
- **`frontend/src/components/`** — React components organized by feature area.
- **`frontend/src/lib/`** — API client, types, and utilities.

## Code Style

### Backend (Python)
- Use type hints for function signatures
- Follow FastAPI patterns: dependency injection, Pydantic models for validation
- All database queries must be scoped and use async sessions
- Never hardcode secrets — use environment variables

### Frontend (TypeScript)
- Use TypeScript strict mode
- Components go in `src/components/{feature}/`
- API calls go through `src/lib/api.ts`
- Use Tailwind CSS for styling (no CSS modules)
- Icons from `lucide-react`

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add skill installation progress bar
fix: handle expired JWT tokens gracefully
docs: update deployment guide for Caddy
refactor: extract Stripe service into separate module
```

## Pull Requests

1. Keep PRs focused on a single feature or fix
2. Update documentation if your change affects setup or usage
3. Add your environment variables to `.env.example` if you introduce new ones
4. Test both backend and frontend if your change spans both

## Security

- **Never commit secrets** — API keys, passwords, tokens belong in `.env` only
- **Never log sensitive data** — no tokens or passwords in console output
- Use `utils/encryption.py` for any stored credentials
- Report security issues privately to contact@butlr.cloud

## Need Help?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Tag issues with appropriate labels (`bug`, `feature`, `docs`, etc.)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
