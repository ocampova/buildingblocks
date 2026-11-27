import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { ExpenseForm } from "@/components/expense-form";
import { PageHeader } from "@/components/ui";
import { requireMoneyMember } from "@/lib/auth";
import { getPartners } from "@/lib/data";
import { prisma } from "@/lib/db";
import { createExpense } from "@/lib/expense-actions";
import { todayKey } from "@/lib/format";
import { aiAvailable } from "@/lib/receipt-ai";

export const metadata: Metadata = { title: "Registrar gasto" };

export default async function NewExpense({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const member = await requireMoneyMember(projectId);
  const [partners, stages] = await Promise.all([
    getPartners(projectId),
    prisma.stage.findMany({ where: { projectId }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Registrar gasto"
        action={
          <Link href={`/p/${projectId}`} aria-label="Cancelar y volver al inicio" className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-sunken">
            <X className="size-6" aria-hidden />
          </Link>
        }
      />
      <ExpenseForm
        projectId={projectId}
        partners={partners.map((p) => ({ id: p.id, name: p.user.name, color: p.color }))}
        stages={stages}
        defaultPayer={member.role === "SOCIO" ? `socio:${member.id}` : undefined}
        today={todayKey()}
        aiEnabled={aiAvailable()}
        action={createExpense.bind(null, projectId)}
      />
    </div>
  );
}
