import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
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
          background: "#06365A",
          borderRadius: 14,
          color: "#FC6B04",
          fontSize: 34,
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: -1,
        }}
      >
        IM
      </div>
    ),
    size,
  );
}
