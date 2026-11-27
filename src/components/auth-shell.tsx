import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-ground">
      <div className="guilloche h-28 border-b border-brand/10 bg-brand-soft/60 lg:h-36" />
      <div className="mx-auto -mt-12 w-full max-w-[420px] flex-1 px-4 pb-10">
        <div className="rounded-card border border-line bg-surface p-6 shadow-raise sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="size-11" />
            <div>
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
              {subtitle && <p className="text-[14.5px] text-ink-2">{subtitle}</p>}
            </div>
          </div>
          {children}
        </div>
        {footer && <div className="mt-5 text-center text-[13.5px] text-ink-3">{footer}</div>}
      </div>
    </main>
  );
}
