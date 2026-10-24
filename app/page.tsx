"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  MapPin,
  Phone,
  MessageCircle,
  Navigation,
  Clock,
  CheckCircle2,
  Bike,
  Volume2,
  VolumeX,
  History,
  TrendingUp,
  RefreshCw,
  BellRing,
  ShieldCheck,
  UserCheck,
  PackageCheck,
  Download,
  X,
  LogOut,
  ChefHat,
  Flame
} from "lucide-react";

type ItemPedido = {
  id: number;
  nombre: string;
  porcion?: string | null;
  opcion?: string | null;
  precio: number;
  cantidad: number;
  subtotal: number;
};

type Pedido = {
  id: number;
  numero_pedido: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email?: string | null;
  tipo_entrega: string;
  direccion_entrega?: string | null;
  direccion_detalles?: string | null;
  codigo_postal?: string | null;
  repartidor_nombre?: string | null;
  fecha_salida_reparto?: string | null;
  hora_recogida?: string | null;
  notas?: string | null;
  metodo_pago: string;
  estado_pago: string;
  estado_pedido: string;
  total: number;
  created_at: string;
  tiempo_entrega_minutos?: number | null;
  items: ItemPedido[];
};

type HistorialData = {
  pedidos: Pedido[];
  porHora: { hora: number; total_pedidos: number; promedio_minutos: number; total_facturado: number }[];
  porDia: { fecha: string; total_pedidos: number; entregados: number; promedio_minutos: number; total_facturado: number }[];
};

