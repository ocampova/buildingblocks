import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Lleva al proyecto de la persona; si tiene varios, a la lista. */
export default async function Home() {
  const user = await requireUser();
  const members = await prisma.member.findMany({ where: { userId: user.id, active: true }, select: { projectId: true } });
  if (members.length === 1) redirect(`/p/${members[0].projectId}`);
  redirect("/proyectos");
}
