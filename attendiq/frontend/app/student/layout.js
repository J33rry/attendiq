"use client";
import RoleGate from "@/components/auth/RoleGate";
import Shell from "@/components/Shell";

export default function StudentLayout({ children }) {
  return (
    <RoleGate role="student">
      <Shell role="student">{children}</Shell>
    </RoleGate>
  );
}
