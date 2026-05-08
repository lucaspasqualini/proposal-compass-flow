// Registra (ou desregistra) o Service Worker da PWA com proteções anti-iframe/preview.

export const VAPID_PUBLIC_KEY =
  "BNSNeOYuCU5vjvXvyH5tcxfkWFp9PX-LgmaeGMBjhgtgUaHY4KYZJYqcfahExnLtJAVEOrfRsSbLxhdgrpbUFt0";

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("lovableproject.com") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

export function shouldEnablePWA(): boolean {
  return !isInIframe() && !isPreviewHost();
}

export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  if (!shouldEnablePWA()) {
    // Em preview/iframe, desregistra qualquer SW antigo para evitar cache obsoleto
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      // ignore
    }
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.warn("[PWA] Falha ao registrar service worker:", err);
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}
