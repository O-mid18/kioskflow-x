import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase";

const SESSION_KEY = "owner_session";
const SALT = "kf-owner-v1";

function sha(str: string) {
  return createHash("sha256").update(str).digest("hex");
}

function makeToken(pwHash: string): string {
  const ts = Date.now().toString();
  return `${ts}.${sha(`${ts}:${pwHash}:${SALT}`)}`;
}

function verifyToken(token: string, pwHash: string): boolean {
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (Number.isNaN(parseInt(ts))) return false;
  if (Date.now() - parseInt(ts) > 7 * 86_400_000) return false;
  const expected = sha(`${ts}:${pwHash}:${SALT}`);
  try { return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex")); }
  catch { return false; }
}

async function getPwHash(): Promise<string> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("owner_config").select("value").eq("key", "password_hash").maybeSingle();
    if (data?.value) return data.value;
  } catch {}
  return sha(process.env.OWNER_PASSWORD ?? "kioskflow2024");
}

function cookieOpts(maxAge = 7 * 86_400) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_KEY)?.value ?? "";
  if (!token) return false;
  return verifyToken(token, await getPwHash());
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const action = req.nextUrl.searchParams.get("action") ?? "verify";
  if (action === "verify") return NextResponse.json({ ok: true });

  const db = createAdminClient();

  if (action === "stats") {
    const [
      { count: userCount }, { count: supplierCount },
      { count: orderCount }, { count: productCount },
      { data: paid },
    ] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("suppliers").select("id", { count: "exact", head: true }),
      db.from("orders").select("id", { count: "exact", head: true }),
      db.from("products").select("id", { count: "exact", head: true }),
      db.from("orders").select("total_price").eq("status", "paid"),
    ]);
    const revenue = (paid ?? []).reduce((s: number, o: any) => s + (o.total_price ?? 0), 0);
    return NextResponse.json({ userCount, supplierCount, orderCount, productCount, revenue });
  }

  if (action === "revenue") {
    const { data } = await db.from("orders").select("total_price, created_at").eq("status", "paid");
    const monthly: Record<string, number> = {};
    for (const o of data ?? []) {
      const month = new Date(o.created_at).toISOString().slice(0, 7);
      monthly[month] = (monthly[month] ?? 0) + (o.total_price ?? 0);
    }
    return NextResponse.json(monthly);
  }

  if (action === "users") {
    const [{ data: profiles }, authResult] = await Promise.all([
      db.from("profiles").select("*").order("created_at", { ascending: false }),
      db.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const authMap = new Map((authResult.data?.users ?? []).map((u: any) => [
      u.id,
      { email: u.email, banned: u.banned_until ? new Date(u.banned_until) > new Date() : false },
    ]));
    return NextResponse.json((profiles ?? []).map((p: any) => ({ ...p, ...authMap.get(p.id) })));
  }

  if (action === "suppliers") {
    const { data } = await db.from("suppliers").select("*").order("created_at", { ascending: false });
    return NextResponse.json(data ?? []);
  }

  if (action === "orders") {
    const { data } = await db
      .from("orders")
      .select("id, status, total_price, created_at, buyer_id, profiles!buyer_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    return NextResponse.json(data ?? []);
  }

  if (action === "products") {
    const { data } = await db
      .from("products")
      .select("id, name, price, stock, category, created_at, suppliers(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    return NextResponse.json(data ?? []);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (body.action === "login") {
    const pwHash = await getPwHash();
    if (sha(body.password ?? "") !== pwHash) return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_KEY, makeToken(pwHash), cookieOpts());
    return res;
  }

  if (!(await isAuthed(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();

  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_KEY, "", cookieOpts(0));
    return res;
  }

  if (body.action === "change_password") {
    const pwHash = await getPwHash();
    if (sha(body.currentPassword ?? "") !== pwHash) return NextResponse.json({ error: "Aktuelles Passwort ist falsch" }, { status: 401 });
    if (!body.newPassword || body.newPassword.length < 6) return NextResponse.json({ error: "Mindestens 6 Zeichen erforderlich" }, { status: 400 });
    const newHash = sha(body.newPassword);
    const { error } = await db.from("owner_config").upsert({ key: "password_hash", value: newHash, updated_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: "Tabelle 'owner_config' fehlt — SQL ausführen" }, { status: 500 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_KEY, makeToken(newHash), cookieOpts());
    return res;
  }

  // ── User actions ─────────────────────────────────────────────────────────────
  if (body.action === "change_role") {
    if (!["buyer", "supplier", "admin"].includes(body.role)) return NextResponse.json({ error: "Ungültige Rolle" }, { status: 400 });
    await db.from("profiles").update({ role: body.role }).eq("id", body.userId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "block_user") {
    await db.auth.admin.updateUserById(body.userId, { ban_duration: "876600h" });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unblock_user") {
    await db.auth.admin.updateUserById(body.userId, { ban_duration: "none" });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_user") {
    await db.from("profiles").delete().eq("id", body.userId);
    await db.auth.admin.deleteUser(body.userId);
    return NextResponse.json({ ok: true });
  }

  // ── Supplier actions ──────────────────────────────────────────────────────────
  if (body.action === "verify_supplier") {
    await db.from("suppliers").update({ verified: true }).eq("id", body.supplierId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unverify_supplier") {
    await db.from("suppliers").update({ verified: false }).eq("id", body.supplierId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_supplier") {
    await db.from("products").update({ stock: 0 }).eq("supplier_id", body.supplierId);
    await db.from("suppliers").delete().eq("id", body.supplierId);
    return NextResponse.json({ ok: true });
  }

  // ── Product actions ───────────────────────────────────────────────────────────
  if (body.action === "update_product") {
    await db.from("products").update({ price: Number(body.price), stock: Number(body.stock) }).eq("id", body.productId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_product") {
    await db.from("products").delete().eq("id", body.productId);
    return NextResponse.json({ ok: true });
  }

  // ── Order actions ─────────────────────────────────────────────────────────────
  if (body.action === "update_order_status") {
    await db.from("orders").update({ status: body.status }).eq("id", body.orderId);
    return NextResponse.json({ ok: true });
  }

  // ── Broadcast notification ────────────────────────────────────────────────────
  if (body.action === "broadcast_notification") {
    if (!body.title || !body.message) return NextResponse.json({ error: "Titel und Nachricht erforderlich" }, { status: 400 });
    const { data: profileIds } = await db.from("profiles").select("id");
    if (profileIds && profileIds.length > 0) {
      await db.from("notifications").insert(
        profileIds.map((p: any) => ({ user_id: p.id, title: body.title, body: body.message, read: false }))
      );
    }
    return NextResponse.json({ ok: true, sent: profileIds?.length ?? 0 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
