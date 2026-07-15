# UGT Sales Forecast

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Configure `.env` from `.env.example`.
3. Start the backend: `npm run server`
4. Start the frontend: `npm run dev`

## App modes (NYL vs UFA)

One codebase and **one deployment**. Data stays in the same database — the selected mode only filters visibility.

| | Polymer + Composite (Nylon) | UFA |
|--|--|--|
| URL | `/ugt-sales-forecast?mode=nylon` | `/ugt-sales-forecast?mode=ufa` |
| Allowed BUs | Polymer, Composite | UFA |
| Default | Yes (missing/invalid `mode` falls back to nylon) | No |

Local:
- Frontend: `http://localhost:3000/ugt-sales-forecast?mode=nylon`
- API: port **3001**
- Switch modes with the Nylon / UFA toggle in the top bar, or by changing `?mode=`

## Docker deployment

1. Create `.env` on the deployment server. For production use:
   - `APP_BASE_URL=https://ugtweb.ube.co.th`
   - `APP_BASE_PATH=/ugt-sales-forecast`
   - `DEV_AUTH_BYPASS=false`
   - Configure `DATABASE_URL`, `SESSION_SECRET`, and Keycloak variables.
2. Build and start: `docker compose up -d --build`
3. Check status: `docker compose ps`
4. Open:
   - Nylon: `https://ugtweb.ube.co.th/ugt-sales-forecast?mode=nylon`
   - UFA: `https://ugtweb.ube.co.th/ugt-sales-forecast?mode=ufa`

The container runs `prisma migrate deploy` before starting Express. Secrets are read from `.env` at runtime and are excluded from the image build context.
