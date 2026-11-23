"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { FullPageLoader } from "@/components/auth/RoleGate";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user === null) router.replace("/login");
    else if (user) router.replace(`/${user.role}`);
  }, [user, router]);
  return <FullPageLoader />;
}
