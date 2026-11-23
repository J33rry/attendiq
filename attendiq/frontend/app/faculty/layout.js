"use client";
import RoleGate from "@/components/auth/RoleGate";
import Shell from "@/components/Shell";

export default function FacultyLayout({ children }) {
  return (
    <RoleGate role="faculty">
      <Shell role="faculty">{children}</Shell>
    </RoleGate>
  );
}
