import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #b4f481 0%, #6e56cf 100%)",
          borderRadius: 8,
          color: "#0a1102",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: -1,
        }}
      >
        rp
      </div>
    ),
    size,
  );
}
