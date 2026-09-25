"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

import { login, logout, onUserChange, signUp } from "@/lib/auth";
import type { User } from "firebase/auth";

type AuthMode = "login" | "signup";

export default function SanCommunityAuth() {
  const [mounted, setMounted] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onUserChange((nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        setMessage("");
      }
    });

    const timer = window.requestAnimationFrame(() => {
      const header = document.querySelector<HTMLElement>(".app header");
      setHost(header);
      setMounted(true);
    });

    return () => {
      window.cancelAnimationFrame(timer);
      unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    try {
      setBusy(true);
      setMessage(mode === "login" ? "Logging in..." : "Creating account...");

      if (mode === "login") {
        await login(email, password);
        setMessage("Logged in successfully.");
      } else {
        await signUp(
          email,
          password,
          username,
          displayName,
          country,
          language
        );
        setMessage("Account created successfully.");
      }

      setPassword("");
      setUsername("");
      setDisplayName("");
      setCountry("");
      setLanguage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Authentication failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      setBusy(true);
      await logout();
      setMessage("Logged out successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Logout failed."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || !host) {
    return null;
  }

  const authPanel = user ? (
    <div className="sancommunity-auth__user">
      <span className="sancommunity-auth__identity">
        <span aria-hidden="true">●</span>
        {user.displayName || user.email || "Authenticated"}
      </span>

      <button
        type="button"
        className="sancommunity-auth__button sancommunity-auth__button--secondary"
        onClick={handleLogout}
        disabled={busy}
      >
        {busy ? "Logging out..." : "Log out"}
      </button>
    </div>
  ) : (
    <div className="sancommunity-auth__guest">
      <div className="sancommunity-auth__tabs" role="tablist">
        <button
          type="button"
          className={`sancommunity-auth__tab${
            mode === "login" ? " sancommunity-auth__tab--active" : ""
          }`}
          onClick={() => setMode("login")}
          role="tab"
          aria-selected={mode === "login"}
        >
          Login
        </button>

        <button
          type="button"
          className={`sancommunity-auth__tab${
            mode === "signup" ? " sancommunity-auth__tab--active" : ""
          }`}
          onClick={() => setMode("signup")}
          role="tab"
          aria-selected={mode === "signup"}
        >
          Sign up
        </button>
      </div>

      <form className="sancommunity-auth__form" onSubmit={handleSubmit}>
        <input
          className="sancommunity-auth__input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          aria-label="Email"
          required
          autoComplete="email"
        />

        <input
          className="sancommunity-auth__input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          aria-label="Password"
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        {mode === "signup" && (
          <>
            <input
              className="sancommunity-auth__input"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              aria-label="Username"
              required
              autoComplete="username"
            />

            <input
              className="sancommunity-auth__input"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display name"
              aria-label="Display name"
              required
              autoComplete="name"
            />

            <input
              className="sancommunity-auth__input"
              type="text"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Country"
              aria-label="Country"
              required
              autoComplete="country-name"
            />

            <input
              className="sancommunity-auth__input"
              type="text"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              placeholder="Language"
              aria-label="Language"
              required
            />
          </>
        )}

        <button
          type="submit"
          className="sancommunity-auth__button sancommunity-auth__button--primary"
          disabled={busy}
        >
          {busy
            ? "Working..."
            : mode === "login"
              ? "Login"
              : "Create account"}
        </button>
      </form>
    </div>
  );

  return createPortal(
    <div className="sancommunity-auth">
      {authPanel}

      {message ? (
        <span
          className="sancommunity-auth__message"
          role="status"
          aria-live="polite"
        >
          {message}
        </span>
      ) : null}
    </div>,
    host
  );
}