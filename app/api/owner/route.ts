import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual, pbkdf2Sync } from "crypto";
import { createAdminClient, createServerClient } from "@/lib/supabase";

const SESSION_KEY = "owner_session";
const LEGACY_SALT = "kf-owner-v1";

function sha(str: string) {
  return createHash("sha256").update(str).digest("hex");
}

// PBKDF2 with 200k iterations. Salt is now stored inside the hash as "v2:<salt>:<hash>"
function hashPasswordV2(str: string, salt?: string): string {
  const s = salt ?? createHash("sha256").update(str + Date.now() + Math.random()).digest("hex").slice(0, 32);
  return "v2:" + s + ":" + pbkdf2Sync(str, s, 200_000, 32, "sha512").toString("hex");
}

function verifyPassword(input: string, stored: string): boolean {
  if (stored.startsWith("v2:")) {
    const parts = stored.split(":");
    if (parts.length < 3) return false;
    const salt = parts[1];
    const expected = "v2:" + salt + ":" + pbkdf2Sync(input, salt, 200_000, 32, "sha512").toString("hex");
    try { return timingSafeEqual(Buffer.from(stored), Buffer.from(expected)); } catch { return false; }
  }
  // Legacy SHA-256 — timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(sha(input), "hex"), Buffer.from(stored, "hex"));
  } catch { return false; }
}

function makeToken(pwHash: string): string {
  const ts = Date.now().toString();
  return `${ts}.${sha(`${ts}:${pwHash}:${LEGACY_SALT}`)}`;
}

function verifyToken(token: string, pwHash: string): boolean {
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (Number.isNaN(parseInt(ts))) return false;
  if (Date.now() - parseInt(ts) > 7 * 86_400_000) return false;
  const expected = sha(`${ts}:${pwHash}:${LEGACY_SALT}`);
  try { return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex")); }
  catch { return false; }
}

async function getPwHash(): Promise<string> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("owner_config").select("value").eq("key", "password_hash").maybeSingle();
    if (data?.value) return data.value;
  } catch {}
  const envPw = process.env.OWNER_PASSWORD;
  if (!envPw) throw new Error("OWNER_PASSWORD env var is not set and no password_hash in DB");
  return sha(envPw);
}

