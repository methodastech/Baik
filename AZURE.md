# Azure deployment

The site is hosted on **Azure Static Web Apps** (Free tier). No build step: the
repo root is published as-is.

## Resources

| Thing | Value |
|---|---|
| Subscription | `Azure subscription 1` (`b74af92f-4a0e-430f-b034-5f7ce7c5fcff`) |
| Resource group | `baikapp-rg` (Southeast Asia) |
| Static Web App | `baikapp` (East Asia) |
| Default hostname | `blue-sky-0ed005e00.1.azurestaticapps.net` |
| Custom domains | `baikapp.com`, `www.baikapp.com` |
| Registrar / DNS | Namecheap (nameservers stay there) |

## Deploys

Push to `main` runs `.github/workflows/azure-static-web-apps.yml`, which uploads
the repo root. Pull requests get a temporary staging URL, torn down on close.

The workflow needs one repository secret:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`

Fetch its value with:

```bash
az staticwebapp secrets list -n baikapp -g baikapp-rg --query "properties.apiKey" -o tsv
```

Add it at **GitHub → Settings → Secrets and variables → Actions → New repository secret**.
If the token is ever leaked, rotate it:

```bash
az staticwebapp secrets reset-api-key -n baikapp -g baikapp-rg
```

## DNS records (Namecheap → Advanced DNS)

| Type | Host | Value | TTL |
|---|---|---|---|
| ALIAS | `@` | `blue-sky-0ed005e00.1.azurestaticapps.net` | Automatic |
| TXT | `@` | `_3k3rx7l268qifa3py08otlo4pw60ogc` | Automatic |
| CNAME | `www` | `blue-sky-0ed005e00.1.azurestaticapps.net` | Automatic |

The TXT record proves apex ownership to Azure. Once the apex shows `Ready` it can
be deleted, but leaving it costs nothing and avoids surprises on re-validation.

`www` cannot be registered in Azure until its CNAME resolves. After adding the
record above, run:

```bash
az staticwebapp hostname set -n baikapp -g baikapp-rg --hostname www.baikapp.com
```

Check status of both:

```bash
az staticwebapp hostname list -n baikapp -g baikapp-rg -o table
```

SSL certificates are issued and renewed by Azure automatically once a domain
reaches `Ready`. Nothing to buy or install.

## Config

`staticwebapp.config.json` holds routing, cache headers, MIME types and security
headers. It is read from the repo root on every deploy.

## Not built yet: auth and database

Login is planned, not wired. When that lands:

- **Auth.** Free tier ships Entra ID and GitHub sign-in at `/.auth/login/<provider>`,
  with the user available at `/.auth/me`. Custom providers (Google, Facebook, any
  OIDC) need the **Standard** tier. Switching tier is in-place:
  `az staticwebapp update -n baikapp -g baikapp-rg --sku Standard`
- **Database.** Roughly in order of fit for this app: Azure Cosmos DB (serverless,
  pay-per-request), Azure SQL (serverless, auto-pause), or Azure Database for
  PostgreSQL. SWA's built-in database connection feature also requires Standard.
- **API.** An `api/` folder of Azure Functions deploys alongside the site and is
  reachable at `/api/*`. Set `api_location: "api"` in the workflow when it exists.

## Email + password accounts (api/)

Built: `api/` holds Azure Functions for `POST /api/auth/register`, `/login`, `/logout` and `GET /api/auth/me`.
Passwords are hashed with scrypt; the session is a signed HttpOnly cookie (`baik_session`, 30 days).
Eight wrong passwords lock an account for 15 minutes. `login.html` is the sign-in / create-account page;
`Khayr.html` asks `/api/auth/me` on load and sends signed-out visitors to it.

The lock lives in the page: on the Free plan Azure cannot gate static files with our own accounts,
so the duas inside Khayr.html are still readable in the page source.

Two app settings must exist before it works (portal: baikapp → Settings → Environment variables, Production):
- `AZURE_TABLES_CONNECTION`: connection string of a Storage account (Access keys → Connection string).
  Accounts go in table `baikusers`, created on first use.
- `AUTH_SECRET`: long random string that signs sessions. Make one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
  Changing it signs everyone out.

Local test with no Azure tools: `node api/dev-server.js`, then http://localhost:4280.
Test accounts land in `api/.data/users.json` (git-ignored).

Not built: email verification and "forgot password" (both need an email sender, e.g. Azure Communication Services).

## Payments: ToyyibPay (Premium)

Built: `api/src/pay.js`. The checkout in Khayr.html sends the reader to ToyyibPay (FPX online banking or card)
and back. Prices live on the server (Monthly RM19.90 for 30 days, Annual RM179.10 for 365 days, Lifetime RM358.20).
ToyyibPay has no automatic renewal, so Monthly and Annual are one payment each; paying again early adds the time on.

- `POST /api/pay/create {plan}` makes the bill; the order is saved in table `baikusers` (partition `order`).
- `POST /api/pay/callback` is ToyyibPay's notice. It is not trusted: the server asks ToyyibPay
  (`getBillTransactions`) whether the bill was paid, in full, for that order, before granting anything.
- `GET /api/pay/status?order=` does the same check when the reader returns, so it works even if the callback is late.
- Premium is stored on the account (`premiumPlan`, `premiumUntil`, `premiumLife`) and returned by `/api/auth/me`.

Setup (start in sandbox):
1. Make an account at https://dev.toyyibpay.com (sandbox) and copy the **User Secret Key** from the dashboard.
2. Create a category: `node api/tools/toyyibpay-setup.js <secret> sandbox` (or in the dashboard).
3. App settings (baikapp → Environment variables): `TOYYIBPAY_SECRET`, `TOYYIBPAY_CATEGORY`, `TOYYIBPAY_ENV=sandbox`.
   Optional `PUBLIC_BASE_URL=https://baikapp.com` if the return/callback address should be fixed.
4. When ready for real money: an approved account at https://toyyibpay.com, a new secret and category from it,
   and `TOYYIBPAY_ENV=live`.

Local test: `TOYYIBPAY_SECRET=… TOYYIBPAY_CATEGORY=… node api/dev-server.js`. ToyyibPay cannot reach
localhost for the callback, but the return check confirms the payment anyway.
