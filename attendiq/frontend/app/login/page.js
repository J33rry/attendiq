"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import { Button, Field, Notice, inputCls } from "@/components/ui/primitives";
import { ChalkboardScene, Squiggle } from "@/components/illustrations/Classroom";
import { firstName } from "@/lib/format";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-paper-100 lg:grid lg:grid-cols-[1.05fr_1fr]">
      <Welcome />
      <div className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8 lg:min-h-0">
        <Suspense fallback={null}><LoginForm /></Suspense>
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <aside className="relative hidden overflow-hidden bg-paper-50 lg:flex lg:flex-col lg:justify-between lg:p-12 paper-ruled border-r border-paper-300/70">
      <Logo size={40} />
      <div className="relative z-10 max-w-md pl-6">
        <p className="font-hand text-2xl text-sage-600">Morning bell&apos;s ringing…</p>
        <h1 className="mt-2 text-5xl font-semibold leading-[1.05]">
          Your campus.<br />Your classes.<br />
          <span className="relative inline-block">
            Your progress.
            <Squiggle className="absolute -bottom-2 left-0 h-3 w-full text-butter-400" />
          </span>
        </h1>
        <p className="mt-6 text-lg text-ink-500">
          Tap your card at the door, and AttendIQ keeps your register up to date — plus helps you plan the rest of the semester.
        </p>
      </div>
      <ChalkboardScene className="relative z-10 ml-4 w-full max-w-md" message="Welcome!" />
    </aside>
  );
}

function LoginForm() {
  const { user, login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const expired = params.get("expired") === "1";

  const destination = (role) => {
    const next = params.get("next");
    return next && next.startsWith(`/${role}`) ? next : `/${role}`;
  };

  // Already signed in? Skip the form.
  useEffect(() => {
    if (user && !busy) router.replace(destination(user.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function validate() {
    const e = {};
    if (!email.trim()) e.email = "Please enter your college email.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "That doesn't look like an email address.";
    if (!password) e.password = "Please enter your password.";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    setFormError("");
    if (!validate()) return;
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      toast.success(`Welcome back, ${firstName(u.name)}!`, u.role === "faculty" ? "Your faculty desk is ready." : "Your notebook is up to date.");
      router.replace(destination(u.role));
    } catch (err) {
      setFormError(
        err.status === 401 ? "That email and password don't match our records. Give it another go."
          : err.status === 429 ? "Too many attempts. Take a short break and try again in a few minutes."
            : err.message,
      );
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] animate-rise">
      <div className="mb-8 lg:hidden"><Logo size={38} tagline /></div>

      <p className="font-hand text-2xl text-sage-600">Hello again!</p>
      <h2 className="text-[2rem] font-semibold leading-tight">Sign in to your classroom</h2>
      <p className="mt-1 text-ink-500">Use the email and password from your college.</p>

      {expired && (
        <Notice tone="butter" icon="clock" className="mt-5">Your session timed out. Sign in again to pick up where you left off.</Notice>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Field label="College email" error={errors.email} htmlFor="email">
          <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="you@college.edu"
            value={email} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })); }}
            className={inputCls(errors.email)} aria-invalid={!!errors.email} />
        </Field>

        <Field label="Password" error={errors.password} htmlFor="password">
          <div className="relative">
            <input id="password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined })); }}
              className={`${inputCls(errors.password)} pr-12`} aria-invalid={!!errors.password} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-400 hover:bg-paper-100 hover:text-ink-700">
              <Icon name={show ? "eyeOff" : "eye"} size={19} />
            </button>
          </div>
        </Field>

        {formError && (
          <div className="flex items-start gap-2 rounded-xl bg-coral-50 p-3 text-sm text-coral-700 animate-pop" role="alert">
            <Icon name="info" size={18} className="mt-0.5" /> {formError}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={busy} iconRight={busy ? undefined : "arrowRight"}>
          {busy ? "Signing you in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white/70 p-4 text-sm text-ink-500 ring-1 ring-paper-300/70">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700"><Icon name="rfid" size={19} /></span>
        Attendance is marked when you tap your ID card on the classroom reader — no need to sign in for that.
      </div>
    </div>
  );
}
