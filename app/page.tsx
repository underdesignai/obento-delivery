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
  X
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
  const [activeTab, setActiveTab] = useState<"activos" | "historial">("activos");
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
  
  // PWA Prompt
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
            p => p.estado_pedido === "listo_reparto" && !prev.some(old => old.id === p.id)
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
    const entregadosHoy = historial.pedidos?.filter(p => p.estado_pedido === "entregado") || [];
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

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#080706",
      color: "#f5efe6",
      overflowX: "hidden"
    }}>
      
      {/* ── CABECERA EXACTA A LA IMAGEN 1 ── */}
      <header style={{
        background: "#13110f",
        borderBottom: "1.5px solid rgba(200,30,34,0.4)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 4px 20px rgba(0,0,0,0.85)",
        width: "100%",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {/* Izquierda: Logo Obento + Título + Rider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            boxShadow: "0 0 16px rgba(200,30,34,0.5)",
            border: "2px solid #c81e22",
            flexShrink: 0
          }}>
            <Image src="/images/logo-obento.png" alt="Obento" width={40} height={40} style={{ objectFit: "contain" }} priority />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1.5, color: "#ffffff", lineHeight: 1 }}>OBENTO</span>
              <span style={{ fontSize: 11, background: "#c81e22", color: "#ffffff", padding: "2px 6px", borderRadius: 4, fontWeight: 900 }}>RIDER</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
              {isEditingRider ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    type="text"
                    value={tempRiderName}
                    onChange={e => setTempRiderName(e.target.value)}
                    style={{ background: "#211e1a", border: "1px solid #c81e22", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 12, width: 95, outline: "none" }}
                    autoFocus
                  />
                  <button onClick={saveRider} style={{ background: "#c81e22", color: "#fff", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer", fontWeight: "bold" }}>OK</button>
                </div>
              ) : (
                <span onClick={() => setIsEditingRider(true)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }} title="Toca para cambiar nombre">
                  👤 {riderName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Derecha: Botón EN RUTA */}
        <button
          onClick={() => setIsOnDuty(!isOnDuty)}
          style={{
            background: isOnDuty ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: isOnDuty ? "1.5px solid #22c55e" : "1.5px solid #ef4444",
            padding: "8px 16px",
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <span style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: isOnDuty ? "#22c55e" : "#ef4444",
            boxShadow: isOnDuty ? "0 0 10px #22c55e" : "0 0 10px #ef4444"
          }}></span>
          <span style={{ fontSize: 14, fontWeight: 900, color: isOnDuty ? "#4ade80" : "#fca5a5", letterSpacing: 0.5 }}>
            {isOnDuty ? "EN RUTA" : "PAUSADO"}
          </span>
        </button>
      </header>

      {/* ── BANNER DISCRETO DE INSTALACIÓN PWA (COMO EN LA IMAGEN 1) ── */}
      {showPwaBanner && (
        <div style={{
          background: "linear-gradient(90deg, #181311 0%, #13100e 100%)",
          borderBottom: "1px solid rgba(200,30,34,0.4)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Download size={18} color="#c81e22" />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>Instalar Obento Rider en el móvil</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleInstallPwa}
              style={{ background: "#c81e22", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 900, cursor: "pointer" }}
            >
              INSTALAR
            </button>
            <button
              onClick={() => setShowPwaBanner(false)}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 4 }}
            >
              <X size={16} />
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
        paddingBottom: 95
      }}>
        
        {loading ? (
          <div style={{ flex: 1, minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", border: "3px solid rgba(200,30,34,0.2)", borderTopColor: "#c81e22", animation: "spin 1s linear infinite", marginBottom: 20 }}></div>
            <p style={{ color: "#ffffff", fontWeight: 800, fontSize: 18 }}>Conectando terminal...</p>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 4 }}>Obento Central</span>
          </div>
        ) : activeTab === "activos" ? (
          
          /* ═══════════ PESTAÑA: PEDIDOS ACTIVOS ═══════════ */
          <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column" }}>
            
            {pedidos.length === 0 ? (
              /* RADAR DE PROPORCIONES EXACTAS A LA IMAGEN 1 */
              <div style={{
                flex: 1,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "24px 20px 20px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                minHeight: "calc(100vh - 170px)"
              }}>
                
                {/* 1. SECCIÓN RADAR: Gran tamaño que llena la anchura visual */}
                <div style={{
                  position: "relative",
                  width: "min(92vw, 380px)",
                  height: "min(92vw, 380px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "10px auto 16px"
                }}>
                  {/* Anillos de sonar rojos idénticos a la Imagen 1 */}
                  <div className="radar-ring" style={{ width: "min(90vw, 370px)", height: "min(90vw, 370px)" }}></div>
                  <div className="radar-ring" style={{ width: "min(90vw, 370px)", height: "min(90vw, 370px)" }}></div>
                  <div className="radar-ring" style={{ width: "min(90vw, 370px)", height: "min(90vw, 370px)" }}></div>

                  {/* Icono central de moto iluminada */}
                  <div style={{
                    width: 116,
                    height: 116,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, #2d2621 0%, #161311 100%)",
                    border: "2.5px solid #c81e22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 45px rgba(200,30,34,0.6)",
                    zIndex: 2
                  }}>
                    <Bike size={58} color="#f5efe6" />
                  </div>
                </div>

                {/* 2. SECCIÓN TEXTOS Y ESTADO (Proporciones Imagen 1) */}
                <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
                  
                  {/* Badge Verde: RADAR EN SERVICIO */}
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(34,197,94,0.12)",
                    border: "1.5px solid rgba(34,197,94,0.35)",
                    padding: "6px 18px",
                    borderRadius: 24,
                    marginBottom: 12
                  }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }}></span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: "#4ade80", letterSpacing: 1, textTransform: "uppercase" }}>
                      RADAR EN SERVICIO
                    </span>
                  </div>

                  {/* Título en Negrita Grande */}
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", marginBottom: 8, lineHeight: 1.25 }}>
                    Esperando pedidos de cocina
                  </h2>

                  {/* Subtítulo explicativo */}
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14.5, lineHeight: 1.45, maxWidth: 380, margin: "0 auto 20px" }}>
                    Mantén tu pantalla encendida y el sonido activado. En cuanto cocina pulse <strong>"Repartir"</strong>, sonará la alarma sonora de aviso.
                  </p>

                  {/* 3. BOTONES DE ACCIÓN (Idénticos en color y estilo a Imagen 1) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                    
                    {/* Botón Gris: Probar Alarma Sonora */}
                    <button
                      onClick={testAudio}
                      style={{
                        width: "100%",
                        minHeight: 58,
                        background: soundTested ? "rgba(34,197,94,0.22)" : "#22201e",
                        border: soundTested ? "2px solid #22c55e" : "1.5px solid rgba(255,255,255,0.15)",
                        color: soundTested ? "#4ade80" : "#ffffff",
                        padding: "14px 20px",
                        borderRadius: 16,
                        fontSize: 16,
                        fontWeight: 900,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        transition: "all 0.2s"
                      }}
                    >
                      <BellRing size={20} color={soundTested ? "#4ade80" : "#fbbf24"} />
                      <span>{soundTested ? "¡Alarma Correcta! Suena Fuerte" : "🔔 Probar Alarma Sonora (Test)"}</span>
                    </button>

                    {/* Botón Rojo: Comprobar Pedidos Ahora */}
                    <button
                      onClick={manualRefresh}
                      disabled={refreshing}
                      style={{
                        width: "100%",
                        minHeight: 54,
                        background: "rgba(200,30,34,0.18)",
                        border: "1.5px solid rgba(200,30,34,0.45)",
                        color: "#fca5a5",
                        padding: "12px 20px",
                        borderRadius: 16,
                        fontSize: 15.5,
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10
                      }}
                    >
                      <RefreshCw size={18} className={refreshing ? "spin" : ""} />
                      <span>{refreshing ? "Sincronizando..." : "Comprobar Pedidos Ahora"}</span>
                    </button>
                  </div>

                  {/* Texto de pie con icono de seguridad */}
                  <div style={{ marginTop: 22, fontSize: 12.5, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <ShieldCheck size={16} color="#4ade80" />
                    <span>Sincronización en vivo cada 3.5s · Obento Japanese Food</span>
                  </div>
                </div>
              </div>
            ) : (
              /* LISTADO DE PEDIDOS ACTIVOS */
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
                {pedidos.map(p => {
                  const isListoParaRepartir = p.estado_pedido === "listo_reparto";
                  const isEnCamino = p.estado_pedido === "en_camino";
                  const isCocina = p.estado_pedido === "en_preparacion" || p.estado_pedido === "recibido";
                  const isPagado = p.metodo_pago === "stripe" || p.estado_pago === "pagado";

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: "#161311",
                        borderRadius: 18,
                        border: isEnCamino
                          ? "2.5px solid #a855f7"
                          : isListoParaRepartir
                          ? "2.5px solid #fbbf24"
                          : "1.5px solid rgba(255,255,255,0.15)",
                        boxShadow: isEnCamino
                          ? "0 8px 30px rgba(168,85,247,0.3)"
                          : isListoParaRepartir
                          ? "0 8px 30px rgba(251,191,36,0.3)"
                          : "0 6px 25px rgba(0,0,0,0.6)",
                        padding: "18px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16
                      }}
                    >
                      {/* Cabecera Pedido */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1.5px solid rgba(255,255,255,0.1)",
                        paddingBottom: 12,
                        gap: 10
                      }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 900, color: "#ffffff" }}>
                              #{p.numero_pedido}
                            </span>

                            {isListoParaRepartir && (
                              <span className="pulse" style={{
                                fontSize: 12.5,
                                fontWeight: 900,
                                padding: "4px 10px",
                                borderRadius: 14,
                                background: "#fbbf24",
                                color: "#000"
                              }}>
                                🔔 ¡LISTO PARA SALIR!
                              </span>
                            )}

                            {isEnCamino && (
                              <span style={{
                                fontSize: 12.5,
                                fontWeight: 900,
                                padding: "4px 10px",
                                borderRadius: 14,
                                background: "rgba(168,85,247,0.25)",
                                color: "#c084fc",
                                border: "1.5px solid #c084fc"
                              }}>
                                🛵 EN CAMINO AL CLIENTE
                              </span>
                            )}

                            {isCocina && (
                              <span style={{
                                fontSize: 12,
                                fontWeight: 800,
                                padding: "4px 10px",
                                borderRadius: 12,
                                background: "rgba(255,255,255,0.1)",
                                color: "#cbd5e1"
                              }}>
                                👨‍🍳 EN COCINA
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                            Hora: {p.created_at ? new Date(p.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "Reciente"}
                          </div>
                        </div>

                        {/* Importe y Pago */}
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: "#f5efe6", lineHeight: 1 }}>
                            {Number(p.total).toFixed(2)} €
                          </div>
                          <div style={{
                            fontSize: 12,
                            fontWeight: 900,
                            padding: "3px 8px",
                            borderRadius: 8,
                            display: "inline-block",
                            marginTop: 5,
                            background: isPagado ? "rgba(34,197,94,0.2)" : "rgba(251,191,36,0.2)",
                            color: isPagado ? "#4ade80" : "#fbbf24",
                            border: isPagado ? "1.5px solid rgba(34,197,94,0.5)" : "1.5px solid rgba(251,191,36,0.5)"
                          }}>
                            {isPagado ? "✓ PAGADO ONLINE" : "💵 COBRAR EN MANO"}
                          </div>
                        </div>
                      </div>

                      {/* Bloque Destino con Google Maps */}
                      <div style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1.5px solid rgba(200,30,34,0.45)",
                        borderRadius: 16,
                        padding: "16px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#c81e22", fontWeight: 900, fontSize: 12.5, letterSpacing: 1 }}>
                            <MapPin size={18} />
                            <span>DIRECCIÓN DE ENTREGA</span>
                          </div>
                          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>
                            CP {p.codigo_postal || "30107"} · La Ñora
                          </span>
                        </div>

                        <div style={{ fontSize: 20, fontWeight: 900, color: "#ffffff", lineHeight: 1.3 }}>
                          {p.direccion_entrega || "Calle Mayor, La Ñora (Murcia)"}
                        </div>

                        {p.direccion_detalles && (
                          <div style={{
                            background: "rgba(251,191,36,0.14)",
                            borderLeft: "4px solid #fbbf24",
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontSize: 14,
                            color: "#fde68a",
                            fontWeight: 700
                          }}>
                            🏢 <strong>Piso / Detalles:</strong> {p.direccion_detalles}
                          </div>
                        )}

                        {/* Botón GPS Gigante */}
                        <a
                          href={getMapsUrl(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginTop: 4,
                            minHeight: 56,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                            background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                            color: "#ffffff",
                            textDecoration: "none",
                            fontSize: 16,
                            fontWeight: 900,
                            padding: "14px 18px",
                            borderRadius: 14,
                            boxShadow: "0 6px 20px rgba(37,99,235,0.5)",
                            letterSpacing: 0.5
                          }}
                        >
                          <Navigation size={22} />
                          <span>ABRIR EN GOOGLE MAPS (GPS)</span>
                        </a>
                      </div>

                      {/* Contacto con el Cliente */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>
                          👤 Cliente: <strong>{p.cliente_nombre}</strong>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <a
                            href={`tel:${p.cliente_telefono}`}
                            style={{
                              minHeight: 50,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              padding: "10px",
                              borderRadius: 12,
                              textDecoration: "none",
                              fontSize: 14.5,
                              fontWeight: 800,
                              background: "rgba(255,255,255,0.08)",
                              border: "1.5px solid rgba(255,255,255,0.2)",
                              color: "#ffffff"
                            }}
                          >
                            <Phone size={18} color="#60a5fa" />
                            <span>Llamar</span>
                          </a>

                          <a
                            href={getWhatsAppUrl(p)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              minHeight: 50,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              padding: "10px",
                              borderRadius: 12,
                              textDecoration: "none",
                              fontSize: 14.5,
                              fontWeight: 800,
                              background: "rgba(37,211,102,0.18)",
                              border: "2px solid rgba(37,211,102,0.5)",
                              color: "#25d366"
                            }}
                          >
                            <MessageCircle size={19} />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      {/* Notas */}
                      {p.notas && (
                        <div style={{
                          background: "rgba(200,30,34,0.12)",
                          borderLeft: "4px solid #c81e22",
                          padding: "10px 12px",
                          borderRadius: 8,
                          fontSize: 14,
                          color: "#fca5a5"
                        }}>
                          <strong>📝 Nota:</strong> {p.notas}
                        </div>
                      )}

                      {/* Mochila térmica */}
                      <div style={{
                        background: "rgba(0,0,0,0.3)",
                        borderRadius: 12,
                        padding: 12,
                        border: "1px solid rgba(255,255,255,0.08)"
                      }}>
                        <div style={{ fontSize: 11.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6, fontWeight: 800 }}>
                          Verificar Mochila ({p.items?.reduce((a, b) => a + (b.cantidad || 1), 0) || 0} platos):
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(p.items || []).map((it, idx) => (
                            <span key={idx} style={{
                              fontSize: 13,
                              background: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              padding: "5px 10px",
                              borderRadius: 8,
                              color: "#f5efe6",
                              fontWeight: 600
                            }}>
                              <strong>{it.cantidad}×</strong> {it.nombre}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Botones de Cambio de Estado */}
                      <div>
                        {isListoParaRepartir && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <button
                              onClick={() => handleStatusChange(p.id, "en_camino")}
                              style={{
                                width: "100%",
                                minHeight: 60,
                                border: "none",
                                borderRadius: 14,
                                fontSize: 16.5,
                                fontWeight: 900,
                                cursor: "pointer",
                                background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                                color: "#ffffff",
                                boxShadow: "0 6px 25px rgba(168,85,247,0.45)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 10
                              }}
                            >
                              <Bike size={24} />
                              <span>SALGO A REPARTIR (EN CAMINO)</span>
                            </button>

                            <button
                              onClick={() => handleStatusChange(p.id, "entregado")}
                              style={{
                                width: "100%",
                                minHeight: 52,
                                border: "none",
                                borderRadius: 14,
                                fontSize: 15.5,
                                fontWeight: 900,
                                cursor: "pointer",
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8
                              }}
                            >
                              <CheckCircle2 size={20} />
                              <span>FINALIZAR ENTREGA REALIZADA</span>
                            </button>
                          </div>
                        )}

                        {isEnCamino && (
                          <button
                            onClick={() => handleStatusChange(p.id, "entregado")}
                            style={{
                              width: "100%",
                              minHeight: 64,
                              border: "none",
                              borderRadius: 16,
                              fontSize: 17,
                              fontWeight: 900,
                              cursor: "pointer",
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              color: "#ffffff",
                              boxShadow: "0 8px 30px rgba(16,185,129,0.5)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 10
                            }}
                          >
                            <CheckCircle2 size={26} />
                            <span>✓ CONFIRMAR PEDIDO ENTREGADO</span>
                          </button>
                        )}

                        {isCocina && (
                          <div style={{
                            textAlign: "center",
                            padding: "14px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px dashed rgba(255,255,255,0.15)",
                            borderRadius: 12,
                            fontSize: 14,
                            color: "rgba(255,255,255,0.7)"
                          }}>
                            👨‍🍳 En preparación en cocina. Sonará la alerta aquí en cuanto esté listo.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ═══════════ PESTAÑA: HISTORIAL Y RENDIMIENTO ═══════════ */
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* Tarjetas KPI de Resumen del Turno */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <div style={{ background: "#161311", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Entregas</div>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", marginTop: 4 }}>{stats.entregadosCount}</div>
                <div style={{ fontSize: 10.5, color: "#4ade80", fontWeight: 700 }}>Completadas</div>
              </div>
              <div style={{ background: "#161311", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Media Ruta</div>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: "#fbbf24", marginTop: 4 }}>~{stats.promedioMinutos}m</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>Por cliente</div>
              </div>
              <div style={{ background: "#161311", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Recaudado</div>
                <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "monospace", color: "#60a5fa", marginTop: 4 }}>
                  {stats.totalFacturado.toFixed(2)}€
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>Total hoy</div>
              </div>
            </div>

            {/* Distribución Horaria */}
            <div style={{ background: "#161311", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={17} color="#fbbf24" />
                <span>Horas de Reparto</span>
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 11.5, textTransform: "uppercase" }}>
                      <th style={{ padding: "10px" }}>Hora</th>
                      <th style={{ padding: "10px" }}>Pedidos</th>
                      <th style={{ padding: "10px" }}>Media</th>
                      <th style={{ padding: "10px" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historial.porHora || []).length > 0 ? (
                      historial.porHora.map((h, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <td style={{ padding: 10, fontWeight: 700 }}>{String(h.hora).padStart(2, "0")}:00</td>
                          <td style={{ padding: 10 }}>{h.total_pedidos}</td>
                          <td style={{ padding: 10, color: "#fbbf24", fontWeight: 700 }}>{h.promedio_minutos}m</td>
                          <td style={{ padding: 10, fontWeight: 700 }}>{Number(h.total_facturado).toFixed(2)} €</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.4)" }}>Sin actividad registrada hoy.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Listado de Entregas */}
            <div style={{ background: "#161311", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>📋 Últimas Entregas</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(historial.pedidos || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,0.4)" }}>No hay registros de entrega anteriores.</div>
                ) : (
                  (historial.pedidos || []).map((p, idx) => (
                    <div key={idx} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 900, color: "#c81e22", fontSize: 16 }}>#{p.numero_pedido}</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                          {p.created_at ? new Date(p.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                        <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: 16 }}>{Number(p.total).toFixed(2)} €</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>👤 {p.cliente_nombre} ({p.cliente_telefono})</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>📍 {p.direccion_entrega} {p.direccion_detalles ? `(${p.direccion_detalles})` : ""}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: 6, marginTop: 4 }}>
                        <span>Rider: <strong>{p.repartidor_nombre || riderName}</strong></span>
                        <span style={{ color: "#4ade80", fontWeight: 800 }}>⏱️ {p.tiempo_entrega_minutos ? `${p.tiempo_entrega_minutos} min` : "Entregado"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── BARRA INFERIOR EXACTA A LA IMAGEN 1 ── */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        background: "#0c0a09",
        borderTop: "1.5px solid rgba(200,30,34,0.4)",
        zIndex: 100,
        boxShadow: "0 -8px 25px rgba(0,0,0,0.85)",
        paddingBottom: "max(10px, env(safe-area-inset-bottom))"
      }}>
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "8px 0 2px" }}>
          
          {/* Pestaña 1: Repartos Activos (Rojo activo como Imagen 1) */}
          <button
            onClick={() => setActiveTab("activos")}
            style={{
              padding: "6px 4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: activeTab === "activos" ? "#c81e22" : "rgba(255,255,255,0.5)"
            }}
          >
            <div style={{ position: "relative" }}>
              <Bike size={24} />
              {pedidos.length > 0 && (
                <span style={{
                  position: "absolute",
                  top: -6,
                  right: -10,
                  background: "#c81e22",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 900,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 8px #c81e22"
                }}>
                  {pedidos.length}
                </span>
              )}
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 900 }}>Repartos</span>
          </button>

          {/* Pestaña 2: Historial (Gris como Imagen 1) */}
          <button
            onClick={() => { setActiveTab("historial"); fetchHistorial(); }}
            style={{
              padding: "6px 4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: activeTab === "historial" ? "#c81e22" : "rgba(255,255,255,0.5)"
            }}
          >
            <History size={24} />
            <span style={{ fontSize: 12.5, fontWeight: 900 }}>Historial</span>
          </button>

          {/* Pestaña 3: Alarma ON (Verde como Imagen 1) */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            style={{
              padding: "6px 4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: audioEnabled ? "#4ade80" : "#ef4444"
            }}
          >
            {audioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            <span style={{ fontSize: 12.5, fontWeight: 900 }}>{audioEnabled ? "Alarma ON" : "Silencio"}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
