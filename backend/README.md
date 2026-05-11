# FreshGuard Backend

Express.js API for TVC and freshness prediction datasets.

## Env

Copy `.env.example` to `.env` and fill in:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (read/write via RLS) or `SUPABASE_SERVICE_ROLE_KEY` (admin)
- `PORT` (optional)
- `FRONTEND_URL` or `FRONTEND_URLS` for CORS allowlist

## Supabase tables

Open Supabase SQL Editor and run:

```
node src/db/printSchema.js
```

Paste the output into the SQL editor.

## Endpoints

- `GET /health`
- `GET /api/tvc?limit=50`
- `POST /api/tvc`
- `GET /api/predict?limit=50`
- `POST /api/predict`

## CORS

If the frontend is deployed on a different domain, set `FRONTEND_URL` or `FRONTEND_URLS` in the backend environment.

Examples:

- `FRONTEND_URL=https://your-frontend.example`
- `FRONTEND_URLS=http://localhost:5173,https://your-frontend.example`

## Notes

TVC class mapping:

| Class | Label | TVC Range | Meaning |
|-------|-------|-----------|---------|
| 0 | Safe | TVC ≤ 4.0 log10 CFU/g | Safe for consumption |
| 1 | Warning | 4.0 < TVC < 5.0 log10 CFU/g | Approaching spoilage |
| 2 | Danger | TVC ≥ 5.0 log10 CFU/g | Already spoiled |
