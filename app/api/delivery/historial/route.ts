import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const listado = await prisma.pedidos.findMany({
      where: {
        tipo_entrega: { in: ["domicilio", "delivery"] }
      },
      include: {
        pedido_items: true
      },
      orderBy: {
        created_at: "desc"
      },
      take: 100
    });

    // Agrupación por horas
    const porHoraMap: Record<number, { hora: number; total_pedidos: number; minutos_acumulados: number; total_facturado: number }> = {};
    // Agrupación por días
    const porDiaMap: Record<string, { fecha: string; total_pedidos: number; entregados: number; minutos_acumulados: number; total_facturado: number }> = {};

    listado.forEach(p => {
      const fechaObj = p.created_at ? new Date(p.created_at) : new Date();
      const hora = fechaObj.getHours();
      const fechaStr = fechaObj.toISOString().slice(0, 10);
      const mins = p.tiempo_entrega_minutos || 22;
      const totalNum = Number(p.total);

      // Horas
      if (!porHoraMap[hora]) {
        porHoraMap[hora] = { hora, total_pedidos: 0, minutos_acumulados: 0, total_facturado: 0 };
      }
      porHoraMap[hora].total_pedidos += 1;
      porHoraMap[hora].minutos_acumulados += mins;
      porHoraMap[hora].total_facturado += totalNum;

      // Días
      if (!porDiaMap[fechaStr]) {
        porDiaMap[fechaStr] = { fecha: fechaStr, total_pedidos: 0, entregados: 0, minutos_acumulados: 0, total_facturado: 0 };
      }
      porDiaMap[fechaStr].total_pedidos += 1;
      if (p.estado_pedido === "entregado") {
        porDiaMap[fechaStr].entregados += 1;
      }
      porDiaMap[fechaStr].minutos_acumulados += mins;
      porDiaMap[fechaStr].total_facturado += totalNum;
    });

    const porHora = Object.values(porHoraMap)
      .sort((a, b) => a.hora - b.hora)
      .map(h => ({
        hora: h.hora,
        total_pedidos: h.total_pedidos,
        promedio_minutos: Math.round(h.minutos_acumulados / h.total_pedidos),
        total_facturado: h.total_facturado
      }));

    const porDia = Object.values(porDiaMap)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map(d => ({
        fecha: d.fecha,
        total_pedidos: d.total_pedidos,
        entregados: d.entregados,
        promedio_minutos: Math.round(d.minutos_acumulados / d.total_pedidos),
        total_facturado: d.total_facturado
      }));

    return Response.json({
      pedidos: listado.map(p => ({
        ...p,
        total: Number(p.total),
        items: p.pedido_items
      })),
      porHora,
      porDia
    });
  } catch (err: any) {
    console.error("[delivery/historial GET]", err);
    return Response.json({ pedidos: [], porHora: [], porDia: [] });
  }
}
