# Inventory & Sales Analytics Dashboard

A full-stack inventory and sales app for small businesses, currently set up for pharmacies in Ghana. It covers product categories, supplier lists, batch numbers and expiry tracking. Owners and staff log in, manage stock, record sales, bulk-import data from CSV or Excel, and get low-stock and expiry alerts.

**Live demo:** https://inventory-sales-analytics-dashboard.vercel.app
The frontend is on Vercel and the API is on Render. If the API is asleep or down, login won't work.

## Features

- **Auth and roles:** register/login with JWT. Two roles, `owner` and `staff`; only owners can delete products
- **Products:** CRUD, bulk delete, category stats, batch number and expiry date
- **Sales:** record sales and see sales stats
- **Alerts:** low-stock and expiring-soon lists
- **Import:** upload CSV or Excel files; rows are parsed and normalized server-side (multer + SheetJS)
- **Export:** tables to Excel or PDF from the browser
- **Dashboard:** charts with Recharts
- Installable PWA, responsive layout

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS, Recharts, lucide-react, jsPDF, SheetJS |
| Backend | Node.js 18+, Express, multer, express-validator, helmet, express-rate-limit, bcryptjs, jsonwebtoken |
| Database | [Turso](https://turso.tech) (libSQL/SQLite); falls back to a local `local.db` file when no Turso URL is set |
| Hosting | Vercel (frontend), Render (API) |

## Structure

```
backend/
  server.js            Express app: security middleware, rate limits, route mounting
  routes/              auth, products, sales, upload
  controllers/         uploadController (CSV/Excel parsing)
  middleware/          auth (JWT + role check), errorHandler
  db/turso.js          libSQL client
  db/init.js           Creates tables: users, products, sales, upload_history
frontend/
  src/pages/           Dashboard, Products, Sales, Alerts, UploadPage, Login, Register
  src/lib/             api client, export helpers, pharmacy constants
  src/context/         AuthContext
package.json           Convenience scripts for running both halves
```

## API

All routes are under `/api`. Everything except register and login needs a `Bearer` token.

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Rate-limited |
| GET | `/auth/me` | |
| GET/POST | `/products` | |
| GET/PUT/DELETE | `/products/:id` | DELETE: owner only |
| POST | `/products/bulk-delete` | Owner only |
| GET | `/products/alerts/low-stock`, `/products/alerts/expiring`, `/products/stats/by-category` | |
| GET/POST | `/sales` | |
| GET | `/sales/stats` | |
| POST | `/upload` | multipart field `file` |

## Run locally

```bash
# backend
cd backend
npm install
cp .env.example .env   # with no TURSO_DATABASE_URL a local SQLite file is used
npm run db:init
npm run dev            # http://localhost:5000

# frontend (second terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Without `VITE_API_URL`, the frontend calls `/api` on its own origin.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `PORT` | backend | Default `5000` |
| `JWT_SECRET` | backend | Required — signs auth tokens |
| `JWT_EXPIRES_IN` | backend | Default `7d` |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | backend | Turso database; omit to use `file:local.db` |
| `CORS_ORIGIN` | backend | Production frontend URL |
| `VITE_API_URL` | frontend | API base URL, e.g. `https://<render-service>.onrender.com/api` |

## License

MIT (as declared in `backend/package.json`).
