"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SupplierProfilePage() {
  const params = useParams();

  const [supplier, setSupplier] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupplier();
  }, []);

  const fetchSupplier = async () => {
    const supplierId = String(params.id);

    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", supplierId)
      .single();

    setSupplier(data);

    const { data: productData } = await supabase
      .from("products")
      .select("*")
      .eq("supplier_id", supplierId);

    setProducts(productData || []);

    setLoading(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="bg-white text-black rounded-3xl p-8 mb-10">
        <h1 className="text-5xl font-bold">
          {supplier?.name}
        </h1>

        <p className="mt-4 text-gray-600">
          {supplier?.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl p-4 shadow-lg"
          >
            <a href={`/product/${product.id}`}>
              <h2 className="text-2xl font-bold text-black hover:text-red-600">
                {product.name}
              </h2>
            </a>

            <p className="text-3xl font-bold mt-4 text-green-600">
              €{product.price}
            </p>

            <button
              onClick={async () => {
                const { data: userData } =
                  await supabase.auth.getUser();

                if (!userData.user) {
                  alert("Please login first");
                  return;
                }

                await supabase.from("cart_items").insert({
                  user_id: userData.user.id,
                  product_id: product.id,
                  quantity: 1,
                });

                alert("Added to cart 🛒");
              }}
              className="mt-4 w-full bg-black text-white py-3 rounded-xl"
            >
              Add To Cart
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}