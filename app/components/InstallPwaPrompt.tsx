"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya corre instalada en pantalla completa
    const isApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone;
    setIsStandalone(Boolean(isApp));

    // 2. Detectar iOS (Safari)
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    // 3. Capturar evento nativo de instalación (Android/Chrome)
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || dismissed) return null;

  return (
    <>
      {/* Banner de instalación nativa para Android / Chrome */}
      {deferredPrompt && (
        <aside
          aria-label="Instalación de la aplicación"
          style={{
            margin: "0 0 16px 0",
            width: "100%",
            background: "linear-gradient(135deg, #1f1a17 0%, #171412 100%)",
            border: "1.5px solid #c81e22",
            borderRadius: 16,
            padding: "14px 18px",
            boxShadow: "0 8px 25px rgba(200,30,34,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(200,30,34,0.18)",
              border: "1.5px solid #c81e22",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c81e22",
              flexShrink: 0
            }}>
              <Download size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#ffffff" }}>Instalar Obento Rider</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Acceso directo a pantalla completa</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleInstallClick}
              style={{
                background: "#c81e22",
                color: "#ffffff",
                border: "none",
                padding: "10px 18px",
                borderRadius: 10,
                fontWeight: 900,
                fontSize: 14,
                cursor: "pointer",
                letterSpacing: 0.5
              }}
            >
              INSTALAR
            </button>
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                padding: 6,
                display: "flex"
              }}
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </aside>
      )}

      {/* Banner de ayuda para iPhone / iPad en Safari */}
      {isIOS && !deferredPrompt && (
        <aside
          aria-label="Instrucciones de instalación para iOS"
          style={{
            margin: "0 0 16px 0",
            padding: "12px 16px",
            background: "rgba(200,30,34,0.1)",
            border: "1.5px dashed rgba(200,30,34,0.4)",
            borderRadius: 14,
            fontSize: 14,
            color: "rgba(255,255,255,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Smartphone size={20} color="#c81e22" />
            <span>
              <strong>Instalar en iPhone:</strong> Pulsa Compartir <span style={{ fontSize: 15 }}>⎋</span> y elige <em>"Añadir a pantalla de inicio"</em>.
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 4 }}
          >
            <X size={16} />
          </button>
        </aside>
      )}
    </>
  );
}
