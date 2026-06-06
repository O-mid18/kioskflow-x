"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TrackingPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    setOrders(data || []);
  };

  return (
    <main className="min-h-screen bg-black text-white p-8">

      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-red-700 via-black to-gray-900 p-12 mb-12 shadow-2xl">
        <p className="uppercase tracking-[6px] text-red-400 text-sm font-bold">
          Order Tracking
        </p>

        <h1 className="text-6xl font-black leading-tight mt-4">
          Track Your
          <span className="text-red-500">
            {" "}Orders
          </span>
        </h1>

        <p className="text-gray-300 text-xl mt-6">
          Follow your shipments and monitor delivery progress in real time.
        </p>
      </div>

      <div className="space-y-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[30px] p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">
                  Order ID
                </p>

                <h2 className="text-3xl font-black mt-2">
                  #{order.id}
                </h2>
              </div>

              <div className="bg-yellow-500 text-black px-5 py-2 rounded-full font-bold">
                {order.status}
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="w-10 h-10 rounded-full bg-red-600 mx-auto"></div>

                  <p className="mt-3 font-bold">
                    Ordered
                  </p>
                </div>

                <div className="h-1 bg-red-600 flex-1"></div>

                <div className="text-center flex-1">
                  <div className="w-10 h-10 rounded-full bg-red-600 mx-auto"></div>

                  <p className="mt-3 font-bold">
                    Processing
                  </p>
                </div>

                <div className="h-1 bg-gray-700 flex-1"></div>

                <div className="text-center flex-1">
                  <div className="w-10 h-10 rounded-full bg-gray-700 mx-auto"></div>

                  <p className="mt-3 text-gray-500 font-bold">
                    Shipping
                  </p>
                </div>

                <div className="h-1 bg-gray-700 flex-1"></div>

                <div className="text-center flex-1">
                  <div className="w-10 h-10 rounded-full bg-gray-700 mx-auto"></div>

                  <p className="mt-3 text-gray-500 font-bold">
                    Delivered
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <p className="text-4xl font-black text-red-400">
                €{order.total}
              </p>

              <p className="text-gray-400">
                Estimated delivery:
                <span className="text-white font-bold">
                  {" "}2-4 Days
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}