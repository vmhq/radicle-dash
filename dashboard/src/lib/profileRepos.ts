/**
 * Profile configuration.
 *
 * Everything here is overridable via environment variables — the defaults
 * are intentionally generic placeholders so a fresh clone renders a sensible
 * "configure me" state rather than someone else's identity.
 *
 * To make the profile yours, set these in `dashboard/.env.local`:
 *   - RADICLE_PROFILE_ALIAS
 *   - RADICLE_DELEGATE_DID
 *   - RADICLE_REPO_IDS         (comma-separated)
 *   - RADICLE_PROFILE_BIO      (optional)
 *   - RADICLE_PROFILE_LINKS    (optional, "label:url, label:url")
 *   - RADICLE_PROFILE_AVATAR_URL (optional, /file-in-public or https URL)
 *
 * See `dashboard/.env.example` for the full list with examples.
 */

/**
 * Default RIDs used when `RADICLE_REPO_IDS` is unset.
 * Empty by default — the `/profile` page will render an "configure me"
 * empty state until you point it at your own repos.
 */
export const DEFAULT_PROFILE_REPO_IDS: readonly string[] = [];

export function getProfileRepoIds(): string[] {
  const raw = process.env.RADICLE_REPO_IDS;
  if (raw?.trim()) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [...DEFAULT_PROFILE_REPO_IDS];
}

/** Placeholder DID used when `RADICLE_DELEGATE_DID` is unset. */
export const PROFILE_DELEGATE_DID =
  process.env.RADICLE_DELEGATE_DID ?? "did:key:z6Mk...your-did-here";

/** Placeholder alias used when `RADICLE_PROFILE_ALIAS` is unset. */
export const PROFILE_ALIAS =
  process.env.RADICLE_PROFILE_ALIAS ?? "your-alias";

/** Optional one-line bio shown beneath the alias. */
export const PROFILE_BIO = process.env.RADICLE_PROFILE_BIO?.trim() ?? "";

/**
 * Optional avatar image URL. Anything `<img src>` will accept (https URL,
 * data: URL, or a path under `/public`). Falls back to a generative monogram.
 */
export const PROFILE_AVATAR_URL =
  process.env.RADICLE_PROFILE_AVATAR_URL?.trim() ?? "";

export type ProfileLink = { label: string; href: string };

/**
 * Parse `RADICLE_PROFILE_LINKS` into a list of `{label, href}`.
 * Format: `label1:url1, label2:url2`.
 * Use the URL scheme for things like email (`email:mailto:you@example.com`).
 */
export function getProfileLinks(): ProfileLink[] {
  const raw = process.env.RADICLE_PROFILE_LINKS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const colon = entry.indexOf(":");
      if (colon === -1) return { label: "link", href: entry };
      return {
        label: entry.slice(0, colon).trim(),
        href: entry.slice(colon + 1).trim(),
      };
    })
    .filter((l) => l.href);
}
