import { useEffect, useState, type ReactNode } from "react";
import { onIdTokenChanged, signInWithPopup, signOut, GoogleAuthProvider, type Auth, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase';
import { useQueryClient } from '@tanstack/react-query';

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
    let unsubscribeAccess: (() => void) | undefined;
    getFirebase().then(({ auth: instance, db }) => {
      if (disposed) return;
      setAuth(instance);
      unsubscribe = onIdTokenChanged(instance, current => {
        unsubscribeAccess?.();
        cache.clear();
        setUser(current); setAdmin(false); setReady(!current);
        if (current) unsubscribeAccess = onSnapshot(doc(db, 'admin_access', current.uid), access => {
          if (!disposed) {
            const enabled = access.exists() && access.data().enabled === true;
            if (!enabled) cache.clear();
            setAdmin(enabled); setReady(true);
          }
        }, () => { if (!disposed) { setAdmin(false); setReady(true); setError('Administrator access could not be checked.'); } });
      });
    }).catch(() => { if (!disposed) { setError('Administrator sign-in has not been configured.'); setReady(true); } });
    return () => { disposed = true; unsubscribe?.(); unsubscribeAccess?.(); };
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
