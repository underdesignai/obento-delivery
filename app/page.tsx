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
  AlertTriangle,
  PackageCheck,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Power
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
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
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
      
      // Chime alegre en doble tono para aviso urgente de cocina
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
      osc1.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.24); // D6

      osc2.frequency.setValueAtTime(293.66, ctx.currentTime);
      osc2.frequency.setValueAtTime(440.00, ctx.currentTime + 0.12);
      osc2.frequency.setValueAtTime(587.33, ctx.currentTime + 0.24);

      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
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
        setLastCheckTime(new Date());
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
    const msg = `¡Hola ${p.cliente_nombre}! Soy tu repartidor de OBENTO Japanese Food 🍱. Voy de camino con tu pedido #${p.numero_pedido}. ¿Estás en el domicilio para recibirlo?`;
    return `https://wa.me/${telSpain}?text=${encodeURIComponent(msg)}`;
  };

  // KPIs de la jornada
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#090807", color: "#f3ede0" }}>
      
      {/* HEADER PRINCIPAL PARA REPARTIDOR */}
      <header style={{
        background: "linear-gradient(180deg, #171513 0%, #11100e 100%)",
        borderBottom: "1.5px solid rgba(200,30,34,0.3)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 8px 30px rgba(0,0,0,0.8)"
      }}>
        {/* Fila superior: Logo y Estado Rider */}
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          
          {/* Logo Obento */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 2,
              boxShadow: "0 0 16px rgba(200,30,34,0.45)",
              border: "2px solid #c81e22",
              flexShrink: 0
            }}>
              <Image src="/images/logo-obento.png" alt="Obento Japanese Food" width={38} height={38} style={{ objectFit: "contain" }} priority />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: 2, color: "#ffffff", lineHeight: 1 }}>OBENTO</span>
                <span style={{ fontSize: 10, background: "#c81e22", color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 900, letterSpacing: 1 }}>RIDER</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                Terminal de Reparto en Vivo
              </span>
            </div>
          </div>

          {/* Estado de Turno & Rider Pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            
            {/* Botón On/Off Duty */}
            <button
              onClick={() => setIsOnDuty(!isOnDuty)}
              style={{
                background: isOnDuty ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                border: isOnDuty ? "1.5px solid #22c55e" : "1.5px solid #ef4444",
                padding: "6px 12px",
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              title="Cambiar estado de servicio"
            >
              <span style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: isOnDuty ? "#22c55e" : "#ef4444",
                boxShadow: isOnDuty ? "0 0 10px #22c55e" : "0 0 10px #ef4444"
              }}></span>
              <span style={{ fontSize: 12, fontWeight: 800, color: isOnDuty ? "#4ade80" : "#fca5a5", letterSpacing: 0.5 }}>
                {isOnDuty ? "EN SERVICIO" : "PAUSADO"}
              </span>
            </button>

            {/* Nombre del repartidor */}
            {isEditingRider ? (
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="text"
                  value={tempRiderName}
                  onChange={e => setTempRiderName(e.target.value)}
                  style={{ background: "#211e1a", border: "1.5px solid #c81e22", color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 12, width: 110, outline: "none" }}
                  autoFocus
                />
                <button onClick={saveRider} style={{ background: "#c81e22", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer", fontWeight: "bold" }}>OK</button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingRider(true)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  padding: "6px 10px",
                  borderRadius: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
                title="Toca para cambiar nombre de rider"
              >
                <UserCheck size={14} color="#f3ede0" />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#f3ede0", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {riderName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CINTA DE RESUMEN DEL TURNO (KPIs Rápidos) */}
        <div style={{
          background: "rgba(0,0,0,0.45)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 880,
          margin: "0 auto",
          fontSize: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PackageCheck size={14} color="#4ade80" />
              <span>Entregas hoy: <strong style={{ color: "#4ade80", fontSize: 13 }}>{stats.entregadosCount}</strong></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} color="#fbbf24" />
              <span>Media: <strong style={{ color: "#fbbf24", fontSize: 13 }}>{stats.promedioMinutos}m</strong></span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={manualRefresh}
              disabled={refreshing}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11.5
              }}
              title="Actualizar manualmente"
            >
              <RefreshCw size={13} className={refreshing ? "spin" : ""} color="#f3ede0" />
              <span>{refreshing ? "Sincronizando..." : "Actualizar"}</span>
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS TIPO APP NATIVA */}
        <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => setActiveTab("activos")}
            style={{
              padding: "14px 10px",
              background: activeTab === "activos" ? "rgba(200,30,34,0.18)" : "transparent",
              border: "none",
              borderBottom: activeTab === "activos" ? "3px solid #c81e22" : "3px solid transparent",
              color: activeTab === "activos" ? "#ffffff" : "rgba(255,255,255,0.55)",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s"
            }}
          >
            <Bike size={18} color={activeTab === "activos" ? "#c81e22" : "currentColor"} />
            <span>Repartos Activos</span>
            <span style={{
              background: pedidos.length > 0 ? "#c81e22" : "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 900,
              padding: "2px 7px",
              borderRadius: 12
            }}>
              {pedidos.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab("historial"); fetchHistorial(); }}
            style={{
              padding: "14px 10px",
              background: activeTab === "historial" ? "rgba(200,30,34,0.18)" : "transparent",
              border: "none",
              borderBottom: activeTab === "historial" ? "3px solid #c81e22" : "3px solid transparent",
              color: activeTab === "historial" ? "#ffffff" : "rgba(255,255,255,0.55)",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s"
            }}
          >
            <History size={18} color={activeTab === "historial" ? "#c81e22" : "currentColor"} />
            <span>Historial & Estadísticas</span>
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "16px 16px 36px", width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Prompt PWA (si corresponde) */}
        <InstallPwaPrompt />

        {loading ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(200,30,34,0.2)", borderTopColor: "#c81e22", animation: "spin 1s linear infinite", marginBottom: 16 }}></div>
            <p style={{ color: "#f3ede0", fontWeight: 700, fontSize: 16 }}>Conectando terminal con cocina...</p>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 4 }}>Obento Japanese Food · Servidor Central</span>
          </div>
        ) : activeTab === "activos" ? (
          
          /* PESTAÑA 1: PEDIDOS ACTIVOS */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Si no hay pedidos: RADAR DE ESPERA COMPLETO (Experiencia Rider de Alta Calidad) */}
            {pedidos.length === 0 ? (
              <div style={{
                flex: 1,
                minHeight: "68vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(180deg, #13110f 0%, #0d0c0a 100%)",
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "36px 20px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 10px 40px rgba(0,0,0,0.6)"
              }}>
                
                {/* RADAR DECORATIVO CON ONDAS CONCÉNTRICAS */}
                <div style={{
                  position: "relative",
                  width: 190,
                  height: 190,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 28
                }}>
                  {/* Anillos de sonar */}
                  <div className="radar-ring" style={{ width: 180, height: 180 }}></div>
                  <div className="radar-ring" style={{ width: 180, height: 180 }}></div>
                  <div className="radar-ring" style={{ width: 180, height: 180 }}></div>

                  {/* Icono central de moto iluminada */}
                  <div style={{
                    width: 92,
                    height: 92,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, #25201c 0%, #171412 100%)",
                    border: "2px solid #c81e22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 35px rgba(200,30,34,0.5)",
                    zIndex: 2
                  }}>
                    <Bike size={44} color="#f3ede0" />
                  </div>
                </div>

                {/* Textos Claros y Legibles a Distancia */}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  padding: "5px 14px",
                  borderRadius: 20,
                  marginBottom: 14
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }}></span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#4ade80", letterSpacing: 0.8, textTransform: "uppercase" }}>
                    Radar de Reparto Activo
                  </span>
                </div>

                <h2 style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", marginBottom: 10, letterSpacing: -0.5 }}>
                  A la espera de pedidos de cocina
                </h2>

                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14.5, lineHeight: 1.5, maxWidth: 440, margin: "0 auto 24px" }}>
                  Mantén tu pantalla encendida y el sonido activado. En cuanto cocina pulse <strong>"Repartir"</strong>, tu terminal sonará con alarma acústica y recibirás la ruta GPS instantáneamente.
                </p>

                {/* Botones de Utilidad para el Rider */}
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, maxWidth: 440, width: "100%" }}>
                  
                  {/* Botón Probar Sonido */}
                  <button
                    onClick={testAudio}
                    style={{
                      flex: "1 1 180px",
                      background: soundTested ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)",
                      border: soundTested ? "1.5px solid #22c55e" : "1px solid rgba(255,255,255,0.15)",
                      color: soundTested ? "#4ade80" : "#f3ede0",
                      padding: "12px 16px",
                      borderRadius: 12,
                      fontSize: 13.5,
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
                    <span>{soundTested ? "¡Alarma Correcta!" : "Probar Alarma Sonora"}</span>
                  </button>

                  {/* Botón Comprobar Red */}
                  <button
                    onClick={manualRefresh}
                    disabled={refreshing}
                    style={{
                      flex: "1 1 180px",
                      background: "rgba(200,30,34,0.15)",
                      border: "1px solid rgba(200,30,34,0.35)",
                      color: "#fca5a5",
                      padding: "12px 16px",
                      borderRadius: 12,
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8
                    }}
                  >
                    <RefreshCw size={16} className={refreshing ? "spin" : ""} />
                    <span>Comprobar Cocina</span>
                  </button>
                </div>

                {/* Pie del radar */}
                <div style={{ marginTop: 28, fontSize: 11.5, color: "rgba(255,255,255,0.4)" }}>
                  Sincronización continua cada 3.5 segundos · Obento Japanese Food
                </div>
              </div>
            ) : (
              /* LISTADO DE PEDIDOS DISPONIBLES O EN CURSO */
              pedidos.map(p => {
                const isListoParaRepartir = p.estado_pedido === "listo_reparto";
                const isEnCamino = p.estado_pedido === "en_camino";
                const isCocina = p.estado_pedido === "en_preparacion" || p.estado_pedido === "recibido";
                const isPagado = p.metodo_pago === "stripe" || p.estado_pago === "pagado";

                return (
                  <div
                    key={p.id}
                    style={{
                      background: "#161412",
                      borderRadius: 20,
                      border: isEnCamino
                        ? "2.5px solid #a855f7"
                        : isListoParaRepartir
                        ? "2.5px solid #fbbf24"
                        : "1px solid rgba(255,255,255,0.12)",
                      boxShadow: isEnCamino
                        ? "0 8px 30px rgba(168,85,247,0.25)"
                        : isListoParaRepartir
                        ? "0 8px 30px rgba(251,191,36,0.25)"
                        : "0 6px 25px rgba(0,0,0,0.5)",
                      padding: "18px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16
                    }}
                  >
                    {/* ENCABEZADO DEL PEDIDO */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      paddingBottom: 12,
                      gap: 10
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 900, color: "#ffffff", letterSpacing: 1 }}>
                            #{p.numero_pedido}
                          </span>
                          
                          {/* Badge de Urgencia / Estado */}
                          {isListoParaRepartir && (
                            <span className="pulse" style={{
                              fontSize: 11.5,
                              fontWeight: 900,
                              padding: "4px 10px",
                              borderRadius: 14,
                              background: "#fbbf24",
                              color: "#000",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5
                            }}>
                              🔔 ¡LISTO EN COCINA!
                            </span>
                          )}

                          {isEnCamino && (
                            <span style={{
                              fontSize: 11.5,
                              fontWeight: 900,
                              padding: "4px 10px",
                              borderRadius: 14,
                              background: "rgba(168,85,247,0.2)",
                              color: "#c084fc",
                              border: "1px solid #c084fc",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5
                            }}>
                              🛵 EN REPARTO AL CLIENTE
                            </span>
                          )}

                          {isCocina && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 12,
                              background: "rgba(255,255,255,0.08)",
                              color: "#9ca3af"
                            }}>
                              👨‍🍳 EN COCINA (PREPARANDO)
                            </span>
                          )}
                        </div>

                        {/* Hora del pedido */}
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                          Recibido: {p.created_at ? new Date(p.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "Ahora"}
                        </span>
                      </div>

                      {/* Importe y Estado de Pago */}
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "monospace", color: "#f3ede0" }}>
                          {Number(p.total).toFixed(2)} €
                        </div>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 8,
                          display: "inline-block",
                          marginTop: 4,
                          background: isPagado ? "rgba(34,197,94,0.18)" : "rgba(251,191,36,0.18)",
                          color: isPagado ? "#4ade80" : "#fbbf24",
                          border: isPagado ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(251,191,36,0.4)"
                        }}>
                          {isPagado ? "✓ PAGADO ONLINE" : "💵 COBRAR EN MANO"}
                        </div>
                      </div>
                    </div>

                    {/* BLOQUE DE DIRECCIÓN Y NAVEGACIÓN GPS */}
                    <div style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1.5px solid rgba(200,30,34,0.4)",
                      borderRadius: 16,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#c81e22", fontWeight: 800, fontSize: 11.5, letterSpacing: 1 }}>
                          <MapPin size={17} />
                          <span>DESTINO DE ENTREGA</span>
                        </div>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                          CP {p.codigo_postal || "30107"} · La Ñora
                        </span>
                      </div>

                      {/* Dirección en Tipografía Grande y Clara */}
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#ffffff", lineHeight: 1.3 }}>
                        {p.direccion_entrega || "Calle Mayor, La Ñora (Murcia)"}
                      </div>

                      {/* Indicaciones para el repartidor */}
                      {p.direccion_detalles && (
                        <div style={{
                          background: "rgba(251,191,36,0.12)",
                          borderLeft: "3px solid #fbbf24",
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 13.5,
                          color: "#fde68a"
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
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                          color: "#ffffff",
                          textDecoration: "none",
                          fontSize: 15,
                          fontWeight: 900,
                          padding: "16px 20px",
                          borderRadius: 14,
                          boxShadow: "0 6px 20px rgba(37,99,235,0.45)",
                          letterSpacing: 0.5
                        }}
                      >
                        <Navigation size={22} />
                        <span>ABRIR EN GOOGLE MAPS (GPS)</span>
                      </a>
                    </div>

                    {/* DATOS DEL CLIENTE Y CONTACTO RÁPIDO */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff" }}>
                        👤 Cliente: {p.cliente_nombre}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <a
                          href={`tel:${p.cliente_telefono}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "13px 10px",
                            borderRadius: 12,
                            textDecoration: "none",
                            fontSize: 13.5,
                            fontWeight: 800,
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.18)",
                            color: "#ffffff"
                          }}
                        >
                          <Phone size={17} color="#60a5fa" />
                          <span>Llamar</span>
                        </a>

                        <a
                          href={getWhatsAppUrl(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "13px 10px",
                            borderRadius: 12,
                            textDecoration: "none",
                            fontSize: 13.5,
                            fontWeight: 800,
                            background: "rgba(37,211,102,0.16)",
                            border: "1.5px solid rgba(37,211,102,0.45)",
                            color: "#25d366"
                          }}
                        >
                          <MessageCircle size={18} />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    {/* NOTAS O PETICIONES ESPECIALES */}
                    {p.notas && (
                      <div style={{
                        background: "rgba(200,30,34,0.1)",
                        borderLeft: "3px solid #c81e22",
                        padding: "10px 14px",
                        borderRadius: 8,
                        fontSize: 13,
                        color: "#fca5a5"
                      }}>
                        <strong>📝 Nota del cliente:</strong> {p.notas}
                      </div>
                    )}

                    {/* REVISIÓN DE BOLSA / ÍTEMS DEL PEDIDO */}
                    <div style={{
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: 12,
                      padding: 12,
                      border: "1px solid rgba(255,255,255,0.06)"
                    }}>
                      <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 800 }}>
                        Verificación de Mochila Térmica ({p.items?.reduce((a, b) => a + (b.cantidad || 1), 0) || 0} platos):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(p.items || []).map((it, idx) => (
                          <span key={idx} style={{
                            fontSize: 12.5,
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            padding: "4px 10px",
                            borderRadius: 8,
                            color: "#f3ede0"
                          }}>
                            <strong>{it.cantidad}×</strong> {it.nombre} {it.porcion ? `(${it.porcion})` : ""}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* BOTONES DE CAMBIO DE ESTADO GIGANTES PARA EL RIDER */}
                    <div style={{ marginTop: 4 }}>
                      {isListoParaRepartir && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <button
                            onClick={() => handleStatusChange(p.id, "en_camino")}
                            style={{
                              width: "100%",
                              padding: "16px 20px",
                              border: "none",
                              borderRadius: 14,
                              fontSize: 16,
                              fontWeight: 900,
                              cursor: "pointer",
                              background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                              color: "#fff",
                              boxShadow: "0 6px 25px rgba(168,85,247,0.45)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 10
                            }}
                          >
                            <Bike size={22} />
                            <span>SALGO A REPARTIR (EN CAMINO)</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(p.id, "entregado")}
                            style={{
                              width: "100%",
                              padding: "15px 20px",
                              border: "none",
                              borderRadius: 14,
                              fontSize: 15,
                              fontWeight: 900,
                              cursor: "pointer",
                              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              color: "#fff",
                              boxShadow: "0 6px 20px rgba(16,185,129,0.35)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 10
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
                            padding: "18px 20px",
                            border: "none",
                            borderRadius: 14,
                            fontSize: 16,
                            fontWeight: 900,
                            cursor: "pointer",
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            color: "#fff",
                            boxShadow: "0 8px 30px rgba(16,185,129,0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10
                          }}
                        >
                          <CheckCircle2 size={24} />
                          <span>✓ CONFIRMAR PEDIDO ENTREGADO</span>
                        </button>
                      )}

                      {isCocina && (
                        <div style={{
                          textAlign: "center",
                          padding: "12px 16px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px dashed rgba(255,255,255,0.12)",
                          borderRadius: 12,
                          fontSize: 13,
                          color: "rgba(255,255,255,0.6)"
                        }}>
                          👨‍🍳 Pedido en preparación en cocina. Cuando esté empaquetado sonará la alerta aquí.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* PESTAÑA 2: HISTORIAL Y RENDIMIENTO */
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ background: "#151311", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Repartos</div>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", marginTop: 4 }}>{stats.entregadosCount}</div>
                <div style={{ fontSize: 10.5, color: "#4ade80", fontWeight: 700 }}>Completados</div>
              </div>
              <div style={{ background: "#151311", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Media Ruta</div>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: "#fbbf24", marginTop: 4 }}>~{stats.promedioMinutos}m</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>Por cliente</div>
              </div>
              <div style={{ background: "#151311", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Total Turno</div>
                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: "#60a5fa", marginTop: 4 }}>
                  {stats.totalFacturado.toFixed(2)}€
                </div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>Entregado</div>
              </div>
            </div>

            {/* TABLA HORARIA */}
            <div style={{ background: "#151311", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={17} color="#fbbf24" />
                <span>Distribución por Franja Horaria</span>
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase" }}>
                      <th style={{ padding: "10px 12px" }}>Hora</th>
                      <th style={{ padding: "10px 12px" }}>Pedidos</th>
                      <th style={{ padding: "10px 12px" }}>Tiempo Medio</th>
                      <th style={{ padding: "10px 12px" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historial.porHora || []).length > 0 ? (
                      historial.porHora.map((h, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "12px", fontWeight: 700 }}>{String(h.hora).padStart(2, "0")}:00 - {String(h.hora + 1).padStart(2, "0")}:00</td>
                          <td style={{ padding: "12px" }}>{h.total_pedidos} repartos</td>
                          <td style={{ padding: "12px", color: "#fbbf24", fontWeight: 700 }}>{h.promedio_minutos} min</td>
                          <td style={{ padding: "12px", fontWeight: 700 }}>{Number(h.total_facturado).toFixed(2)} €</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.4)" }}>Sin actividad registrada aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LISTADO DE ENTREGAS COMPLETADAS */}
            <div style={{ background: "#151311", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>📋 Registro de Entregas Realizadas</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(historial.pedidos || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,0.4)" }}>No hay registros de entrega anteriores.</div>
                ) : (
                  (historial.pedidos || []).map((p, idx) => (
                    <div key={idx} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 900, color: "#c81e22", fontSize: 15 }}>#{p.numero_pedido}</span>
                        <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>
                          {p.created_at ? new Date(p.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                        <span style={{ fontWeight: 900, fontFamily: "monospace", fontSize: 16 }}>{Number(p.total).toFixed(2)} €</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>👤 {p.cliente_nombre} ({p.cliente_telefono})</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>📍 {p.direccion_entrega} {p.direccion_detalles ? `(${p.direccion_detalles})` : ""}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: 8, marginTop: 4 }}>
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

      {/* FOOTER ERGONÓMICO CON CONTROL DE AUDIO */}
      <footer style={{
        background: "#0d0c0a",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 880,
        margin: "0 auto",
        width: "100%"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>
          <ShieldCheck size={14} color="#4ade80" />
          <span>Obento Delivery · Terminal v1.2</span>
        </div>

        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          style={{
            background: audioEnabled ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            border: audioEnabled ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
            color: audioEnabled ? "#4ade80" : "#fca5a5",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 700
          }}
        >
          {audioEnabled ? <Volume2 size={15} color="#4ade80" /> : <VolumeX size={15} color="#ef4444" />}
          <span>{audioEnabled ? "Alarma Activada" : "Alarma Silenciada"}</span>
        </button>
      </footer>
    </div>
  );
}
