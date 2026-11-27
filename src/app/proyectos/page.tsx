import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Proyectos" };
export const dynamic = "force-dynamic";

const ROLE = { SOCIO: "Socio", ADMINISTRACION: "Administración", CONSTRUCTOR: "Constructor" } as const;

export default async function Projects() {
  const user = await requireUser();
  const members = await prisma.member.findMany({ where: { userId: user.id, active: true }, include: { project: true }, orderBy: { createdAt: "asc" } });
  return (
    <AuthShell title="Sus proyectos" subtitle={user.name}>
      {members.length === 0 ? (
        <p className="text-[15px] text-ink-2">Todavía no pertenece a ningún proyecto. Pídale a un socio que lo invite.</p>
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {members.map((m) => (
            <li key={m.id}>
              <Link href={`/p/${m.projectId}`} className="flex min-h-14 items-center justify-between gap-3 rounded-control px-2 hover:bg-sunken">
                <span>
                  <span className="block font-semibold">{m.project.name}</span>
                  <span className="text-[13.5px] text-ink-3">{ROLE[m.role]}</span>
                </span>
                <ChevronRight className="size-5 text-ink-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <form action="/salir" method="post" className="mt-6">
        <button className="text-[14px] font-semibold text-ink-2 underline">Salir</button>
      </form>
    </AuthShell>
  );
}
