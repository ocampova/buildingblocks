import type { Metadata } from "next";
import { ContractCard, ContractForm } from "@/components/contract-bits";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { requireMoneyMember } from "@/lib/auth";
import { createContract } from "@/lib/contract-actions";
import { getContracts } from "@/lib/data";
import { prisma } from "@/lib/db";
import { crc } from "@/lib/format";

export const metadata: Metadata = { title: "Contratos" };

export default async function Contracts({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await requireMoneyMember(projectId);
  const [contracts, stages] = await Promise.all([getContracts(projectId), prisma.stage.findMany({ where: { projectId }, orderBy: { position: "asc" }, select: { id: true, name: true } })]);
  const total = contracts.reduce((s, c) => s + c.summary.total, 0);
  const balance = contracts.reduce((s, c) => s + c.summary.balance, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Contratos"
        description={contracts.length ? <span className="tnum">Falta pagar {crc(balance)} de {crc(total)} contratados con adicionales.</span> : "Lo contratado con el constructor y otros, con sus adicionales y abonos."}
      />
      {contracts.length === 0 ? (
        <EmptyState title="Todavía no hay contratos">Cuando tengan el monto del constructor, regístrelo aquí. Después se agregan las obras adicionales y cada abono.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {contracts.map((c) => (
            <ContractCard key={c.id} projectId={projectId} c={c} />
          ))}
        </div>
      )}
      <SectionTitle>Nuevo contrato</SectionTitle>
      <Card className="p-4 sm:p-5">
        <ContractForm action={createContract.bind(null, projectId)} stages={stages} submitLabel="Crear contrato" />
      </Card>
    </div>
  );
}
