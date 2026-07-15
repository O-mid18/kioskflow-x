import { createAdminClient } from "@/lib/supabase";
import MarketplaceClient from "./MarketplaceClient";

export const revalidate = 60;

export default async function MarketplacePage() {
  try {
    const db = createAdminClient();
    const [{ data: suppliers }, { data: reviews }] = await Promise.all([
      db.from("suppliers").select("*").eq("verified", true),
      db.from("reviews").select("*"),
    ]);
    const verifiedIds = (suppliers ?? []).map((s: any) => s.id);
    const { data: products } = verifiedIds.length > 0
      ? await db.from("products").select("*").in("supplier_id", verifiedIds)
      : { data: [] };
    return (
      <MarketplaceClient
        initialProducts={products ?? []}
        initialSuppliers={suppliers ?? []}
        initialReviews={reviews ?? []}
      />
    );
  } catch {
    return <MarketplaceClient initialProducts={[]} initialSuppliers={[]} initialReviews={[]} />;
  }
}
