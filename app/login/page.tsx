"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem("obento_delivery_remember") === "true";
      if (savedRemember) {
        const savedUser = localStorage.getItem("obento_delivery_user") || "";
        const savedPass = localStorage.getItem("obento_delivery_pass") || "";
        setUser(savedUser);
        setPassword(savedPass);
        setRememberMe(true);
      }
    } catch (_) {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });

      if (res.ok) {
        try {
          if (rememberMe) {
            localStorage.setItem("obento_delivery_user", user);
            localStorage.setItem("obento_delivery_pass", password);
            localStorage.setItem("obento_delivery_remember", "true");
          } else {
            localStorage.removeItem("obento_delivery_user");
            localStorage.removeItem("obento_delivery_pass");
            localStorage.removeItem("obento_delivery_remember");
          }
        } catch (_) {}
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Credenciales incorrectas");
        setLoading(false);
      }
    } catch {
      setError("Error de conexión con el servidor");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#080706",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem 1.25rem",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440, margin: "auto" }}>
        {/* Cabecera con Logo circular y títulos */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
          {/* Logo Circular */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.8), 0 0 20px rgba(200, 30, 34, 0.35)",
              border: "3px solid #c81e22",
              marginBottom: "1.25rem",
              padding: "6px",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <Image
              src="/images/logo-obento.png"
              alt="OBENTO"
              width={86}
              height={86}
              style={{ objectFit: "contain", width: "100%", height: "100%" }}
              priority
            />
          </div>

          {/* Título OBENTO */}
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "0.28em",
              color: "#ffffff",
              textTransform: "uppercase",
              paddingLeft: "0.28em",
            }}
          >
            OBENTO
          </h1>

          {/* Subtítulo rojo */}
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.26em",
              color: "#c81e22",
              textTransform: "uppercase",
              paddingLeft: "0.26em",
            }}
          >
            DELIVERY & RIDERS
          </div>
        </div>

        <style>{`
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus, 
          input:-webkit-autofill:active {
            -webkit-text-fill-color: #ffffff !important;
            -webkit-box-shadow: 0 0 0px 1000px #17181d inset !important;
            transition: background-color 5000s ease-in-out 0s !important;
            color: #ffffff !important;
          }
        `}</style>

        {/* Tarjeta del formulario */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#141210",
            border: "1.5px solid rgba(200, 30, 34, 0.3)",
            borderRadius: 18,
            padding: "2rem 1.85rem",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.85), 0 0 20px rgba(200, 30, 34, 0.1)",
          }}
        >
          {/* Campo Usuario */}
          <div style={{ marginBottom: "1.35rem" }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#a89f8d",
                marginBottom: "0.45rem",
                fontWeight: 700,
              }}
            >
              USUARIO
            </label>
            <input
              type="text"
              value={user}
              onChange={e => setUser(e.target.value)}
              placeholder="kini"
              autoComplete="username"
              required
              autoFocus
              style={{
                width: "100%",
                background: "#1c1712",
                border: "1px solid rgba(200, 30, 34, 0.25)",
                borderRadius: 9,
                padding: "0.85rem 1rem",
                color: "#ffffff",
                fontSize: 14.5,
                fontWeight: 500,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "rgba(200, 30, 34, 0.85)";
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(200, 30, 34, 0.5)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "rgba(200, 30, 34, 0.25)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Campo Contraseña */}
          <div style={{ marginBottom: "1.75rem" }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#a89f8d",
                marginBottom: "0.45rem",
                fontWeight: 700,
              }}
            >
              CONTRASEÑA
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              style={{
                width: "100%",
                background: "#1c1712",
                border: "1px solid rgba(200, 30, 34, 0.25)",
                borderRadius: 9,
                padding: "0.85rem 1rem",
                color: "#ffffff",
                fontSize: 14.5,
                fontWeight: 500,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "rgba(200, 30, 34, 0.85)";
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(200, 30, 34, 0.5)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "rgba(200, 30, 34, 0.25)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Checkbox Recordar Contraseña */}
          <div style={{ marginBottom: "1.45rem", display: "flex", alignItems: "center" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                cursor: "pointer",
                fontSize: 13.5,
                color: "#d1d5db",
                userSelect: "none",
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: "#c81e22",
                  cursor: "pointer",
                  borderRadius: 4,
                }}
              />
              <span>Recordar contraseña</span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: "1.25rem",
                padding: "0.65rem 0.85rem",
                borderRadius: 8,
                background: "rgba(200, 30, 34, 0.15)",
                border: "1px solid rgba(200, 30, 34, 0.4)",
                fontSize: 12.5,
                color: "#fca5a5",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {/* Botón Entrar */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#7f1d1d" : "#c81e22",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              padding: "0.95rem 1rem",
              fontSize: 13.5,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 18px rgba(200, 30, 34, 0.35)",
              transition: "transform 100ms, filter 150ms",
              outline: "none",
            }}
            onMouseEnter={e => {
              if (!loading) e.currentTarget.style.filter = "brightness(1.1)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.filter = "none";
            }}
            onMouseDown={e => {
              if (!loading) e.currentTarget.style.transform = "scale(0.99)";
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = "none";
            }}
          >
            {loading ? "Accediendo..." : "Entrar al Terminal"}
          </button>
        </form>

        {/* Pie */}
        <div
          style={{
            marginTop: "1.75rem",
            textAlign: "center",
            fontSize: 11,
            color: "#52525b",
            letterSpacing: "0.06em",
          }}
        >
          OBENTO · Sistema de Reparto y Gestión de Riders
        </div>
      </div>
    </div>
  );
}
