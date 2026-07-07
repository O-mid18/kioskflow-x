import { NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userClient = createServerClient(token);
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminClient();
  const body = await request.json();

  if (body.action === "update_order_status") {
    const { orderId, status } = body;
    if (!orderId || !status) return NextResponse.json({ error: "Missing params" }, { status: 400 });
    const { error } = await db.from("orders").update({ status }).eq("id", orderId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_product") {
    const { productId } = body;
    if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    const { error } = await db.from("products").delete().eq("id", productId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "get_conversations") {
    const { data } = await db.from("conversations").select("id, buyer_id, supplier_id, created_at").order("created_at", { ascending: false });
    if (!data) return NextResponse.json({ conversations: [] });
    const ids = [...new Set([...data.map((c: any) => c.buyer_id), ...data.map((c: any) => c.supplier_id)])];
    const { data: profs } = await db.from("profiles").select("id, full_name, company_name").in("id", ids);
    const nameMap: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => { nameMap[p.id] = p.company_name || p.full_name || "Unbekannt"; });
    const enriched = data.map((c: any) => ({ ...c, buyer_name: nameMap[c.buyer_id] ?? "Käufer", supplier_name: nameMap[c.supplier_id] ?? "Lieferant" }));
    return NextResponse.json({ conversations: enriched });
  }

  if (body.action === "get_messages") {
    const { conversationId } = body;
    if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    const { data } = await db.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    return NextResponse.json({ messages: data ?? [] });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
