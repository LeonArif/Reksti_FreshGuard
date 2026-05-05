# FreshGuard Backend

Express.js API for TVC and freshness prediction datasets.

## Env

Copy `.env.example` to `.env` and fill in:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (read/write via RLS) or `SUPABASE_SERVICE_ROLE_KEY` (admin)
- `PORT` (optional)

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

## Notes

TVC class mapping:

| Class | Label | TVC Range | Meaning |
|-------|-------|-----------|---------|
| 0 | Safe | TVC ≤ 4.0 log10 CFU/g | Safe for consumption |
| 1 | Warning | 4.0 < TVC < 5.0 log10 CFU/g | Approaching spoilage |
| 2 | Danger | TVC ≥ 5.0 log10 CFU/g | Already spoiled |
