import Link from "next/link";
import { Settings } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { cx } from "@/components/ui";
import { requireMember, seesPartnerAccounts } from "@/lib/auth";
import { getLedger } from "@/lib/data";
import { crc } from "@/lib/format";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const member = await requireMember(projectId);
  const showCash = seesPartnerAccounts(member.role);
  const cash = showCash ? (await getLedger(projectId)).ledger.cash.balance : 0;
  const low = showCash && cash < member.project.cashMinimum;

  return (
    <div className="min-h-dvh lg:pl-64">
      <AppNav projectId={projectId} projectName={member.project.name} role={member.role} userName={member.user.name} />

      {/* Celular: barra superior */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex min-h-14 max-w-xl items-center gap-3 px-4 py-1.5">
          <p className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-tight tracking-[-0.01em]">{member.project.name}</p>
          {showCash && (
            <Link
              href={`/p/${projectId}/cuentas#caja`}
              className={cx(
                "tnum inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold",
                low ? "bg-warn-soft text-warn" : "bg-caja-soft text-caja",
              )}
            >
              <span aria-hidden className="size-2 rounded-full bg-current" />
              <span className="sr-only">Caja chica:</span>
              {crc(cash)}
            </Link>
          )}
          <Link href={`/p/${projectId}/ajustes`} aria-label="Ajustes" className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-sunken">
            <Settings className="size-[21px]" strokeWidth={1.9} />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pb-32 pt-4 lg:max-w-6xl lg:px-10 lg:pb-16 lg:pt-8">{children}</main>
    </div>
  );
}
