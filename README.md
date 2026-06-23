# UGT Sales Forecast

## Run Locally

**Prerequisites:** Node.js


1. Install dependencies:
   `npm install`
2. Configure `.env` from `.env.example`.
3. Start the backend: `npm run server`
4. Start the frontend: `npm run dev`

## Docker deployment

1. Create `.env` on the deployment server. For production use:
   - `APP_BASE_URL=https://ugtweb.ube.co.th`
   - `APP_BASE_PATH=/ugt-sales-forecast`
   - `DEV_AUTH_BYPASS=false`
   - Configure `DATABASE_URL`, `SESSION_SECRET`, and Keycloak variables.
2. Build and start: `docker compose up -d --build`
3. Check status: `docker compose ps`
4. Open: `https://ugtweb.ube.co.th/ugt-sales-forecast/`

The container runs `prisma migrate deploy` before starting Express. Secrets are read from `.env` at runtime and are excluded from the image build context.