function cookieOpts(maxAge = 7 * 86_400) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_KEY)?.value ?? "";
  if (token && (await verifyToken(token, await getPwHash()))) return true;

  // Alternative: a normal Supabase session for an admin-role account (so
  // logging in via /login with an admin account reaches the owner panel
  // too, not just the separate password-only /owner gate).
  const authHeader = req.headers.get("Authorization");
  const bearerToken = authHeader?.replace("Bearer ", "");
  if (!bearerToken) return false;
  const supabase = createServerClient(bearerToken);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin";
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

  if (action === "verification_doc_url") {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    const { data: profile } = await db.from("profiles").select("verification_document_url").eq("id", userId).maybeSingle();
    if (!profile?.verification_document_url) return NextResponse.json({ error: "Kein Dokument vorhanden" }, { status: 404 });
    const { data, error } = await db.storage.from("verification-documents").createSignedUrl(profile.verification_document_url, 300);
    if (error || !data) return NextResponse.json({ error: "Konnte Dokument nicht laden" }, { status: 500 });
    return NextResponse.json({ url: data.signedUrl });
  }

  if (action === "orders") {
    const { data } = await db
      .from("orders")
      .select("id, status, total_price, created_at, buyer_id, profiles!buyer_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    return NextResponse.json(data ?? []);
  }

  if (action === "order_items") {
    const orderId = req.nextUrl.searchParams.get("orderId");
    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    const { data } = await db
      .from("order_items")
      .select("id, quantity, price_at_purchase, products(name), suppliers(name)")
      .eq("order_id", orderId);
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

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function checkBruteForce(ip: string): Promise<{ blocked: boolean }> {
  const db = createAdminClient();
  const { data } = await db.from("owner_login_attempts").select("count, locked_until").eq("ip", ip).maybeSingle();
  if (data && data.count >= MAX_FAILURES && data.locked_until && new Date(data.locked_until) > new Date()) {
    return { blocked: true };
  }
  return { blocked: false };
}

async function recordFailure(ip: string): Promise<void> {
  const db = createAdminClient();
  const lockedUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
  const { data } = await db.from("owner_login_attempts").select("count").eq("ip", ip).maybeSingle();
  const newCount = (data?.count ?? 0) + 1;
  await db.from("owner_login_attempts").upsert({ ip, count: newCount, locked_until: lockedUntil }, { onConflict: "ip" });
}

async function clearFailures(ip: string): Promise<void> {
  const db = createAdminClient();
  await db.from("owner_login_attempts").delete().eq("ip", ip);
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (body.action === "login") {
    const ip = getClientIp(req);
    const { blocked } = await checkBruteForce(ip);
    if (blocked) {
      return NextResponse.json({ error: "Zu viele Fehlversuche. Bitte warte 15 Minuten." }, { status: 429 });
    }

    let pwHash: string;
    try { pwHash = await getPwHash(); }
    catch { return NextResponse.json({ error: "Owner-Passwort nicht konfiguriert." }, { status: 503 }); }

    if (!verifyPassword(body.password ?? "", pwHash)) {
      await recordFailure(ip);
      return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
    }

    await clearFailures(ip);
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
    if (!verifyPassword(body.currentPassword ?? "", pwHash)) return NextResponse.json({ error: "Aktuelles Passwort ist falsch" }, { status: 401 });
    if (!body.newPassword || body.newPassword.length < 6) return NextResponse.json({ error: "Mindestens 6 Zeichen erforderlich" }, { status: 400 });
    const newHash = hashPasswordV2(body.newPassword); // always store as PBKDF2 from now on
    const { error } = await db.from("owner_config").upsert({ key: "password_hash", value: newHash, updated_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: "Tabelle 'owner_config' fehlt — SQL ausführen" }, { status: 500 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_KEY, makeToken(newHash), cookieOpts());
    return res;
  }

  // ── User actions ─────────────────────────────────────────────────────────────
  if (body.action === "approve_buyer") {
    await db.from("profiles").update({ approved: true }).eq("id", body.userId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unapprove_buyer") {
    await db.from("profiles").update({ approved: false }).eq("id", body.userId);
    return NextResponse.json({ ok: true });
  }

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
    const uid = body.userId;
    if (!uid) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // 1. Get buyer order IDs first (needed to delete order_items)
    const { data: userOrders } = await db.from("orders").select("id").eq("buyer_id", uid);
    const orderIds = (userOrders ?? []).map((o: any) => o.id);

    // 2. Delete all related data in dependency order
    await db.from("cart_items").delete().eq("user_id", uid);
    await db.from("wishlist").delete().eq("user_id", uid);
    await db.from("notifications").delete().eq("user_id", uid);
    await db.from("reviews").delete().eq("user_id", uid);

    // Support chat (support_conversations / support_messages)
    const { data: convs } = await db.from("support_conversations").select("id").eq("user_id", uid);
    const convIds = (convs ?? []).map((c: any) => c.id);
    if (convIds.length > 0) {
      await db.from("support_messages").delete().in("conversation_id", convIds);
      await db.from("support_conversations").delete().in("id", convIds);
    }
    // Also delete any support_messages where this user is the sender (e.g. admin replies)
    await db.from("support_messages").delete().eq("sender_id", uid);

    // Direct buyer-supplier chat (conversations / messages)
    const { data: directConvs } = await db
      .from("conversations")
      .select("id")
      .or(`buyer_id.eq.${uid},supplier_id.eq.${uid}`);
    const directConvIds = (directConvs ?? []).map((c: any) => c.id);
    if (directConvIds.length > 0) {
      await db.from("messages").delete().in("conversation_id", directConvIds);
      await db.from("conversations").delete().in("id", directConvIds);
    }
    // Also delete any messages sent by this user in other conversations
    await db.from("messages").delete().eq("sender_id", uid);

    // Orders & items
    if (orderIds.length > 0) {
      await db.from("order_items").delete().in("order_id", orderIds);
    }
    await db.from("orders").delete().eq("buyer_id", uid);

    // If supplier: delete products then supplier record
    const { data: sup } = await db.from("suppliers").select("id").eq("user_id", uid).maybeSingle();
    if (sup?.id) {
      const { data: supProducts } = await db.from("products").select("id").eq("supplier_id", sup.id);
      const supProductIds = (supProducts ?? []).map((p: any) => p.id);

      if (supProductIds.length > 0) {
        await db.from("reviews").delete().in("product_id", supProductIds);
        await db.from("wishlist").delete().in("product_id", supProductIds);
        await db.from("cart_items").delete().in("product_id", supProductIds);
      }

      await db.from("order_items").delete().eq("supplier_id", sup.id);
      if (supProductIds.length > 0) {
        await db.from("order_items").delete().in("product_id", supProductIds);
      }
      await db.from("orders").update({ supplier_id: null }).eq("supplier_id", sup.id);
      await db.from("products").delete().eq("supplier_id", sup.id);
      await db.from("suppliers").delete().eq("id", sup.id);
    }

    await db.from("profiles").delete().eq("id", uid);

    // 3. Finally remove from auth
    const { error: authErr } = await db.auth.admin.deleteUser(uid);
    if (authErr) {
      console.error("[owner] delete_user auth error:", authErr.message);
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }
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
    const sid = body.supplierId;
    if (!sid) return NextResponse.json({ error: "Missing supplierId" }, { status: 400 });
    const { data: supProducts } = await db.from("products").select("id").eq("supplier_id", sid);
    const supProductIds = (supProducts ?? []).map((p: any) => p.id);
    if (supProductIds.length > 0) {
      await db.from("reviews").delete().in("product_id", supProductIds);
      await db.from("wishlist").delete().in("product_id", supProductIds);
      await db.from("cart_items").delete().in("product_id", supProductIds);
      await db.from("order_items").delete().in("product_id", supProductIds);
    }
    await db.from("order_items").delete().eq("supplier_id", sid);
    await db.from("orders").update({ supplier_id: null }).eq("supplier_id", sid);
    await db.from("products").delete().eq("supplier_id", sid);
    await db.from("suppliers").delete().eq("id", sid);
    return NextResponse.json({ ok: true });
  }

  // ── Product actions ───────────────────────────────────────────────────────────
  if (body.action === "update_product") {
    const price = Number(body.price);
    const stock = Number(body.stock);
    if (isNaN(price) || price <= 0) return NextResponse.json({ error: "Ungültiger Preis" }, { status: 400 });
    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) return NextResponse.json({ error: "Ungültiger Lagerbestand" }, { status: 400 });
    await db.from("products").update({ price, stock }).eq("id", body.productId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_product") {
    await db.from("products").delete().eq("id", body.productId);
    return NextResponse.json({ ok: true });
  }

  // ── Order actions ─────────────────────────────────────────────────────────────
  const VALID_ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"];
  if (body.action === "update_order_status") {
    if (!VALID_ORDER_STATUSES.includes(body.status)) return NextResponse.json({ error: "Ungültiger Bestellstatus" }, { status: 400 });
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
