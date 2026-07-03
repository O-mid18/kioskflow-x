import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the user with their JWT
  const userClient = createServerClient(token);
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();

  // Check if supplier record already exists
  const { data: existing } = await db
    .from("suppliers")
    .select("id, name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ supplier: existing });

  // No supplier record — check profile role first
  const { data: profile } = await db
    .from("profiles")
    .select("role, company_name, full_name, city, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "supplier") {
    return NextResponse.json({ error: "Kein Lieferant-Konto" }, { status: 403 });
  }

  // Create supplier record (admin client bypasses RLS)
  const { data: created, error: insertError } = await db
    .from("suppliers")
    .insert({
      user_id: user.id,
      name: profile.company_name || profile.full_name || "Mein Unternehmen",
      city: profile.city ?? null,
      phone: profile.phone ?? null,
    })
    .select("id, name")
    .maybeSingle();

  if (insertError || !created) {
    return NextResponse.json({ error: "Fehler beim Erstellen des Lieferanten" }, { status: 500 });
  }

  return NextResponse.json({ supplier: created });
}
