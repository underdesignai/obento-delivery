"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [riderName, setRiderName] = useState("Repartidor 1");
  const [isEditingRider, setIsEditingRider] = useState(false);
  const [tempRiderName, setTempRiderName] = useState("");

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
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  }, [audioEnabled]);

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
    }
  }, [playChime]);

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
    const interval = setInterval(fetchActivos, 4000);
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
    const msg = `Hola ${p.cliente_nombre}, soy tu repartidor de Obento Japanese Food 🍱. Voy en camino con tu pedido #${p.numero_pedido}. ¿Estás disponible para recogerlo?`;
    return `https://wa.me/${telSpain}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0c0b0a", color: "#f3ede0" }}>
      
      {/* HEADER */}
      <header style={{ background: "#141210", borderBottom: "2px solid rgba(200,30,34,0.35)", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 3, boxShadow: "0 0 10px rgba(200,30,34,0.4)" }}>
              <Image src="/images/logo-obento.png" alt="Obento" width={36} height={36} style={{ objectFit: "contain" }} priority />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, color: "#fff", lineHeight: 1 }}>OBENTO</h1>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#c81e22", textTransform: "uppercase" }}>DELIVERY APP · TERMINAL</span>
            </div>
          </div>

          {/* Repartidor Pill */}
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", padding: "6px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }}></span>
            {isEditingRider ? (
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="text"
                  value={tempRiderName}
                  onChange={e => setTempRiderName(e.target.value)}
                  style={{ background: "#1f1d1b", border: "1px solid #c81e22", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 12, width: 100 }}
                  autoFocus
                />
                <button onClick={saveRider} style={{ background: "#c81e22", color: "#fff", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer", fontWeight: "bold" }}>OK</button>
              </div>
            ) : (
              <div onClick={() => setIsEditingRider(true)} style={{ cursor: "pointer", display: "flex", flexDirection: "column" }} title="Haz clic para cambiar nombre">
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f3ede0" }}>{riderName}</span>
                <span style={{ fontSize: 9.5, color: "#4ade80" }}>🛵 En Turno</span>
              </div>
            )}
          </div>
        </div>

        {/* Selector Pestañas */}
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setActiveTab("activos")}
            style={{
              flex: 1,
              padding: "12px",
              background: activeTab === "activos" ? "rgba(200,30,34,0.12)" : "transparent",
              border: "none",
              borderBottom: activeTab === "activos" ? "2px solid #c81e22" : "2px solid transparent",
              color: activeTab === "activos" ? "#ffffff" : "rgba(255,255,255,0.5)",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s"
            }}
          >
            <Bike size={16} />
            <span>Pedidos Activos ({pedidos.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab("historial"); fetchHistorial(); }}
            style={{
              flex: 1,
              padding: "12px",
              background: activeTab === "historial" ? "rgba(200,30,34,0.12)" : "transparent",
              border: "none",
              borderBottom: activeTab === "historial" ? "2px solid #c81e22" : "2px solid transparent",
              color: activeTab === "historial" ? "#ffffff" : "rgba(255,255,255,0.5)",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s"
            }}
          >
            <History size={16} />
            <span>Historial & Tiempos</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: 16, width: "100%", flex: 1 }}>
        <InstallPwaPrompt />
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.5)" }}>
            <Clock className="pulse" size={36} style={{ margin: "0 auto 12px", color: "#c81e22" }} />
            <p>Conectando con la base de datos de Obento...</p>
          </div>
        ) : activeTab === "activos" ? (
          /* PESTAÑA: PEDIDOS ACTIVOS */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {pedidos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "#141210", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.12)" }}>
                <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>🍱</span>
                <h3 style={{ fontSize: 20, color: "#fff", marginBottom: 8, fontWeight: 800 }}>No hay entregas pendientes</h3>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, maxWidth: 400, margin: "0 auto 14px" }}>
                  En cuanto cocina termine un pedido a domicilio y pulse "Repartir" en su pantalla, sonará una alerta aquí.
                </p>
                <div style={{ fontSize: 12, color: "#c81e22", fontWeight: 700 }}>Sincronización en tiempo real activa (4s)</div>
              </div>
            ) : (
              pedidos.map(p => {
                const isListoParaRepartir = p.estado_pedido === "listo_reparto";
                const isEnCamino = p.estado_pedido === "en_camino";
                const isCocina = p.estado_pedido === "en_preparacion" || p.estado_pedido === "recibido";
                const isPagado = p.metodo_pago === "stripe" || p.estado_pago === "pagado";

                return (
                  <div
                    key={p.id}
                    style={{
                      background: "#151311",
                      borderRadius: 14,
                      padding: 18,
                      border: isEnCamino
                        ? "2px solid #a855f7"
                        : isListoParaRepartir
                        ? "2px solid #eab308"
                        : "1px solid rgba(255,255,255,0.1)",
                      boxShadow: isEnCamino
                        ? "0 0 20px rgba(168,85,247,0.2)"
                        : isListoParaRepartir
                        ? "0 0 20px rgba(234,179,8,0.2)"
                        : "0 4px 20px rgba(0,0,0,0.4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14
                    }}
                  >
                    {/* Header Pedido */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 17, fontWeight: 900, color: "#c81e22" }}>#{p.numero_pedido}</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: 12,
                          background: isPagado ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)",
                          color: isPagado ? "#4ade80" : "#fbbf24",
                          border: isPagado ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(245,158,11,0.35)"
                        }}>
                          {isPagado ? "✓ PAGADO ONLINE" : `💵 COBRAR ${p.total.toFixed(2)}€`}
                        </span>
                        {isListoParaRepartir && (
                          <span className="pulse" style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 12, background: "rgba(234,179,8,0.2)", color: "#facc15", border: "1px solid #facc15" }}>
                            🔔 LISTO EN COCINA
                          </span>
                        )}
                        {isEnCamino && (
                          <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 12, background: "rgba(168,85,247,0.2)", color: "#c084fc", border: "1px solid #c084fc" }}>
                            🛵 EN CAMINO
                          </span>
                        )}
                        {isCocina && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 12, background: "rgba(255,255,255,0.08)", color: "#9ca3af" }}>
                            👨‍🍳 EN PREPARACIÓN
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: "#f3ede0" }}>
                        {p.total.toFixed(2)} €
                      </div>
                    </div>

                    {/* Cliente */}
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
                        👤 {p.cliente_nombre}
                      </div>

                      {/* CAJA DIRECCIÓN VERIFICADA CON GOOGLE MAPS */}
                      <div style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(200,30,34,0.35)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#c81e22", fontWeight: 800, fontSize: 11, letterSpacing: 1 }}>
                          <MapPin size={15} />
                          <span>DIRECCIÓN VERIFICADA</span>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#ffffff" }}>
                          {p.direccion_entrega || "Calle Mayor, La Ñora (Murcia)"}
                        </div>
                        {p.direccion_detalles && (
                          <div style={{ fontSize: 13.5, color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "4px 8px", borderRadius: 6, display: "inline-block", width: "fit-content" }}>
                            🏢 <strong>Detalles:</strong> {p.direccion_detalles}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                          Código Postal: {p.codigo_postal || "30107"} · La Ñora / Murcia
                        </div>

                        {/* BOTÓN GOOGLE MAPS GPS */}
                        <a
                          href={getMapsUrl(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginTop: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                            background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                            color: "#fff",
                            textDecoration: "none",
                            fontSize: 14,
                            fontWeight: 900,
                            padding: 13,
                            borderRadius: 10,
                            boxShadow: "0 4px 15px rgba(37,99,235,0.35)"
                          }}
                        >
                          <Navigation size={18} />
                          <span>ABRIR EN GOOGLE MAPS (GPS)</span>
                        </a>
                      </div>
                    </div>

                    {/* Acciones de Contacto: Llamar y WhatsApp */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <a
                        href={`tel:${p.cliente_telefono}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: 11,
                          borderRadius: 8,
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 700,
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          color: "#fff"
                        }}
                      >
                        <Phone size={15} />
                        <span>Llamar ({p.cliente_telefono})</span>
                      </a>
                      <a
                        href={getWhatsAppUrl(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: 11,
                          borderRadius: 8,
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 700,
                          background: "rgba(37,211,102,0.15)",
                          border: "1px solid rgba(37,211,102,0.4)",
                          color: "#25d366"
                        }}
                      >
                        <MessageCircle size={15} />
                        <span>WhatsApp</span>
                      </a>
                    </div>

                    {/* Notas */}
                    {p.notas && (
                      <div style={{ background: "rgba(200,30,34,0.1)", borderLeft: "3px solid #c81e22", padding: "8px 12px", borderRadius: 4, fontSize: 13, color: "#fca5a5" }}>
                        <strong>📝 Instrucciones:</strong> {p.notas}
                      </div>
                    )}

                    {/* Desglose de ítems */}
                    <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 6, fontWeight: 700 }}>
                        Contenido del pedido ({p.items?.reduce((a, b) => a + (b.cantidad || 1), 0) || 0} platos):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(p.items || []).map((it, idx) => (
                          <span key={idx} style={{ fontSize: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", padding: "3px 8px", borderRadius: 6 }}>
                            {it.cantidad}× {it.nombre} {it.porcion ? `(${it.porcion})` : ""}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Botones de Cambio de Estado */}
                    <div style={{ marginTop: 4 }}>
                      {isListoParaRepartir && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <button
                            onClick={() => handleStatusChange(p.id, "en_camino")}
                            style={{
                              width: "100%",
                              padding: 15,
                              border: "none",
                              borderRadius: 10,
                              fontSize: 15,
                              fontWeight: 900,
                              cursor: "pointer",
                              background: "linear-gradient(135deg, #a855f7, #7e22ce)",
                              color: "#fff",
                              boxShadow: "0 4px 18px rgba(168,85,247,0.4)"
                            }}
                          >
                            🛵 SALGO A ENTREGAR (EN CAMINO)
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.id, "entregado")}
                            style={{
                              width: "100%",
                              padding: 14,
                              border: "none",
                              borderRadius: 10,
                              fontSize: 14,
                              fontWeight: 900,
                              cursor: "pointer",
                              background: "linear-gradient(135deg, #10b981, #047857)",
                              color: "#fff",
                              boxShadow: "0 4px 18px rgba(16,185,129,0.4)"
                            }}
                          >
                            ✓ FINALIZAR ENTREGA REALIZADA
                          </button>
                        </div>
                      )}

                      {isEnCamino && (
                        <button
                          onClick={() => handleStatusChange(p.id, "entregado")}
                          style={{
                            width: "100%",
                            padding: 15,
                            border: "none",
                            borderRadius: 10,
                            fontSize: 15,
                            fontWeight: 900,
                            cursor: "pointer",
                            background: "linear-gradient(135deg, #10b981, #047857)",
                            color: "#fff",
                            boxShadow: "0 4px 18px rgba(16,185,129,0.4)"
                          }}
                        >
                          ✓ FINALIZAR ENTREGA REALIZADA
                        </button>
                      )}

                      {isCocina && (
                        <div style={{ textAlign: "center", padding: 10, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>
                          👨‍🍳 En cocina. Esperando a que el chef pulse "Enviar al Delivery"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* PESTAÑA: HISTORIAL Y TIEMPOS */
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ background: "#141210", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Total Repartos</div>
                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", marginTop: 4 }}>{historial.pedidos?.length || 0}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Acumulados</div>
              </div>
              <div style={{ background: "#141210", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Tiempo Medio</div>
                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: "#fbbf24", marginTop: 4 }}>~23 min</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Por servicio</div>
              </div>
              <div style={{ background: "#141210", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Entregados Hoy</div>
                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: "#4ade80", marginTop: 4 }}>
                  {historial.porDia?.[0]?.entregados || historial.pedidos?.filter(p => p.estado_pedido === "entregado").length || 0}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Jornada actual</div>
              </div>
            </div>

            {/* TABLA HORAS */}
            <div style={{ background: "#141210", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} color="#fbbf24" />
                <span>Distribución y Tiempos de Reparto por Hora</span>
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase" }}>
                      <th style={{ padding: "8px 10px" }}>Franja Horaria</th>
                      <th style={{ padding: "8px 10px" }}>Nº Pedidos</th>
                      <th style={{ padding: "8px 10px" }}>Tiempo Medio</th>
                      <th style={{ padding: "8px 10px" }}>Facturado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historial.porHora || []).length > 0 ? (
                      historial.porHora.map((h, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: 10, fontWeight: 700 }}>{String(h.hora).padStart(2, "0")}:00 - {String(h.hora + 1).padStart(2, "0")}:00</td>
                          <td style={{ padding: 10 }}>{h.total_pedidos} pedidos</td>
                          <td style={{ padding: 10, color: "#fbbf24", fontWeight: 700 }}>{h.promedio_minutos} min</td>
                          <td style={{ padding: 10 }}>{h.total_facturado.toFixed(2)} €</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 16, color: "rgba(255,255,255,0.4)" }}>Sin datos por hora aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLA DÍAS */}
            <div style={{ background: "#141210", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={16} color="#4ade80" />
                <span>Rendimiento Diario</span>
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase" }}>
                      <th style={{ padding: "8px 10px" }}>Fecha</th>
                      <th style={{ padding: "8px 10px" }}>Total</th>
                      <th style={{ padding: "8px 10px" }}>Entregados</th>
                      <th style={{ padding: "8px 10px" }}>Media Minutos</th>
                      <th style={{ padding: "8px 10px" }}>Facturado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historial.porDia || []).length > 0 ? (
                      historial.porDia.map((d, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: 10, fontWeight: 700 }}>{d.fecha}</td>
                          <td style={{ padding: 10 }}>{d.total_pedidos}</td>
                          <td style={{ padding: 10, color: "#4ade80" }}>✓ {d.entregados}</td>
                          <td style={{ padding: 10 }}>{d.promedio_minutos} min</td>
                          <td style={{ padding: 10, fontWeight: 700 }}>{d.total_facturado.toFixed(2)} €</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: 16, color: "rgba(255,255,255,0.4)" }}>No hay registros diarios.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LISTADO ÚLTIMAS ENTREGAS */}
            <div style={{ background: "#141210", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>📋 Registro de Últimas Entregas</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(historial.pedidos || []).map((p, idx) => (
                  <div key={idx} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#c81e22" }}>#{p.numero_pedido}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{p.created_at ? new Date(p.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      <span style={{ fontWeight: 800, fontFamily: "monospace" }}>{p.total.toFixed(2)} €</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>👤 {p.cliente_nombre} ({p.cliente_telefono})</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>📍 {p.direccion_entrega} {p.direccion_detalles ? `(${p.direccion_detalles})` : ""}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: 6, marginTop: 4 }}>
                      <span>Rider: <strong>{p.repartidor_nombre || riderName}</strong></span>
                      <span style={{ color: "#4ade80", fontWeight: 700 }}>⏱️ {p.tiempo_entrega_minutos ? `${p.tiempo_entrega_minutos} min` : "Entregado"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ background: "#100f0d", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>Obento Japanese Food · Terminal Delivery v1.0</span>
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          {audioEnabled ? <Volume2 size={13} color="#4ade80" /> : <VolumeX size={13} color="#ef4444" />}
          <span>{audioEnabled ? "Sonido Activado" : "Silenciado"}</span>
        </button>
      </footer>
    </div>
  );
}
