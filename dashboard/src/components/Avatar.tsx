import { gradientFromSeed, monogramFor } from "@/lib/visual";

type AvatarProps = {
  seed: string;
  alias: string;
  size?: number;
  className?: string;
  /**
   * Optional image URL. When set, an `<img>` is rendered inside the gradient
   * ring; otherwise we fall back to the generative monogram.
   */
  imageUrl?: string;
};

export function Avatar({
  seed,
  alias,
  size = 88,
  className,
  imageUrl,
}: AvatarProps) {
  const { cssGradient, from, to } = gradientFromSeed(seed);
  const monogram = monogramFor(alias);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        borderRadius: 9999,
        padding: 2,
        background: `conic-gradient(from 210deg at 50% 50%, ${from}, ${to}, ${from})`,
        boxShadow:
          "0 22px 60px -22px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)",
      }}
      aria-hidden
    >
      {imageUrl ? (
        <div
          className="h-full w-full overflow-hidden rounded-full"
          style={{ background: cssGradient }}
        >
          {/* Plain <img> intentional: avatar URL is user-supplied via env var,
              so we skip Next/Image's host allow-list to keep self-host simple. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`${alias} avatar`}
            width={size}
            height={size}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white"
          style={{
            background: cssGradient,
            fontSize: size * 0.36,
            letterSpacing: "-0.02em",
            textShadow: "0 1px 0 rgba(0,0,0,0.25)",
          }}
        >
          {monogram}
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0 rounded-full mix-blend-overlay"
        style={{
          background:
            "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 45%)",
        }}
      />
    </div>
  );
}
