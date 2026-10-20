import { useEffect, useState, type ReactNode } from "react";
import LegalDocument from "./LegalDocument";
import { LEGAL, terms, privacy, cookies } from "@/legal/content";

const docs = { terms, privacy, cookies } as const;
export type DocKey = keyof typeof docs;

/** A link that opens a legal document in a pop-up, so a half-filled form is never lost. */
export default function LegalDialog({ doc, children }: { doc: DocKey; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="underline font-medium text-teal-600 hover:text-teal-700">
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={docs[doc].title}
            className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <LegalDocument doc={docs[doc]} updated={LEGAL.updated} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-8 w-full rounded-xl py-3 font-semibold bg-gradient-to-r from-teal-500 to-orange-500 text-white hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
