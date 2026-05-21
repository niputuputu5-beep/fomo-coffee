import { PublicLayout } from "@/components/PublicLayout";
import { setSeo } from "@/lib/seo";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  Coffee,
  CreditCard,
  ShieldCheck,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";

const features = [
  { icon: CreditCard, title: "POS Touch-Friendly", text: "Cart cepat, multi payment, dine in, takeaway, delivery, promo, dan shift kasir." },
  { icon: Boxes, title: "Inventory & Supplier", text: "Stok minimum, batch, expired tracking, supplier, purchase receiving, dan valuasi." },
  { icon: Users, title: "Customer & Membership", text: "Loyalty point, membership level, riwayat transaksi, voucher, dan customer analytics." },
  { icon: BarChart3, title: "Owner Analytics", text: "Dashboard penjualan, peak hour, kategori, kasir, margin, dan laporan operasional." },
  { icon: ShieldCheck, title: "RBAC & Audit Trail", text: "Pemisahan Owner, Admin, Kasir, permission menu, session, dan activity log." },
  { icon: UtensilsCrossed, title: "Kitchen Display", text: "Antrian order, status pesanan, tiket dapur, dan alur penyelesaian pesanan." },
];

const stats = [
  ["3 Role", "Owner, Admin, Kasir"],
  ["11%", "Auto tax default"],
  ["8+", "Produk dummy realistis"],
  ["24/7", "Support workflow"],
];

export default function LandingPage() {
  useEffect(() => {
    setSeo({
      title: "FOMO COFFEE POS - Sistem Kasir Coffee Shop Modern",
      description:
        "FOMO COFFEE POS adalah sistem point of sales enterprise untuk coffee shop dengan inventory, supplier, customer membership, laporan, audit log, dan RBAC.",
      path: "/",
    });
  }, []);

  return (
    <PublicLayout>
      <main>
        <section className="landing-hero relative overflow-hidden border-b border-white/[0.08]">
          <div className="absolute inset-0">
            <img
              src="/products/cappuccino.jpg"
              alt="FOMO COFFEE POS coffee shop operation"
              className="h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-[#141415]/70" />
          </div>
          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#D4A853]">
                Enterprise Coffee Shop POS
              </p>
              <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white sm:text-6xl">
                FOMO COFFEE POS
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
                Sistem kasir modern untuk coffee shop dengan alur operasional
                lengkap: POS, kitchen, inventory, supplier, customer,
                promo, laporan, audit log, dan kontrol role.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-[#D4A853] px-5 py-3 text-sm font-bold text-black hover:bg-[#E5B964]"
                >
                  Masuk Dashboard
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-lg border border-white/[0.14] px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.06]"
                >
                  Lihat Fitur
                </a>
              </div>
            </div>
            <div className="surface-elevated rounded-2xl p-5">
              <div className="grid grid-cols-2 gap-3">
                {stats.map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-white/[0.04] p-4">
                    <p className="text-2xl font-bold text-[#D4A853]">{value}</p>
                    <p className="mt-1 text-sm text-white/60">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {[
                  "Role-based dashboard",
                  "Audit trail untuk internal control",
                  "Dummy data coffee shop siap demo",
                ].map((item) => (
                  <p key={item} className="flex items-center gap-2 text-sm text-white/72">
                    <CheckCircle2 size={17} className="text-[#D4A853]" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">
              Fitur Utama
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white">
              Dibangun untuk operasional coffee shop
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="card-glass rounded-2xl p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4A853]/10">
                    <Icon size={21} className="text-[#D4A853]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/62">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="operations" className="dark-band border-y border-white/[0.08] bg-[#101011]">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">
                Workflow
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                Dari pembelian bahan sampai closing kasir
              </h2>
            </div>
            <div className="grid gap-3">
              {[
                "Admin mengelola produk, supplier, inventory, customer, dan promo.",
                "Kasir membuka shift, memproses transaksi, dan menutup kas.",
                "Kitchen menerima status order dari POS dan menyelesaikan pesanan.",
                "Owner memantau laporan, audit log, performa bisnis, dan pengaturan sensitif.",
              ].map((step, index) => (
                <div key={step} className="flex gap-4 rounded-xl bg-white/[0.04] p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D4A853] text-sm font-bold text-black">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-white/70">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="reports" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1fr]">
            <div className="surface-elevated rounded-2xl p-5">
              <img
                src="/products/latte.jpg"
                alt="Coffee analytics and premium latte"
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            </div>
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4A853]/10">
                <Coffee size={24} className="text-[#D4A853]" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                Dashboard premium untuk keputusan bisnis
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/65">
                Analitik penjualan harian, distribusi pembayaran, produk
                terlaris, stok menipis, dan laporan operasional dirancang agar
                Owner bisa membaca kondisi bisnis dengan cepat.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex rounded-lg bg-[#D4A853] px-5 py-3 text-sm font-bold text-black hover:bg-[#E5B964]"
              >
                Coba Akun Demo
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
