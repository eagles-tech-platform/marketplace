import { Link, useNavigate } from "react-router";
import LegalDocument from "@/components/legal/LegalDocument";
import { LEGAL, terms, privacy, cookies } from "@/legal/content";
import type { LegalDoc } from "@/legal/content";

function Shell({ doc }: { doc: LegalDoc }) {
  const navigate = useNavigate();
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/login"));
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12" style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}>
        <button type="button" onClick={goBack} className="mb-4 text-sm font-medium text-teal-600 hover:text-teal-700">
          &larr; Back
        </button>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-10">
          <LegalDocument doc={doc} updated={LEGAL.updated} />
        </div>
        <nav className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-500" aria-label="Legal documents">
          <Link to="/terms" className="hover:underline">Terms of Service</Link>
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/cookies" className="hover:underline">Cookie Policy</Link>
        </nav>
      </div>
    </div>
  );
}

export const TermsPage = () => <Shell doc={terms} />;
export const PrivacyPage = () => <Shell doc={privacy} />;
export const CookiesPage = () => <Shell doc={cookies} />;
