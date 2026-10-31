
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { supportApi, type Article, type ArticleSummary } from "../lib/api";

// Safe text renderer: no raw HTML is injected.
function Content({ text }: { text: string }) {
  return (
    <div className="space-y-5 text-[15px] leading-8 text-slate-700 sm:text-base">
      {text.trim().split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n");

        if (block.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="border-b border-teal-100 pb-2 pt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            >
              {block.slice(3)}
            </h2>
          );
        }

        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-2 pl-6 marker:text-teal-600">
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          );
        }

        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return (
            <ol key={i} className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-teal-700">
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\d+\.\s/, "")}</li>
              ))}
            </ol>
          );
        }

        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}

export default function HelpArticlePage() {
  const { slug = "" } = useParams();

  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<ArticleSummary[]>([]);
  const [error, setError] = useState("");
  const [voted, setVoted] = useState<boolean | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    let active = true;

    setArticle(null);
    setRelated([]);
    setError("");

    try {
      const savedVote = sessionStorage.getItem(`help-vote-${slug}`);
      setVoted(savedVote === null ? null : savedVote === "1");
    } catch {
      setVoted(null);
    }

    supportApi.article(slug)
      .then((d) => {
        if (!active) return;

        setArticle(d.article);
        setRelated(d.related);
        document.title = `${d.article.title} | Help Center`;
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((e) => {
        if (active) {
          setError(
            e instanceof Error ? e.message : "Something went wrong."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [slug]);

  async function vote(helpful: boolean) {
    if (voting || voted !== null) return;

    setVoting(true);

    try {
      await supportApi.feedback(slug, helpful);
      setVoted(helpful);

      try {
        sessionStorage.setItem(
          `help-vote-${slug}`,
          helpful ? "1" : "0"
        );
      } catch {
        // Feedback has already been submitted.
      }
    } catch {
      setError("We couldn't submit your feedback. Please try again.");
    } finally {
      setVoting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500 py-20 pt-28 sm:py-24">
        <div
          className="absolute inset-0 bg-[url('/hero-main.jpg')] bg-cover bg-center opacity-10"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/5"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-sm">
            <BookOpen className="h-7 w-7" />
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/85">
            Support & Resources
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Help Center
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
            Find answers, explore helpful guides, and get the support you need.
          </p>
        </div>
      </section>

      {/* Article content */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Link
          to="/help"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-50 hover:text-teal-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Help Center
        </Link>

        {error && !article ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="text-lg font-bold text-slate-900">
              We couldn't find that article.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {error}
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
              <Link to="/help" className="text-teal-700 hover:text-teal-900 hover:underline">
                Search the Help Center
              </Link>
              <Link to="/contact" className="text-teal-700 hover:text-teal-900 hover:underline">
                Contact support
              </Link>
            </div>
          </div>
        ) : !article ? (
          <div className="mt-8 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
            <p className="mt-4 font-medium text-slate-600">
              Loading article...
            </p>
          </div>
        ) : (
          <article className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50 via-white to-orange-50 px-6 py-7 sm:px-9 sm:py-9">
                <span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-800">
                  <BookOpen className="h-3.5 w-3.5" />
                  Help Article
                </span>

                <h2 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                  {article.title}
                </h2>

                <p className="mt-3 text-sm text-slate-500">
                  Last updated{" "}
                  {new Date(article.updatedAt).toLocaleDateString("en-NG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="px-6 py-8 sm:px-9 sm:py-10">
                <Content text={article.content} />
              </div>
            </div>

            {/* Feedback */}
            <section className="mt-8 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-orange-50 p-6 sm:p-8">
              {voted === null ? (
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Was this article helpful?
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Your feedback helps us improve our support resources.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => vote(true)}
                      disabled={voting}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {voting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                      Yes
                    </button>

                    <button
                      type="button"
                      onClick={() => vote(false)}
                      disabled={voting}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Thank you for your feedback!
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {voted
                        ? "We're glad this article was helpful."
                        : "Sorry this didn't answer your question. "}
                      {!voted && (
                        <Link
                          to="/contact"
                          className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900"
                        >
                          Contact our support team.
                        </Link>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Related articles */}
            {related.length > 0 && (
              <section className="mt-12" aria-labelledby="related">
                <h2
                  id="related"
                  className="text-xl font-bold text-slate-900"
                >
                  Related articles
                </h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {related.map((r) => (
                    <Link
                      key={r._id}
                      to={`/help/${r.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/50 hover:shadow-md"
                    >
                      <span className="font-medium text-slate-700 transition-colors group-hover:text-teal-800">
                        {r.title}
                      </span>
                      <ArrowLeft className="h-4 w-4 shrink-0 rotate-180 text-slate-400 transition-colors group-hover:text-teal-700" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </div>
    </main>
  );
}
