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
  Compass,
  AlertCircle
} from "lucide-react";
import InstallPwaPrompt from "@/app/components/InstallPwaPrompt";

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

  useEffect(() => {
    const saved = localStorage.getItem("obento_rider_name");
    if (saved) {
      setRiderName(saved);
      setTempRiderName(saved);
    } else {
      setTempRiderName("Repartidor 1");
    }
  }, []);

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

      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#090807", color: "#f5efe6", width: "100%", overflowX: "hidden" }}>
      
      {/* ── BARRA SUPERIOR MÓVIL (HEADER) ── */}
      <header style={{
        background: "linear-gradient(180deg, #181512 0%, #110f0d 100%)",
        borderBottom: "2px solid rgba(200,30,34,0.35)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 6px 25px rgba(0,0,0,0.85)",
        width: "100%"
      }}>
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", maxWidth: 640, margin: "0 auto" }}>
          
          {/* Logo Obento y Título */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 3,
              boxShadow: "0 0 16px rgba(200,30,34,0.5)",
              border: "2px solid #c81e22",
              flexShrink: 0
            }}>
              <Image src="/images/logo-obento.png" alt="Obento" width={42} height={42} style={{ objectFit: "contain" }} priority />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 21, fontWeight: 900, letterSpacing: 2, color: "#ffffff", lineHeight: 1 }}>OBENTO</span>
                <span style={{ fontSize: 11, background: "#c81e22", color: "#ffffff", padding: "3px 7px", borderRadius: 6, fontWeight: 900, letterSpacing: 1 }}>RIDER</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                Terminal Oficial de Reparto
              </div>
            </div>
          </div>

          {/* Estado de Turno & Nombre */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setIsOnDuty(!isOnDuty)}
              style={{
                background: isOnDuty ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
                border: isOnDuty ? "2px solid #22c55e" : "2px solid #ef4444",
                padding: "8px 14px",
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              title="Cambiar estado"
            >
              <span style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: isOnDuty ? "#22c55e" : "#ef4444",
                boxShadow: isOnDuty ? "0 0 12px #22c55e" : "0 0 12px #ef4444"
              }}></span>
              <span style={{ fontSize: 13, fontWeight: 900, color: isOnDuty ? "#4ade80" : "#fca5a5" }}>
                {isOnDuty ? "EN RUTA" : "PAUSADO"}
              </span>
            </button>

            {isEditingRider ? (
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="text"
                  value={tempRiderName}
                  onChange={e => setTempRiderName(e.target.value)}
                  style={{ background: "#211e1a", border: "1.5px solid #c81e22", color: "#fff", padding: "6px 8px", borderRadius: 8, fontSize: 14, width: 95, outline: "none" }}
                  autoFocus
                />
                <button onClick={saveRider} style={{ background: "#c81e22", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer", fontWeight: "bold" }}>OK</button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingRider(true)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  padding: "8px 12px",
                  borderRadius: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
                title="Toca para cambiar nombre"
              >
                <UserCheck size={16} color="#f5efe6" />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#f5efe6", maxWidth: 85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {riderName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── CINTA DE RESUMEN DEL TURNO (KPIs Rápidos) ── */}
        <div style={{
          background: "rgba(0,0,0,0.5)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: 640,
          margin: "0 auto"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PackageCheck size={16} color="#4ade80" />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                Entregas: <strong style={{ color: "#4ade80", fontSize: 15 }}>{stats.entregadosCount}</strong>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={16} color="#fbbf24" />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                Media: <strong style={{ color: "#fbbf24", fontSize: 15 }}>{stats.promedioMinutos}m</strong>
              </span>
            </div>
          </div>

          <button
            onClick={manualRefresh}
            disabled={refreshing}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 700
            }}
          >
            <RefreshCw size={15} className={refreshing ? "spin" : ""} color="#f5efe6" />
            <span>{refreshing ? "Cargando..." : "Sincronizar"}</span>
          </button>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL (Espacio completo para el Rider) ── */}
      <main style={{
        flex: 1,
        width: "100%",
        maxWidth: 640,
        margin: "0 auto",
        padding: "16px 16px 100px", // 100px padding-bottom para que no tape la barra inferior
        display: "flex",
        flexDirection: "column"
      }}>
        
        {/* Banner de instalación PWA si no está instalada */}
        <InstallPwaPrompt />

        {loading ? (
          <div style={{ flex: 1, minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", border: "3px solid rgba(200,30,34,0.2)", borderTopColor: "#c81e22", animation: "spin 1s linear infinite", marginBottom: 20 }}></div>
            <p style={{ color: "#ffffff", fontWeight: 800, fontSize: 18 }}>Conectando terminal...</p>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 4 }}>Obento Central · Sincronizando cocina</span>
          </div>
        ) : activeTab === "activos" ? (
          
          /* ═══════════ PESTAÑA: PEDIDOS ACTIVOS ═══════════ */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            
            {pedidos.length === 0 ? (
              /* RADAR DE PANTALLA COMPLETA (Cuando no hay pedidos) */
              <div style={{
                flex: 1,
                minHeight: "65vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(180deg, #151210 0%, #0d0c0a 100%)",
                borderRadius: 24,
                border: "1.5px solid rgba(255,255,255,0.08)",
                padding: "36px 20px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 10px 40px rgba(0,0,0,0.7)"
              }}>
                
                {/* ONDAS CONCÉNTRICAS DE RADAR DE GRAN TAMAÑO */}
                <div style={{
                  position: "relative",
                  width: 240,
                  height: 240,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 32
                }}>
                  <div className="radar-ring" style={{ width: 230, height: 230 }}></div>
                  <div className="radar-ring" style={{ width: 230, height: 230 }}></div>
                  <div className="radar-ring" style={{ width: 230, height: 230 }}></div>

                  {/* Icono central de moto iluminada */}
                  <div style={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, #2a241f 0%, #171411 100%)",
                    border: "2.5px solid #c81e22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 45px rgba(200,30,34,0.6)",
                    zIndex: 2
                  }}>
                    <Bike size={54} color="#f5efe6" />
                  </div>
                </div>

                {/* Badge de Estado Conectado */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(34,197,94,0.15)",
                  border: "1.5px solid rgba(34,197,94,0.4)",
                  padding: "6px 16px",
                  borderRadius: 24,
                  marginBottom: 16
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }}></span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#4ade80", letterSpacing: 1, textTransform: "uppercase" }}>
                    RADAR EN SERVICIO
                  </span>
                </div>

                {/* Título y Subtítulo Grandes y Claros */}
                <h2 style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", marginBottom: 12, lineHeight: 1.2 }}>
                  Esperando pedidos de cocina
                </h2>

                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15.5, lineHeight: 1.5, maxWidth: 460, margin: "0 auto 28px" }}>
                  Mantén tu pantalla encendida y el sonido activado. En cuanto cocina pulse <strong>"Repartir"</strong>, sonará una alarma sonora y recibirás la ruta GPS al instante.
                </p>

                {/* Botones Grandes de Utilidad */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 420 }}>
                  
                  <button
                    onClick={testAudio}
                    style={{
                      width: "100%",
                      minHeight: 56,
                      background: soundTested ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)",
                      border: soundTested ? "2px solid #22c55e" : "1.5px solid rgba(255,255,255,0.18)",
                      color: soundTested ? "#4ade80" : "#ffffff",
                      padding: "14px 20px",
                      borderRadius: 14,
                      fontSize: 15,
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

                  <button
                    onClick={manualRefresh}
                    disabled={refreshing}
                    style={{
                      width: "100%",
                      minHeight: 52,
                      background: "rgba(200,30,34,0.18)",
                      border: "1.5px solid rgba(200,30,34,0.45)",
                      color: "#fca5a5",
                      padding: "12px 20px",
                      borderRadius: 14,
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10
                    }}
                  >
                    <RefreshCw size={18} className={refreshing ? "spin" : ""} />
                    <span>Comprobar Pedidos Ahora</span>
                  </button>
                </div>

                <div style={{ marginTop: 28, fontSize: 13, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={16} color="#4ade80" />
                  <span>Sincronización continua cada 3.5s · Cocina Obento</span>
                </div>
              </div>
            ) : (
              /* LISTADO DE TARJETAS DE PEDIDO GIGANTES (Alta Visibilidad para Reparto) */
              pedidos.map(p => {
                const isListoParaRepartir = p.estado_pedido === "listo_reparto";
                const isEnCamino = p.estado_pedido === "en_camino";
                const isCocina = p.estado_pedido === "en_preparacion" || p.estado_pedido === "recibido";
                const isPagado = p.metodo_pago === "stripe" || p.estado_pago === "pagado";

                return (
                  <div
                    key={p.id}
                    style={{
                      background: "#181512",
                      borderRadius: 22,
                      border: isEnCamino
                        ? "3px solid #a855f7"
                        : isListoParaRepartir
                        ? "3px solid #fbbf24"
                        : "1.5px solid rgba(255,255,255,0.15)",
                      boxShadow: isEnCamino
                        ? "0 10px 35px rgba(168,85,247,0.3)"
                        : isListoParaRepartir
                        ? "0 10px 35px rgba(251,191,36,0.3)"
                        : "0 8px 30px rgba(0,0,0,0.6)",
                      padding: "20px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 18
                    }}
                  >
                    {/* CABECERA DEL PEDIDO */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1.5px solid rgba(255,255,255,0.1)",
                      paddingBottom: 14,
                      gap: 10
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 900, color: "#ffffff", letterSpacing: 1 }}>
                            #{p.numero_pedido}
                          </span>

                          {isListoParaRepartir && (
                            <span className="pulse" style={{
                              fontSize: 13,
                              fontWeight: 900,
                              padding: "5px 12px",
                              borderRadius: 16,
                              background: "#fbbf24",
                              color: "#000",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6
                            }}>
                              🔔 ¡LISTO PARA SALIR!
                            </span>
                          )}

                          {isEnCamino && (
                            <span style={{
                              fontSize: 13,
                              fontWeight: 900,
                              padding: "5px 12px",
                              borderRadius: 16,
                              background: "rgba(168,85,247,0.25)",
                              color: "#c084fc",
                              border: "1.5px solid #c084fc",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6
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
                              👨‍🍳 EN PREPARACIÓN
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                          Hora: {p.created_at ? new Date(p.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "Reciente"}
                        </div>
                      </div>

                      {/* Importe Total y Estado de Cobro */}
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: "#f5efe6", lineHeight: 1 }}>
                          {Number(p.total).toFixed(2)} €
                        </div>
                        <div style={{
                          fontSize: 12.5,
                          fontWeight: 900,
                          padding: "4px 10px",
                          borderRadius: 10,
                          display: "inline-block",
                          marginTop: 6,
                          background: isPagado ? "rgba(34,197,94,0.2)" : "rgba(251,191,36,0.2)",
                          color: isPagado ? "#4ade80" : "#fbbf24",
                          border: isPagado ? "1.5px solid rgba(34,197,94,0.5)" : "1.5px solid rgba(251,191,36,0.5)"
                        }}>
                          {isPagado ? "✓ PAGADO ONLINE" : "💵 COBRAR EN MANO"}
                        </div>
                      </div>
                    </div>

                    {/* BLOQUE DE DESTINO Y GOOGLE MAPS GPS */}
                    <div style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "2px solid rgba(200,30,34,0.45)",
                      borderRadius: 18,
                      padding: "18px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#c81e22", fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>
                          <MapPin size={20} />
                          <span>DIRECCIÓN DE ENTREGA</span>
                        </div>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>
                          CP {p.codigo_postal || "30107"} · La Ñora
                        </span>
                      </div>

                      {/* Dirección Gigante */}
                      <div style={{ fontSize: 22, fontWeight: 900, color: "#ffffff", lineHeight: 1.3 }}>
                        {p.direccion_entrega || "Calle Mayor, La Ñora (Murcia)"}
                      </div>

                      {/* Indicaciones para el rider */}
                      {p.direccion_detalles && (
                        <div style={{
                          background: "rgba(251,191,36,0.14)",
                          borderLeft: "4px solid #fbbf24",
                          padding: "10px 14px",
                          borderRadius: 8,
                          fontSize: 15,
                          color: "#fde68a",
                          fontWeight: 700
                        }}>
                          🏢 <strong>Piso / Detalles:</strong> {p.direccion_detalles}
                        </div>
                      )}

                      {/* BOTÓN NAVEGADOR GPS GIGANTE */}
                      <a
                        href={getMapsUrl(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          marginTop: 6,
                          minHeight: 58,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 12,
                          background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                          color: "#ffffff",
                          textDecoration: "none",
                          fontSize: 17,
                          fontWeight: 900,
                          padding: "16px 20px",
                          borderRadius: 16,
                          boxShadow: "0 6px 25px rgba(37,99,235,0.5)",
                          letterSpacing: 0.5
                        }}
                      >
                        <Navigation size={24} />
                        <span>ABRIR EN GOOGLE MAPS (GPS)</span>
                      </a>
                    </div>

                    {/* DATOS DEL CLIENTE Y CONTACTO RÁPIDO */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "#ffffff" }}>
                        👤 Cliente: <strong>{p.cliente_nombre}</strong>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <a
                          href={`tel:${p.cliente_telefono}`}
                          style={{
                            minHeight: 52,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "12px",
                            borderRadius: 14,
                            textDecoration: "none",
                            fontSize: 15,
                            fontWeight: 800,
                            background: "rgba(255,255,255,0.08)",
                            border: "1.5px solid rgba(255,255,255,0.2)",
                            color: "#ffffff"
                          }}
                        >
                          <Phone size={19} color="#60a5fa" />
                          <span>Llamar</span>
                        </a>

                        <a
                          href={getWhatsAppUrl(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            minHeight: 52,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "12px",
                            borderRadius: 14,
                            textDecoration: "none",
                            fontSize: 15,
                            fontWeight: 800,
                            background: "rgba(37,211,102,0.18)",
                            border: "2px solid rgba(37,211,102,0.5)",
                            color: "#25d366"
                          }}
                        >
                          <MessageCircle size={20} />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    {/* NOTAS DEL CLIENTE */}
                    {p.notas && (
                      <div style={{
                        background: "rgba(200,30,34,0.12)",
                        borderLeft: "4px solid #c81e22",
                        padding: "12px 14px",
                        borderRadius: 8,
                        fontSize: 14.5,
                        color: "#fca5a5"
                      }}>
                        <strong>📝 Nota del cliente:</strong> {p.notas}
                      </div>
                    )}

                    {/* PRODUCTOS / CONTENIDO DE MOCHILA */}
                    <div style={{
                      background: "rgba(0,0,0,0.35)",
                      borderRadius: 14,
                      padding: 14,
                      border: "1px solid rgba(255,255,255,0.08)"
                    }}>
                      <div style={{ fontSize: 12, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 800 }}>
                        Verificación de Mochila Térmica ({p.items?.reduce((a, b) => a + (b.cantidad || 1), 0) || 0} platos):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(p.items || []).map((it, idx) => (
                          <span key={idx} style={{
                            fontSize: 14,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            padding: "6px 12px",
                            borderRadius: 10,
                            color: "#f5efe6",
                            fontWeight: 600
                          }}>
                            <strong>{it.cantidad}×</strong> {it.nombre} {it.porcion ? `(${it.porcion})` : ""}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* BOTONES GIGANTES DE CAMBIO DE ESTADO */}
                    <div style={{ marginTop: 4 }}>
                      {isListoParaRepartir && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <button
                            onClick={() => handleStatusChange(p.id, "en_camino")}
                            style={{
                              width: "100%",
                              minHeight: 64,
                              border: "none",
                              borderRadius: 16,
                              fontSize: 17,
                              fontWeight: 900,
                              cursor: "pointer",
                              background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                              color: "#ffffff",
                              boxShadow: "0 8px 30px rgba(168,85,247,0.5)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 12
                            }}
                          >
                            <Bike size={26} />
                            <span>SALGO A REPARTIR (EN CAMINO)</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(p.id, "entregado")}
                            style={{
                              width: "100%",
                              minHeight: 56,
                              border: "none",
                              borderRadius: 16,
                              fontSize: 16,
                              fontWeight: 900,
                              cursor: "pointer",
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              color: "#ffffff",
                              boxShadow: "0 6px 20px rgba(16,185,129,0.35)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 10
                            }}
                          >
                            <CheckCircle2 size={22} />
                            <span>FINALIZAR ENTREGA REALIZADA</span>
                          </button>
                        </div>
                      )}

                      {isEnCamino && (
                        <button
                          onClick={() => handleStatusChange(p.id, "entregado")}
                          style={{
                            width: "100%",
                            minHeight: 68,
                            border: "none",
                            borderRadius: 18,
                            fontSize: 18,
                            fontWeight: 900,
                            cursor: "pointer",
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            color: "#ffffff",
                            boxShadow: "0 10px 35px rgba(16,185,129,0.55)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 12
                          }}
                        >
                          <CheckCircle2 size={28} />
                          <span>✓ CONFIRMAR PEDIDO ENTREGADO</span>
                        </button>
                      )}

                      {isCocina && (
                        <div style={{
                          textAlign: "center",
                          padding: "16px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1.5px dashed rgba(255,255,255,0.15)",
                          borderRadius: 14,
                          fontSize: 14.5,
                          color: "rgba(255,255,255,0.7)"
                        }}>
                          👨‍🍳 Pedido en preparación en cocina. En cuanto esté listo sonará la alerta aquí.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ═══════════ PESTAÑA: HISTORIAL Y RENDIMIENTO ═══════════ */
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* Tarjetas KPI de gran tamaño */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ background: "#181512", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "18px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Repartos</div>
                <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "monospace", marginTop: 4 }}>{stats.entregadosCount}</div>
                <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>Completados</div>
              </div>
              <div style={{ background: "#181512", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "18px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Media Ruta</div>
                <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "monospace", color: "#fbbf24", marginTop: 4 }}>~{stats.promedioMinutos}m</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Por cliente</div>
              </div>
              <div style={{ background: "#181512", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "18px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Total Turno</div>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: "#60a5fa", marginTop: 4 }}>
                  {stats.totalFacturado.toFixed(2)}€
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Entregado</div>
              </div>
            </div>

            {/* TABLA HORARIA */}
            <div style={{ background: "#181512", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={18} color="#fbbf24" />
                <span>Distribución por Franja Horaria</span>
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 12, textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 10px" }}>Hora</th>
                      <th style={{ padding: "12px 10px" }}>Pedidos</th>
                      <th style={{ padding: "12px 10px" }}>Media</th>
                      <th style={{ padding: "12px 10px" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historial.porHora || []).length > 0 ? (
                      historial.porHora.map((h, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <td style={{ padding: 12, fontWeight: 700 }}>{String(h.hora).padStart(2, "0")}:00</td>
                          <td style={{ padding: 12 }}>{h.total_pedidos} ped.</td>
                          <td style={{ padding: 12, color: "#fbbf24", fontWeight: 700 }}>{h.promedio_minutos}m</td>
                          <td style={{ padding: 12, fontWeight: 700 }}>{Number(h.total_facturado).toFixed(2)} €</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "rgba(255,255,255,0.4)" }}>Sin actividad registrada aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LISTADO DE ENTREGAS COMPLETADAS */}
            <div style={{ background: "#181512", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>📋 Registro de Entregas Realizadas</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(historial.pedidos || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.4)" }}>No hay registros anteriores.</div>
                ) : (
                  (historial.pedidos || []).map((p, idx) => (
                    <div key={idx} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 900, color: "#c81e22", fontSize: 17 }}>#{p.numero_pedido}</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                          {p.created_at ? new Date(p.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                        <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: 18 }}>{Number(p.total).toFixed(2)} €</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>👤 {p.cliente_nombre} ({p.cliente_telefono})</div>
                      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>📍 {p.direccion_entrega} {p.direccion_detalles ? `(${p.direccion_detalles})` : ""}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: 8, marginTop: 4 }}>
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

      {/* ── BARRA DE NAVEGACIÓN INFERIOR FIJA (ESTILO APP NATIVA GLOVO / UBER) ── */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#110f0d",
        borderTop: "2px solid rgba(200,30,34,0.35)",
        zIndex: 100,
        boxShadow: "0 -8px 25px rgba(0,0,0,0.8)",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))"
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "6px 8px 0" }}>
          
          {/* Botón Pestaña 1: Repartos Activos */}
          <button
            onClick={() => setActiveTab("activos")}
            style={{
              padding: "10px 4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: activeTab === "activos" ? "#c81e22" : "rgba(255,255,255,0.45)",
              position: "relative"
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
            <span style={{ fontSize: 12, fontWeight: 800 }}>Repartos</span>
          </button>

          {/* Botón Pestaña 2: Historial */}
          <button
            onClick={() => { setActiveTab("historial"); fetchHistorial(); }}
            style={{
              padding: "10px 4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: activeTab === "historial" ? "#c81e22" : "rgba(255,255,255,0.45)"
            }}
          >
            <History size={24} />
            <span style={{ fontSize: 12, fontWeight: 800 }}>Historial</span>
          </button>

          {/* Botón Toggle Alarma Sonora */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            style={{
              padding: "10px 4px",
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
            <span style={{ fontSize: 12, fontWeight: 800 }}>{audioEnabled ? "Alarma ON" : "Silencio"}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
