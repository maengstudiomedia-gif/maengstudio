import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

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
          background: "#050505",
          color: "#f43f5e",
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: -6,
          fontFamily: "Arial, sans-serif",
        }}
      >
        MS
      </div>
    ),
    size
  );
}
