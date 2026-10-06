"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import type { Profile } from "@project/contracts";
import { api } from "@/lib/api";

export function Account({ mode }: { mode: "profile" | "forgot" | "reset" }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [validLink, setValidLink] = useState(false);
  const [show, setShow] = useState(false);
  const tokens = useRef<{ accessToken: string; refreshToken: string } | null>(
    null,
  );
  const profile = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Profile>("/auth/me"),
    enabled: mode === "profile",
  });
  useEffect(() => {
    if (mode !== "reset") return;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      tokens.current = { accessToken, refreshToken };
      setValidLink(true);
    } else if (!tokens.current)
      setError(
        "This link is missing or expired. Request a new password reset email.",
      );
    window.history.replaceState(null, "", window.location.pathname);
  }, [mode]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    if (mode === "reset" && form.get("password") !== form.get("confirm")) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "profile") {
        const user = await api<Profile>("/auth/profile", {
          method: "PATCH",
          body: JSON.stringify({ fullName: form.get("fullName") }),
        });
        qc.setQueryData(["me"], user);
        void qc.invalidateQueries({ queryKey: ["workspace"] });
        setMessage("Your profile is updated.");
      } else if (mode === "forgot") {
        const result = await api<{ message: string }>("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: form.get("email") }),
        });
        setMessage(result.message);
      } else {
        if (!tokens.current)
          throw new Error("Request a new reset link to continue.");
        const result = await api<{ message: string }>("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            ...tokens.current,
            password: form.get("password"),
          }),
        });
        tokens.current = null;
        setValidLink(false);
        qc.clear();
        setMessage(result.message);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="topbar">
        <Link
          className="brand"
          href={mode === "profile" ? "/dashboard" : "/login"}
        >
          <span className="brand-mark">
            d<span>.</span>
          </span>
          Daymark
        </Link>
        <span className="edition">YOUR DAY. YOUR MARK.</span>
      </header>
      <main className="account-page">
        <Link
          className="quiet-link"
          href={mode === "profile" ? "/dashboard" : "/login"}
        >
          <ArrowLeft size={16} />
          {mode === "profile" ? "Back to workspace" : "Back to sign in"}
        </Link>
        <h1>
          {mode === "profile"
            ? "Make it yours."
            : mode === "forgot"
              ? "Let’s get you back."
              : "A fresh start."}
        </h1>
        <p>
          {mode === "profile"
            ? "Your profile and account, all in one place."
            : mode === "forgot"
              ? "Enter your account email. We’ll send a secure reset link."
              : "Choose a strong password you haven’t used before."}
        </p>
        <section className="account-card">
          {mode === "profile" && profile.isPending ? (
            <p role="status">Loading your profile...</p>
          ) : mode === "profile" && profile.error ? (
            <>
              <p role="alert">{profile.error.message}</p>
              <Link href="/login">Sign in</Link>
            </>
          ) : (
            <form onSubmit={submit}>
              {mode === "profile" && (
                <>
                  <span className="profile-avatar" aria-hidden="true">
                    {profile.data?.fullName.slice(0, 1).toUpperCase() || "D"}
                  </span>
                  <label>
                    Full name
                    <input
                      name="fullName"
                      defaultValue={profile.data?.fullName}
                      maxLength={120}
                      required
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      value={profile.data?.email ?? ""}
                      readOnly
                      autoComplete="email"
                    />
                  </label>
                  <p className="small">
                    Your email identifies this account and receives password
                    recovery links.
                  </p>
                </>
              )}
              {mode === "forgot" && (
                <label>
                  Email address
                  <input
                    suppressHydrationWarning
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {mode === "reset" && validLink && (
                <>
                  <label>
                    New password
                    <span className="password-field">
                      <input
                        name="password"
                        type={show ? "text" : "password"}
                        minLength={8}
                        maxLength={72}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="icon-button password-toggle"
                        aria-label={show ? "Hide password" : "Show password"}
                        onClick={() => setShow(!show)}
                      >
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                  </label>
                  <label>
                    Confirm new password
                    <input
                      name="confirm"
                      type={show ? "text" : "password"}
                      minLength={8}
                      maxLength={72}
                      autoComplete="new-password"
                      required
                    />
                  </label>
                </>
              )}
              {error && (
                <p className="message" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p className="notice" role="status">
                  {message}
                </p>
              )}
              {(mode !== "reset" || validLink) && (
                <button
                  suppressHydrationWarning
                  className="primary"
                  disabled={busy}
                >
                  {busy
                    ? "Please wait..."
                    : mode === "profile"
                      ? "Save profile"
                      : mode === "forgot"
                        ? "Send reset link"
                        : "Update password"}
                  <ArrowUpRight size={18} />
                </button>
              )}
              {mode === "reset" && !validLink && (
                <Link href={message ? "/login" : "/forgot-password"}>
                  {message ? "Sign in" : "Request a new link"}
                </Link>
              )}
            </form>
          )}
        </section>
        {mode === "profile" && (
          <section className="account-card">
            <h2>Password & security</h2>
            <p>
              Need a new password? We’ll verify your email before changing it.
              Resetting your password signs out your other sessions.
            </p>
            <Link className="quiet-link" href="/forgot-password">
              Reset password <ArrowUpRight size={16} />
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
