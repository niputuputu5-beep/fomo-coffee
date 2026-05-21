import { PublicLayout } from "@/components/PublicLayout";
import { setSeo } from "@/lib/seo";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useEffect } from "react";

type PublicInfoPageProps = {
  type: "contact" | "support" | "fax" | "privacy" | "terms";
};

const content = {
  contact: {
    title: "Kontak FOMO COFFEE",
    description: "Hubungi tim FOMO COFFEE untuk demo POS, kemitraan, dan kebutuhan implementasi coffee shop.",
    body: [
      "Tim FOMO COFFEE siap membantu kebutuhan implementasi POS, onboarding data produk, dan konfigurasi operasional coffee shop.",
      "Gunakan kanal kontak resmi untuk permintaan demo, pertanyaan teknis, atau diskusi kebutuhan bisnis.",
    ],
  },
  support: {
    title: "Support Center",
    description: "Pusat bantuan FOMO COFFEE POS untuk operasional, troubleshooting, dan dukungan sistem.",
    body: [
      "Support mencakup bantuan login, database lokal, setup printer, alur POS, dan kendala operasional harian.",
      "Untuk kasus prioritas seperti transaksi gagal atau closing kasir, sertakan waktu kejadian dan screenshot error.",
    ],
  },
  fax: {
    title: "Fax & Dokumen Resmi",
    description: "Informasi fax dan pengiriman dokumen resmi untuk FOMO COFFEE.",
    body: [
      "Nomor fax digunakan untuk pengiriman dokumen legal, purchase order, invoice supplier, dan dokumen administrasi.",
      "Pastikan dokumen mencantumkan nama pengirim, nomor kontak, dan referensi outlet.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    description: "Kebijakan privasi FOMO COFFEE POS terkait data pengguna, pelanggan, transaksi, dan audit log.",
    body: [
      "Data pengguna, pelanggan, transaksi, inventory, dan audit log digunakan untuk kebutuhan operasional internal.",
      "Akses data dibatasi berdasarkan role Owner, Admin, dan Kasir untuk menjaga segregasi tugas dan keamanan.",
    ],
  },
  terms: {
    title: "Terms of Service",
    description: "Syarat penggunaan FOMO COFFEE POS untuk operasional coffee shop.",
    body: [
      "Sistem ini digunakan untuk mendukung operasional POS, inventory, supplier, customer, dan laporan bisnis.",
      "Setiap pengguna bertanggung jawab menjaga akun, mengikuti role yang diberikan, dan mencatat transaksi secara benar.",
    ],
  },
};

export default function PublicInfoPage({ type }: PublicInfoPageProps) {
  const page = content[type];

  useEffect(() => {
    setSeo({
      title: `${page.title} - FOMO COFFEE POS`,
      description: page.description,
      path: `/${type}`,
    });
  }, [page.description, page.title, type]);

  return (
    <PublicLayout>
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D4A853]">
          FOMO COFFEE
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">{page.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/65">
          {page.description}
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <section className="card-glass rounded-2xl p-6">
            <div className="space-y-4">
              {page.body.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-white/68">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
          <aside className="surface-elevated rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white">Informasi Resmi</h2>
            <div className="mt-5 space-y-4 text-sm text-white/68">
              <p className="flex items-center gap-3"><MapPin size={18} className="text-[#D4A853]" /> Jl. Kopi No. 123, Jakarta</p>
              <p className="flex items-center gap-3"><Phone size={18} className="text-[#D4A853]" /> 021-5550000</p>
              <p className="flex items-center gap-3"><Send size={18} className="text-[#D4A853]" /> Fax: 021-5550001</p>
              <p className="flex items-center gap-3"><Mail size={18} className="text-[#D4A853]" /> support@fomo.coffee</p>
            </div>
          </aside>
        </div>
      </main>
    </PublicLayout>
  );
}
