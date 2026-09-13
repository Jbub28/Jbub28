import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a3161",
          color: "#f0c43a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 180,
          fontWeight: 700,
        }}
      >
        EG
      </div>
    ),
    size,
  );
}
