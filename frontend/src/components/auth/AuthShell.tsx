import type { ReactNode } from "react";
import { Link } from "react-router";

type Props = {
  heading: string; // left-panel title
  blurb: string; // left-panel text
  children: ReactNode; // card content
};

/** Same split layout as Login.tsx, reused by the other auth pages. */
export default function AuthShell({ heading, blurb, children }: Props) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500">
        <div className="absolute inset-0 bg-[url('/hero-main.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative flex flex-col justify-center items-center text-white p-12 text-center">
          <img src="/logo.png" alt="Quantum MarketPlace" className="w-16 h-16 object-contain rounded-2xl mb-6" />
          <h2 className="text-3xl font-bold mb-4">{heading}</h2>
          <p className="text-white/80 max-w-sm">{blurb}</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-light text-slate-600">QUANTUM</span>
                <span className="text-2xl font-bold text-slate-800">MarketPlace</span>
              </div>
            </Link>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">{children}</div>
        </div>
      </div>
    </div>
  );
}