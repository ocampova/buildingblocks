import { FileSpreadsheet } from "lucide-react";
import { cx } from "./ui";

/** Descarga el Excel de gastos y cuentas (para el contador). */
export function ExportButton({ projectId, className }: { projectId: string; className?: string }) {
  return (
    <a
      href={`/api/p/${projectId}/exportar`}
      download
      className={cx(
        "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-line-strong bg-surface px-4 text-[15px] font-semibold text-ink transition-colors hover:border-ink-3 hover:bg-sunken/60",
        className,
      )}
    >
      <FileSpreadsheet className="size-[18px] text-ok" aria-hidden />
      <span className="sm:hidden">Excel</span>
      <span className="hidden sm:inline">Descargar Excel</span>
    </a>
  );
}
