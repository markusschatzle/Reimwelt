# Deploying Reimwelt to a VPS (netcup)

Two long-running services behind nginx:

- **FastAPI** (`uvicorn`) on `127.0.0.1:8000`
- **Next.js** (`next start`) on `127.0.0.1:3000`

nginx terminates TLS and routes `/api/*` → FastAPI, everything else → Next.js.
Both run under systemd. Example paths below use `/opt/reimwelt` and a `reimwelt`
user — adjust to taste.

## 0. Prerequisites

- Ubuntu/Debian VPS, a domain (`reimwelt.de`) pointed at it
- PostgreSQL 14+, Python 3.11+, Node.js 18+ (`node -v`), nginx, certbot
- A dedicated user: `sudo useradd -r -m -d /opt/reimwelt reimwelt`

## 1. Code + Python backend

```bash
sudo -u reimwelt -H bash
cd /opt/reimwelt
git clone <repo> .            # or rsync the project here
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Create `/opt/reimwelt/.env` (read by `api.py` via python-dotenv):

```
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/rhymes
ALLOWED_ORIGINS=https://reimwelt.de
# ESPEAK_TIMEOUT / DEFAULT_LIMIT / DEFAULT_SORT_MODE are optional
```

## 2. Restore the database

The DB is shipped as a Postgres custom-format dump (`rhymes_full_backup.dump`),
not committed — copy it to the server, then:

```bash
sudo -u postgres createdb rhymes
sudo -u postgres pg_restore --no-owner --dbname=rhymes /path/to/rhymes_full_backup.dump
```

(Alternatively rebuild from scratch: `python etl.py --input data/raw-wiktextract-data.jsonl.gz --db $DATABASE_URL --languages de en`, then the helpers in `scripts/`.)

## 3. Build the frontend

Create `/opt/reimwelt/web/.env.production` (Next loads it at **build and runtime**):

```
NEXT_PUBLIC_SITE_URL=https://reimwelt.de
INTERNAL_API_URL=http://127.0.0.1:8000
SSG_WORD_LIMIT=1000        # prebuilt word pages/lang; rest via ISR
SSG_ENDING_LIMIT=200
SSG_CROSS_LIMIT=300
# NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_ADS_ID if/when you enable analytics
```

```bash
cd /opt/reimwelt/web
npm ci
npm run build         # or: npm run build:full  (top 10k words/lang — slower, more RAM)
```

> The backend (step 1–2) must be running during the build, because
> `generateStaticParams` and `sitemap.js` fetch `INTERNAL_API_URL`. If it isn't,
> the build still succeeds but prebuilds nothing (everything falls back to ISR).

## 4. systemd services

```bash
sudo cp deploy/reimwelt-api.service deploy/reimwelt-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now reimwelt-api reimwelt-web
sudo systemctl status reimwelt-api reimwelt-web
```

Check the `ExecStart` npm path in `reimwelt-web.service` matches `command -v npm`.

## 5. nginx + TLS

```bash
sudo cp deploy/nginx-reimwelt.conf /etc/nginx/sites-available/reimwelt
sudo ln -s /etc/nginx/sites-available/reimwelt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d reimwelt.de -d www.reimwelt.de
```

Visit `https://reimwelt.de` — it redirects to `/de/reime`.

## 6. Redeploying

```bash
cd /opt/reimwelt && git pull
.venv/bin/pip install -r requirements.txt        # if backend deps changed
sudo systemctl restart reimwelt-api

cd web && npm ci && npm run build
sudo systemctl restart reimwelt-web
```

### ⚠️ ISR cache after backend data changes

SEO pages cache their backend fetches with a **weekly** `revalidate`. If you
change backend logic or data that alters *existing* pages (e.g. a synonym fix),
pages can serve stale for up to a week. To force fresh content on deploy, clear
the Next data cache before rebuilding:

```bash
cd /opt/reimwelt/web && rm -rf .next && npm run build
sudo systemctl restart reimwelt-web
```

(For surgical refreshes later, wire up Next on-demand revalidation instead of a
full rebuild.)

## Notes

- The Next config also rewrites `/api/*` → `INTERNAL_API_URL`, so the app works
  even without the nginx `/api` rule — but routing `/api` straight to uvicorn in
  nginx (as configured) is one less hop.
- ISR writes its cache under `web/.next`; keep that directory writable by the
  `reimwelt` user and persistent across restarts.
