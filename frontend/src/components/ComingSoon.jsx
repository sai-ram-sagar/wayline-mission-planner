/**
 * Placeholder for a route whose page lands in a later phase. Kept explicit so
 * a partially-built dev branch never shows a blank screen.
 */
export default function ComingSoon({ title, phase, children }) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="panel max-w-md p-6 text-center">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{children}</p>
        <p className="mt-4 text-xs uppercase tracking-wide text-slate-600">Arrives in {phase}</p>
      </div>
    </div>
  );
}
