import { useEffect, useState, type ElementType } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, Rocket, CreditCard, ShieldCheck, Wrench, UserCog, ChevronRight, MessageCircle, Loader2 } from "lucide-react";
import { supportApi, type ArticleSummary, type Category } from "../lib/api";
import { CONTACT } from "../lib/contactInfo";

const ICONS: Record<string, ElementType> = {
  "getting-started": Rocket,
  payments: CreditCard,
  "trust-safety": ShieldCheck,
  providers: Wrench,
  account: UserCog,
};

function ArticleRow({ a }: { a: ArticleSummary }) {
  return (
    <li>
      <Link to={`/help/${a.slug}`} className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600">
        <span>
          <span className="block font-medium text-slate-900 group-hover:text-teal-700">{a.title}</span>
          <span className="mt-0.5 block text-sm text-slate-600">{a.summary}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-teal-600" aria-hidden />
      </Link>
    </li>
  );
}

export default function HelpCenter() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Help Center | Quantum MarketPlace";
    supportApi.categories().then(setCategories).catch(() => { });
  }, []);

  useEffect(() => {
    let active = true;
    const q = query.trim();
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await supportApi.articles({ q: q || undefined, category: category || undefined, featured: !q && !category ? true : undefined });
        if (active) setArticles(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    }, q ? 300 : 0);
    return () => { active = false; clearTimeout(t); };
  }, [query, category]);

  const searching = query.trim().length > 0;
  const activeCategory = categories.find((c) => c.id === category);
  const heading = searching ? `Results for "${query.trim()}"` : activeCategory ? activeCategory.label : "Popular articles";

  return (
    <main>
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500">
        <div className="absolute inset-0 bg-[url('/hero-main.jpg')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">How can we help?</h1>
          <p className="mt-3 text-teal-100">Search our guides on booking, payments, verification and your account.</p>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mt-8">
            <label htmlFor="help-search" className="sr-only">Search the Help Center</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="help-search" type="search" value={query} autoComplete="off"
              onChange={(e) => { setQuery(e.target.value); if (category) setParams({}); }}
              placeholder="Try: refund, verified badge, reset password"
              className="w-full rounded-xl border-0 bg-white py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline focus:outline-2 focus:outline-orange-400"
            />
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        {!searching && !category && (
          <section aria-labelledby="browse" className="mb-12">
            <h2 id="browse" className="text-xl font-semibold text-slate-900">Browse by topic</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => {
                const Icon = ICONS[c.id] ?? Rocket;
                return (
                  <li key={c.id}>
                    <button onClick={() => setParams({ category: c.id })} className="flex h-full w-full items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600">
                      <span className="rounded-lg bg-teal-50 p-2.5 text-teal-700"><Icon className="h-5 w-5" aria-hidden /></span>
                      <span>
                        <span className="block font-medium text-slate-900">{c.label}</span>
                        <span className="mt-1 block text-sm text-slate-600">{c.description}</span>
                        <span className="mt-2 block text-xs text-slate-500">{c.count} {c.count === 1 ? "article" : "articles"}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-labelledby="results" aria-live="polite">
          <div className="flex items-center justify-between gap-4">
            <h2 id="results" className="text-xl font-semibold text-slate-900">{heading}</h2>
            {category && !searching && (
              <button onClick={() => setParams({})} className="text-sm font-medium text-teal-700 hover:underline">Back to all topics</button>
            )}
          </div>
          {loading ? (
            <p className="mt-6 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading</p>
          ) : error ? (
            <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>
          ) : articles.length === 0 ? (
            <p className="mt-6 rounded-lg bg-slate-50 p-5 text-slate-700">
              {searching ? "No guides match that search. Try a shorter word, or send us your question." : "No articles here yet."}{" "}
              <Link to="/contact" className="font-medium text-teal-700 underline">Contact support</Link>
            </p>
          ) : (
            <ul className="mt-4 space-y-3">{articles.map((a) => <ArticleRow key={a._id} a={a} />)}</ul>
          )}
        </section>

        <section className="relative mt-14 overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 px-6 py-14 sm:px-10 sm:py-16">
          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Didn't find your answer?
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Send us a message and we'll get back to you {CONTACT.responseTime}.
              For urgent assistance, reach out to us directly on WhatsApp.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
              <Link
                to="/contact"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:w-auto"
              >
                Contact Support
              </Link>

              <a
                href={`https://wa.me/${CONTACT.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contact support on WhatsApp (opens in a new tab)"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-teal-700 bg-white px-6 py-3 text-base font-semibold text-teal-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:w-auto"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                WhatsApp Support
              </a>
            </div>
          </div>

          {/* Decorative background accents */}
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-teal-100/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-cyan-100/50 blur-3xl" />
        </section>
      </div>
    </main>
  );
}
