"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
};

export function CopyButton({ value, label = "Copy", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          // ignore: clipboard not available
        }
      }}
      aria-label={copied ? "Copied to clipboard" : label}
      className={
        "inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-surface px-2.5 py-1 text-xs text-muted-strong transition hover:border-border-strong hover:text-foreground " +
        (className ?? "")
      }
    >
      {copied ? (
        <>
          <Check size={13} className="text-accent" />
          Copied
        </>
      ) : (
        <>
          <Copy size={13} />
          {label}
        </>
      )}
    </button>
  );
}
