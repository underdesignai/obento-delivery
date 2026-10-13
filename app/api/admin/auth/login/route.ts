import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { JWT_SECRET_BYTES } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { user, password } = await req.json();

    const expectedUser = process.env.ADMIN_USER || "admin";
    const expectedPassword = process.env.ADMIN_PASSWORD || "45014501";

    if (user === expectedUser && password === expectedPassword) {
      const token = await new SignJWT({ sub: user, role: "admin", username: user })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(JWT_SECRET_BYTES);

      const cookieStore = await cookies();
      cookieStore.set("admin_token", token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 días para terminal de riders
      });

      return Response.json({ ok: true, role: "admin" });
    }

    return Response.json({ error: "Credenciales incorrectas" }, { status: 401 });
  } catch (err) {
    return Response.json({ error: "Error en el servidor de autenticación" }, { status: 500 });
  }
}
