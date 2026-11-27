import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export default function NotFound() {
  return (
    <AuthShell title="No se encontró" subtitle="Esa página no existe o no tiene acceso a ella.">
      <Link href="/" className="inline-flex min-h-11 items-center rounded-control bg-brand px-4 font-semibold text-white">Ir al inicio</Link>
    </AuthShell>
  );
}
