import { ImageResponse } from "next/og";

export const alt = "Iron Mallas — Mallas de seguridad en Santiago de Chile";
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
          justifyContent: "center",
          padding: "72px 80px",
          background: "linear-gradient(120deg, #031726 0%, #06365A 65%, #0D4670 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: "#FC6B04", fontWeight: 700 }}>
          IRON MALLAS.CL
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 940 }}>
          Mallas de seguridad en Santiago de Chile
        </div>
        <div style={{ display: "flex", width: 140, height: 10, marginTop: 36, borderRadius: 6, background: "#FC6B04" }} />
        <div style={{ display: "flex", marginTop: 32, fontSize: 34, color: "#D9E6F0" }}>
          Seguridad real. Trabajo bien hecho.
        </div>
      </div>
    ),
    size,
  );
}
