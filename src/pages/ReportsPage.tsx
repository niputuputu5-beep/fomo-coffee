import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { TrendingUp, Users, Package, Download, DollarSign } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const COLORS = ["#D4A853", "#E5B964", "#C49A3C", "#A8832F", "#8B6D26"];

export default function ReportsPage() {
  const [period, setPeriod] = useState("week");
  const range = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    if (period === "today") start.setHours(0, 0, 0, 0);
    if (period === "week") start.setDate(end.getDate() - 6);
    if (period === "month") start.setMonth(end.getMonth() - 1);
    if (period === "year") start.setFullYear(end.getFullYear() - 1);
    if (period !== "today") start.setHours(0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [period]);
  const { data: salesSummary } = trpc.report.salesSummary.useQuery(range);
  const { data: salesData = [] } = trpc.report.salesTrend.useQuery(range);
  const { data: hourlyData = [] } = trpc.report.hourlySales.useQuery(range);
  const { data: paymentData = [] } = trpc.report.paymentDistribution.useQuery(range);
  const { data: topProducts = [] } = trpc.report.topProducts.useQuery({ ...range, limit: 5 });
  const { data: customerAnalytics } = trpc.report.customerAnalytics.useQuery();
  const { data: inventoryStatus } = trpc.report.inventoryStatus.useQuery();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
  };

  const periods = [
    { key: "today", label: "Hari Ini" },
    { key: "week", label: "Minggu Ini" },
    { key: "month", label: "Bulan Ini" },
    { key: "year", label: "Tahun Ini" },
  ];

  const handleExport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Period", period],
      ["Start", range.startDate],
      ["End", range.endDate],
      ["Total Sales", String(salesSummary?.totalSales || 0)],
      ["Total Orders", String(salesSummary?.totalOrders || 0)],
      ["Total Customers", String(customerAnalytics?.totalCustomers || 0)],
      ["Inventory Value", String(inventoryStatus?.totalValue || 0)],
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fomo-report-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report CSV berhasil diunduh.");
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                period === p.key ? "bg-[#D4A853] text-black" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <Button onClick={handleExport} variant="outline" className="w-full border-white/[0.07] text-white/70 hover:bg-white/[0.06] rounded-xl sm:w-auto">
          <Download size={16} className="mr-2" /> Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Penjualan", value: formatPrice(salesSummary?.totalSales || 0), icon: DollarSign, change: `${salesSummary?.totalOrders || 0} order` },
          { title: "HPP / COGS", value: formatPrice(salesSummary?.totalCogs || 0), icon: Package, change: "tracked" },
          { title: "Gross Profit", value: formatPrice(salesSummary?.grossProfit || 0), icon: TrendingUp, change: `${(salesSummary?.grossMargin || 0).toFixed(1)}%` },
          { title: "Pelanggan", value: String(customerAnalytics?.totalCustomers || 0), icon: Users, change: `avg ${formatPrice(customerAnalytics?.avgSpending || 0)}` },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="card-glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4A853]/10 flex items-center justify-center">
                  <Icon size={18} className="text-[#D4A853]" />
                </div>
                <span className="text-xs text-green-400 font-medium">{stat.change}</span>
              </div>
              <p className="text-sm text-white/60">{stat.title}</p>
              <p className="text-xl font-bold text-white mt-1" style={{ fontFamily: 'Playfair Display, serif' }}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-glass rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white mb-4">Tren Penjualan</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={salesData}>
              <defs><linearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4A853" stopOpacity={0.3} /><stop offset="95%" stopColor="#D4A853" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={(v) => `Rp${(v / 1000000).toFixed(0)}M`} />
              <Tooltip contentStyle={{ background: '#1E1E20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} formatter={(v: number) => formatPrice(v)} />
              <Area type="monotone" dataKey="sales" stroke="#D4A853" fill="url(#rptGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card-glass rounded-2xl p-5">
          <h3 className="text-base font-semibold text-white mb-4">Peak Hour Analytics</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" stroke="rgba(255,255,255,0.3)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1E1E20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="orders" fill="#D4A853" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-glass rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white mb-4">Distribusi Pembayaran</h3>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
          <div className="h-[200px] w-full md:w-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1E1E20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          </div>
          <div className="space-y-3 flex-1">
            {paymentData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-sm text-white/70">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-white">{item.value}% / {formatPrice(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card-glass rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white mb-4">Top Produk</h3>
        <div className="space-y-3">
          {topProducts.length === 0 ? (
            <p className="text-sm text-white/45">Belum ada produk terjual pada periode ini.</p>
          ) : topProducts.map((item) => (
            <div key={item.name} className="grid grid-cols-2 gap-3 rounded-xl bg-white/[0.03] p-3 text-sm sm:grid-cols-5">
              <span className="font-medium text-white sm:col-span-2">{item.name}</span>
              <span className="text-white/60">Qty {item.quantity}</span>
              <span className="text-[#D4A853]">{formatPrice(item.revenue)}</span>
              <span className="text-green-400">{item.margin.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
