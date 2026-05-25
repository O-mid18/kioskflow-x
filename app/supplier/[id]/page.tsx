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
    const fetchSupplier = async () => {
      try {
        console.log("PARAMS:", params);

        const { data, error } = await supabase
          .from("suppliers")
          .select("*")
          .eq("id", params.id)
          .single();

        console.log("SUPPLIER:", data);
        console.log("ERROR:", error);

        setSupplier(data);

        const { data: productData } = await supabase
          .from("products")
          .select("*")
          .eq("supplier_id", params.id);

        setProducts(productData || []);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) {
      fetchSupplier();
    }
  }, [params]);

  if (loading) {
    return (
      <div className="text-white p-10">
        Loading...
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-red-500 p-10">
        Supplier not found
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B1120] text-white p-10">
      <div className="bg-white text-black rounded-3xl p-10">
        <h1 className="text-5xl font-bold">
          {supplier.name}
        </h1>

        <p className="mt-4 text-gray-600">
          {supplier.description}
        </p>
      </div>

      <h2 className="text-3xl font-bold mt-10 mb-6">
        Products
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
  {products.map((product) => (
    <div
      key={product.id}
      className="bg-white rounded-2xl p-4 shadow-lg"
    >
      <img
        src={product.image_url}
        alt={product.name}
        className="w-full h-48 object-cover rounded-xl"
      />

      <a href={`/product/${product.id}`}>
  <h2 className="text-2xl font-bold mt-4 text-black hover:text-red-600 cursor-pointer">
    {product.name}
  </h2>
</a> 

      <p className="text-gray-600 mt-2">
        {product.description}
      </p>

      <p className="text-3xl font-bold mt-4 text-green-600">
        €{product.price}
      </p>
      <button
  onClick={async () => {
    const { data: userData } = await supabase.auth.getUser();

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
          <div
            key={product.id}
            className="bg-white text-black p-6 rounded-2xl"
          >
            <h3 className="text-2xl font-bold">
              {product.name}
            </h3>
          </div>
        ))}
      </div>
    </main>
  );
}