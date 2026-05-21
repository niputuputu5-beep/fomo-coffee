import { Link } from "react-router";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Send,
  Twitter,
} from "lucide-react";

const footerMenus = [
  {
    title: "Perusahaan",
    links: [
      { label: "Landing", path: "/" },
      { label: "Kontak", path: "/contact" },
      { label: "Support", path: "/support" },
      { label: "Fax", path: "/fax" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", path: "/privacy" },
      { label: "Terms of Service", path: "/terms" },
    ],
  },
];

const socials = [
  { label: "Instagram", href: "https://instagram.com/fomocoffee", icon: Instagram },
  { label: "Facebook", href: "https://facebook.com/fomocoffee", icon: Facebook },
  { label: "X", href: "https://x.com/fomocoffee", icon: Twitter },
  { label: "LinkedIn", href: "https://linkedin.com/company/fomo-coffee", icon: Linkedin },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-shell min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#141415]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="FOMO COFFEE" className="h-9 w-9" />
            <div>
              <p className="text-sm font-bold tracking-[0.12em] text-[#D4A853]">
                FOMO COFFEE
              </p>
              <p className="text-[11px] uppercase tracking-widest text-white/45">
                Enterprise POS
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="/#features" className="hover:text-white">Fitur</a>
            <a href="/#operations" className="hover:text-white">Operasional</a>
            <a href="/#reports" className="hover:text-white">Laporan</a>
            <Link to="/support" className="hover:text-white">Support</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.06]"
            >
              Login
            </Link>
            <Link
              to="/contact"
              className="hidden rounded-lg bg-[#D4A853] px-4 py-2 text-sm font-bold text-black hover:bg-[#E5B964] sm:inline-flex"
            >
              Hubungi Kami
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-white/[0.08] bg-[#101011]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="FOMO COFFEE" className="h-10 w-10" />
              <div>
                <p className="font-bold tracking-[0.12em] text-[#D4A853]">
                  FOMO COFFEE
                </p>
                <p className="text-sm text-white/50">Coffee shop POS system</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/60">
              Sistem POS modern untuk operasional coffee shop: transaksi,
              inventory, supplier, membership, promo, laporan, dan audit log.
            </p>
            <div className="mt-5 space-y-2 text-sm text-white/60">
              <p className="flex items-center gap-2"><MapPin size={16} /> Jl. Kopi No. 123, Jakarta</p>
              <p className="flex items-center gap-2"><Phone size={16} /> 021-5550000</p>
              <p className="flex items-center gap-2"><Mail size={16} /> support@fomo.coffee</p>
              <p className="flex items-center gap-2"><Send size={16} /> Fax: 021-5550001</p>
            </div>
          </div>
          {footerMenus.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-white/45">
                {group.title}
              </h3>
              <div className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="block text-sm text-white/65 hover:text-[#D4A853]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/[0.08] px-4 py-6 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 FOMO COFFEE. All rights reserved.</p>
          <div className="flex gap-3">
            {socials.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-white/65 hover:bg-[#D4A853] hover:text-black"
                >
                  <Icon size={17} />
                </a>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
