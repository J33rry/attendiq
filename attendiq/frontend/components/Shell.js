"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Logo from "@/components/ui/Logo";
import { Avatar, cx } from "@/components/ui/primitives";
import { useAuth } from "@/components/auth/AuthProvider";

export const NAV = {
  student: [
    { href: "/student", label: "Home", icon: "home" },
    { href: "/student/attendance", label: "Attendance", icon: "chart" },
    { href: "/student/planner", label: "Bunk Planner", short: "Planner", icon: "compass" },
    { href: "/student/recovery", label: "Recovery Planner", short: "Recovery", icon: "sprout" },
    { href: "/student/history", label: "History", icon: "history" },
    { href: "/student/schedule", label: "Upcoming Classes", short: "Classes", icon: "calendar" },
    { href: "/student/assistant", label: "Assistant", icon: "chat" },
  ],
  faculty: [
    { href: "/faculty", label: "Overview", icon: "home" },
    { href: "/faculty/sessions", label: "Sessions", icon: "calendar" },
    { href: "/faculty/subjects", label: "Subjects & Students", short: "Subjects", icon: "book" },
  ],
};
const MOBILE_PRIMARY = {
  student: ["/student", "/student/attendance", "/student/planner", "/student/assistant"],
  faculty: ["/faculty", "/faculty/sessions", "/faculty/subjects"],
};

const isActive = (path, href, root) => (href === root ? path === href : path === href || path.startsWith(`${href}/`));

export default function Shell({ role, children }) {
  const { user, logout } = useAuth();
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV[role];
  const root = `/${role}`;

  useEffect(() => setMoreOpen(false), [path]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-paper-300/70 bg-paper-50 px-4 py-6 lg:flex">
        <Link href={root} className="px-2"><Logo /></Link>
        <p className="mt-1 px-2 font-hand text-lg text-ink-400">{role === "faculty" ? "Faculty desk" : "Student notebook"}</p>

        <nav className="mt-6 flex flex-col gap-1" aria-label="Main">
          {items.map((it) => {
            const active = isActive(path, it.href, root);
            return (
              <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}
                className={cx(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-semibold transition",
                  active ? "bg-white text-ink-900 shadow-soft ring-1 ring-paper-300" : "text-ink-500 hover:bg-paper-200/60 hover:text-ink-900",
                )}>
                <span className={cx("grid size-8 place-items-center rounded-lg transition", active ? "bg-butter-100 text-butter-700" : "text-ink-400 group-hover:text-ink-700")}>
                  <Icon name={it.icon} size={19} />
                </span>
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <StickyDate />
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-paper-300/70">
            <Avatar name={user?.name} tone={role === "faculty" ? "sky" : "lavender"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-ink-400">{user?.email}</p>
            </div>
            <button onClick={logout} className="grid size-9 place-items-center rounded-lg text-ink-400 transition hover:bg-coral-50 hover:text-coral-700" aria-label="Log out" title="Log out">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-paper-300/60 bg-paper-100/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link href={root}><Logo size={30} /></Link>
        <Avatar name={user?.name} tone={role === "faculty" ? "sky" : "lavender"} className="size-8 text-xs" />
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        <div key={path} className="animate-rise">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-paper-300/70 bg-paper-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
        <div className="mx-auto flex max-w-md justify-around px-2">
          {items.filter((i) => MOBILE_PRIMARY[role].includes(i.href)).map((it) => {
            const active = isActive(path, it.href, root);
            return (
              <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}
                className={cx("flex min-w-16 flex-col items-center gap-0.5 py-2 text-[0.7rem] font-semibold", active ? "text-ink-900" : "text-ink-400")}>
                <span className={cx("grid h-8 w-12 place-items-center rounded-full transition", active && "bg-butter-100 text-butter-700")}>
                  <Icon name={it.icon} size={20} />
                </span>
                {it.short || it.label}
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(true)} className="flex min-w-16 flex-col items-center gap-0.5 py-2 text-[0.7rem] font-semibold text-ink-400">
            <span className="grid h-8 w-12 place-items-center rounded-full"><Icon name="menu" size={20} /></span>
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
          <div className="absolute inset-0 animate-fade bg-ink-900/30" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-pop rounded-t-[1.75rem] bg-paper-50 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-pop">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-paper-300" />
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={user?.name} tone={role === "faculty" ? "sky" : "lavender"} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user?.name}</p>
                <p className="truncate text-xs text-ink-400">{user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {items.map((it) => (
                <Link key={it.href} href={it.href}
                  className={cx("flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-semibold ring-1",
                    isActive(path, it.href, root) ? "bg-white ring-paper-400" : "ring-paper-300/70 text-ink-500")}>
                  <Icon name={it.icon} size={22} />
                  {it.short || it.label}
                </Link>
              ))}
            </div>
            <button onClick={logout} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-coral-50 font-semibold text-coral-700">
              <Icon name="logout" size={18} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StickyDate() {
  const [now, setNow] = useState(null);
  useEffect(() => setNow(new Date()), []);
  if (!now) return <div className="h-[92px]" />;
  return (
    <div className="relative mx-1 rotate-[-1.5deg] rounded-md bg-butter-100 px-4 pb-3 pt-4 shadow-soft">
      <span className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 rotate-2 rounded-sm bg-white/70 ring-1 ring-paper-300/60" />
      <p className="font-hand text-2xl leading-none text-ink-700">{now.toLocaleDateString([], { weekday: "long" })}</p>
      <p className="mt-1 text-sm font-medium text-ink-500">{now.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  );
}
