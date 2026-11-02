import { Fragment } from "react";

/**
 * Renders plain text where `**text**` marks emphasis. Content stays free of
 * HTML so it can be edited safely from the admin panel later.
 */
export function RichText({ text, strongClassName }: { text: string; strongClassName?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className={strongClassName ?? "font-semibold text-navy-700"}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
