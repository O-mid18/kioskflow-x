export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-gray-500 mt-2">
              Manage your kiosk orders and deliveries
            </p>
          </div>

          <button className="bg-red-600 text-white px-5 py-3 rounded-2xl">
            New Order
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-gray-500">Total Orders</p>
            <h2 className="text-4xl font-bold mt-4">24</h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-gray-500">Pending Deliveries</p>
            <h2 className="text-4xl font-bold mt-4">5</h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <p className="text-gray-500">Monthly Spending</p>
            <h2 className="text-4xl font-bold mt-4">€4,320</h2>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6">Recent Orders</h2>

          <div className="space-y-4">
            {[
              {
                id: "#1024",
                status: "Preparing",
                supplier: "Red Bull Supplier",
              },
              {
                id: "#1025",
                status: "Shipped",
                supplier: "Haribo Wholesale",
              },
              {
                id: "#1026",
                status: "Delivered",
                supplier: "Coca-Cola Distributor",
              },
            ].map((order) => (
              <div
                key={order.id}
                className="border rounded-2xl p-5 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold">{order.id}</h3>
                  <p className="text-gray-500">{order.supplier}</p>
                </div>

                <span className="bg-gray-100 px-4 py-2 rounded-xl text-sm">
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}