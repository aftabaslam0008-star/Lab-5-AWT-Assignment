# Enterprise Multi-Tenant Security Gateway

Production-oriented security gateway implementing:

- Local registration/login with bcrypt password hashing
- Authentication rate limiting: 5 attempts / 15 minutes
- Google OAuth 2.0 / OpenID Connect-style social login
- 15-minute JWT access tokens
- 7-day refresh tokens in httpOnly, Secure-in-production, SameSite=Strict cookies
- Refresh-token rotation and server-side revocation
- RBAC: SuperAdmin, Manager, Employee
- Multi-tenant `tenantId` isolation on protected user deletion
- Helmet security headers
- Strict CORS
- Express input validation
- Request size limits
- `x-powered-by` disabled
- Postman collection
- Simple frontend for demonstration

## 1. Requirements

Install:

- Node.js 20+
- MongoDB local or MongoDB Atlas
- Google Cloud project only if demonstrating Google login

## 2. Backend setup

```bash
cd backend
npm install
copy .env.example .env
```

Edit `.env` and set strong JWT secrets and your MongoDB URI.

Start:

```bash
npm run dev
```

API:
`http://localhost:5000`

## 3. Seed demo users

With MongoDB running:

```bash
npm run seed
```

Test credentials:

| Role | Email | Password |
|---|---|---|
| SuperAdmin | superadmin@example.com | SuperAdmin@123 |
| Manager | manager@example.com | Manager@123 |
| Employee | employee@example.com | Employee@123 |

For a public repository, change these demo passwords before real deployment.

## 4. Route access matrix

| Route | Employee | Manager | SuperAdmin |
|---|---:|---:|---:|
| GET /api/v1/employee/profile | YES | YES | YES |
| POST /api/v1/payroll/approve | NO | YES | YES |
| DELETE /api/v1/users/:id | NO | NO | YES |

## 5. OAuth setup

Create OAuth credentials in Google Cloud Console.

Authorized redirect URI:

`http://localhost:5000/api/v1/auth/google/callback`

Set:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
```

Then open:

`http://localhost:5000/api/v1/auth/google`

For production, replace localhost with your HTTPS backend URL and add the exact production callback URL in Google Cloud.

## 6. Frontend

The included frontend is intentionally simple for viva/demo.

Run a static server from the `frontend` directory, or use VS Code Live Server. It expects the backend at `http://localhost:5000`.

## 7. Token architecture

Access token:
- JWT
- 15 minutes
- Sent as `Authorization: Bearer <token>`

Refresh token:
- JWT
- 7 days
- httpOnly cookie
- SameSite=Strict
- Secure when `NODE_ENV=production`
- Stored hashed in MongoDB
- Rotated on every `/auth/refresh`
- Revoked on logout

## 8. Security notes

Do not commit `.env`.

Use HTTPS in production.

Use a strong random JWT secret, never the sample value.

The login rate limiter is an application-level brute-force protection. For a large production deployment, add a distributed rate-limit store such as Redis.

For production multi-tenancy, derive tenant identity from a trusted authenticated organization/tenant mapping rather than accepting arbitrary tenant IDs from public registration.

## 9. Postman viva tests

1. Login as Employee.
2. Copy `accessToken` into Postman `accessToken`.
3. Call employee profile -> 200.
4. Call payroll approve -> 403.
5. Login as Manager -> payroll approve -> 200.
6. Login as Employee and try delete user -> 403.
7. Login as SuperAdmin -> delete permitted target user -> 200.
8. Call refresh -> old refresh token is revoked and a new refresh token is issued.
9. Logout -> refresh cookie is revoked.
10. Send more than 5 login attempts within 15 minutes -> rate limit response.
11. Test Google OAuth -> callback creates/syncs the user and issues system credentials.

## 10. Deployment

### Render/Railway backend

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Add all `.env` values in platform environment variables.
- Set `NODE_ENV=production`.
- Set `CLIENT_URL` to your HTTPS frontend URL.
- Set `GOOGLE_CALLBACK_URL` to your HTTPS backend callback URL.

### Frontend

The included frontend can be hosted on Vercel/Netlify/static hosting.

Change the `API` constant in `frontend/app.js` to your deployed HTTPS backend.

### Important cookie/CORS production note

The assignment requires `SameSite=Strict`. If frontend and backend are hosted on different sites, browser cookie behavior can affect OAuth/refresh flows. Keep frontend/backend under an appropriate same-site deployment arrangement for the strict cookie requirement, and test the deployed browser flow.

## 11. Project structure

```text
enterprise-security-gateway/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── postman/
│   └── Enterprise-Security-Gateway.postman_collection.json
└── README.md
```
