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
      {/* Botón flotante nativo para Android / Chrome */}
      {deferredPrompt && (
        <aside
          aria-label="Instalación de la aplicación"
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            width: "calc(100% - 32px)",
            maxWidth: 420,
            background: "#181513",
            border: "1.5px solid #c81e22",
            borderRadius: 14,
            padding: "12px 16px",
            boxShadow: "0 12px 35px rgba(0,0,0,0.85), 0 0 20px rgba(200,30,34,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(200,30,34,0.15)",
              border: "1px solid #c81e22",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c81e22",
              flexShrink: 0
            }}>
              <Download size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>Instalar Obento Rider</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Acceso directo y pantalla completa</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={handleInstallClick}
              style={{
                background: "#c81e22",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                borderRadius: 8,
                fontWeight: 900,
                fontSize: 12,
                cursor: "pointer",
                letterSpacing: "0.5px"
              }}
            >
              INSTALAR
            </button>
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                padding: 4,
                display: "flex"
              }}
              title="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </aside>
      )}

      {/* Banner de ayuda para iPhone / iPad en Safari */}
      {isIOS && !deferredPrompt && (
        <aside
          aria-label="Instrucciones de instalación para iOS"
          style={{
            margin: "12px 0",
            padding: "10px 14px",
            background: "rgba(200,30,34,0.08)",
            border: "1px dashed rgba(200,30,34,0.35)",
            borderRadius: 10,
            fontSize: 12,
            color: "rgba(255,255,255,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Smartphone size={16} color="#c81e22" />
            <span>
              <strong>Instalar en iPhone:</strong> Pulsa Compartir <span style={{ fontSize: 13 }}>⎋</span> y selecciona <em>"Añadir a pantalla de inicio"</em>.
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
          >
            <X size={14} />
          </button>
        </aside>
      )}
    </>
  );
}
