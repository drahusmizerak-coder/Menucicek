"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Avoid dev-mode staleness: an SW caching an old build can serve stale
      // HTML/chunks after a dev-server restart and cause reload loops.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability/offline shell is a nice-to-have, not critical - ignore failures.
    });
  }, []);

  return null;
}
