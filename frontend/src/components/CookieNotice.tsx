import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Capacitor } from "@capacitor/core";

const KEY = "cookie-notice-v1";

/** Website only: tells visitors we use essential cookies/storage. Hidden inside the mobile app. */
export default function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* storage blocked: the notice will simply show again next time */
    }
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl bg-slate-900 p-4 text-sm text-white shadow-xl sm:flex-row sm:items-center">
        <p className="flex-1">
          We use essential cookies and similar storage to keep you signed in and the site working. See our{" "}
          <Link to="/cookies" className="underline">Cookie Policy</Link> and{" "}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <button
          type="button"
          onClick={accept}
          className="rounded-xl bg-white px-5 py-2.5 font-semibold text-slate-900 hover:opacity-90"
        >
          OK
        </button>
      </div>
    </div>
  );
}