export default function DeliveryHomePage() {
  const [activeTab, setActiveTab] = useState<"activos" | "preparacion" | "historial">("activos");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [historial, setHistorial] = useState<HistorialData>({ pedidos: [], porHora: [], porDia: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [riderName, setRiderName] = useState("Repartidor 1");
  const [isEditingRider, setIsEditingRider] = useState(false);
  const [tempRiderName, setTempRiderName] = useState("");
  const [soundTested, setSoundTested] = useState(false);
  const [selectedHistorialPedido, setSelectedHistorialPedido] = useState<Pedido | null>(null);

  // Separación de pedidos para Repartos (Listos / En Camino) y Pedidos en Preparación (Cocina / Entrada)
  const pedidosActivos = useMemo(() => {
    return pedidos.filter(
      p => p.estado_pedido === "listo_reparto" || p.estado_pedido === "listo" || p.estado_pedido === "en_camino" || p.estado_pedido === "en_reparto"
    );
  }, [pedidos]);

  const pedidosPreparacion = useMemo(() => {
    return pedidos.filter(
      p => p.estado_pedido !== "listo_reparto" && p.estado_pedido !== "listo" && p.estado_pedido !== "en_camino" && p.estado_pedido !== "en_reparto"
    );
  }, [pedidos]);

  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("obento_rider_name");
    if (saved) {
      setRiderName(saved);
      setTempRiderName(saved);
    } else {
      setTempRiderName("Repartidor 1");
    }

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPwaBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowPwaBanner(false);
      setDeferredPrompt(null);
    }
  };

  const saveRider = () => {
    if (tempRiderName.trim()) {
      setRiderName(tempRiderName.trim());
      localStorage.setItem("obento_rider_name", tempRiderName.trim());
    }
    setIsEditingRider(false);
  };

  const playChime = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc1.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12);
      osc1.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.24);

      osc2.frequency.setValueAtTime(293.66, ctx.currentTime);
      osc2.frequency.setValueAtTime(440.00, ctx.currentTime + 0.12);
      osc2.frequency.setValueAtTime(587.33, ctx.currentTime + 0.24);

      gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.75);
      osc2.stop(ctx.currentTime + 0.75);
    } catch (_) {}
  }, [audioEnabled]);

  const testAudio = () => {
    playChime();
    setSoundTested(true);
    setTimeout(() => setSoundTested(false), 2000);
  };

  const fetchActivos = useCallback(async () => {
    try {
      const res = await fetch("/api/delivery/pedidos");
      if (res.ok) {
        const data: Pedido[] = await res.json();
        setPedidos(prev => {
          const nuevosParaSalir = data.filter(
            p => (p.estado_pedido === "listo_reparto" || p.estado_pedido === "listo") &&
                 !prev.some(old => old.id === p.id && (old.estado_pedido === "listo_reparto" || old.estado_pedido === "listo"))
          );
          if (nuevosParaSalir.length > 0 && prev.length > 0) {
            playChime();
          }
          return data;
        });
      }
    } catch (e) {
      console.warn("Error consultando pedidos activos:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [playChime]);

  const manualRefresh = () => {
    setRefreshing(true);
    fetchActivos();
    fetchHistorial();
  };

  const fetchHistorial = useCallback(async () => {
    try {
      const res = await fetch("/api/delivery/historial");
      if (res.ok) {
        const data = await res.json();
        setHistorial(data);
      }
    } catch (e) {
      console.warn("Error consultando historial:", e);
    }
  }, []);

  useEffect(() => {
    fetchActivos();
    fetchHistorial();
    const interval = setInterval(fetchActivos, 3500);
    return () => clearInterval(interval);
  }, [fetchActivos, fetchHistorial]);

  const handleStatusChange = async (id: number, nuevoEstado: string) => {
    try {
      const res = await fetch(`/api/delivery/pedidos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado_pedido: nuevoEstado,
          repartidor_nombre: riderName
        })
      });
      if (res.ok) {
        await fetchActivos();
        await fetchHistorial();
      }
    } catch (_) {
      alert("Error actualizando estado del pedido");
    }
  };

  const getMapsUrl = (p: Pedido) => {
    const address = `${p.direccion_entrega || ""}, ${p.codigo_postal || "30107"}, Murcia, España`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  };

  const getWhatsAppUrl = (p: Pedido) => {
    const cleanTel = (p.cliente_telefono || "").replace(/\D/g, "");
    const telSpain = cleanTel.startsWith("34") ? cleanTel : `34${cleanTel}`;
    const msg = `¡Hola ${p.cliente_nombre}! Soy tu repartidor de OBENTO Japanese Food 🍱. Voy en camino con tu pedido #${p.numero_pedido}. ¿Estás en el domicilio para recibirlo?`;
    return `https://wa.me/${telSpain}?text=${encodeURIComponent(msg)}`;
  };

  const stats = useMemo(() => {
    const entregadosHoy = historial.pedidos?.filter(p => p.estado_pedido === "entregado" || p.estado_pedido === "delivery_entregado") || [];
    const totalEuros = entregadosHoy.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const mediaMin = entregadosHoy.length > 0
      ? Math.round(entregadosHoy.reduce((acc, curr) => acc + (curr.tiempo_entrega_minutos || 22), 0) / entregadosHoy.length)
      : 22;
    return {
      entregadosCount: entregadosHoy.length,
      totalFacturado: totalEuros,
      promedioMinutos: mediaMin
    };
  }, [historial]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      background: "#080706",
      color: "#f5efe6",
      overflowX: "hidden"
    }}>
      {/* Contenedor tipo App Móvil centrado */}
      <div className="delivery-app-container" style={{
        width: "100%",
        maxWidth: 580,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0c0b0a",
        position: "relative",
        boxShadow: "0 0 50px rgba(0,0,0,0.8)"
      }}>
        {/* ── CABECERA DE LA APP COMPACTA ── */}
        <header style={{
          background: "#141210",
          borderBottom: "1.5px solid rgba(200,30,34,0.45)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 2px 14px rgba(0,0,0,0.85)",
          width: "100%",
          minHeight: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px"
        }}>
        {/* Logo y Nombre */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            boxShadow: "0 0 12px rgba(200,30,34,0.4)",
            border: "1.5px solid #c81e22",
            flexShrink: 0
          }}>
            <Image src="/images/logo-obento.png" alt="Obento" width={30} height={30} style={{ objectFit: "contain" }} priority />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1.2, color: "#ffffff", lineHeight: 1 }}>OBENTO</span>
              <span style={{ fontSize: 9.5, background: "#c81e22", color: "#ffffff", padding: "2px 5px", borderRadius: 4, fontWeight: 900 }}>RIDER</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
              {isEditingRider ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    type="text"
                    value={tempRiderName}
                    onChange={e => setTempRiderName(e.target.value)}
                    style={{ background: "#211e1a", border: "1.5px solid #c81e22", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 11, width: 90, outline: "none" }}
                    autoFocus
                  />
                  <button onClick={saveRider} style={{ background: "#c81e22", color: "#fff", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer", fontWeight: "bold" }}>OK</button>
                </div>
              ) : (
                <span onClick={() => setIsEditingRider(true)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }} title="Toca para cambiar nombre">
                  👤 {riderName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botones Derecha: Servicio y Salir */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setIsOnDuty(!isOnDuty)}
            style={{
              background: isOnDuty ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
              border: isOnDuty ? "1.5px solid #22c55e" : "1.5px solid #ef4444",
              padding: "5px 10px",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <span style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: isOnDuty ? "#22c55e" : "#ef4444",
              boxShadow: isOnDuty ? "0 0 8px #22c55e" : "0 0 8px #ef4444"
            }}></span>
            <span style={{ fontSize: 11, fontWeight: 900, color: isOnDuty ? "#4ade80" : "#fca5a5" }}>
              {isOnDuty ? "EN RUTA" : "PAUSADO"}
            </span>
          </button>

          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "5px 7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#a89f8d",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={e => (e.currentTarget.style.color = "#a89f8d")}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── BANNER DISCRETO DE INSTALACIÓN PWA ── */}
      {showPwaBanner && (
        <div style={{
          background: "linear-gradient(90deg, #1f1412 0%, #171210 100%)",
          borderBottom: "1.5px solid #c81e22",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Download size={22} color="#c81e22" />
            <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Instalar Obento Rider en el móvil</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleInstallPwa}
              style={{ background: "#c81e22", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 900, cursor: "pointer" }}
            >
              INSTALAR
            </button>
            <button
              onClick={() => setShowPwaBanner(false)}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 6 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── CUERPO PRINCIPAL EDGE-TO-EDGE ── */}
      <main style={{
        flex: 1,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 68
      }}>
        
        {loading ? (
          <div style={{ flex: 1, minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: "4px solid rgba(200,30,34,0.2)", borderTopColor: "#c81e22", animation: "spin 1s linear infinite", marginBottom: 24 }}></div>
            <p style={{ color: "#ffffff", fontWeight: 800, fontSize: 22 }}>Conectando terminal...</p>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, marginTop: 6 }}>Obento Central</span>
          </div>
        ) : activeTab === "activos" ? (
          
          /* ═══════════ PESTAÑA: PEDIDOS ACTIVOS ═══════════ */
          <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column" }}>
            
            {pedidosActivos.length === 0 ? (
              /* RADAR COMPACTO DE PANTALLA COMPLETA */
              <div style={{
                flex: 1,
                minHeight: "calc(100vh - 120px)",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px 14px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden"
              }}>
                
                {/* ONDAS CONCÉNTRICAS DE RADAR COMPACTAS (170px) */}
                <div style={{
                  position: "relative",
                  width: 170,
                  height: 170,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16
                }}>
                  <div className="radar-ring" style={{ width: 165, height: 165 }}></div>
                  <div className="radar-ring" style={{ width: 165, height: 165 }}></div>
                  <div className="radar-ring" style={{ width: 165, height: 165 }}></div>

                  {/* Icono central de moto iluminada */}
                  <div style={{
                    width: 68,
                    height: 68,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, #2d2621 0%, #161311 100%)",
                    border: "2px solid #c81e22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 24px rgba(200,30,34,0.55)",
                    zIndex: 2
                  }}>
                    <Bike size={32} color="#f5efe6" />
                  </div>
                </div>

                {/* Badge de Estado */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(34,197,94,0.18)",
                  border: "1.5px solid rgba(34,197,94,0.45)",
                  padding: "4px 12px",
                  borderRadius: 16,
                  marginBottom: 10
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }}></span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#4ade80", letterSpacing: 0.8, textTransform: "uppercase" }}>
                    RADAR EN SERVICIO
                  </span>
                </div>

                {/* Título y Subtítulo Compactos */}
                {pedidosPreparacion.length > 0 && (
                  <div
                    onClick={() => setActiveTab("preparacion")}
                    style={{
                      background: "rgba(245,158,11,0.14)",
                      border: "1.5px solid rgba(245,158,11,0.5)",
                      borderRadius: 12,
                      padding: "8px 12px",
                      marginBottom: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      maxWidth: 310,
                      width: "100%",
                      textAlign: "left",
                      boxShadow: "0 2px 10px rgba(245,158,11,0.15)"
                    }}
                  >
                    <ChefHat size={22} color="#fbbf24" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#fbbf24" }}>
                        {pedidosPreparacion.length} pedido{pedidosPreparacion.length > 1 ? "s" : ""} de reparto en preparación
                      </div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)" }}>
                        Toca para ver los pedidos elaborándose
                      </div>
                    </div>
                    <span style={{ fontSize: 14, color: "#fbbf24", fontWeight: 900 }}>→</span>
                  </div>
                )}

                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#ffffff", marginBottom: 6, lineHeight: 1.25 }}>
                  Esperando pedidos de cocina
                </h2>

                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, lineHeight: 1.4, maxWidth: 300, margin: "0 auto 16px" }}>
                  Mantén la pantalla encendida y el sonido activado. En cuanto cocina pulse <strong>"Repartir"</strong>, sonará la alarma.
                </p>

                {/* Botones de Utilidad Compactos */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
                  
                  <button
                    onClick={testAudio}
                    style={{
                      width: "100%",
                      minHeight: 44,
                      background: soundTested ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)",
                      border: soundTested ? "1.5px solid #22c55e" : "1px solid rgba(255,255,255,0.2)",
                      color: soundTested ? "#4ade80" : "#ffffff",
                      padding: "8px 14px",
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "all 0.2s"
                    }}
                  >
                    <BellRing size={16} color={soundTested ? "#4ade80" : "#fbbf24"} />
                    <span>{soundTested ? "¡Alarma Correcta! Suena Fuerte" : "🔔 Probar Alarma Sonora"}</span>
                  </button>

                  <button
                    onClick={manualRefresh}
                    disabled={refreshing}
                    style={{
                      width: "100%",
                      minHeight: 40,
                      background: "rgba(200,30,34,0.22)",
                      border: "1.5px solid rgba(200,30,34,0.5)",
                      color: "#fca5a5",
                      padding: "8px 14px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8
                    }}
                  >
                    <RefreshCw size={14} className={refreshing ? "spin" : ""} />
                    <span>{refreshing ? "Sincronizando..." : "Comprobar Pedidos Ahora"}</span>
                  </button>
                </div>

                <div style={{ marginTop: 16, fontSize: 10.5, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={14} color="#4ade80" />
                  <span>Sincronización en vivo cada 3.5s · Obento</span>
                </div>
              </div>
            ) : (
              /* LISTADO DE PEDIDOS ACTIVOS GIGANTES */
              <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: 20 }}>
                {pedidosActivos.map(p => {
                  const isListoParaRepartir = p.estado_pedido === "listo_reparto" || p.estado_pedido === "listo";
                  const isEnCamino = p.estado_pedido === "en_camino";
                  const isCocina = p.estado_pedido === "en_preparacion" || p.estado_pedido === "recibido" || p.estado_pedido === "preparando" || p.estado_pedido === "nuevo";
                  const isPagado = p.metodo_pago === "stripe" || p.estado_pago === "pagado";

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: "#161311",
                        borderRadius: 16,
                        border: isEnCamino
                          ? "2px solid #a855f7"
                          : isListoParaRepartir
                          ? "2px solid #fbbf24"
                          : "1.5px solid rgba(255,255,255,0.15)",
                        boxShadow: isEnCamino
                          ? "0 6px 24px rgba(168,85,247,0.25)"
                          : isListoParaRepartir
                          ? "0 6px 24px rgba(251,191,36,0.25)"
                          : "0 4px 16px rgba(0,0,0,0.5)",
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10
                      }}
                    >
                      {/* Cabecera Pedido Compacta */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        paddingBottom: 8,
                        gap: 8
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 21, fontWeight: 900, color: "#ffffff" }}>
                            #{p.numero_pedido}
                          </span>

                          {isListoParaRepartir && (
                            <span className="pulse" style={{
                              fontSize: 11,
                              fontWeight: 900,
                              padding: "3px 8px",
                              borderRadius: 8,
                              background: "#fbbf24",
                              color: "#000"
                            }}>
                              🔔 LISTO
                            </span>
                          )}

                          {isEnCamino && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 900,
                              padding: "3px 8px",
                              borderRadius: 8,
                              background: "rgba(168,85,247,0.25)",
                              color: "#c084fc",
                              border: "1px solid #c084fc"
                            }}>
                              🛵 EN REPARTO
                            </span>
                          )}

                          {isCocina && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: 8,
                              background: "rgba(255,255,255,0.1)",
                              color: "#cbd5e1"
                            }}>
                              👨‍🍳 EN COCINA
                            </span>
                          )}

                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                            {p.created_at ? new Date(p.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "Reciente"}
                          </span>
                        </div>

                        {/* Importe y Pago */}
                        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: isPagado ? "rgba(34,197,94,0.18)" : "rgba(251,191,36,0.18)",
                            color: isPagado ? "#4ade80" : "#fbbf24",
                            border: isPagado ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(251,191,36,0.4)"
                          }}>
                            {isPagado ? "✓ PAGADO ONLINE" : "💵 COBRAR EN MANO"}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", color: "#f5efe6", lineHeight: 1 }}>
                            {Number(p.total).toFixed(2)} €
                          </div>
                        </div>
                      </div>

                      {/* Bloque Destino con Google Maps Compacto */}
                      <div style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(200,30,34,0.35)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ffffff", fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>
                            <MapPin size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.direccion_entrega || "Calle Mayor, La Ñora (Murcia)"}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginLeft: 24, marginTop: 2 }}>
                            {p.direccion_detalles ? (
                              <span style={{ color: "#fde68a", fontWeight: 600 }}>🏢 {p.direccion_detalles} · </span>
                            ) : null}
                            CP {p.codigo_postal || "30107"} · La Ñora
                          </div>
                        </div>

                        {/* Botón Google Maps */}
                        <a
                          href={getMapsUrl(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flexShrink: 0,
                            height: 38,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                            color: "#ffffff",
                            textDecoration: "none",
                            fontSize: 13,
                            fontWeight: 800,
                            padding: "0 12px",
                            borderRadius: 10,
                            boxShadow: "0 2px 10px rgba(37,99,235,0.4)"
                          }}
                        >
                          <Navigation size={14} />
                          <span>Google Maps</span>
                        </a>
                      </div>

                      {/* Contacto con el Cliente: Teléfono directo + Icono WhatsApp */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ color: "rgba(255,255,255,0.6)", marginRight: 4 }}>👤</span>
                          {p.cliente_nombre}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {/* Teléfono directo */}
                          <a
                            href={`tel:${p.cliente_telefono}`}
                            style={{
                              height: 34,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "0 10px",
                              borderRadius: 8,
                              textDecoration: "none",
                              fontSize: 13,
                              fontWeight: 700,
                              background: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#ffffff"
                            }}
                          >
                            <Phone size={13} color="#60a5fa" />
                            <span>{p.cliente_telefono}</span>
                          </a>

                          {/* WhatsApp: solo icono */}
                          <a
                            href={getWhatsAppUrl(p)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            style={{
                              width: 34,
                              height: 34,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 8,
                              textDecoration: "none",
                              background: "rgba(37,211,102,0.18)",
                              border: "1px solid rgba(37,211,102,0.5)",
                              color: "#25d366"
                            }}
                          >
                            <MessageCircle size={18} />
                          </a>
                        </div>
                      </div>

                      {/* Notas (si existen) */}
                      {p.notas && (
                        <div style={{
                          background: "rgba(200,30,34,0.12)",
                          borderLeft: "3px solid #c81e22",
                          padding: "6px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "#fca5a5"
                        }}>
                          <strong>📝 Nota:</strong> {p.notas}
                        </div>
                      )}

                      {/* Mochila térmica compacta */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        background: "rgba(0,0,0,0.25)",
                        borderRadius: 8,
                        padding: "6px 8px",
                        border: "1px solid rgba(255,255,255,0.06)"
                      }}>
                        <span style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>
                          🎒 {p.items?.reduce((a, b) => a + (b.cantidad || 1), 0) || 0} platos:
                        </span>
                        {(p.items || []).map((it, idx) => (
                          <span key={idx} style={{
                            fontSize: 11,
                            background: "rgba(255,255,255,0.08)",
                            padding: "2px 6px",
                            borderRadius: 6,
                            color: "#f5efe6",
                            fontWeight: 600
                          }}>
                            <strong style={{ color: "#ef4444" }}>{it.cantidad}×</strong> {it.nombre}
                          </span>
                        ))}
                      </div>

                      {/* Botones de Cambio de Estado Compactos */}
                      <div>
                        {isListoParaRepartir && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <button
                              onClick={() => handleStatusChange(p.id, "en_camino")}
                              style={{
                                height: 42,
                                border: "none",
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: 900,
                                cursor: "pointer",
                                background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                                color: "#ffffff",
                                boxShadow: "0 4px 15px rgba(168,85,247,0.35)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6
                              }}
                            >
                              <Bike size={18} />
                              <span>🛵 SALIR A REPARTIR</span>
                            </button>

                            <button
                              onClick={() => handleStatusChange(p.id, "delivery_entregado")}
                              style={{
                                height: 42,
                                border: "none",
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: 900,
                                cursor: "pointer",
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6
                              }}
                            >
                              <CheckCircle2 size={16} />
                              <span>FINALIZAR REPARTO</span>
                            </button>
                          </div>
                        )}

                        {(isEnCamino || (!isListoParaRepartir && !isCocina)) && (
                          <button
                            onClick={() => handleStatusChange(p.id, "delivery_entregado")}
                            style={{
                              width: "100%",
                              height: 44,
                              border: "none",
                              borderRadius: 12,
                              fontSize: 15,
                              fontWeight: 900,
                              cursor: "pointer",
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              color: "#ffffff",
                              boxShadow: "0 4px 18px rgba(16,185,129,0.4)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8
                            }}
                          >
                            <CheckCircle2 size={20} />
                            <span>✓ FINALIZAR REPARTO</span>
                          </button>
                        )}

                        {isCocina && (
                          <div style={{
                            textAlign: "center",
                            padding: "8px 12px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px dashed rgba(255,255,255,0.15)",
                            borderRadius: 10,
                            fontSize: 12,
                            color: "rgba(255,255,255,0.7)"
                          }}>
                            👨‍🍳 En preparación en cocina. Alerta cuando esté listo.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "preparacion" ? (
          
          /* ═══════════ PESTAÑA: PEDIDOS EN PREPARACIÓN (EXCLUSIVO REPARTO) ═══════════ */
          <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column" }}>
            
            {/* Cabecera de la sección En Preparación */}
            <div style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(245,158,11,0.06)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(245,158,11,0.2)",
                  border: "1.5px solid rgba(245,158,11,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <ChefHat size={18} color="#fbbf24" />
                </div>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 900, color: "#ffffff", lineHeight: 1.1 }}>
                    Pedidos en Preparación
                  </h2>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)" }}>
                    Exclusivamente pedidos para reparto a domicilio
                  </span>
                </div>
              </div>

              <div style={{
                background: pedidosPreparacion.length > 0 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)",
                border: pedidosPreparacion.length > 0 ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.15)",
                color: pedidosPreparacion.length > 0 ? "#fbbf24" : "rgba(255,255,255,0.5)",
                fontSize: 11,
                fontWeight: 900,
                padding: "3px 9px",
                borderRadius: 12
              }}>
                {pedidosPreparacion.length} en cocina
              </div>
            </div>

            {pedidosPreparacion.length === 0 ? (
              /* ESTADO VACÍO CUANDO NO HAY PEDIDOS EN PREPARACIÓN */
              <div style={{
                flex: 1,
                minHeight: "calc(100vh - 160px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 16px",
                textAlign: "center"
              }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "rgba(245,158,11,0.08)",
                  border: "2px dashed rgba(245,158,11,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                  boxShadow: "0 0 20px rgba(245,158,11,0.1)"
                }}>
                  <ChefHat size={36} color="#fbbf24" />
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 6 }}>
                  No hay pedidos en preparación ahora
                </h3>

                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.45, maxWidth: 310, margin: "0 auto 16px" }}>
                  En cuanto entre un pedido de reparto a domicilio o cocina comience a elaborarlo, aparecerá automáticamente aquí en tiempo real.
                </p>

                <button
                  onClick={manualRefresh}
                  disabled={refreshing}
                  style={{
                    minHeight: 38,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#ffffff",
                    padding: "6px 14px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <RefreshCw size={14} className={refreshing ? "spin" : ""} />
                  <span>{refreshing ? "Actualizando..." : "Comprobar ahora"}</span>
                </button>
              </div>
            ) : (
              /* LISTADO DE PEDIDOS EN PREPARACIÓN */
              <div style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 14 }}>
                {pedidosPreparacion.map(p => {
                  const isCocinando = p.estado_pedido === "preparando" || p.estado_pedido === "en_preparacion";
                  const isPagado = p.metodo_pago === "stripe" || p.estado_pago === "pagado";

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: "#161311",
                        borderRadius: 14,
                        border: isCocinando ? "1.5px solid rgba(245,158,11,0.6)" : "1.5px solid rgba(56,189,248,0.4)",
                        boxShadow: isCocinando ? "0 4px 18px rgba(245,158,11,0.18)" : "0 4px 14px rgba(0,0,0,0.6)",
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10
                      }}
                    >
                      {/* Cabecera Pedido */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        paddingBottom: 8,
                        gap: 8
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 900, color: "#ffffff" }}>
                            #{p.numero_pedido}
                          </span>

                          <span className={isCocinando ? "pulse" : ""} style={{
                            fontSize: 10.5,
                            fontWeight: 900,
                            padding: "3px 8px",
                            borderRadius: 8,
                            background: isCocinando ? "rgba(245,158,11,0.22)" : "rgba(56,189,248,0.2)",
                            color: isCocinando ? "#fbbf24" : "#38bdf8",
                            border: isCocinando ? "1px solid #f59e0b" : "1px solid #38bdf8"
                          }}>
                            {isCocinando ? "👨‍🍳 COCINANDO" : "📥 ENTRADA PENDIENTE"}
                          </span>

                          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>
                            {p.created_at ? new Date(p.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "Reciente"}
                          </span>
                        </div>

                        {/* Importe y Estado de Pago */}
                        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: isPagado ? "rgba(34,197,94,0.18)" : "rgba(251,191,36,0.18)",
                            color: isPagado ? "#4ade80" : "#fbbf24",
                            border: isPagado ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(251,191,36,0.4)"
                          }}>
                            {isPagado ? "✓ PAGADO" : "💵 EN MANO"}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "monospace", color: "#f5efe6", lineHeight: 1 }}>
                            {Number(p.total).toFixed(2)} €
                          </div>
                        </div>
                      </div>

                      {/* Dirección de Destino */}
                      <div style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        padding: "8px 10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#ffffff", fontWeight: 800, fontSize: 14, lineHeight: 1.25 }}>
                            <MapPin size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.direccion_entrega || "Calle Mayor, La Ñora (Murcia)"}
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginLeft: 21, marginTop: 2 }}>
                            {p.direccion_detalles ? (
                              <span style={{ color: "#fde68a", fontWeight: 600 }}>🏢 {p.direccion_detalles} · </span>
                            ) : null}
                            CP {p.codigo_postal || "30107"} · La Ñora
                          </div>
                        </div>

                        {/* Botón Mapa */}
                        <a
                          href={getMapsUrl(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flexShrink: 0,
                            height: 32,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "rgba(29,78,216,0.25)",
                            border: "1px solid #2563eb",
                            color: "#93c5fd",
                            textDecoration: "none",
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "0 10px",
                            borderRadius: 8
                          }}
                        >
                          <Navigation size={13} />
                          <span>Ver Ruta</span>
                        </a>
                      </div>

                      {/* Contacto Cliente */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ color: "rgba(255,255,255,0.6)", marginRight: 4 }}>👤</span>
                          {p.cliente_nombre}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <a
                            href={`tel:${p.cliente_telefono}`}
                            style={{
                              height: 30,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "0 8px",
                              borderRadius: 6,
                              textDecoration: "none",
                              fontSize: 12,
                              fontWeight: 700,
                              background: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.2)",
                              color: "#ffffff"
                            }}
                          >
                            <Phone size={12} color="#60a5fa" />
                            <span>{p.cliente_telefono}</span>
                          </a>

                          <a
                            href={getWhatsAppUrl(p)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            style={{
                              width: 30,
                              height: 30,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 6,
                              textDecoration: "none",
                              background: "rgba(37,211,102,0.18)",
                              border: "1px solid rgba(37,211,102,0.5)",
                              color: "#25d366"
                            }}
                          >
                            <MessageCircle size={16} />
                          </a>
                        </div>
                      </div>

                      {/* Notas (si existen) */}
                      {p.notas && (
                        <div style={{
                          background: "rgba(200,30,34,0.12)",
                          borderLeft: "3px solid #c81e22",
                          padding: "6px 10px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          color: "#fca5a5"
                        }}>
                          <strong>📝 Nota:</strong> {p.notas}
                        </div>
                      )}

                      {/* Mochila / Platos */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        background: "rgba(0,0,0,0.25)",
                        borderRadius: 8,
                        padding: "6px 8px",
                        border: "1px solid rgba(255,255,255,0.06)"
                      }}>
                        <span style={{ fontSize: 10.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>
                          🎒 {p.items?.reduce((a, b) => a + (b.cantidad || 1), 0) || 0} platos:
                        </span>
                        {(p.items || []).map((it, idx) => (
                          <span key={idx} style={{
                            fontSize: 11,
                            background: "rgba(255,255,255,0.08)",
                            padding: "2px 6px",
                            borderRadius: 6,
                            color: "#f5efe6",
                            fontWeight: 600
                          }}>
                            <strong style={{ color: "#fbbf24" }}>{it.cantidad}×</strong> {it.nombre}
                          </span>
                        ))}
                      </div>

                      {/* Aviso de cocina + Botón de recogida rápida */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        paddingTop: 4,
                        borderTop: "1px solid rgba(255,255,255,0.06)"
                      }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 5 }}>
                          <Clock size={13} color="#fbbf24" />
                          <span>Cocina avisará al terminar</span>
                        </div>

                        <button
                          onClick={() => handleStatusChange(p.id, "en_camino")}
                          style={{
                            height: 34,
                            border: "none",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 900,
                            cursor: "pointer",
                            background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                            color: "#ffffff",
                            padding: "0 10px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5
                          }}
                          title="Si cocina ya te dio el pedido en mano"
                        >
                          <Bike size={14} />
                          <span>Recoger y salir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ═══════════ PESTAÑA: HISTORIAL Y RENDIMIENTO COMPACTO ═══════════ */
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            
            {/* Tarjetas KPI de Resumen del Turno */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <div style={{ background: "#161311", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Entregas</div>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", marginTop: 2 }}>{stats.entregadosCount}</div>
                <div style={{ fontSize: 10.5, color: "#4ade80", fontWeight: 700 }}>Completadas</div>
              </div>
              <div style={{ background: "#161311", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Media Ruta</div>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: "#fbbf24", marginTop: 2 }}>~{stats.promedioMinutos}m</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>Por cliente</div>
              </div>
              <div style={{ background: "#161311", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Recaudado</div>
                <div style={{ fontSize: 19, fontWeight: 900, fontFamily: "monospace", color: "#60a5fa", marginTop: 2 }}>
                  {stats.totalFacturado.toFixed(2)}€
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>Total hoy</div>
              </div>
            </div>

            {/* Distribución Horaria */}
            <div style={{ background: "#161311", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={15} color="#fbbf24" />
                <span>Horas de Reparto</span>
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 10.5, textTransform: "uppercase" }}>
                      <th style={{ padding: "8px 6px" }}>Hora</th>
                      <th style={{ padding: "8px 6px" }}>Pedidos</th>
                      <th style={{ padding: "8px 6px" }}>Media</th>
                      <th style={{ padding: "8px 6px" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historial.porHora || []).length > 0 ? (
                      historial.porHora.map((h, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <td style={{ padding: "7px 6px", fontWeight: 700 }}>{String(h.hora).padStart(2, "0")}:00</td>
                          <td style={{ padding: "7px 6px" }}>{h.total_pedidos}</td>
                          <td style={{ padding: "7px 6px", color: "#fbbf24", fontWeight: 700 }}>{h.promedio_minutos}m</td>
                          <td style={{ padding: "7px 6px", fontWeight: 700 }}>{Number(h.total_facturado).toFixed(2)} €</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 16, color: "rgba(255,255,255,0.4)" }}>Sin actividad registrada hoy.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Listado de Entregas */}
            <div style={{ background: "#161311", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10 }}>📋 Últimas Entregas</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(historial.pedidos || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>No hay registros de entrega anteriores.</div>
                ) : (
                    (historial.pedidos || []).map((p, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedHistorialPedido(p)}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        position: "relative"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                        e.currentTarget.style.borderColor = "#c81e22";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 900, color: "#c81e22", fontSize: 15 }}>#{p.numero_pedido}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                          {p.created_at ? new Date(p.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                        <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: 16 }}>{Number(p.total).toFixed(2)} €</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>👤 {p.cliente_nombre} ({p.cliente_telefono})</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>📍 {p.direccion_entrega} {p.direccion_detalles ? `(${p.direccion_detalles})` : ""}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: 6, marginTop: 2 }}>
                        <span>Rider: <strong>{p.repartidor_nombre || riderName}</strong></span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#4ade80", fontWeight: 800 }}>⏱️ {p.tiempo_entrega_minutos ? `${p.tiempo_entrega_minutos} min` : "Entregado"}</span>
                          <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, background: "rgba(96,165,250,0.15)", padding: "2px 6px", borderRadius: 4 }}>Detalles ›</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── BARRA INFERIOR FIJA COMPACTA (ESTILO APP NATIVA) ── */}
      <nav className="delivery-nav-bar" style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 580,
        minHeight: 52,
        background: "#110f0d",
        borderTop: "1.5px solid rgba(200,30,34,0.45)",
        zIndex: 100,
        boxShadow: "0 -4px 20px rgba(0,0,0,0.9)",
        paddingBottom: "max(6px, env(safe-area-inset-bottom))"
      }}>
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "4px 0 2px" }}>
          
          {/* Pestaña 1: Repartos Activos (Listos / En Camino) */}
          <button
            onClick={() => setActiveTab("activos")}
            style={{
              padding: "4px 1px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: activeTab === "activos" ? "#c81e22" : "rgba(255,255,255,0.5)"
            }}
          >
            <div style={{ position: "relative" }}>
              <Bike size={19} />
              {pedidosActivos.length > 0 && (
                <span style={{
                  position: "absolute",
                  top: -6,
                  right: -10,
                  background: "#c81e22",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 900,
                  width: 17,
                  height: 17,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 8px #c81e22"
                }}>
                  {pedidosActivos.length}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 800 }}>Repartos</span>
          </button>

          {/* Pestaña 2: Pedidos en Preparación (Exclusivo Reparto) */}
          <button
            onClick={() => setActiveTab("preparacion")}
            style={{
              padding: "4px 1px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: activeTab === "preparacion" ? "#fbbf24" : "rgba(255,255,255,0.5)"
            }}
          >
            <div style={{ position: "relative" }}>
              <ChefHat size={19} />
              {pedidosPreparacion.length > 0 && (
                <span style={{
                  position: "absolute",
                  top: -6,
                  right: -10,
                  background: "#f59e0b",
                  color: "#000",
                  fontSize: 10,
                  fontWeight: 900,
                  width: 17,
                  height: 17,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 8px #f59e0b"
                }}>
                  {pedidosPreparacion.length}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" }}>En Prep.</span>
          </button>

          {/* Pestaña 3: Historial */}
          <button
            onClick={() => { setActiveTab("historial"); fetchHistorial(); }}
            style={{
              padding: "4px 1px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: activeTab === "historial" ? "#c81e22" : "rgba(255,255,255,0.5)"
            }}
          >
            <History size={19} />
            <span style={{ fontSize: 10.5, fontWeight: 800 }}>Historial</span>
          </button>

          {/* Pestaña 4: Alarma */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            style={{
              padding: "4px 1px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: audioEnabled ? "#4ade80" : "#ef4444"
            }}
          >
            {audioEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
            <span style={{ fontSize: 10.5, fontWeight: 800 }}>{audioEnabled ? "Alarma ON" : "Silencio"}</span>
          </button>
        </div>
      </nav>

      {/* ── MODAL DETALLES PEDIDO HISTORIAL / REVERTIR ENTREGA ── */}
      {selectedHistorialPedido && (
        <div
          onClick={() => setSelectedHistorialPedido(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "0 0 env(safe-area-inset-bottom)"
          }}
        >
          <div
            className="delivery-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#161311",
              border: "1.5px solid #eab308",
              borderBottom: "none",
              borderRadius: "18px 18px 0 0",
              width: "100%",
              maxWidth: 580,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "16px 14px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "0 -8px 40px rgba(0,0,0,0.9)",
              color: "#ffffff"
            }}
          >
            {/* Cabecera del Modal */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: 10,
              gap: 8
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 900, color: "#ffffff" }}>
                    #{selectedHistorialPedido.numero_pedido}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 900,
                    padding: "3px 8px",
                    borderRadius: 10,
                    background: selectedHistorialPedido.estado_pedido === "entregado"
                      ? "rgba(34,197,94,0.22)"
                      : "#fbbf24",
                    color: selectedHistorialPedido.estado_pedido === "entregado" ? "#4ade80" : "#000",
                    border: selectedHistorialPedido.estado_pedido === "entregado"
                      ? "1px solid rgba(34,197,94,0.5)"
                      : "none"
                  }}>
                    {selectedHistorialPedido.estado_pedido === "entregado" ? "✓ ENTREGADO" : "🔔 ¡LISTO PARA SALIR!"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
                  Hora: {selectedHistorialPedido.created_at ? new Date(selectedHistorialPedido.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "Reciente"}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: "#f5efe6", lineHeight: 1 }}>
                    {Number(selectedHistorialPedido.total).toFixed(2)} €
                  </div>
                  <div style={{
                    fontSize: 10.5,
                    fontWeight: 900,
                    padding: "2px 6px",
                    borderRadius: 6,
                    display: "inline-block",
                    marginTop: 2,
                    background: selectedHistorialPedido.estado_pago === "pagado" || selectedHistorialPedido.metodo_pago === "stripe"
                      ? "rgba(34,197,94,0.22)"
                      : "rgba(251,191,36,0.22)",
                    color: selectedHistorialPedido.estado_pago === "pagado" || selectedHistorialPedido.metodo_pago === "stripe"
                      ? "#4ade80"
                      : "#fbbf24",
                    border: "1px solid rgba(255,255,255,0.15)"
                  }}>
                    {selectedHistorialPedido.estado_pago === "pagado" || selectedHistorialPedido.metodo_pago === "stripe" ? "✓ PAGADO ONLINE" : "💵 COBRAR EN MANO"}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedHistorialPedido(null)}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Bloque Destino con Google Maps Compacto */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(200,30,34,0.35)",
              borderRadius: 10,
              padding: "8px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#ffffff", fontWeight: 800, fontSize: 13.5, lineHeight: 1.25 }}>
                  <MapPin size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedHistorialPedido.direccion_entrega || "Calle Mayor, La Ñora (Murcia)"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginLeft: 20, marginTop: 2 }}>
                  {selectedHistorialPedido.direccion_detalles ? (
                    <span style={{ color: "#fde68a", fontWeight: 600 }}>🏢 {selectedHistorialPedido.direccion_detalles} · </span>
                  ) : null}
                  CP {selectedHistorialPedido.codigo_postal || "30107"} · La Ñora
                </div>
              </div>

              {/* Botón Google Maps */}
              <a
                href={getMapsUrl(selectedHistorialPedido)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flexShrink: 0,
                  height: 32,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: "0 10px",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(37,99,235,0.3)"
                }}
              >
                <Navigation size={12} />
                <span>Maps</span>
              </a>
            </div>

            {/* Contacto con el Cliente: Teléfono directo + Icono WhatsApp */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: "rgba(255,255,255,0.6)", marginRight: 4 }}>👤</span>
                {selectedHistorialPedido.cliente_nombre}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {/* Teléfono directo */}
                <a
                  href={`tel:${selectedHistorialPedido.cliente_telefono}`}
                  style={{
                    height: 30,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "0 8px",
                    borderRadius: 6,
                    textDecoration: "none",
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#ffffff"
                  }}
                >
                  <Phone size={12} color="#60a5fa" />
                  <span>{selectedHistorialPedido.cliente_telefono}</span>
                </a>

                {/* WhatsApp: solo icono */}
                <a
                  href={getWhatsAppUrl(selectedHistorialPedido)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp"
                  style={{
                    width: 30,
                    height: 30,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    textDecoration: "none",
                    background: "rgba(37,211,102,0.18)",
                    border: "1px solid rgba(37,211,102,0.5)",
                    color: "#25d366"
                  }}
                >
                  <MessageCircle size={15} />
                </a>
              </div>
            </div>

            {/* Notas */}
            {selectedHistorialPedido.notas && (
              <div style={{
                background: "rgba(200,30,34,0.12)",
                borderLeft: "3px solid #c81e22",
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 12,
                color: "#fca5a5"
              }}>
                <strong>📝 Nota:</strong> {selectedHistorialPedido.notas}
              </div>
            )}

            {/* Mochila térmica / Platos */}
            <div style={{
              background: "rgba(0,0,0,0.35)",
              borderRadius: 10,
              padding: 10,
              border: "1px solid rgba(255,255,255,0.1)"
            }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 6, fontWeight: 800 }}>
                Verificar Mochila ({selectedHistorialPedido.items?.reduce((a, b) => a + (b.cantidad || 1), 0) || 0} platos):
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(selectedHistorialPedido.items || []).map((it, idx) => (
                  <span key={idx} style={{
                    fontSize: 12,
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    padding: "4px 8px",
                    borderRadius: 8,
                    color: "#f5efe6",
                    fontWeight: 700
                  }}>
                    <strong>{it.cantidad}×</strong> {it.nombre}
                  </span>
                ))}
              </div>
            </div>

            {/* Botones de acción / Reabrir o reactivar pedido */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}>
              <button
                onClick={async () => {
                  await handleStatusChange(selectedHistorialPedido.id, "en_camino");
                  setSelectedHistorialPedido(null);
                  setActiveTab("activos");
                }}
                style={{
                  width: "100%",
                  minHeight: 44,
                  border: "none",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                  color: "#ffffff",
                  boxShadow: "0 4px 15px rgba(168,85,247,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                <Bike size={18} />
                <span>↺ REABRIR PEDIDO Y PONER EN CAMINO</span>
              </button>

              <button
                onClick={async () => {
                  await handleStatusChange(selectedHistorialPedido.id, "listo_reparto");
                  setSelectedHistorialPedido(null);
                  setActiveTab("activos");
                }}
                style={{
                  width: "100%",
                  minHeight: 38,
                  border: "1.5px solid rgba(251,191,36,0.6)",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  background: "rgba(251,191,36,0.15)",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <RefreshCw size={15} />
                <span>Volver a dejar "Listo para salir"</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
