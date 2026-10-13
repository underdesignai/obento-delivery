import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  return Response.json(user);
}
