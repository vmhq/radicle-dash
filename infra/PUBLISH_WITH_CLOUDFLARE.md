# Publish to the public internet with Cloudflare Tunnel

This guide takes **M3** (your temporary home server) from a fresh state — `rad` is installed and a node is running, but nothing else — to a fully exposed public deployment.

It covers, in order:

1. Moving the dashboard codebase from M1 (your dev machine) to M3 via AirDrop.
2. Bringing up `radicle-httpd` and the dashboard on M3.
3. Pointing two public URLs at M3 via Cloudflare Tunnel — **without** opening any router ports and **without** ever exposing your home IP.

The setup is built to be reused: one Cloudflare account, one tunnel per machine, multiple hostnames per tunnel. The same pattern works for any future projects.

> **Cost:** $0/month. You only pay for domain registration (typically ~$10/yr per domain via Cloudflare Registrar at-cost).

---

## 0. Move the project from M1 to M3 (one-time)

You're moving the dashboard codebase, infra config, and any **avatar image** you put under `dashboard/public/` from M1 (where you built it) to M3. M3 already has `rad`, a node, and `radicle-httpd` running — it just doesn't have the dashboard yet, and probably doesn't have the same repositories seeded.

### 0a. On M1: bundle the project (two files)

The codebase is gitignored to keep personal data out of the rad push, so we build **two** small archives and AirDrop both. They land in `~/Downloads` on M3 and slot together cleanly.

**File 1 — codebase (safe, no personal info, ~500 KB):**

```bash
python3 ~/Documents/project_backups/backup_project.py \
  ~/Documents/built_with_cursor/radicle
```

Prints something like `~/Documents/project_backups/radicle_<timestamp>.tar.gz`.

**File 2 — personal overlay (`.env.local` + optional avatar, small):**

```bash
cd ~/Documents/built_with_cursor/radicle
# Always include .env.local. If you use a local image for RADICLE_PROFILE_AVATAR_URL,
# append those paths on the same line (e.g. dashboard/public/me.jpg).
tar -czf ~/Documents/project_backups/radicle_personal.tar.gz dashboard/.env.local
```

This file is *deliberately* outside the codebase tarball. Treat it like an SSH key: keep it on Mac-to-Mac AirDrop only, never check it into a repo, never email it.

### 0b. AirDrop both bundles to M3

In Finder on M1: navigate to `~/Documents/project_backups/`, select **both** `.tar.gz` files (cmd-click), **Share → AirDrop**, pick M3. Both files land in `~/Downloads` on M3.

### 0c. On M3: install Node.js (the only missing tool)

The dashboard is a Next.js app, so M3 needs Node:

```bash
brew install node
node --version   # confirm
```

That's the only required install — `radicle-httpd` is already running, and Caddy isn't needed because the Cloudflare Tunnel in section 6 hits the upstream ports directly.

> **If you ever set up a fresh Mac and `radicle-httpd` is *not* already installed,** download `radicle-httpd-<version>-aarch64-apple-darwin.tar.xz` from <https://radicle.xyz>, extract it to `~/.radicle/bin/`, `chmod +x`, then add that directory to `PATH`.

### 0d. On M3: extract both bundles and install dependencies

```bash
# 1. Extract the codebase
cd ~/Documents
tar -xzf ~/Downloads/radicle_2*.tar.gz   # creates ~/Documents/radicle/

# 2. Overlay the personal bundle (.env.local and any files you added to the tar)
cd ~/Documents/radicle
tar -xzf ~/Downloads/radicle_personal.tar.gz

# 3. Install dependencies
cd dashboard
npm install
```

After step 2 you should see:

```
dashboard/.env.local        ← your alias, DID, RIDs, bio, links
dashboard/public/…        ← only if you included avatar file(s) in the personal tar
```

Open `.env.local` if you want to tweak anything M3-specific (e.g. flip `RADICLE_HTTP_BASE` if `radicle-httpd` is on a non-default port).

> **Heads-up:** `.env.local` is your personal config. AirDrop is end-to-end encrypted between trusted Macs, but never email or upload `radicle_personal.tar.gz` anywhere public.

### 0e. On M3: seed the same repos so the profile is populated

The profile page renders whichever RIDs M3's node has data for. Pull the list from your `.env.local` (the source of truth) and seed them in one shot:

```bash
grep -oE 'rad:[a-zA-Z0-9]+' \
  ~/Documents/radicle/dashboard/.env.local \
  | sort -u | xargs -n1 rad seed
```

Give the node a minute to fetch from peers; `rad ls` should then show all 9 repositories.

### 0f. On M3: build and start both Next.js sites

`radicle-httpd` and `rad node` are already running on M3, so all that's left is the dashboard. In two terminal tabs:

```bash
# Tab 1 — build once, then start the personal site (port 3100)
cd ~/Documents/radicle/dashboard
npm run build
SITE_MODE=personal PORT=3100 npm start

# Tab 2 — start the marketing site (port 3200)
cd ~/Documents/radicle/dashboard
SITE_MODE=marketing PORT=3200 npm start
```

> Both `npm start` commands run the same already-built `.next/` output. Build once, run twice.

### 0g. On M3: verify locally before exposing anything

```bash
curl -sI http://127.0.0.1:8090/api/v1/node | head -1   # 200 OK (radicle-httpd)
curl -sI http://127.0.0.1:3100/profile      | head -1   # 200 OK (personal)
curl -sI http://127.0.0.1:3200              | head -1   # 200 OK (marketing)
```

Open `http://localhost:3100/profile` in M3's browser — your repos, avatar, bio, heatmap, and recent activity should all render. If they do, M3 is in the same state M1 is in, and you can publish it. Continue with section 1.

