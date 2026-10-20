import type { LegalDoc } from "@/legal/content";

export default function LegalDocument({ doc, updated }: { doc: LegalDoc; updated: string }) {
  return (
    <article>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{doc.title}</h1>
      <p className="mt-1 text-sm text-slate-500">Last updated: {updated}</p>
      {doc.intro && <p className="mt-6 leading-relaxed text-slate-600">{doc.intro}</p>}
      {doc.sections.map((s, i) => (
        <section key={s.title} className="mt-8">
          <h2 className="text-lg font-semibold text-slate-800">
            {i + 1}. {s.title}
          </h2>
          {s.body.map((b, j) =>
            Array.isArray(b) ? (
              <ul key={j} className="mt-3 list-disc pl-6 space-y-1.5 text-slate-600">
                {b.map((li, k) => (
                  <li key={k}>{li}</li>
                ))}
              </ul>
            ) : (
              <p key={j} className="mt-3 leading-relaxed text-slate-600">
                {b}
              </p>
            ),
          )}
        </section>
      ))}
    </article>
  );
}
