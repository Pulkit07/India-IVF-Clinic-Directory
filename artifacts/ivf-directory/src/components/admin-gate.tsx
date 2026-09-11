import { useEffect, useState, type ReactNode } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onIdTokenChanged, signInWithPopup, signOut, GoogleAuthProvider, connectAuthEmulator, type Auth, type User } from "firebase/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

let authPromise: Promise<Auth> | undefined;
async function loadAuth(): Promise<Auth> {
  const env = import.meta.env;
  let config = env.VITE_FIREBASE_API_KEY ? {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "ivf-directory-india.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? "ivf-directory-india",
    appId: env.VITE_FIREBASE_APP_ID,
  } : undefined;
  if (!config) {
    const response = await fetch("/__/firebase/init.json");
    if (!response.ok) throw new Error("Administrator sign-in has not been configured.");
    config = await response.json();
  }
  if (!config?.apiKey) throw new Error("Administrator sign-in has not been configured.");
  const auth = getAuth(getApps()[0] ?? initializeApp(config));
  if (env.DEV && env.VITE_USE_FIREBASE_EMULATORS === "true") connectAuthEmulator(auth, "http://127.0.0.1:9099");
  setAuthTokenGetter(async () => {
    await auth.authStateReady();
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
  });
  return auth;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [auth, setAuth] = useState<Auth>();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    (authPromise ??= loadAuth()).then(instance => {
      if (disposed) return;
      setAuth(instance);
      unsubscribe = onIdTokenChanged(instance, async current => {
        setReady(false);
        cache.clear();
        try {
          const token = await current?.getIdTokenResult();
          if (!disposed) { setUser(current); setAdmin(token?.claims.admin === true); }
        } catch {
          if (!disposed) { setUser(null); setAdmin(false); setError("Your session could not be verified. Please sign in again."); }
        } finally { if (!disposed) setReady(true); }
      });
    }).catch(() => { if (!disposed) { setError("Administrator sign-in has not been configured."); setReady(true); } });
    return () => { disposed = true; unsubscribe?.(); };
  }, [cache]);

  const login = async () => {
    if (!auth) return;
    setBusy(true); setError("");
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch { setError("Sign-in could not be completed. Please try again."); }
    finally { setBusy(false); }
  };
  return <>
    <div className="shell-inner" style={{ paddingBlock: "2rem" }}>
      {user ? <button className="text-link-button" onClick={() => auth && signOut(auth).catch(() => setError("Sign-out failed. Please try again."))}>Sign out</button> : null}
      {!ready ? <p>Checking your session…</p> : !isAdmin ? <div className="state-card">
        <p className="eyebrow">Directory desk</p><h1>Administrator sign-in</h1>
        <p>{user ? "This account does not have administrator access." : "Sign in with your approved Google account to manage clinic records."}</p>
        {!user && auth ? <button className="text-link-button" disabled={busy} onClick={login}>{busy ? "Signing in…" : "Sign in with Google"}</button> : null}
        <p><a href="/">Return to the directory</a></p>
      </div> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
    {ready && isAdmin ? children : null}
  </>;
}
