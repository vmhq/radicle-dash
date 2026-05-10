# Published repositories tracker (per-user)

Copy this file to **`PUBLISHED_REPOS.md`** in your clone if you want a local
RID list. That filename is **gitignored** so your table never ships with the
repo. The dashboard reads profile RIDs from **`RADICLE_REPO_IDS`** in
`dashboard/.env.local`, not from `PUBLISHED_REPOS.md`.

> If you cloned this repo: replace the table below with your own RIDs as
> you publish, then either set `RADICLE_REPO_IDS` in `dashboard/.env.local`
> or delete `PUBLISHED_REPOS.md` entirely.

## Format

| # | Name | RID | Explorer link |
|---|------|-----|---------------|
| 1 | example-repo | `rad:zXxx…` | https://radicle.network/nodes/<seed>/rad%3AzXxx… |

## How to publish a repo

```bash
cd /path/to/your/project
rad init                        # creates a Radicle identity for the repo
git push rad main               # subsequent pushes only need this
rad seed <rid>                  # tell your node to keep a copy
```

Then add a row to the table above and (optionally) append the RID to
`RADICLE_REPO_IDS` in `dashboard/.env.local` so it shows up on `/profile`.
