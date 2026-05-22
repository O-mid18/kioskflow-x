"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-black border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <h1 className="text-2xl font-bold text-white">
        KioskFlow
      </h1>

      <div className="flex items-center gap-4">
        <Link
          href="/marketplace"
          className="text-white hover:text-red-500"
        >
          Marketplace
        </Link>

        <Link
          href="/cart"
          className="text-white hover:text-red-500"
        >
          Cart
        </Link>

        <Link
          href="/supplier"
          className="text-white hover:text-red-500"
        >
          Supplier
        </Link>

        <Link
          href="/admin"
          className="text-white hover:text-red-500"
        >
          Admin
        </Link>
      </div>
    </nav>
  );
}