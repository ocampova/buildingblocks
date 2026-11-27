import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { OrderForm } from "@/components/order-form";
import { PageHeader } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { requireMember } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/format";
import { createOrder } from "@/lib/order-actions";

export const metadata: Metadata = { title: "Nuevo pedido" };

export default async function NewOrder({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await requireMember(projectId);
  const stages = await prisma.stage.findMany({ where: { projectId, kind: "OBRA" }, orderBy: { position: "asc" }, select: { id: true, name: true } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Nuevo pedido"
        description="Qué materiales necesita, cuánto y para cuándo."
        action={
          <Link href={`/p/${projectId}/pedidos`} aria-label="Cancelar y volver a pedidos" className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-sunken">
            <X className="size-6" aria-hidden />
          </Link>
        }
      />
      <OrderForm projectId={projectId} stages={stages} today={todayKey()} aiEnabled={aiAvailable()} action={createOrder.bind(null, projectId)} />
    </div>
  );
}
