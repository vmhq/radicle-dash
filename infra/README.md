# Infra: Caddy reverse proxy + publish guides

This folder powers two things:

1. **Local reverse proxy** — Caddy serves `personal.localhost`, `marketing.localhost`, and `api.localhost` from this Mac.
2. **Publish recipes** — how to put the same setup on the public internet without surprise billing.

The system Caddy is shared across all your Cursor projects (one Caddy instance, many project snippets). Same setup runs on your laptop today and any Mac/Linux box you migrate to later.

## Files

| Path | Purpose |
|------|---------|
| `sites/radicle-dashboard.caddy` | This project's site blocks (`personal.localhost`, `marketing.localhost`, `api.localhost`). Symlinked into the shared `~/.config/caddy/conf.d/`. |
| `api-landing/index.html` | Styled landing page Caddy serves at `http://api.localhost/` so the API root isn't blank in the browser. The `/api/*` paths still proxy to `radicle-httpd`. |
| `Caddyfile` | Standalone Caddyfile (for ad-hoc testing only). |
| `caddy-start.sh` | Foreground runner for the standalone file. |
| `PUBLISH_WITH_CLOUDFLARE.md` | Step-by-step guide to put the dashboard on the public internet (recommended for M3 today and Mac mini later). |

## Hostnames in local development

| URL | Backend |
|-----|---------|
| `http://personal.localhost`  | Next.js with `SITE_MODE=personal` (port 3100) |
| `http://marketing.localhost` | Next.js with `SITE_MODE=marketing` (port 3200) |
| `http://api.localhost`       | Styled landing page + proxy to `radicle-httpd` (port 8090) |

`*.localhost` resolves to `127.0.0.1` automatically on macOS — no `/etc/hosts` edits needed.

## How the shared Caddy is wired

```
brew install caddy
brew services start caddy            # auto-starts at login

# /opt/homebrew/etc/Caddyfile  -> imports ~/.config/caddy/conf.d/*.caddy
# ~/.config/caddy/conf.d/radicle-dashboard.caddy
#     -> symlink to infra/sites/radicle-dashboard.caddy
```

### One-time setup on a new machine

1. `brew install caddy`
2. Save the system Caddyfile at `/opt/homebrew/etc/Caddyfile`:
   ```
   { auto_https off }
   import /Users/<you>/.config/caddy/conf.d/*.caddy
   ```
3. `mkdir -p ~/.config/caddy/conf.d`
4. Export the absolute path to this repo so Caddy can find `api-landing/`:
   ```bash
   echo 'export RADICLE_DASHBOARD_DIR="$HOME/Documents/radicle"' >> ~/.zshrc
   source ~/.zshrc
   ```
5. From the repo root: `web-add "$PWD/infra/sites/radicle-dashboard.caddy"`
6. `brew services start caddy`

## Helper commands (already on `PATH` via `~/.radicle/bin`)

| Command | What it does |
|---------|--------------|
| `web-add <abs-path-to.caddy>`  | Symlink a project's snippet into `~/.config/caddy/conf.d/` and `caddy reload`. |
| `web-remove <filename.caddy>` | Remove a snippet and reload. |
| `web-status` | Show service status, registered snippets, and listening ports. |

## Local dev quickstart

```bash
# 1. Radicle node + HTTP API (one terminal)
radicle-start

# 2. Personal Next.js, port 3100 (second terminal)
cd dashboard
SITE_MODE=personal PORT=3100 npm run dev

# 3. Marketing Next.js, port 3200 (third terminal — only if you want both URLs locally)
cd dashboard
SITE_MODE=marketing PORT=3200 npm run dev

# 4. Caddy is already running as a brew service.
#    Visit http://personal.localhost / http://marketing.localhost / http://api.localhost
```

To pause the shared Caddy: `brew services stop caddy`. To bring it back: `brew services start caddy`.

## Adding a new project's site to this Caddy

In the new project, create `infra/sites/<project>.caddy`:

```
http://<project>.localhost {
  encode zstd gzip
  reverse_proxy 127.0.0.1:<port>
}
```

Then:

```bash
web-add /absolute/path/to/<project>/infra/sites/<project>.caddy
```

That's it. Done in two seconds, no Caddy restart needed (Caddy reloads live).

## Going public

See [`PUBLISH_WITH_CLOUDFLARE.md`](./PUBLISH_WITH_CLOUDFLARE.md) for a step-by-step Cloudflare Tunnel guide that gives you `https://yourname.dev` and `https://radprofile.xyz` (or whatever names you pick) with $0/month hosting cost, no router port-forward, and no surprise billing.