---

## 1. Choose two domain names

You'll need at least one real domain (a TLD, not just a name). Cloudflare doesn't sell `.profile` (it's not a real TLD) — pick from `.com`, `.dev`, `.me`, `.xyz`, `.app`, `.io`, etc.

Suggestions:
- Personal: `yourname.dev`, `yourname.me`, `yourhandle.xyz`
- Project: `radprofile.xyz`, `radpage.dev`, `<your_word>.dev`

**Tip:** you can run *both* sites on subdomains of one domain — `yourname.dev` for personal and `lab.yourname.dev` for the project. Saves you one registration.

Pick whatever you want and have them registered (Cloudflare Registrar, Namecheap, Porkbun all work).

---

## 2. Create your Cloudflare account (one for everything)

1. Go to <https://dash.cloudflare.com/sign-up> and create one account. Use this account for **all** your projects going forward — Cloudflare's free tier comfortably covers many sites.
2. Click **Add a site**, paste your domain (e.g. `yourname.dev`), pick the **Free** plan.
3. Cloudflare will give you two nameservers (e.g. `kara.ns.cloudflare.com`, `theo.ns.cloudflare.com`). Set them on your domain registrar's control panel. Wait for the change to propagate (5 min – 24 hours; usually fast).
4. Repeat for any other domain you want to manage.

---

## 3. Install `cloudflared` on M3

```bash
brew install cloudflared
cloudflared --version
```

Authenticate it with your Cloudflare account:

```bash
cloudflared tunnel login
```

A browser window opens. Pick the domain (zone) you want this tunnel to be associated with. A cert file gets saved at `~/.cloudflared/cert.pem`.

---

## 4. Create one named tunnel for this machine

A "tunnel" is a persistent connection from your machine to Cloudflare. You can route many hostnames through a single tunnel.

```bash
cloudflared tunnel create m3-laptop
```

Output includes a tunnel UUID and writes a credentials file at `~/.cloudflared/<UUID>.json`. Note that UUID; you'll need it.

---

## 5. Map hostnames to the tunnel

Each hostname becomes a CNAME record pointing at the tunnel.

```bash
cloudflared tunnel route dns m3-laptop yourname.dev
cloudflared tunnel route dns m3-laptop radprofile.xyz
# Optional: expose the API too
cloudflared tunnel route dns m3-laptop api.yourname.dev
```

Cloudflare creates the DNS records automatically inside your zone.

---

## 6. Tell the tunnel which local services to send each hostname to

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: m3-laptop
credentials-file: /Users/<you>/.cloudflared/<UUID>.json

ingress:
  - hostname: yourname.dev
    service: http://127.0.0.1:3100      # personal Next.js
  - hostname: radprofile.xyz
    service: http://127.0.0.1:3200      # marketing Next.js
  - hostname: api.yourname.dev
    service: http://127.0.0.1:8090      # radicle-httpd
  - service: http_status:404            # required catch-all
```

Replace `<you>` and `<UUID>` with real values, and the hostnames with whatever you registered.

> **Why bypass Caddy?** When everything is on one machine, Cloudflare Tunnel can hit the upstream Next.js / radicle-httpd ports directly. Cloudflare terminates TLS for you, so you don't need Caddy's auto-HTTPS. **Keep** Caddy for the local `*.localhost` URLs and for any future deployment where you don't use Cloudflare.

---

## 7. Run the tunnel — and make it survive reboots

Test it in the foreground:

```bash
cloudflared tunnel run m3-laptop
```

Visit your URLs in a browser. Cloudflare provisions TLS automatically on first request.

When you're happy, install it as a persistent service:

```bash
sudo cloudflared service install
```

It now starts at boot and survives logouts. Verify:

```bash
sudo launchctl list | grep cloudflared
```

To stop / start later:

```bash
sudo launchctl bootout system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

---

## 8. Reuse for your other Cursor projects

For every new project on this same M3:

1. Pick a hostname (subdomain of an existing domain works great: `myapp.yourname.dev`).
2. `cloudflared tunnel route dns m3-laptop myapp.yourname.dev`
3. Add an entry to `~/.cloudflared/config.yml`:
   ```yaml
   - hostname: myapp.yourname.dev
     service: http://127.0.0.1:<port>
   ```
4. Restart the tunnel service so it picks up the new config:
   ```bash
   sudo launchctl bootout system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
   sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
   ```

You can run **as many hostnames as you want** through the single `m3-laptop` tunnel. Free.

When you stand up the Mac mini home server later, you'll create a second tunnel called `mac-mini`, install `cloudflared` the same way, move the relevant `ingress` entries into its `config.yml`, and the public URLs follow you. (DNS routes belong to the tunnel they were created with, so to migrate you'd `cloudflared tunnel route dns mac-mini yourname.dev` to repoint the CNAME — Cloudflare updates it in seconds.)

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `bad gateway` in browser | Local service on the listed port isn't running. Start the Next.js / radicle-httpd process. |
| `host not found` for the new domain | DNS hasn't propagated. Wait a few minutes; verify CNAME exists in the Cloudflare DNS panel. |
| 5xx after editing `config.yml` | YAML indent error. Run `cloudflared tunnel ingress validate`. |
| Page works locally but not over the tunnel | Make sure the upstream isn't bound to `127.0.0.1` *only* and you're sending the tunnel to that address; that's fine. Check `cloudflared tunnel info m3-laptop`. |
| `/profile` on M3 looks empty | M3's node hasn't seeded the RIDs yet. Re-run the `grep … xargs rad seed` one-liner from step 0e and wait a minute. |
