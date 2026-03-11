"use client";

import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  // Use top-center on mobile (avoids virtual keyboard overlap), bottom-right on desktop
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  return (
    <SonnerToaster
      position={isMobile ? "top-center" : "bottom-right"}
      toastOptions={{
        duration: 5000,
        style: {
          background: "#FFFCF7",
          border: "1px solid #E8E2D9",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        },
      }}
    />
  );
}
