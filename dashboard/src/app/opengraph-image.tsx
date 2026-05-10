import { ImageResponse } from "next/og";

export const alt = "Radicle profile dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          backgroundColor: "#08090b",
          backgroundImage:
            "radial-gradient(circle at 18% 22%, rgba(180,244,129,0.22), transparent 55%), radial-gradient(circle at 82% 8%, rgba(110,86,207,0.18), transparent 50%)",
          color: "#f5f5f7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            color: "#a1a1aa",
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, #b4f481 0%, #6e56cf 100%)",
              color: "#0a1102",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            rp
          </div>
          radprofile.xyz
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.05,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>A beautiful public face</span>
          <span style={{ display: "flex", flexDirection: "row", gap: 16 }}>
            <span>for your</span>
            <span
              style={{
                backgroundImage:
                  "linear-gradient(120deg, #b4f481 0%, #a4f1ff 60%, #c8a9ff 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Radicle node.
            </span>
          </span>
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 28,
            color: "#a1a1aa",
            maxWidth: 900,
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          Open-source Next.js site that reads radicle-httpd and presents your
          repositories with the polish of a modern developer hub.
        </div>
      </div>
    ),
    size,
  );
}
