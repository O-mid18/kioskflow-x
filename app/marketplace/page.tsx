import { createAdminClient } from "@/lib/supabase";
import MarketplaceClient from "./MarketplaceClient";

export const revalidate = 60;

export default async function MarketplacePage() {
  try {
    const db = createAdminClient();
    const [{ data: products }, { data: suppliers }, { data: reviews }] = await Promise.all([
      db.from("products").select("*"),
      db.from("suppliers").select("*"),
      db.from("reviews").select("*"),
    ]);
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
