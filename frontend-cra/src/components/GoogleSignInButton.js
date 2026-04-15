import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve();
        return;
      }
      const onLoad = () => resolve();
      const onErr = () => reject(new Error("Failed to load Google sign-in"));
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onErr, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.body.appendChild(script);
  });
}

/**
 * Official Google Identity Services button. Parent receives the ID token via onCredential(jwt).
 */
export function GoogleSignInButton({ onCredential, disabled }) {
  const hostRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID || disabled) return undefined;
    let cancelled = false;
    const hostEl = hostRef.current;

    loadGsiScript()
      .then(() => {
        if (cancelled) return;
        const el = hostRef.current;
        if (!el) return;
        el.innerHTML = "";
        const width = Math.max(280, Math.floor(el.getBoundingClientRect().width) || 320);
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => {
            if (res?.credential) onCredentialRef.current(res.credential);
          },
        });
        window.google.accounts.id.renderButton(el, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          width,
          logo_alignment: "left",
          shape: "pill",
        });
      })
      .catch(() => {
        /* Parent can show errors if needed; script load failures are rare */
      });

    return () => {
      cancelled = true;
      if (hostEl) hostEl.innerHTML = "";
    };
  }, [disabled]);

  if (!CLIENT_ID) {
    return (
      <p className="auth-google-hint">
        Set <code className="auth-google-code">REACT_APP_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
      </p>
    );
  }

  return (
    <div className={`auth-google-wrap${disabled ? " auth-google-wrap--disabled" : ""}`}>
      <div ref={hostRef} className="auth-google-host" />
    </div>
  );
}
