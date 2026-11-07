"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AudioLines,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  CreditCard,
  FileText,
  LoaderCircle,
  MapPin,
  Mic2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Trash2,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { createNewBookingAction, getClientDashboardData } from "@/app/actions/booking";
import { getPublicPackages } from "@/app/actions/publicActions";
import PublicBookingCalendarSection from "@/app/components/bookingCalendar/PublicBookingCalendarSection";
import { PACKAGE_CATEGORIES, getPackageCategoryLabel } from "@/lib/package-categories";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EventForm = {
  id: string;
  date: string;
  eventName: string;
  startTime: string;
  address: string;
};

type PackageItem = {
  id: string;
  name: string;
  type: string;
  price: number;
  description?: string | null;
  image?: string | null;
  image_url?: string | null;
  features?: unknown;
  print_results?: unknown;
  is_popular?: boolean;
};

type AppView = "home" | "active" | "cart";

const categoryIcons: Record<string, typeof Package> = {
  audio: AudioLines,
  dokumentasi: Camera,
  dekorasi: Sparkles,
  "master ceremony": Mic2,
  catering: Utensils,
  bundle: Package,
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseEventDetails(value: unknown): Record<string, unknown>[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
  return parsed && typeof parsed === "object" ? [parsed as Record<string, unknown>] : [];
}

function formatOrderDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("id-ID", { dateStyle: "long" });
}

function newEvent(): EventForm {
  return { id: `${Date.now()}-${Math.random()}`, date: "", eventName: "", startTime: "", address: "" };
}

