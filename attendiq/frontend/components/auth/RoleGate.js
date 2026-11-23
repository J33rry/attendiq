"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { LogoMark } from "@/components/ui/Logo";

/**
 * Keeps each area for its own role. This only shapes the UI —
 * the backend enforces roles on every request (requireRole middleware).
 */
export default function RoleGate({ role, children }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    else if (user && user.role !== role) router.replace(`/${user.role}`);
  }, [user, role, router]);

  if (!user || user.role !== role) return <FullPageLoader />;
  return children;
}

export function FullPageLoader({ label = "Opening your classroom…" }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper-100">
      <div className="flex flex-col items-center gap-3 animate-fade">
        <LogoMark size={52} className="animate-pulse" />
        <p className="font-hand text-xl text-ink-400">{label}</p>
      </div>
    </div>
  );
}
