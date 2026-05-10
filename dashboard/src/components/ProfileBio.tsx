import { AtSign, ExternalLink, Globe2, Link as LinkIcon, Mail } from "lucide-react";
import type { ProfileLink } from "@/lib/profileRepos";

type ProfileBioProps = {
  bio?: string;
  links: ProfileLink[];
};

export function ProfileBio({ bio, links }: ProfileBioProps) {
  if (!bio && links.length === 0) return null;
  return (
    <div className="mt-4 space-y-3">
      {bio && (
        <p className="max-w-xl text-sm leading-relaxed text-muted-strong">
          {bio}
        </p>
      )}
      {links.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-strong transition hover:border-border-strong hover:text-foreground"
              >
                {iconFor(link.label)}
                <span className="capitalize">{link.label}</span>
                <ExternalLink size={10} className="opacity-60" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function iconFor(label: string) {
  const l = label.toLowerCase();
  if (l.includes("mail") || l.includes("email")) return <Mail size={11} />;
  if (
    l.includes("site") ||
    l.includes("web") ||
    l.includes("home") ||
    l.includes("blog")
  ) {
    return <Globe2 size={11} />;
  }
  if (
    l === "x" ||
    l === "@" ||
    l.includes("mastodon") ||
    l.includes("bsky") ||
    l.includes("bluesky") ||
    l.includes("twitter") ||
    l.includes("threads")
  ) {
    return <AtSign size={11} />;
  }
  return <LinkIcon size={11} />;
}
