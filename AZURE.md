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