export default function MobileHomeApp({ initialCategory = "" }: { initialCategory?: string }) {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [view, setView] = useState<AppView>("home");
  const category = initialCategory || "all";
  const [query, setQuery] = useState("");
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [cartOwnerId, setCartOwnerId] = useState("");
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [events, setEvents] = useState<EventForm[]>([newEvent()]);
  const [notes, setNotes] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [eventType, setEventType] = useState("Pernikahan");
  const [customEventType, setCustomEventType] = useState("");
  const [bookerType, setBookerType] = useState("sendiri");
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [pendingPackageId, setPendingPackageId] = useState("");
  const [pendingCartPackageId, setPendingCartPackageId] = useState("");
  const [pendingView, setPendingView] = useState<AppView | "">("");

  useEffect(() => {
    let active = true;
    getPublicPackages()
      .then((result) => {
        if (active && result.success) setPackages((result.data || []) as PackageItem[]);
      })
      .finally(() => {
        if (active) setLoadingPackages(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getClientDashboardData()
      .then((result) => {
        if (!active || !result.success) return;
        setUser(result.user);
        setBalance(Number(result.balance) || 0);
      })
      .catch((error) => console.error("Gagal memuat saldo akun:", error));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setCartIds([]);
      setCartOwnerId("");
      return;
    }

    try {
      const savedCart = JSON.parse(window.localStorage.getItem(`maeng-cart-v1-${user.id}`) || "[]");
      if (Array.isArray(savedCart)) setCartIds(savedCart.map(String));
    } catch {
      setCartIds([]);
    }
    setCartOwnerId(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!cartOwnerId || user?.id !== cartOwnerId) return;
    window.localStorage.setItem(`maeng-cart-v1-${cartOwnerId}`, JSON.stringify(cartIds));
  }, [cartIds, cartOwnerId, user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const packageId = params.get("book");
    const cartPackageId = params.get("add");
    const requestedView = params.get("tab");
    if (packageId) setPendingPackageId(packageId);
    if (cartPackageId) setPendingCartPackageId(cartPackageId);
    if (requestedView === "active" || requestedView === "cart") setPendingView(requestedView);
  }, []);

  const filteredPackages = useMemo(() => {
    return packages.filter((item) => {
      const type = String(item.type || "").toLowerCase();
      const matchesCategory = category === "all"
        || (category === "other"
          ? !PACKAGE_CATEGORIES.some((entry) => entry.value === type)
          : type === category);
      const matchesSearch = `${item.name} ${item.description || ""}`.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [packages, category, query]);

  const cartPackages = useMemo(
    () => cartIds.map((id) => packages.find((item) => String(item.id) === id)).filter(Boolean) as PackageItem[],
    [cartIds, packages]
  );

  const bannerImage = packages.find((item) => item.image_url || item.image)?.image_url
    || packages.find((item) => item.image)?.image
    || "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1400&q=85";

  const requestLogin = (nextPath: string) => {
    router.push(`/login?next=${encodeURIComponent(nextPath)}`);
  };

  const verifyUser = async (nextPath: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      requestLogin(nextPath);
      return null;
    }
    setUser(currentUser);
    return currentUser;
  };

  const openBooking = async (item: PackageItem) => {
    const categoryPath = initialCategory ? `/paket/${encodeURIComponent(initialCategory)}` : "/";
    const nextPath = `${categoryPath}?book=${encodeURIComponent(String(item.id))}`;
    const currentUser = await verifyUser(nextPath);
    if (!currentUser) return;
    setSelectedPackage(item);
    setClientName(String(currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || ""));
    setClientPhone(String(currentUser.user_metadata?.phone || currentUser.phone || ""));
    setEvents([newEvent()]);
    setNotes("");
    setEventType("Pernikahan");
    setCustomEventType("");
    setBookerType("sendiri");
    setBrideName("");
    setGroomName("");
    setNotice("");
  };

  useEffect(() => {
    if (!pendingPackageId || packages.length === 0) return;
    const item = packages.find((entry) => String(entry.id) === pendingPackageId);
    if (!item) return;
    setPendingPackageId("");
    void openBooking(item);
  }, [pendingPackageId, packages]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    const result = await getClientDashboardData();
    if (result.success) {
      setBookings(result.bookings || []);
      setInvoices(result.invoices || []);
      if (result.user) setUser(result.user);
      setBalance(Number(result.balance) || 0);
    }
    setLoadingBookings(false);
  };

  useEffect(() => {
    if (!pendingView) return;
    const nextPath = `/?tab=${pendingView}`;
    void verifyUser(nextPath).then((currentUser) => {
      if (!currentUser) return;
      setView(pendingView);
      setPendingView("");
      if (pendingView === "active") void loadBookings();
    });
  }, [pendingView]);

  const chooseView = async (nextView: AppView) => {
    if (nextView === "active") {
      const currentUser = await verifyUser("/?tab=active");
      if (!currentUser) return;
      setView("active");
      void loadBookings();
      return;
    }
    if (nextView === "cart") {
      const currentUser = await verifyUser("/?tab=cart");
      if (!currentUser) return;
      setView("cart");
      return;
    }
    if (nextView === "home" && initialCategory) {
      router.push("/");
      return;
    }
    setView(nextView);
    if (nextView === "home") window.history.replaceState(null, "", "/");
  };

  const addToCart = async (item: PackageItem) => {
    const id = String(item.id);
    const currentUser = await verifyUser(`/?add=${encodeURIComponent(id)}`);
    if (!currentUser) return;

    if (cartOwnerId !== currentUser.id) {
      let savedCart: string[] = [];
      try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(`maeng-cart-v1-${currentUser.id}`) || "[]");
        if (Array.isArray(parsed)) savedCart = parsed.map(String);
      } catch {
        savedCart = [];
      }
      setCartOwnerId(currentUser.id);
      setCartIds([...new Set([...savedCart, id])]);
    } else {
      setCartIds((current) => current.includes(id) ? current : [...current, id]);
    }
    setView("cart");
    setNotice(`${item.name} ditambahkan ke keranjang.`);
    window.setTimeout(() => setNotice(""), 2600);
  };

  useEffect(() => {
    if (!pendingCartPackageId || packages.length === 0 || !user || cartOwnerId !== user.id) return;
    const item = packages.find((entry) => String(entry.id) === pendingCartPackageId);
    setPendingCartPackageId("");
    if (item) void addToCart(item);
  }, [pendingCartPackageId, packages, user, cartOwnerId]);

  const updateEvent = (index: number, field: keyof Omit<EventForm, "id">, value: string) => {
    setEvents((current) => current.map((event, eventIndex) =>
      eventIndex === index ? { ...event, [field]: value } : event
    ));
  };

  const submitBooking = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!selectedPackage) return;
    const currentUser = await verifyUser(`/?book=${encodeURIComponent(String(selectedPackage.id))}`);
    if (!currentUser) return;

    setIsSubmitting(true);
    setNotice("");
    const result = await createNewBookingAction({
      packageId: selectedPackage.id,
      events: events.map((event) => ({
        ...event,
        eventType: eventType === "Lainnya" ? customEventType.trim() : eventType,
        bookerType,
        brideName: eventType === "Pernikahan" && bookerType === "orang_lain" ? brideName : "",
        groomName: eventType === "Pernikahan" && bookerType === "orang_lain" ? groomName : "",
      })),
      notes,
      totalPrice: Number(selectedPackage.price || 0),
      dpAmount: Number(selectedPackage.price || 0) * 0.5,
      clientName,
      clientPhone,
      eventType: eventType === "Lainnya" ? customEventType.trim() : eventType,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setNotice(result.message || "Pesanan belum dapat dibuat. Periksa kembali tanggal acara.");
      return;
    }
    setCartIds((current) => current.filter((id) => id !== String(selectedPackage.id)));
    setSelectedPackage(null);
    setNotice("Pesanan berhasil dibuat. Rincian tagihan tersedia di Pesanan saya.");
    setView("active");
    void loadBookings();
    window.setTimeout(() => setNotice(""), 4000);
  };

  const startCheckout = async (item: PackageItem) => {
    const currentUser = await verifyUser(`/?book=${encodeURIComponent(String(item.id))}`);
    if (currentUser) await openBooking(item);
  };

  const allCategories = [
    ...PACKAGE_CATEGORIES.map((entry) => ({ ...entry, icon: categoryIcons[entry.value] || Package })),
    ...(packages.some((item) => !PACKAGE_CATEGORIES.some((entry) => entry.value === String(item.type || "").toLowerCase()))
      ? [{ value: "other", label: "Lainnya", icon: Package }]
      : []),
  ];
  const customerName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || "Customer").trim();
  const selectedInvoice = selectedBooking
    ? invoices.find((invoice) => String(invoice.booking_id) === String(selectedBooking.id))
    : null;
  const selectedPackageInfo = selectedBooking
    ? packages.find((item) => String(item.id) === String(selectedBooking.package_id))
    : null;
  const selectedEvents = selectedBooking ? parseEventDetails(selectedBooking.event_details) : [];
  const needsDownPayment = selectedBooking?.status === "pending_payment" || selectedInvoice?.payment_status === "unpaid";
  const remainingDownPayment = Math.max(
    Number(selectedInvoice?.dp_amount || Number(selectedInvoice?.total_amount || 0) * 0.5) - Number(selectedInvoice?.paid_amount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#f3f7f4] text-[#18271f]">
      <header className="sticky top-0 z-30 border-b border-[#e3ebe5] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[560px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#087b45] text-white">
              <img src="/favicon.ico" alt="" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718078]">Maeng Studio</p>
              <h1 className="text-[15px] font-bold leading-tight">Layanan Acara</h1>
            </div>
          </div>
          <button type="button" onClick={() => void chooseView("cart")} aria-label={`Buka keranjang, ${cartIds.length} item`} className="relative grid h-10 w-10 place-items-center rounded-full bg-[#f1f6f2] text-[#087b45]">
            <ShoppingBasket className="h-5 w-5" />
            {cartIds.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#ed7d24] px-1 text-[10px] font-bold text-white">{cartIds.length}</span>}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[560px] space-y-5 px-4 pb-28 pt-4">
        {view === "home" && !initialCategory && (
          <>
            <section className="relative isolate flex min-h-[178px] items-end overflow-hidden rounded-[22px] bg-[#133b2a] p-5 text-white shadow-[0_12px_30px_rgba(19,59,42,0.12)]">
              <img src={bannerImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0a2017]/95 via-[#0a2017]/70 to-[#0a2017]/10" />
              <div className="max-w-[290px]">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a5e8bd]">{user ? `Selamat Datang, ${customerName}` : "Momen penting, kami bantu"}</p>
                <h2 className="text-[24px] font-bold leading-[1.12]">Semua kebutuhan acara dalam satu tempat.</h2>
                <p className="mt-2 text-xs text-white/75">Pilih layanan, cek tanggal, lalu pesan dengan mudah.</p>
              </div>
              <div className="absolute bottom-4 right-4 hidden h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 sm:flex"><ChevronRight className="h-5 w-5" /></div>
            </section>

            <section className="flex items-center justify-between rounded-[18px] border border-[#e3ebe5] bg-white px-4 py-3.5 shadow-[0_4px_12px_rgba(24,39,31,0.035)]">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#e6f4eb] text-[#087b45]"><WalletCards className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-semibold text-[#55665b]">Saldo</p>
                  <p className="mt-0.5 text-sm font-bold">{user ? formatRupiah(balance) : "Masuk untuk melihat saldo"}</p>
                  <p className="mt-0.5 text-[10px] text-[#819087]">{user ? "Saldo akun Anda" : "Saldo tampil setelah masuk"}</p>
                </div>
              </div>
              <button type="button" onClick={() => void chooseView("active")} className="text-xs font-bold text-[#087b45]">Lihat</button>
            </section>

            <section aria-label="Kalender ketersediaan" className="scroll-mt-[76px]">
              <PublicBookingCalendarSection />
            </section>

            <section>
              <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8b82]">Jelajahi layanan</p><h2 className="mt-1 text-lg font-bold">Pilih kebutuhan acara</h2></div></div>
              <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-7">
                {allCategories.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <button key={entry.value} type="button" onClick={() => router.push(`/paket/${encodeURIComponent(entry.value)}`)} className="group flex min-w-0 flex-col items-center gap-1.5 text-center">
                      <span className="grid h-[52px] w-[52px] place-items-center rounded-[17px] border border-[#e2eae4] bg-white text-[#087b45] transition-colors group-hover:border-[#b8d9c3] group-hover:bg-[#e8f4ec]"><Icon className="h-[21px] w-[21px]" strokeWidth={1.8} /></span>
                      <span className="max-w-full text-[10px] font-semibold leading-tight text-[#66766c]">{entry.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {view === "home" && initialCategory && (
          <section className="min-h-[65vh]">
            <div className="mb-5 flex items-center gap-3">
              <button type="button" onClick={() => router.push("/")} aria-label="Kembali ke beranda" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e2eae4] bg-white text-[#087b45] transition hover:bg-[#e8f4ec]"><ArrowLeft className="h-4 w-4" /></button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8b82]">Paket Maeng Studio</p>
                <h2 className="mt-1 truncate text-xl font-bold">{getPackageCategoryLabel(category === "other" ? "Lainnya" : category)}</h2>
              </div>
              <span className="shrink-0 rounded-full bg-[#e6f4eb] px-3 py-1.5 text-[11px] font-bold text-[#087b45]">{filteredPackages.length} paket</span>
            </div>
            <label className="mb-3 flex h-11 items-center gap-2.5 rounded-[13px] border border-[#e2eae4] bg-white px-3.5 text-[#76857c]"><Search className="h-4 w-4 shrink-0" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari ${category === "all" ? "paket layanan" : getPackageCategoryLabel(category === "other" ? "Lainnya" : category).toLowerCase()}`} className="w-full bg-transparent text-sm text-[#18271f] outline-none placeholder:text-[#9aa69f]" /></label>
            {loadingPackages ? (
              <div className="grid min-h-36 place-items-center rounded-[16px] bg-white text-[#087b45]"><LoaderCircle className="h-7 w-7 animate-spin" /></div>
            ) : filteredPackages.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[#d6e1d9] bg-white py-10 text-center text-sm text-[#718078]">Paket belum tersedia untuk kategori ini.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredPackages.map((item) => {
                  const image = item.image_url || item.image;
                  const inCart = cartIds.includes(String(item.id));
                  const features = parseList(item.features).slice(0, 2);
                  return (
                    <article key={item.id} className="overflow-hidden rounded-[17px] border border-[#e3ebe5] bg-white shadow-[0_4px_14px_rgba(24,39,31,0.035)]">
                      <div className="relative h-[144px] bg-[#e9f1eb]">{image ? <img src={image} alt={item.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#8ba092]"><Package className="h-8 w-8" /></div>}<span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold uppercase text-[#087b45]">{getPackageCategoryLabel(item.type)}</span>{item.is_popular && <span className="absolute right-3 top-3 rounded-full bg-[#ed7d24] px-2.5 py-1 text-[9px] font-bold text-white">Favorit</span>}</div>
                      <div className="p-3.5">
                        <h3 className="line-clamp-1 text-[15px] font-bold">{item.name}</h3>
                        {item.description && <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-relaxed text-[#748279]">{item.description}</p>}
                        {features.length > 0 && <ul className="mt-2 space-y-1">{features.map((feature) => <li key={feature} className="flex items-center gap-1.5 truncate text-[10px] text-[#718078]"><span className="h-1 w-1 shrink-0 rounded-full bg-[#39a866]" />{feature}</li>)}</ul>}
                        <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[9px] font-semibold uppercase tracking-wide text-[#849188]">Mulai dari</p><p className="mt-0.5 text-[15px] font-extrabold text-[#087b45]">{formatRupiah(Number(item.price))}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => addToCart(item)} aria-label={inCart ? "Paket sudah ada di keranjang" : "Tambah ke keranjang"} className={`grid h-10 w-10 place-items-center rounded-[12px] border ${inCart ? "border-[#b9dfc6] bg-[#e9f6ed] text-[#087b45]" : "border-[#dfe8e1] bg-white text-[#087b45]"}`}>{inCart ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</button><button type="button" onClick={() => void openBooking(item)} className="flex h-10 items-center gap-1.5 rounded-[12px] bg-[#087b45] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#06683a]">Pesan <ChevronRight className="h-3.5 w-3.5" /></button></div></div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {view === "active" && (
          <section className="min-h-[65vh]">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8b82]">Akun Anda</p><h2 className="mt-1 text-xl font-bold">Pesanan saya</h2></div><button type="button" onClick={() => void loadBookings()} aria-label="Muat ulang pesanan" className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#087b45]"><LoaderCircle className={`h-4 w-4 ${loadingBookings ? "animate-spin" : ""}`} /></button></div>
            {loadingBookings ? <div className="grid min-h-44 place-items-center rounded-[16px] bg-white text-[#087b45]"><LoaderCircle className="h-7 w-7 animate-spin" /></div> : bookings.length === 0 ? (
              <div className="rounded-[17px] border border-[#e3ebe5] bg-white px-6 py-12 text-center"><ClipboardList className="mx-auto h-9 w-9 text-[#93a49a]" /><p className="mt-3 text-sm font-bold">Belum ada pesanan</p><p className="mt-1 text-xs text-[#819087]">Paket yang Anda pesan akan muncul di sini.</p><button type="button" onClick={() => setView("home")} className="mt-4 rounded-[11px] bg-[#087b45] px-4 py-2.5 text-xs font-bold text-white">Jelajahi paket</button></div>
            ) : (
              <div className="space-y-3">{bookings.map((booking) => { const eventList = parseEventDetails(booking.event_details); const firstEvent = eventList[0]; return <article key={booking.id} role="button" tabIndex={0} aria-label={`Lihat detail pesanan ${booking.client_name || booking.id}`} onClick={() => setSelectedBooking(booking)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedBooking(booking); } }} className="cursor-pointer rounded-[16px] border border-[#e3ebe5] bg-white p-4 text-left transition hover:border-[#9bc9aa] hover:shadow-[0_6px_18px_rgba(24,39,31,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087b45]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-[#809087]">{getPackageCategoryLabel(booking.service_type || "Layanan")}</p><h3 className="mt-1 text-sm font-bold">{String(firstEvent?.eventName || "Pesanan layanan")}</h3></div><span className="shrink-0 rounded-full bg-[#fff3df] px-2.5 py-1 text-[9px] font-bold text-[#a76114]">{booking.status === "pending_payment" ? "Menunggu DP" : booking.status === "locked" ? "Terjadwal" : booking.status || "Diproses"}</span></div>{firstEvent && <div className="mt-3 space-y-1.5 border-t border-[#edf1ee] pt-3 text-[11px] text-[#718078]"><p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-[#087b45]" />{formatOrderDate(firstEvent.date)} {firstEvent.startTime || firstEvent.time ? `· ${String(firstEvent.startTime || firstEvent.time)}` : ""}</p><p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#087b45]" />{String(firstEvent.address || "Lokasi belum tersedia")}</p></div>}<p className="mt-3 border-t border-[#edf1ee] pt-3 text-[10px] font-semibold text-[#087b45]">Lihat seluruh detail pesanan <ChevronRight className="ml-1 inline h-3.5 w-3.5" /></p></article>; })}</div>
            )}
          </section>
        )}

        {view === "cart" && (
          <section className="min-h-[65vh]">
            <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8b82]">Pilihan Anda</p><h2 className="mt-1 text-xl font-bold">Keranjang</h2></div>
            {cartPackages.length === 0 ? (
              <div className="rounded-[17px] border border-[#e3ebe5] bg-white px-6 py-12 text-center"><ShoppingBasket className="mx-auto h-9 w-9 text-[#93a49a]" /><p className="mt-3 text-sm font-bold">Keranjang masih kosong</p><p className="mt-1 text-xs text-[#819087]">Simpan paket yang ingin Anda pesan.</p><button type="button" onClick={() => setView("home")} className="mt-4 rounded-[11px] bg-[#087b45] px-4 py-2.5 text-xs font-bold text-white">Cari paket</button></div>
            ) : (
              <div className="space-y-3">{cartPackages.map((item) => <article key={item.id} className="flex gap-3 rounded-[16px] border border-[#e3ebe5] bg-white p-3"><div className="h-[76px] w-[82px] shrink-0 overflow-hidden rounded-[12px] bg-[#e9f1eb]">{item.image_url || item.image ? <img src={item.image_url || item.image || ""} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#8ba092]"><Package className="h-6 w-6" /></div>}</div><div className="min-w-0 flex-1 py-0.5"><p className="text-[9px] font-bold uppercase text-[#087b45]">{getPackageCategoryLabel(item.type)}</p><h3 className="mt-1 truncate text-sm font-bold">{item.name}</h3><p className="mt-1 text-xs font-bold text-[#087b45]">{formatRupiah(Number(item.price))}</p></div><div className="flex flex-col items-end justify-between"><button type="button" onClick={() => setCartIds((current) => current.filter((id) => id !== String(item.id)))} aria-label={`Hapus ${item.name} dari keranjang`} className="grid h-8 w-8 place-items-center rounded-full text-[#9aa69f] hover:bg-[#fff0ee] hover:text-[#bd554c]"><Trash2 className="h-4 w-4" /></button><button type="button" onClick={() => void startCheckout(item)} className="rounded-[10px] bg-[#087b45] px-3 py-2 text-[10px] font-bold text-white">Pesan</button></div></article>)}</div>
            )}
          </section>
        )}
      </main>

      <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e1e9e3] bg-white/95 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur-md">
        <div className="mx-auto grid h-[62px] max-w-[560px] grid-cols-4 px-2">
          <button type="button" onClick={() => void chooseView("home")} className={`flex flex-col items-center justify-center gap-1 ${view === "home" ? "text-[#087b45]" : "text-[#8b9990]"}`}><ShoppingBag className="h-[19px] w-[19px]" /><span className="text-[9px] font-semibold">Beranda</span></button>
          <button type="button" onClick={() => void chooseView("active")} className={`flex flex-col items-center justify-center gap-1 ${view === "active" ? "text-[#087b45]" : "text-[#8b9990]"}`}><ClipboardList className="h-[19px] w-[19px]" /><span className="text-[9px] font-semibold">Pesanan saya</span></button>
          <button type="button" onClick={() => void chooseView("cart")} className={`relative flex flex-col items-center justify-center gap-1 ${view === "cart" ? "text-[#087b45]" : "text-[#8b9990]"}`}><ShoppingBasket className="h-[19px] w-[19px]" /><span className="text-[9px] font-semibold">Keranjang</span>{cartIds.length > 0 && <span className="absolute left-1/2 top-1 ml-2 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[#ed7d24] px-1 text-[8px] font-bold text-white">{cartIds.length}</span>}</button>
          <button type="button" onClick={() => void verifyUser("/client/profile").then((currentUser) => { if (currentUser) router.push("/client/profile"); })} className="flex flex-col items-center justify-center gap-1 text-[#8b9990]"><CircleUserRound className="h-[19px] w-[19px]" /><span className="text-[9px] font-semibold">Pengaturan profil</span></button>
        </div>
      </nav>

      {selectedBooking && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#13241b]/55 p-3 backdrop-blur-sm sm:grid sm:place-items-center sm:p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="mx-auto my-2 max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-[20px] bg-[#f7faf8] shadow-2xl sm:my-0">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e3ebe5] bg-white px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6f4eb] text-[#087b45]"><FileText className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <h2 id="order-detail-title" className="text-sm font-bold">Detail pesanan</h2>
                  <p className="truncate text-[10px] text-[#819087]">ID {String(selectedBooking.id)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedBooking(null)} aria-label="Tutup detail pesanan" className="grid h-9 w-9 place-items-center rounded-full text-[#8b9990] hover:bg-[#f0f5f1]"><X className="h-5 w-5" /></button>
            </header>

            <div className="space-y-4 p-4 sm:p-5">
              <section className="rounded-[15px] border border-[#e1e9e3] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#087b45]">{getPackageCategoryLabel(selectedPackageInfo?.type || selectedBooking.service_type || "Layanan")}</p>
                    <h3 className="mt-1 text-base font-bold">{selectedPackageInfo?.name || "Paket layanan"}</h3>
                    {selectedPackageInfo?.description && <p className="mt-1 text-xs leading-relaxed text-[#718078]">{selectedPackageInfo.description}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-[#fff3df] px-2.5 py-1 text-[9px] font-bold capitalize text-[#a76114]">{String(selectedBooking.status || "Diproses").replace(/_/g, " ")}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#edf1ee] pt-3 text-xs">
                  <div><p className="text-[10px] text-[#819087]">Nama pemesan</p><p className="mt-1 font-semibold">{selectedBooking.client_name || "-"}</p></div>
                  <div><p className="text-[10px] text-[#819087]">Nomor WhatsApp</p><p className="mt-1 font-semibold">{selectedBooking.client_phone || "-"}</p></div>
                  <div><p className="text-[10px] text-[#819087]">Jenis acara</p><p className="mt-1 font-semibold">{selectedBooking.event_type || "-"}</p></div>
                  <div><p className="text-[10px] text-[#819087]">Dibuat</p><p className="mt-1 font-semibold">{formatOrderDate(selectedBooking.created_at)}</p></div>
                </div>
                {selectedPackageInfo && parseList(selectedPackageInfo.features).length > 0 && (
                  <div className="mt-3 border-t border-[#edf1ee] pt-3">
                    <p className="text-[10px] font-bold text-[#819087]">Fitur paket</p>
                    <ul className="mt-2 space-y-1 text-xs text-[#52645a]">{parseList(selectedPackageInfo.features).map((feature) => <li key={feature}>• {feature}</li>)}</ul>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-bold">Rangkaian acara ({selectedEvents.length})</h3>
                {selectedEvents.length === 0 ? <p className="rounded-[14px] bg-white p-4 text-xs text-[#819087]">Detail acara belum tersedia.</p> : (
                  <div className="space-y-2">
                    {selectedEvents.map((event, index) => (
                      <article key={String(event.id || index)} className="rounded-[14px] border border-[#e1e9e3] bg-white p-4">
                        <p className="text-[10px] font-bold uppercase text-[#087b45]">Acara {index + 1}</p>
                        <h4 className="mt-1 text-sm font-bold">{String(event.eventName || event.title || "Acara")}</h4>
                        <div className="mt-2 space-y-1.5 text-xs text-[#718078]">
                          <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-[#087b45]" />{formatOrderDate(event.date)}{event.startTime || event.time ? ` · ${String(event.startTime || event.time)}` : ""}</p>
                          <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#087b45]" />{String(event.address || "Lokasi belum tersedia")}</p>
                          {Boolean(event.eventType) && <p>Jenis acara: {String(event.eventType)}</p>}
                          {Boolean(event.bookerType) && <p>Status pemesan: {String(event.bookerType === "orang_lain" ? "Mewakili orang lain" : "Untuk sendiri")}</p>}
                          {Boolean(event.brideName) && <p>Nama wanita: {String(event.brideName)}</p>}
                          {Boolean(event.groomName) && <p>Nama pria: {String(event.groomName)}</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {selectedBooking.notes && <section className="rounded-[14px] border border-[#e1e9e3] bg-white p-4"><h3 className="text-xs font-bold">Catatan pesanan</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#718078]">{typeof selectedBooking.notes === "string" ? selectedBooking.notes : JSON.stringify(selectedBooking.notes, null, 2)}</p></section>}

              <section className="rounded-[15px] border border-[#dce9df] bg-white p-4">
                <h3 className="flex items-center gap-2 text-xs font-bold"><CreditCard className="h-4 w-4 text-[#087b45]" />Rincian pembayaran</h3>
                {selectedInvoice ? (
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between gap-3 text-[#718078]"><span>Total pesanan</span><strong className="text-[#18271f]">{formatRupiah(Number(selectedInvoice.total_amount || 0))}</strong></div>
                    <div className="flex justify-between gap-3 text-[#718078]"><span>DP minimum</span><strong className="text-[#18271f]">{formatRupiah(Number(selectedInvoice.dp_amount || Number(selectedInvoice.total_amount || 0) * 0.5))}</strong></div>
                    <div className="flex justify-between gap-3 text-[#718078]"><span>Sudah dibayar</span><strong className="text-[#087b45]">{formatRupiah(Number(selectedInvoice.paid_amount || 0))}</strong></div>
                    <div className="flex justify-between gap-3 border-t border-[#edf1ee] pt-2 font-bold"><span>Sisa pembayaran</span><span>{formatRupiah(Math.max(Number(selectedInvoice.total_amount || 0) - Number(selectedInvoice.paid_amount || 0), 0))}</span></div>
                  </div>
                ) : <p className="mt-2 text-xs text-[#819087]">Rincian invoice belum tersedia.</p>}
              </section>

              {needsDownPayment && (
                <section className="rounded-[15px] border border-[#f1d8a9] bg-[#fff8e9] p-4">
                  <h3 className="text-sm font-bold text-[#7b4d14]">Instruksi pembayaran DP</h3>
                  <p className="mt-1 text-xs text-[#8b6737]">Silakan bayar DP sebesar <strong>{formatRupiah(remainingDownPayment)}</strong>, lalu konfirmasi melalui WhatsApp.</p>
                  <div className="mt-3 space-y-2 rounded-[12px] border border-[#f1e4c9] bg-white p-3 text-xs text-[#52645a]">
                    <p className="font-bold">Transfer bank / e-wallet · a.n. Guntur Bayu Jantoro</p>
                    <p>BCA: 8435901499</p>
                    <p>SeaBank: 901760387739</p>
                    <p>DANA: 081226216862</p>
                    <p className="border-t border-[#edf1ee] pt-2">Tunai: bayar langsung di Galeri Maeng Studio, Jl. Kapten Robani Kadir LRG Maeng No 06 RT 016 RW 004 Kel. Talangputri, Kec. Plaju.</p>
                  </div>
                  <a href={`https://wa.me/628117873878?text=${encodeURIComponent(`Halo Maeng Studio, saya sudah membayar DP untuk pesanan ${String(selectedBooking.id)}.`)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-10 items-center justify-center rounded-[10px] bg-[#087b45] px-4 text-xs font-bold text-white">Konfirmasi via WhatsApp</a>
                </section>
              )}
            </div>
          </section>
        </div>
      )}

      {notice && !selectedPackage && <div role="status" className="fixed bottom-[78px] left-1/2 z-50 -translate-x-1/2 rounded-[12px] bg-[#183a29] px-4 py-3 text-center text-xs font-semibold text-white shadow-xl">{notice}</div>}

      {selectedPackage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#13241b]/55 p-3 backdrop-blur-sm sm:grid sm:place-items-center sm:p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="booking-title" className="mx-auto my-2 w-full max-w-[620px] overflow-hidden rounded-[20px] bg-[#f7faf8] shadow-2xl sm:my-0">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e3ebe5] bg-white px-4 py-3.5"><div className="flex items-center gap-3"><button type="button" onClick={() => setSelectedPackage(null)} aria-label="Kembali ke katalog" className="grid h-9 w-9 place-items-center rounded-full bg-[#f0f5f1] text-[#52645a]"><ArrowLeft className="h-4 w-4" /></button><div><h2 id="booking-title" className="text-sm font-bold">Detail pemesanan</h2><p className="text-[10px] text-[#819087]">{selectedPackage.name}</p></div></div><button type="button" onClick={() => setSelectedPackage(null)} aria-label="Tutup form" className="grid h-9 w-9 place-items-center rounded-full text-[#8b9990]"><X className="h-5 w-5" /></button></div>
            <form onSubmit={submitBooking} className="space-y-4 p-4 sm:p-5">
              {notice && <p role="alert" className="rounded-[12px] bg-[#fff1e8] px-3.5 py-3 text-xs font-medium text-[#985315]">{notice}</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-[10px] font-bold text-[#627168]">Nama pemesan<input required value={clientName} onChange={(event) => setClientName(event.target.value)} className="mt-1.5 h-11 w-full rounded-[11px] border border-[#dfe8e1] bg-white px-3 text-sm font-normal text-[#18271f] outline-none focus:border-[#087b45]" /></label>
                <label className="text-[10px] font-bold text-[#627168]">Nomor WhatsApp<input required type="tel" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} className="mt-1.5 h-11 w-full rounded-[11px] border border-[#dfe8e1] bg-white px-3 text-sm font-normal text-[#18271f] outline-none focus:border-[#087b45]" /></label>
                <label className="text-[10px] font-bold text-[#627168]">Jenis acara<select value={eventType} onChange={(event) => setEventType(event.target.value)} className="mt-1.5 h-11 w-full rounded-[11px] border border-[#dfe8e1] bg-white px-3 text-sm font-normal text-[#18271f] outline-none focus:border-[#087b45]"><option>Pernikahan</option><option>Khitan</option><option>Aqiqah</option><option>Ulang Tahun</option><option>Lainnya</option></select></label>
                <label className="text-[10px] font-bold text-[#627168]">Status pemesan<select value={bookerType} onChange={(event) => setBookerType(event.target.value)} className="mt-1.5 h-11 w-full rounded-[11px] border border-[#dfe8e1] bg-white px-3 text-sm font-normal text-[#18271f] outline-none focus:border-[#087b45]"><option value="sendiri">Memesan untuk sendiri</option><option value="orang_lain">Memesankan orang lain</option></select></label>
                {eventType === "Lainnya" && <label className="text-[10px] font-bold text-[#627168] sm:col-span-2">Jenis acara lainnya<input required value={customEventType} onChange={(event) => setCustomEventType(event.target.value)} className="mt-1.5 h-11 w-full rounded-[11px] border border-[#dfe8e1] bg-white px-3 text-sm font-normal text-[#18271f] outline-none focus:border-[#087b45]" /></label>}
                {eventType === "Pernikahan" && bookerType === "orang_lain" && <><label className="text-[10px] font-bold text-[#627168]">Nama pria<input required value={groomName} onChange={(event) => setGroomName(event.target.value)} className="mt-1.5 h-11 w-full rounded-[11px] border border-[#dfe8e1] bg-white px-3 text-sm font-normal text-[#18271f] outline-none focus:border-[#087b45]" /></label><label className="text-[10px] font-bold text-[#627168]">Nama wanita<input required value={brideName} onChange={(event) => setBrideName(event.target.value)} className="mt-1.5 h-11 w-full rounded-[11px] border border-[#dfe8e1] bg-white px-3 text-sm font-normal text-[#18271f] outline-none focus:border-[#087b45]" /></label></>}
              </div>
              <div className="flex items-center justify-between border-b border-[#e3ebe5] pb-2"><div><h3 className="text-sm font-bold">Jadwal pelaksanaan</h3><p className="mt-0.5 text-[10px] text-[#819087]">Maksimal dua rangkaian tanggal</p></div>{events.length < 2 && <button type="button" onClick={() => setEvents((current) => [...current, newEvent()])} className="flex items-center gap-1 rounded-[9px] bg-[#e6f4eb] px-2.5 py-2 text-[10px] font-bold text-[#087b45]"><Plus className="h-3.5 w-3.5" />Tambah hari</button>}</div>
              {events.map((event, index) => <div key={event.id} className="space-y-3 rounded-[14px] border border-[#e1e9e3] bg-white p-3.5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wide text-[#087b45]">Acara hari {index + 1}</span>{index > 0 && <button type="button" onClick={() => setEvents((current) => current.filter((_, eventIndex) => eventIndex !== index))} aria-label={`Hapus acara hari ${index + 1}`} className="text-[#9ba79f]"><Minus className="h-4 w-4" /></button>}</div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><label className="text-[10px] font-bold text-[#627168]">Tanggal<input required type="date" value={event.date} onChange={(inputEvent) => updateEvent(index, "date", inputEvent.target.value)} className="mt-1.5 h-10 w-full rounded-[10px] border border-[#dfe8e1] bg-white px-2 text-xs font-normal text-[#18271f] outline-none focus:border-[#087b45]" /></label><label className="text-[10px] font-bold text-[#627168]">Nama acara<input required placeholder="Akad nikah" value={event.eventName} onChange={(inputEvent) => updateEvent(index, "eventName", inputEvent.target.value)} className="mt-1.5 h-10 w-full rounded-[10px] border border-[#dfe8e1] bg-white px-2 text-xs font-normal text-[#18271f] outline-none focus:border-[#087b45]" /></label><label className="text-[10px] font-bold text-[#627168]">Jam mulai<input required type="time" value={event.startTime} onChange={(inputEvent) => updateEvent(index, "startTime", inputEvent.target.value)} className="mt-1.5 h-10 w-full rounded-[10px] border border-[#dfe8e1] bg-white px-2 text-xs font-normal text-[#18271f] outline-none focus:border-[#087b45]" /></label><label className="text-[10px] font-bold text-[#627168] sm:col-span-3">Alamat acara<textarea required rows={2} placeholder="Nama gedung, jalan, dan patokan lokasi" value={event.address} onChange={(inputEvent) => updateEvent(index, "address", inputEvent.target.value)} className="mt-1.5 w-full resize-y rounded-[10px] border border-[#dfe8e1] bg-white px-3 py-2.5 text-xs font-normal text-[#18271f] outline-none focus:border-[#087b45]" /></label></div></div>)}
              <label className="block text-[10px] font-bold text-[#627168]">Catatan tambahan<textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Permintaan khusus (opsional)" className="mt-1.5 w-full resize-y rounded-[10px] border border-[#dfe8e1] bg-white px-3 py-2.5 text-xs font-normal text-[#18271f] outline-none focus:border-[#087b45]" /></label>
              <div className="flex flex-col gap-3 rounded-[14px] bg-[#e9f5ed] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wide text-[#4c765c]">DP 50% · {formatRupiah(Number(selectedPackage.price || 0) * 0.5)}</p><p className="mt-1 text-xs text-[#6d8173]">Total paket {formatRupiah(Number(selectedPackage.price || 0))}</p></div><button type="submit" disabled={isSubmitting} className="flex h-11 items-center justify-center gap-2 rounded-[11px] bg-[#087b45] px-5 text-xs font-bold text-white disabled:opacity-60">{isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{isSubmitting ? "Memproses..." : "Konfirmasi pesanan"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}