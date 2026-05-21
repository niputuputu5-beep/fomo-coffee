import { trpc } from "@/providers/trpc";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  DollarSign,
  Coffee,
  Package,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#D4A853", "#E5B964", "#C49A3C", "#A8832F", "#8B6D26"];

export default function DashboardPage() {
  const { data: todayStats } = trpc.transaction.getTodayStats.useQuery();
  const { data: customers } = trpc.customer.list.useQuery();
  const { data: lowStock } = trpc.inventory.getLowStock.useQuery();
  const { data: products } = trpc.product.list.useQuery({ isBestSeller: true });
  const salesData = Array.from({ length: 8 }, (_, index) => {
    const hour = index * 3;
    const label = `${String(hour).padStart(2, "0")}:00`;
    const sales = (todayStats?.transactions || [])
      .filter((tx) => {
        const txHour = new Date(tx.createdAt).getHours();
        return txHour >= hour && txHour < hour + 3;
      })
      .reduce((sum, tx) => sum + Number(tx.totalAmount), 0);
    return { name: label, sales };
  });
  const categoryData = (products || []).slice(0, 5).map((product) => ({
    name: product.name.length > 12 ? `${product.name.slice(0, 12)}...` : product.name,
    value: Math.max(product.stockQuantity, 1),
  }));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
  };

  const stats = [
    {
      title: "Penjualan Hari Ini",
      value: formatPrice(todayStats?.totalSales || 0),
      change: `${todayStats?.totalOrders || 0} order`,
      up: true,
      icon: DollarSign,
    },
    {
      title: "Total Transaksi",
      value: String(todayStats?.totalOrders || 0),
      change: "hari ini",
      up: true,
      icon: ShoppingBag,
    },
    {
      title: "Pelanggan Aktif",
      value: String(customers?.length || 0),
      change: "terdaftar",
      up: true,
      icon: Users,
    },
    {
      title: "Rata-rata Transaksi",
      value: formatPrice((todayStats?.totalSales || 0) / Math.max(todayStats?.totalOrders || 0, 1)),
      change: "ATV",
      up: true,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="card-glass rounded-2xl p-5 hover:-translate-y-0.5 transition-transform duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4A853]/10 flex items-center justify-center">
                  <Icon size={20} className="text-[#D4A853]" />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${stat.up ? "text-green-400" : "text-red-400"}`}>
                  {stat.up ? <ArrowUpRight size={14} /> : <ArrowUpRight size={14} />}
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-white/60 mb-1">{stat.title}</p>
              <p className="text-xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <div className="lg:col-span-2 card-glass rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Penjualan Harian
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4A853" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4A853" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={(v) => `Rp${(v / 1000000).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: '#1E1E20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                formatter={(value: number) => formatPrice(value)}
              />
              <Area type="monotone" dataKey="sales" stroke="#D4A853" fill="url(#salesGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Best Seller Stock Snapshot */}
        <div className="card-glass rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Snapshot Best Seller
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                {categoryData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1E1E20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[idx] }} />
                  <span className="text-white/70">{cat.name}</span>
                </div>
                <span className="text-white font-medium">{cat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alert */}
        <div className="card-glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-400" />
            <h3 className="text-base font-semibold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Stok Menipis
            </h3>
          </div>
          <div className="space-y-2">
            {(lowStock || []).length === 0 ? (
              <p className="rounded-xl bg-white/[0.03] p-3 text-sm text-white/45">Tidak ada stok menipis.</p>
            ) : (lowStock || []).map((item: any, idx: number) => (
              <div key={idx} className="flex flex-col gap-2 py-2 border-b border-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Package size={16} className="text-white/40" />
                  <span className="truncate text-sm text-white/80">{item.itemName}</span>
                </div>
                <div className="flex items-center gap-3 sm:flex-shrink-0">
                  <span className="text-xs text-white/40">Min: {item.minStock}</span>
                  <span className="text-sm font-semibold text-amber-400">{item.quantity} left</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Sellers */}
        <div className="card-glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Coffee size={18} className="text-[#D4A853]" />
            <h3 className="text-base font-semibold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Produk Terlaris
            </h3>
          </div>
          <div className="space-y-2">
            {(products || []).slice(0, 5).map((product: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 py-2 border-b border-white/[0.04]">
                <span className="text-sm font-mono text-[#D4A853] w-6">#{idx + 1}</span>
                <img src={product.image || "/products/cappuccino.jpg"} alt="" className="w-8 h-8 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{product.name}</p>
                </div>
                <span className="flex-shrink-0 text-sm font-semibold text-[#D4A853]">
                  {formatPrice(Number(product.basePrice))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
