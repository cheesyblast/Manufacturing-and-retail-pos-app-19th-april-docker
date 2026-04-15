import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CurrencyDollar, ShoppingCart, Package, Warning, Factory, Truck, Scissors } from "@phosphor-icons/react";

const StatCard = ({ icon: Icon, label, value, color = "navy" }) => (
  <div className="bg-white border border-beige-300 rounded-2xl p-6 shadow-[0_4px_20px_rgba(19,29,51,0.03)] animate-fade-in">
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">{label}</span>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        color === "success" ? "bg-status-success-bg text-status-success" :
        color === "warning" ? "bg-status-warning-bg text-status-warning" :
        color === "danger" ? "bg-status-danger-bg text-status-danger" :
        "bg-beige-200 text-navy-700"
      }`}>
        <Icon size={20} weight="fill" />
      </div>
    </div>
    <p className="text-3xl font-heading font-medium text-navy-900">{value}</p>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, salesRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/sales", { params: { limit: 8 } }).catch(() => ({ data: { data: [] } })),
        ]);
        setStats(statsRes.data);
        const salesData = salesRes.data?.data || salesRes.data || [];
        setRecentSales(salesData.slice(0, 8));
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">
          Welcome back, {user?.name || user?.email}
        </h1>
        <p className="text-navy-500 mt-1">Here's what's happening today</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatCard icon={CurrencyDollar} label="Today Revenue" value={`Rs ${(stats?.today_revenue || 0).toLocaleString()}`} color="success" />
        <StatCard icon={ShoppingCart} label="Transactions" value={stats?.today_transactions || 0} />
        <StatCard icon={Package} label="Products" value={stats?.total_products || 0} />
        <StatCard icon={Warning} label="Low Stock" value={stats?.low_stock_items || 0} color={stats?.low_stock_items > 0 ? "danger" : "navy"} />
        <StatCard icon={Factory} label="Production" value={stats?.pending_production || 0} color="warning" />
        <StatCard icon={Truck} label="Purchases" value={stats?.pending_purchases || 0} />
        <StatCard icon={Scissors} label="Custom Orders" value={stats?.active_custom_orders || 0} />
      </div>

      {/* Recent Sales */}
      <div className="bg-white border border-beige-300 rounded-2xl shadow-[0_4px_20px_rgba(19,29,51,0.03)] overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-200">
          <h3 className="font-heading font-medium text-navy-900">Recent Sales</h3>
        </div>
        {recentSales.length === 0 ? (
          <div className="p-8 text-center text-navy-500">No sales yet. Start selling from the POS!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-beige-100">
                  <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Invoice</th>
                  <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Customer</th>
                  <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Method</th>
                  <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Total</th>
                  <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-beige-200 hover:bg-beige-50 transition-colors">
                    <td className="py-3 px-6 text-sm text-navy-700 font-mono">{sale.invoice_number}</td>
                    <td className="py-3 px-6 text-sm text-navy-700">{sale.customer_name || "Walk-in"}</td>
                    <td className="py-3 px-6">
                      <span className="text-xs px-2 py-1 rounded-lg bg-beige-200 text-navy-700 capitalize">{sale.payment_method}</span>
                    </td>
                    <td className="py-3 px-6 text-sm text-navy-900 font-medium text-right">Rs {parseFloat(sale.total).toLocaleString()}</td>
                    <td className="py-3 px-6 text-sm text-navy-500">{new Date(sale.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
