export function getRadicleHttpBase(): string {
  const raw = process.env.RADICLE_HTTP_BASE ?? "http://127.0.0.1:8090";
  return raw.replace(/\/$/, "");
}

/** True when `RADICLE_HTTP_BASE` points at loopback (typical self-hosted setup). */
export function isRadicleHttpBaseLoopback(): boolean {
  try {
    const u = new URL(getRadicleHttpBase());
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch {
    return false;
  }
}

/**
 * Text for public UI (footer, hints) — never expose raw `127.0.0.1` to visitors.
 * Set `NEXT_PUBLIC_RADICLE_HTTP_LABEL` to override (e.g. `https://api.example.com`
 * or a short label) once you expose radicle-httpd on a public hostname.
 */
export function getRadicleHttpPublicLabel(): string {
  const custom = process.env.NEXT_PUBLIC_RADICLE_HTTP_LABEL?.trim();
  if (custom) return custom;
  if (isRadicleHttpBaseLoopback()) {
    return "This server’s radicle-httpd (local, read-only)";
  }
  return getRadicleHttpBase();
}

/**
 * Base origin for Explorer links (`/nodes/<host>/<rid>`).
 * Override if you use another Explorer deployment (e.g. app.radicle.xyz).
 */
export function getExplorerOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_RADICLE_EXPLORER_ORIGIN ?? "https://radicle.network";
  return raw.replace(/\/$/, "");
}

/**
 * Node hostname embedded in Explorer URLs. The Explorer UI loads repo data
 * from this node — if it does not replicate your RID yet, the page can error
 * after navigation. Point at a seed that hosts your repos (see FAQ).
 */
export function getExplorerNode(): string {
  return process.env.NEXT_PUBLIC_RADICLE_EXPLORER_NODE ?? "iris.radicle.network";
}

/**
 * `marketing` – product site: keeps the landing page at `/`, profile is shown as a live demo.
 * `personal`  – your own profile: `/` redirects to `/profile`; marketing chrome is hidden.
 */
export type SiteMode = "marketing" | "personal";

export function getSiteMode(): SiteMode {
  const raw = process.env.SITE_MODE ?? process.env.NEXT_PUBLIC_SITE_MODE;
  return raw === "personal" ? "personal" : "marketing";
}
