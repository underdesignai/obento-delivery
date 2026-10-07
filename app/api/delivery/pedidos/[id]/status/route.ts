import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { estado_pedido, repartidor_nombre } = await req.json();

    if (!estado_pedido) {
      return Response.json({ error: "estado_pedido es obligatorio" }, { status: 400 });
    }

    const current = await prisma.pedidos.findUnique({
      where: { id: Number(id) }
    });

    if (!current) {
      return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const updateData: any = {
      estado_pedido,
      updated_at: new Date()
    };

    if (estado_pedido === "en_camino") {
      updateData.fecha_salida_reparto = current.fecha_salida_reparto || new Date();
      if (repartidor_nombre) updateData.repartidor_nombre = repartidor_nombre;
    } else if (estado_pedido === "entregado") {
      const now = new Date();
      updateData.fecha_entregado = now;
      const start = current.fecha_salida_reparto || current.created_at || now;
      const diffMs = now.getTime() - new Date(start).getTime();
      updateData.tiempo_entrega_minutos = Math.max(1, Math.round(diffMs / 60000));
    }

    const updated = await prisma.pedidos.update({
      where: { id: Number(id) },
      data: updateData
    });

    return Response.json(updated);
  } catch (err: any) {
    console.error("[delivery status PATCH]", err);
    return Response.json({ error: "Error al actualizar estado" }, { status: 500 });
  }
}
