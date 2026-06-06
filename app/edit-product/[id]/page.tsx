"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function EditProductPage() {
  const params = useParams();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    const productId = String(params.id);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      console.log(error);
      return;
    }

    if (data) {
      setName(data.name || "");
      setPrice(String(data.price || ""));
      setStock(String(data.stock || ""));
      setImageUrl(data.image_url || "");
    }

    setLoading(false);
  };

  const updateProduct = async () => {
    const productId = String(params.id);

    const { error } = await supabase
      .from("products")
      .update({
        name,
        price: Number(price),
        stock: Number(stock),
        image_url: imageUrl,
      })
      .eq("id", productId);

    if (error) {
      alert(error.message);
    } else {
      alert("Product Updated Successfully");
      window.location.href = "/supplier";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-xl">
        <h1 className="text-4xl font-bold mb-8">
          Edit Product
        </h1>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Product Name"
            value={name}
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="number"
            placeholder="Price"
            value={price}
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setPrice(e.target.value)}
          />

          <input
            type="number"
            placeholder="Stock"
            value={stock}
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setStock(e.target.value)}
          />

          <input
            type="text"
            placeholder="Image URL"
            value={imageUrl}
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <button
            onClick={updateProduct}
            className="w-full bg-red-600 text-white py-4 rounded-2xl text-lg font-semibold"
          >
            Update Product
          </button>
        </div>
      </div>
    </main>
  );
}