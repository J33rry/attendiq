import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { PaperPlane } from "@/components/illustrations/Classroom";

export default function NotFound() {
  return (
    <div className="paper-ruled grid min-h-dvh place-items-center bg-paper-50 px-6">
      <div className="max-w-md text-center">
        <Logo className="justify-center" />
        <PaperPlane className="mx-auto mt-10 w-28" />
        <h1 className="mt-6 text-3xl font-semibold">This page flew out the window</h1>
        <p className="mt-2 text-ink-500">We couldn&apos;t find what you were looking for. Let&apos;s get you back to class.</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink-900 px-5 font-semibold text-paper-50 hover:bg-ink-700">Back to AttendIQ</Link>
      </div>
    </div>
  );
}
