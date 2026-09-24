import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * Android hardware back button (only active inside the native app).
 * Open dialogs close first (Radix listens for Escape), then page history, then exit.
 */
export function useAndroidBack() {
  const router = useRouter();
  useEffect(() => {
    let remove: (() => void) | undefined;
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        const dialog = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
        if (dialog) {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          return;
        }
        const path = window.location.pathname;
        if (canGoBack && path !== "/dashboard" && path !== "/auth") router.history.back();
        else App.minimizeApp();
      });
      remove = () => handle.remove();
    })();
    return () => remove?.();
  }, [router]);
}
