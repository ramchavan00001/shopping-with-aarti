import { Activity, BarChart3, Clapperboard, ExternalLink, FolderTree, Inbox, Link2, Loader2, LogOut, MessageCircle, Percent, Settings } from "lucide-react";
import { InstagramIcon } from "@/components/icons";
import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router";
import type { AdminConfig } from "@shared/admin";
import { cn } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/Header";
import { adminApi, ApiError, useAdminQuery } from "./api";
import { AdminConfigContext } from "./context";
import { Button, ErrorBanner, Field, TextInput, ToastProvider } from "./ui";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ReelsList = lazy(() => import("./pages/ReelsList"));
const ReelEditor = lazy(() => import("./pages/ReelEditor"));
const DealsAdmin = lazy(() => import("./pages/DealsAdmin"));
const CategoriesAdmin = lazy(() => import("./pages/CategoriesAdmin"));
const EnquiriesAdmin = lazy(() => import("./pages/EnquiriesAdmin"));
const SettingsAdmin = lazy(() => import("./pages/SettingsAdmin"));
const LinksAdmin = lazy(() => import("./pages/LinksAdmin"));
const SubscribersAdmin = lazy(() => import("./pages/SubscribersAdmin"));
const InstagramAdmin = lazy(() => import("./pages/InstagramAdmin"));
const SystemAdmin = lazy(() => import("./pages/SystemAdmin"));

type Session = { loggedIn: boolean; configured: boolean; database: boolean };

export default function AdminApp() {
  usePageMeta("Admin");
  const session = useAdminQuery<Session>("/session");

  useEffect(() => {
    const onLogout = () => session.reload();
    window.addEventListener("admin:logged-out", onLogout);
    return () => window.removeEventListener("admin:logged-out", onLogout);
  }, [session]);

  if (session.loading && !session.data) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="size-6 animate-spin text-muted" />
      </div>
    );
  }
  if (!session.data?.loggedIn) return <Login configured={session.data?.configured ?? true} error={session.error} onDone={session.reload} />;

  return (
    <ToastProvider>
      <Shell database={session.data.database} onLogout={session.reload} />
    </ToastProvider>
  );
}

function Login({ configured, error, onDone }: { configured: boolean; error?: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(undefined);
    try {
      await adminApi("/login", { body: { password } });
      onDone();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Couldn't log in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 shadow-lift">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-semibold">Admin login</h1>
        <p className="mt-1 text-sm text-muted">Manage reels, products, deals and enquiries.</p>
        {!configured ? (
          <div className="mt-6">
            <ErrorBanner message="The admin panel is switched off. Set ADMIN_PASSWORD in the server's environment variables, then redeploy." />
          </div>
        ) : (
          <>
            <Field label="Password" error={message ?? error} className="mt-6">
              <TextInput type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" variant="primary" loading={busy} className="mt-5 w-full">
              Log in
            </Button>
          </>
        )}
      </form>
    </div>
  );
}

const nav = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, end: true },
  { to: "/admin/reels", label: "Reels & products", icon: Clapperboard },
  { to: "/admin/deals", label: "Deals & sales", icon: Percent },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/instagram", label: "Instagram sync", icon: InstagramIcon },
  { to: "/admin/links", label: "Link health", icon: Link2 },
  { to: "/admin/enquiries", label: "Enquiries", icon: Inbox },
  { to: "/admin/subscribers", label: "WhatsApp alerts", icon: MessageCircle },
  { to: "/admin/settings", label: "Site settings", icon: Settings },
  { to: "/admin/system", label: "System", icon: Activity },
];

function Shell({ database, onLogout }: { database: boolean; onLogout: () => void }) {
  const navigate = useNavigate();
  const config = useAdminQuery<AdminConfig>("/config");
  const ctx = { uploadsEnabled: false, mediaBaseUrl: null, nextReelCode: "A100", ...config.data, reload: config.reload };

  async function logout() {
    await adminApi("/logout", { body: {} }).catch(() => {});
    onLogout();
    navigate("/admin");
  }

  return (
    <AdminConfigContext.Provider value={ctx}>
      <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[248px_1fr]">
        <aside className="sticky top-0 z-30 border-b border-line bg-surface lg:h-dvh lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2 px-4 py-3 lg:block lg:px-5 lg:py-6">
            <Logo />
            <div className="flex items-center gap-1 lg:hidden">
              <ThemeToggle />
              <button onClick={logout} aria-label="Log out" className="grid size-10 place-items-center rounded-full text-muted hover:text-ink">
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
          <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive ? "bg-accent-soft text-accent" : "text-ink/75 hover:bg-surface-2 hover:text-ink",
                  )
                }
              >
                <Icon className="size-4" /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="absolute inset-x-0 bottom-0 hidden space-y-1 border-t border-line p-3 lg:block">
            <a href="/" target="_blank" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/75 hover:bg-surface-2">
              <ExternalLink className="size-4" /> View site
            </a>
            <div className="flex items-center justify-between px-1">
              <button onClick={logout} className="flex items-center gap-2.5 rounded-xl px-2 py-2.5 text-sm font-medium text-ink/75 hover:text-ink">
                <LogOut className="size-4" /> Log out
              </button>
              <ThemeToggle />
            </div>
          </div>
        </aside>
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {!database && (
            <div className="mb-6">
              <ErrorBanner message="No database connected, so nothing can be saved. Set DATABASE_URL on the server (see the README)." />
            </div>
          )}
          <Suspense fallback={<Loader2 className="size-6 animate-spin text-muted" />}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="reels" element={<ReelsList />} />
              <Route path="reels/new" element={<ReelEditor />} />
              <Route path="reels/:code" element={<ReelEditor />} />
              <Route path="deals" element={<DealsAdmin />} />
              <Route path="categories" element={<CategoriesAdmin />} />
              <Route path="enquiries" element={<EnquiriesAdmin />} />
              <Route path="settings" element={<SettingsAdmin />} />
              <Route path="links" element={<LinksAdmin />} />
              <Route path="subscribers" element={<SubscribersAdmin />} />
              <Route path="instagram" element={<InstagramAdmin />} />
              <Route path="system" element={<SystemAdmin />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </AdminConfigContext.Provider>
  );
}
