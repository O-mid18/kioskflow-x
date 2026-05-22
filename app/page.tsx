export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="px-6 py-24 text-center">
        <h1 className="text-6xl font-bold max-w-4xl mx-auto leading-tight">
          Wholesale ordering for kiosks and spaeti shops
        </h1>

        <p className="mt-6 text-gray-600 text-lg max-w-2xl mx-auto">
          Connect with suppliers, order products in bulk, and manage deliveries
          in one modern B2B platform.
        </p>

        <div className="mt-10 flex justify-center gap-4">
          <a
            href="/signup"
            className="bg-red-600 text-white px-6 py-3 rounded-2xl"
          >
            Start Ordering
          </a>

          <a
            href="/marketplace"
            className="border border-black px-6 py-3 rounded-2xl"
          >
            Marketplace
          </a>
        </div>
      </section>
    </main>
  );
}
