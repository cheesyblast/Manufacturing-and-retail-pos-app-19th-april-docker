import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CurrencyDollar, ShoppingCart, Package, Warning, Factory, Truck, Scissors, MapPin, TrendUp } from "@phosphor-icons/react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#131D33", "#A89279", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

const StatCard = ({ icon: Icon, label, value, color = "navy" }) => (
  <div className="bg-white border border-beige-300 rounded-2xl p-5 shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs uppercase tracking-[0.15em] font-bold text-beige-500">{label}</span>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
        color === "success" ? "bg-status-success-bg text-status-success" :
        color === "warning" ? "bg-status-warning-bg text-status-warning" :
        color === "danger" ? "bg-status-danger-bg text-status-danger" :
        "bg-beige-200 text-navy-700"
      }`}>
        <Icon size={18} weight="fill" />
      </div>
    </div>
    <p className="text-2xl font-heading font-medium text-navy-900">{value}</p>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-beige-300 rounded-xl p-3 shadow-lg">
      <p className="text-xs font-bold text-navy-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs text-navy-600">
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: p.color }} />
          {p.name}: {typeof p.value === "number" ? `Rs ${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [period, setPeriod] = useState("7d");
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, locRes, salesRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/locations"),
          api.get("/sales", { params: { limit: 6 } }).catch(() => ({ data: { data: [] } })),
        ]);
        setStats(statsRes.data);
        setLocations(locRes.data || []);
        setRecentSales((salesRes.data?.data || salesRes.data || []).slice(0, 6));
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const params = { period };
        if (selectedLocation) params.location_id = selectedLocation;
        const { data } = await api.get("/dashboard/analytics", { params });
        setAnalytics(data);
      } catch (err) {
        console.error("Analytics load error:", err);
      }
    };
    loadAnalytics();
  }, [period, selectedLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const paymentData = analytics?.payment_methods
    ? Object.entries(analytics.payment_methods).map(([name, value]) => ({ name: name.replace("_", " "), value }))
    : [];

  const outlets = locations.filter(l => l.type === "outlet");

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">
            Welcome back, {user?.name || user?.email}
          </h1>
          <p className="text-navy-500 mt-1">Here's what's happening today</p>
        </div>
        {/* Profit Center Filter */}
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-navy-500" />
          <select
            data-testid="dashboard-location-filter"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-white border border-beige-300 rounded-xl px-3 py-2 text-sm text-navy-700"
          >
            <option value="">All Locations</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
            ))}
          </select>
          <div className="flex gap-1 bg-beige-200 p-0.5 rounded-lg">
            {["7d", "30d", "90d"].map(p => (
              <button
                key={p}
                data-testid={`period-${p}`}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-700"}`}
              >
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard icon={CurrencyDollar} label="Today Revenue" value={`Rs ${(stats?.today_revenue || 0).toLocaleString()}`} color="success" />
        <StatCard icon={ShoppingCart} label="Transactions" value={stats?.today_transactions || 0} />
        <StatCard icon={Package} label="Products" value={stats?.total_products || 0} />
        <StatCard icon={Warning} label="Low Stock" value={stats?.low_stock_items || 0} color={stats?.low_stock_items > 0 ? "danger" : "navy"} />
        <StatCard icon={Factory} label="Production" value={stats?.pending_production || 0} color="warning" />
        <StatCard icon={Truck} label="Purchases" value={stats?.pending_purchases || 0} />
        <StatCard icon={Scissors} label="Custom Orders" value={stats?.active_custom_orders || 0} />
      </div>

      {/* Analytics Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-beige-300 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] font-bold text-beige-500 mb-1">Period Revenue</p>
            <p className="text-2xl font-heading font-medium text-navy-900">Rs {analytics.total_revenue.toLocaleString()}</p>
            <p className="text-xs text-navy-500 mt-1">{analytics.total_transactions} transactions</p>
          </div>
          <div className="bg-white border border-beige-300 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] font-bold text-beige-500 mb-1">COGS</p>
            <p className="text-2xl font-heading font-medium text-navy-900">Rs {analytics.cogs.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-beige-300 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] font-bold text-beige-500 mb-1">Expenses</p>
            <p className="text-2xl font-heading font-medium text-navy-900">Rs {analytics.total_expenses.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-beige-300 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.15em] font-bold text-beige-500 mb-1">Net Profit</p>
            <p className={`text-2xl font-heading font-medium ${analytics.net_profit >= 0 ? "text-status-success" : "text-status-danger"}`}>
              Rs {analytics.net_profit.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Trend */}
        <div className="lg:col-span-2 bg-white border border-beige-300 rounded-2xl p-5 shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-medium text-navy-900 flex items-center gap-2">
              <TrendUp size={18} /> Sales Trend
            </h3>
          </div>
          {analytics?.trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={analytics.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8B7B6B" }} tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })} />
                <YAxis tick={{ fontSize: 11, fill: "#8B7B6B" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#131D33" strokeWidth={2} dot={{ r: 3, fill: "#131D33" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-navy-400 text-sm">No sales data for this period</div>
          )}
        </div>

        {/* Payment Methods Pie */}
        <div className="bg-white border border-beige-300 rounded-2xl p-5 shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
          <h3 className="font-heading font-medium text-navy-900 mb-4">Payment Methods</h3>
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `Rs ${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-navy-400 text-sm">No payment data</div>
          )}
        </div>
      </div>

      {/* Top Products & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Products */}
        <div className="bg-white border border-beige-300 rounded-2xl p-5 shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
          <h3 className="font-heading font-medium text-navy-900 mb-4">Top Products</h3>
          {analytics?.top_products?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.top_products.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#8B7B6B" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#8B7B6B" }} width={120} />
                <Tooltip formatter={(v) => `Rs ${v.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#131D33" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-navy-400 text-sm">No product data</div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
          <div className="px-5 py-4 border-b border-beige-200">
            <h3 className="font-heading font-medium text-navy-900">Recent Sales</h3>
          </div>
          {recentSales.length === 0 ? (
            <div className="p-8 text-center text-navy-500">No sales yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-beige-100">
                    <th className="text-left py-2.5 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Invoice</th>
                    <th className="text-left py-2.5 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Customer</th>
                    <th className="text-right py-2.5 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-beige-200 hover:bg-beige-50 transition-colors">
                      <td className="py-2.5 px-5 text-sm text-navy-700 font-mono">{sale.invoice_number}</td>
                      <td className="py-2.5 px-5 text-sm text-navy-700">{sale.customer_name || "Walk-in"}</td>
                      <td className="py-2.5 px-5 text-sm text-navy-900 font-medium text-right">Rs {parseFloat(sale.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
