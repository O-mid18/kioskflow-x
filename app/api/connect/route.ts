import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: supplier } = await db.from("suppliers").select("id, stripe_account_id").eq("user_id", user.id).single();
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  let accountId = supplier.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "DE",
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });
    accountId = account.id;
    await db.from("suppliers").update({ stripe_account_id: accountId }).eq("id", supplier.id);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kioskflow-x.vercel.app";
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/supplier/dashboard/verification?refresh=true`,
    return_url: `${baseUrl}/supplier/dashboard/verification?success=true`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: supplier } = await db.from("suppliers").select("stripe_account_id, stripe_onboarded").eq("user_id", user.id).single();
  if (!supplier?.stripe_account_id) return NextResponse.json({ onboarded: false });

  const account = await stripe.accounts.retrieve(supplier.stripe_account_id);
  const onboarded = !!(account.details_submitted && !account.requirements?.currently_due?.length);
  if (onboarded && !supplier.stripe_onboarded) {
    await db.from("suppliers").update({ stripe_onboarded: true }).eq("user_id", user.id);
  }

  return NextResponse.json({ onboarded, payoutsEnabled: account.payouts_enabled });
}
