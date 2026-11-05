import Link from "next/link";
import type { LegalDocument } from "@/content/legal";

export function LegalDocumentView({ doc, related }: { doc: LegalDocument; related: { href: string; label: string } }) {
  return (
    <article className="container-site max-w-3xl py-14 sm:py-16">
      <p role="note" className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-navy-950">{doc.draftNotice}</p>
      <h1 className="text-3xl font-bold text-navy-700 sm:text-4xl">{doc.title}</h1>
      <p className="mt-2 text-sm text-ink-soft">Versión {doc.version} · Actualizada el {doc.updated}</p>
      <p className="mt-6 leading-relaxed">{doc.intro}</p>
      {doc.sections.map(section => (
        <section key={section.title} className="mt-8">
          <h2 className="text-xl font-semibold text-navy-700">{section.title}</h2>
          {section.paragraphs.map(p => <p key={p} className="mt-3 leading-relaxed">{p}</p>)}
          {section.items && <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
        </section>
      ))}
      <p className="mt-10"><Link className="font-semibold text-navy-700 underline" href={related.href}>{related.label}</Link></p>
    </article>
  );
}
