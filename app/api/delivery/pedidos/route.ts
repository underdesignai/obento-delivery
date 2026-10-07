import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pedidos = await prisma.pedidos.findMany({
      where: {
        tipo_entrega: { in: ["domicilio", "delivery"] },
        estado_pedido: { in: ["listo_reparto", "en_camino", "listo", "en_preparacion"] }
      },
      include: {
        pedido_items: true
      },
      orderBy: {
        id: "desc"
      }
    });

    const parsed = pedidos.map(p => ({
      id: p.id,
      numero_pedido: p.numero_pedido,
      cliente_nombre: p.cliente_nombre,
      cliente_telefono: p.cliente_telefono,
      cliente_email: p.cliente_email,
      tipo_entrega: p.tipo_entrega,
      direccion_entrega: p.direccion_entrega,
      direccion_detalles: p.direccion_detalles,
      codigo_postal: p.codigo_postal,
      repartidor_nombre: p.repartidor_nombre,
      fecha_salida_reparto: p.fecha_salida_reparto,
      hora_recogida: p.hora_recogida,
      notas: p.notas,
      metodo_pago: p.metodo_pago,
      estado_pago: p.estado_pago,
      estado_pedido: p.estado_pedido,
      total: Number(p.total),
      created_at: p.created_at,
      items: p.pedido_items.map(it => ({
        id: it.id,
        nombre: it.nombre,
        porcion: it.porcion,
        opcion: it.opcion,
        precio: Number(it.precio_unitario),
        cantidad: it.cantidad,
        subtotal: Number(it.subtotal)
      }))
    }));

    return Response.json(parsed);
  } catch (err: any) {
    console.error("[delivery/pedidos GET]", err);
    return Response.json([], { status: 500 });
  }
}
