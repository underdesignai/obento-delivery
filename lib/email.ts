import nodemailer from "nodemailer";
import { prisma } from "./prisma";

/**
 * Obtiene credenciales de email desde variables de entorno o desde la tabla 'configuracion' de la DB
 */
async function getEmailCredentials() {
  let from = process.env.EMAIL_FROM || "pedidos@obentojapanesefood.es";
  let pass = process.env.EMAIL_PASSWORD || "";

  if (!pass) {
    try {
      const configItem = await prisma.configuracion.findUnique({
        where: { clave: "email_config" }
      });
      if (configItem && configItem.valor) {
        const cfg = JSON.parse(configItem.valor);
        if (cfg.from) from = cfg.from;
        if (cfg.password) pass = cfg.password;
      }
    } catch {
      // Ignorar si no existe tabla o valor
    }
  }

  return { from, pass };
}

/**
 * Retorna el transportador de correo listo para enviar
 */
async function getTransporter() {
  const { from, pass } = await getEmailCredentials();
  if (!from || !pass) {
    return { transporter: null, from };
  }

  return {
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: { user: from, pass }
    }),
    from
  };
}

/**
 * Plantilla corporativa oficial Obento Japanese Food
 */
function baseEmailLayout(content: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background:#0d0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
    <div style="max-width:580px;margin:25px auto;background:#15151c;border-radius:14px;overflow:hidden;border:1px solid rgba(200,30,34,0.35);box-shadow:0 15px 35px rgba(0,0,0,0.6);">
      
      <!-- Cabecera Obento -->
      <div style="background:linear-gradient(135deg, #180507 0%, #0d0d12 100%);padding:26px 32px;display:flex;align-items:center;border-bottom:1px solid rgba(200,30,34,0.25);">
        <div style="border-left:4px solid #c81e22;padding-left:14px;">
          <div style="font-size:24px;font-weight:900;letter-spacing:0.18em;color:#f3ede0;line-height:1;">
            OBENTO
          </div>
          <div style="font-size:11px;color:#c81e22;text-transform:uppercase;letter-spacing:0.25em;margin-top:4px;font-weight:700;">
            Japanese Food · Delivery
          </div>
        </div>
      </div>

      <!-- Contenido Principal -->
      <div style="padding:32px 32px 28px;">
        ${content}
      </div>

      <!-- Pie de página -->
      <div style="background:#0e0e14;padding:20px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
        <p style="font-size:12px;color:#9ca3af;margin:0 0 6px;line-height:1.5;">
          📍 C. Amargura, 3 · 30830 La Ñora, Murcia · 📞 Tel. 613 927 596
        </p>
        <p style="font-size:11px;color:#6b7280;margin:0;">
          © ${new Date().getFullYear()} Obento Japanese Food · Servicio Oficial de Reparto
        </p>
      </div>

    </div>
  </body>
  </html>`;
}

/**
 * Tabla de platos formateada
 */
function itemsTableHtml(items: any[]) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const rows = items
    .map(
      (it) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;color:#f3ede0;">
        <strong style="color:#c81e22;">${it.cantidad || 1}x</strong> ${it.nombre}
        ${it.porcion ? `<span style="color:#9ca3af;font-size:12px;"> (${it.porcion})</span>` : ""}
        ${it.opcion ? `<span style="color:#9ca3af;font-size:12px;"> - ${it.opcion}</span>` : ""}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;color:#f3ede0;text-align:right;font-family:monospace;font-weight:bold;">
        ${Number(it.subtotal || 0).toFixed(2).replace(".", ",")} €
      </td>
    </tr>`
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:18px 0 20px;">
      <thead>
        <tr>
          <th style="text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:8px;">Plato</th>
          <th style="text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:8px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
}

/**
 * Enviar Correo Electrónico cuando el pedido SALE A REPARTO
 */
