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
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid #e8e8ed",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        },
      }}
    />
  );
}
