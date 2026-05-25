"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProductDetailsPage() {
  const params = useParams();

  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
const [comment, setComment] = useState("");
const [rating, setRating] = useState(5);

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", String(params.id))
      .single();

    setProduct(data);
    const { data: reviewData } = await supabase
  .from("reviews")
  .select("*")
  .eq("product_id", params.id);

setReviews(reviewData || []);
  };

  if (!product) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="grid md:grid-cols-2 gap-10">
        <img
          src={
            product.image_url ||
            "https://images.unsplash.com/photo-1543253687-c931c8e01820?q=80&w=1200&auto=format&fit=crop"
          }
          alt={product.name}
          className="w-full rounded-3xl"
        />

        <div>
          <h1 className="text-5xl font-bold">
            {product.name}
          </h1>

          <p className="mt-6 text-gray-400 text-lg">
            {product.description || "No description"}
          </p>

          <p className="mt-8 text-4xl font-bold text-green-500">
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
            className="mt-8 bg-red-600 px-8 py-4 rounded-2xl text-white"
          >
            Add To Cart
            <div className="mt-12">
  <h2 className="text-3xl font-bold mb-6">
    Reviews
  </h2>

  <textarea
    value={comment}
    onChange={(e) => setComment(e.target.value)}
    placeholder="Write your review..."
    className="w-full p-4 rounded-2xl text-black"
  />

  <input
    type="number"
    min="1"
    max="5"
    value={rating}
    onChange={(e) => setRating(Number(e.target.value))}
    className="mt-4 p-3 rounded-xl text-black"
  />

  <button
    onClick={async () => {
      const { data: userData } =
        await supabase.auth.getUser();

      if (!userData.user) {
        alert("Please login first");
        return;
      }

      await supabase.from("reviews").insert({
        product_id: product.id,
        user_id: userData.user.id,
        rating,
        comment,
      });

      alert("Review added ⭐");

      location.reload();
    }}
    className="mt-4 bg-yellow-500 px-6 py-3 rounded-xl text-black font-bold"
  >
    Submit Review
  </button>

  <div className="mt-10 space-y-4">
    {reviews.map((review) => (
      <div
        key={review.id}
        className="bg-white text-black p-4 rounded-2xl"
      >
        <p className="font-bold">
          ⭐ {review.rating}/5
        </p>

        <p className="mt-2">
          {review.comment}
        </p>
      </div>
    ))}
  </div>
</div>
          </button>
        </div>
      </div>
    </main>
  );
}