export async function sendOrderInDeliveryEmail(to: string, data: any) {
  if (!to) return;
  const { transporter, from: emailFrom } = await getTransporter();

  const isEfectivo = data.metodo_pago === "efectivo" || data.estado_pago === "pendiente";
  const rider = data.repartidor_nombre ? data.repartidor_nombre : "Nuestro repartidor";

  const html = baseEmailLayout(`
    <div style="display:inline-block;padding:6px 14px;border-radius:20px;background:rgba(192,132,252,0.15);border:1.5px solid rgba(192,132,252,0.4);color:#c084fc;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">
      🛵 ¡PEDIDO EN CAMINO!
    </div>
    
    <h1 style="font-size:24px;color:#f3ede0;margin:0 0 10px;font-weight:900;line-height:1.2;">
      ¡Tu comida va de camino a tu puerta! 🍣💨
    </h1>
    
    <p style="color:#d1d5db;font-size:15px;line-height:1.5;margin:0 0 20px;">
      Hola <strong>${data.cliente_nombre}</strong>, te informamos de que <strong>${rider}</strong> acaba de salir de nuestro restaurante con tu pedido recién elaborado y empaquetado térmicamente.
    </p>

    <!-- Caja de Destino y Entrega -->
    <div style="background:rgba(200,30,34,0.08);border:1px solid rgba(200,30,34,0.3);border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">NÚMERO DE PEDIDO</span>
        <span style="font-family:monospace;font-size:22px;font-weight:900;color:#c81e22;">${data.numero_pedido}</span>
      </div>
      
      <div style="font-size:14px;color:#f3ede0;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;margin-top:6px;line-height:1.4;">
        📍 <strong>Dirección de entrega:</strong><br/>
        <span style="color:#cbd5e1;">${data.direccion_entrega || "Dirección indicada en el pedido"}</span>
        ${data.direccion_detalles ? `<br/><span style="color:#9ca3af;font-size:12px;">(${data.direccion_detalles})</span>` : ""}
      </div>

      <div style="font-size:13px;color:#d1d5db;margin-top:10px;">
        ⏱️ <strong>Tiempo estimado de llegada:</strong> <span style="color:#4ade80;font-weight:bold;">15 - 25 minutos aprox.</span>
      </div>
    </div>

    <!-- Recordatorio de Pago si es en mano -->
    ${isEfectivo ? `
    <div style="background:rgba(251,191,36,0.1);border:1.5px solid rgba(251,191,36,0.35);border-radius:8px;padding:14px 18px;margin-bottom:22px;">
      <div style="font-size:13px;font-weight:800;color:#fbbf24;margin-bottom:4px;">
        💵 PAGO PENDIENTE EN EFECTIVO
      </div>
      <div style="font-size:13px;color:#e5e7eb;">
        Por favor ten preparado el importe exacto o cambio para agilizar la entrega: <strong>${Number(data.total).toFixed(2).replace(".", ",")} €</strong>.
      </div>
    </div>
    ` : `
    <div style="background:rgba(34,197,94,0.1);border:1.5px solid rgba(34,197,94,0.35);border-radius:8px;padding:12px 18px;margin-bottom:22px;">
      <div style="font-size:13px;font-weight:800;color:#4ade80;">
        ✓ PEDIDO PAGADO ONLINE
      </div>
      <div style="font-size:12px;color:#d1d5db;margin-top:2px;">
        No tienes que pagar nada al repartidor. Solo recoger y disfrutar.
      </div>
    </div>
    `}

    <!-- Resumen de Platos -->
    ${itemsTableHtml(data.items || data.pedido_items || [])}

    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0 0;border-top:2px solid rgba(255,255,255,0.1);margin-bottom:20px;">
      <span style="font-size:15px;font-weight:700;color:#f3ede0;">Total del pedido:</span>
      <span style="font-size:22px;font-weight:900;color:#c81e22;font-family:monospace;">${Number(data.total).toFixed(2).replace(".", ",")} €</span>
    </div>

    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:20px 0 0;line-height:1.4;">
      El repartidor se pondrá en contacto al llegar si tiene cualquier duda con el portal o timbre.<br/>
      ¡Buen provecho! 🥢
    </p>
  `);

  if (!transporter) {
    console.log(`ℹ️ [Email Notificación Salida a Reparto] Para: ${to} | Asunto: Pedido en camino ${data.numero_pedido}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"OBENTO Japanese Food" <${emailFrom}>`,
      to,
      subject: `🛵 ¡Tu pedido va en camino! · ${data.numero_pedido} · OBENTO`,
      html
    });
    console.log(`✉️ Email de salida a reparto enviado con éxito a ${to} (${data.numero_pedido})`);
  } catch (err: any) {
    console.error(`⚠️ Error al enviar email de salida a reparto a ${to}:`, err.message);
  }
}
