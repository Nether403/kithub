"use client";

import { useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function ViewTracker({ slug }: { slug: string }) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    const url = `${API_URL}/api/kits/${slug}/view`;

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const body = new Blob([], { type: "text/plain;charset=UTF-8" });
      navigator.sendBeacon(url, body);
      return;
    }

    void fetch(url, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      // Ignore analytics failures on public page loads.
    });
  }, [slug]);

  return null;
}
