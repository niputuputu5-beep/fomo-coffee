import { useState } from "react";
import {
  Bell,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Save,
  Search,
  Send,
  Shield,
  Store,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { PaginationControls } from "@/components/PaginationControls";

const DEVICE_PAGE_SIZE = 8;

type Field = {
  label: string;
  value: string;
  setter: (value: string) => void;
  textarea?: boolean;
};

function getSavedSetting(key: string, fallback: string) {
  return localStorage.getItem(`fomo-setting-${key}`) ?? fallback;
}

function getSavedBoolean(key: string, fallback: boolean) {
  const value = localStorage.getItem(`fomo-setting-${key}`);
  return value ? value === "true" : fallback;
}

function FieldControl({ field }: { field: Field }) {
  const Control = field.textarea ? Textarea : Input;

  return (
    <div>
      <label className="mb-1 block text-xs text-white/50">{field.label}</label>
      <Control
        value={field.value}
        onChange={(event) => field.setter(event.target.value)}
        className="border-white/[0.07] bg-white/[0.04] text-white"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [storeName, setStoreName] = useState(() => getSavedSetting("storeName", "FOMO COFFEE"));
  const [tagline, setTagline] = useState(() => getSavedSetting("tagline", "Premium Coffee Shop POS System"));
  const [address, setAddress] = useState(() => getSavedSetting("address", "Jl. Kopi No. 123, Jakarta"));
  const [phone, setPhone] = useState(() => getSavedSetting("phone", "021-5550000"));
  const [email, setEmail] = useState(() => getSavedSetting("email", "support@fomo.coffee"));
  const [fax, setFax] = useState(() => getSavedSetting("fax", "021-5550001"));
  const [supportHours, setSupportHours] = useState(() => getSavedSetting("supportHours", "Senin-Jumat, 09.00-18.00 WIB"));
  const [taxRate, setTaxRate] = useState(() => getSavedSetting("taxRate", "11"));
  const [serviceCharge, setServiceCharge] = useState(() => getSavedSetting("serviceCharge", "5"));
  const [receiptFooter, setReceiptFooter] = useState(() => getSavedSetting("receiptFooter", "Terima kasih sudah berkunjung ke FOMO COFFEE."));
  const [metaTitle, setMetaTitle] = useState(() => getSavedSetting("metaTitle", "FOMO COFFEE POS - Sistem Kasir Coffee Shop Modern"));
  const [metaDescription, setMetaDescription] = useState(
    () => getSavedSetting("metaDescription", "Sistem POS enterprise untuk coffee shop dengan inventory, supplier, membership, laporan, audit log, dan role-based access control."),
  );
  const [instagram, setInstagram] = useState(() => getSavedSetting("instagram", "https://instagram.com/fomocoffee"));
  const [facebook, setFacebook] = useState(() => getSavedSetting("facebook", "https://facebook.com/fomocoffee"));
  const [twitter, setTwitter] = useState(() => getSavedSetting("twitter", "https://x.com/fomocoffee"));
  const [linkedin, setLinkedin] = useState(() => getSavedSetting("linkedin", "https://linkedin.com/company/fomo-coffee"));
  const [autoPrint, setAutoPrint] = useState(() => getSavedBoolean("autoPrint", true));
  const [notifications, setNotifications] = useState(() => getSavedBoolean("notifications", true));
  const [stockAlerts, setStockAlerts] = useState(() => getSavedBoolean("stockAlerts", true));
  const [birthdayReminder, setBirthdayReminder] = useState(() => getSavedBoolean("birthdayReminder", true));
  const [idleLogout, setIdleLogout] = useState(() => getSavedBoolean("idleLogout", true));
  const [activityLog, setActivityLog] = useState(() => getSavedBoolean("activityLog", true));
  const [otp, setOtp] = useState(() => getSavedBoolean("otp", false));
  const [offlineMode, setOfflineMode] = useState(() => getSavedBoolean("offlineMode", true));
  const [realTimeSync, setRealTimeSync] = useState(() => getSavedBoolean("realTimeSync", true));
  const [whatsappIntegration, setWhatsappIntegration] = useState(() => getSavedBoolean("whatsappIntegration", true));
  const [devicePage, setDevicePage] = useState(0);
  const utils = trpc.useUtils();
  const { data: devices = [] } = trpc.device.list.useQuery();
  const revokeDevices = trpc.device.revoke.useMutation({
    onSuccess: async () => {
      await utils.device.list.invalidate();
      toast.success("Device session berhasil direvoke.");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSave = () => {
    Object.entries({
      storeName,
      tagline,
      address,
      phone,
      email,
      fax,
      supportHours,
      taxRate,
      serviceCharge,
      receiptFooter,
      metaTitle,
      metaDescription,
      instagram,
      facebook,
      twitter,
      linkedin,
      autoPrint: String(autoPrint),
      notifications: String(notifications),
      stockAlerts: String(stockAlerts),
      birthdayReminder: String(birthdayReminder),
      idleLogout: String(idleLogout),
      activityLog: String(activityLog),
      otp: String(otp),
      offlineMode: String(offlineMode),
      realTimeSync: String(realTimeSync),
      whatsappIntegration: String(whatsappIntegration),
    }).forEach(([key, value]) => localStorage.setItem(`fomo-setting-${key}`, value));
    toast.success("Pengaturan owner berhasil disimpan.");
  };
  const visibleDevices = devices.slice(devicePage * DEVICE_PAGE_SIZE, (devicePage + 1) * DEVICE_PAGE_SIZE);

  const sections = [
    {
      icon: Store,
      title: "Brand & Informasi Toko",
      description: "Identitas utama yang tampil di struk, landing page, footer, dan dokumen operasional.",
      fields: [
        { label: "Nama Toko", value: storeName, setter: setStoreName },
        { label: "Tagline", value: tagline, setter: setTagline },
        { label: "Alamat", value: address, setter: setAddress, textarea: true },
      ],
    },
    {
      icon: Phone,
      title: "Kontak, Support, dan Fax",
      description: "Kanal resmi untuk pelanggan, supplier, dan support operasional.",
      fields: [
        { label: "Telepon", value: phone, setter: setPhone },
        { label: "Email Support", value: email, setter: setEmail },
        { label: "Fax", value: fax, setter: setFax },
        { label: "Jam Support", value: supportHours, setter: setSupportHours },
      ],
    },
    {
      icon: Search,
      title: "SEO Landing Page",
      description: "Metadata publik untuk halaman landing, Open Graph, dan search engine.",
      fields: [
        { label: "Meta Title", value: metaTitle, setter: setMetaTitle },
        { label: "Meta Description", value: metaDescription, setter: setMetaDescription, textarea: true },
      ],
    },
    {
      icon: Globe,
      title: "Social Media",
      description: "Link sosial media yang muncul di footer landing page dan halaman publik.",
      fields: [
        { label: "Instagram", value: instagram, setter: setInstagram },
        { label: "Facebook", value: facebook, setter: setFacebook },
        { label: "X / Twitter", value: twitter, setter: setTwitter },
        { label: "LinkedIn", value: linkedin, setter: setLinkedin },
      ],
      icons: [Instagram, Facebook, Twitter, Linkedin],
    },
    {
      icon: Receipt,
      title: "Transaksi & Struk",
      description: "Pengaturan pajak, service charge, dan teks struk.",
      fields: [
        { label: "PPN (%)", value: taxRate, setter: setTaxRate },
        { label: "Service Charge (%)", value: serviceCharge, setter: setServiceCharge },
        { label: "Footer Struk", value: receiptFooter, setter: setReceiptFooter, textarea: true },
      ],
      toggles: [
        { label: "Auto-print receipt", checked: autoPrint, setter: setAutoPrint },
      ],
    },
    {
      icon: Bell,
      title: "Notifikasi",
      description: "Kontrol reminder penting untuk operasional harian.",
      toggles: [
        { label: "Notifikasi aktif", checked: notifications, setter: setNotifications },
        { label: "Alert stok menipis", checked: stockAlerts, setter: setStockAlerts },
        { label: "Birthday reminder", checked: birthdayReminder, setter: setBirthdayReminder },
      ],
    },
    {
      icon: Shield,
      title: "Keamanan Owner",
      description: "Pengaturan sensitif yang hanya dapat diakses role Owner.",
      fields: [
        { label: "Session Timeout", value: "30 menit", setter: () => undefined },
      ],
      toggles: [
        { label: "Auto logout idle", checked: idleLogout, setter: setIdleLogout },
        { label: "Activity log", checked: activityLog, setter: setActivityLog },
        { label: "OTP optional", checked: otp, setter: setOtp },
        { label: "Offline mode", checked: offlineMode, setter: setOfflineMode },
        { label: "Real-time sync", checked: realTimeSync, setter: setRealTimeSync },
        { label: "WhatsApp integration", checked: whatsappIntegration, setter: setWhatsappIntegration },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D4A853]">
          Owner Settings
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">Pengaturan Sistem</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
          Semua pengaturan brand, kontak support, fax, SEO, social media,
          transaksi, notifikasi, dan keamanan ditempatkan di halaman Owner.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.title} className="card-glass rounded-2xl p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4A853]/10">
                  <Icon size={18} className="text-[#D4A853]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{section.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-white/45">{section.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {section.fields?.map((field) => (
                  <FieldControl key={field.label} field={field} />
                ))}
                {section.toggles?.map((toggle) => (
                  <div key={toggle.label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-white/70">{toggle.label}</span>
                    <Switch checked={toggle.checked} onCheckedChange={toggle.setter} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="surface-elevated rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white">Preview Footer Publik</h3>
        <div className="mt-4 grid gap-4 text-sm text-white/62 md:grid-cols-2">
          <p className="flex items-center gap-2"><MapPin size={16} className="text-[#D4A853]" /> {address}</p>
          <p className="flex items-center gap-2"><Phone size={16} className="text-[#D4A853]" /> {phone}</p>
          <p className="flex items-center gap-2"><Mail size={16} className="text-[#D4A853]" /> {email}</p>
          <p className="flex items-center gap-2"><Send size={16} className="text-[#D4A853]" /> Fax: {fax}</p>
        </div>
      </div>

      <div className="surface-elevated rounded-2xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Device & Session Monitoring</h3>
            <p className="mt-1 text-xs text-white/45">Terminal POS/browser yang pernah aktif di sistem.</p>
          </div>
          <Button variant="outline" onClick={() => revokeDevices.mutate({})} className="w-full border-white/[0.07] text-white/70 sm:w-auto">
            Revoke Semua Aktif
          </Button>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07]">
          <table className="w-full">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Device</th>
                <th className="px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleDevices.map((device) => (
                <tr key={device.id} className="border-t border-white/[0.05] text-sm text-white/65">
                  <td className="px-3 py-2">{device.userName || device.userId}</td>
                  <td className="px-3 py-2">{device.deviceName || "Browser"}</td>
                  <td className="px-3 py-2">{device.ipAddress || "-"}</td>
                  <td className="px-3 py-2 capitalize">{device.status}</td>
                  <td className="px-3 py-2 text-right">
                    {device.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revokeDevices.mutate({ id: Number(device.id) })}
                        className="border-white/[0.07] text-white/70"
                      >
                        Revoke
                      </Button>
                    ) : (
                      <span className="text-xs text-white/35">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            page={devicePage}
            pageSize={DEVICE_PAGE_SIZE}
            itemCount={visibleDevices.length}
            hasNext={(devicePage + 1) * DEVICE_PAGE_SIZE < devices.length}
            onPageChange={setDevicePage}
            label="device"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="w-full btn-primary-gold rounded-xl sm:w-auto">
          <Save size={16} className="mr-2" /> Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}
