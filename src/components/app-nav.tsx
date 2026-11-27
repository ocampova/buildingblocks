"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChartColumnBig, ClipboardList, House, Plus, ReceiptText, Scale, Settings, Truck } from "lucide-react";

import { cx } from "./ui";

type Item = { href: string; label: string; icon: typeof House; exact?: boolean };

export function AppNav({ projectId, projectName, role, userName }: { projectId: string; projectName: string; role: string; userName: string }) {
  const path = usePathname();
  const ver = useSearchParams().get("ver");
  const base = `/p/${projectId}`;
  const money = role !== "CONSTRUCTOR";
  const items: Item[] = [
    { href: base, label: "Inicio", icon: House, exact: true },
    { href: `${base}/pedidos`, label: "Pedidos", icon: ClipboardList },
    ...(money ? [{ href: `${base}/gastos`, label: "Gastos", icon: ReceiptText }] : []),
    ...(money ? [{ href: `${base}/cuentas`, label: "Cuentas", icon: Scale }] : []),
    // El constructor no ve gastos ni el resumen de lo gastado
    ...(money ? [{ href: `${base}/resumen`, label: "Resumen", icon: ChartColumnBig }] : []),
  ];
  // En el celular, Resumen vive en el riel de la computadora y en el inicio
  // El constructor tiene menos secciones: Ajustes completa la barra para que el botón quede al centro
  const tabs = money
    ? items.filter((i) => i.label !== "Resumen")
    : [items[0], items[1], { href: `${base}/pedidos?ver=comprados`, label: "Por llegar", icon: Truck }, { href: `${base}/ajustes`, label: "Ajustes", icon: Settings }];
  const newPaths = [`${base}/gastos/nuevo`, `${base}/pedidos/nuevo`];
  const active = (i: Item) => {
    if (i.href.includes("?")) return path === i.href.split("?")[0] && `?ver=${ver}` === "?" + i.href.split("?")[1];
    if (i.exact) return path === i.href;
    // "Pedidos" no se marca cuando el constructor está en "Por llegar"
    if (!money && i.href === `${base}/pedidos` && ver === "comprados") return false;
    return path.startsWith(i.href) && !newPaths.some((n) => path.startsWith(n));
  };
  // El botón principal: el constructor pide materiales; los demás registran gastos
  const registerHref = money ? `${base}/gastos/nuevo` : `${base}/pedidos/nuevo`;
  const registerLabel = money ? "Registrar gasto" : "Nuevo pedido";
  const registering = newPaths.some((n) => path.startsWith(n));

  return (
    <>
      {/* Computadora: riel lateral */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 pb-4 pt-6">
          <p className="text-balance text-[17px] font-semibold leading-snug tracking-[-0.01em]">{projectName}</p>
        </div>
        <div className="px-4 pb-3">
            <Link
              href={registerHref}
              className={cx(
                "flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-4 text-[15px] font-semibold text-white shadow-raise transition-colors hover:bg-brand-strong",
                registering && "bg-brand-strong",
              )}
            >
              <Plus className="size-5" strokeWidth={2.4} aria-hidden />
              {registerLabel}
            </Link>
        </div>
        <nav aria-label="Principal" className="flex-1 space-y-0.5 px-3">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active(i) ? "page" : undefined}
              className={cx(
                "flex min-h-11 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors",
                active(i) ? "bg-brand-soft text-brand-strong" : "text-ink-2 hover:bg-sunken hover:text-ink",
              )}
            >
              <i.icon className="size-[19px]" strokeWidth={active(i) ? 2.3 : 1.9} aria-hidden />
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line px-3 py-3">
          <Link
            href={`${base}/ajustes`}
            aria-current={path.startsWith(`${base}/ajustes`) ? "page" : undefined}
            className={cx(
              "flex min-h-11 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors",
              path.startsWith(`${base}/ajustes`) ? "bg-brand-soft text-brand-strong" : "text-ink-2 hover:bg-sunken hover:text-ink",
            )}
          >
            <Settings className="size-[19px]" strokeWidth={1.9} aria-hidden />
            Ajustes
          </Link>
          <p className="truncate px-3 pt-2 text-[13px] text-ink-3">{userName}</p>
        </div>
      </aside>

      {/* Celular: barra inferior con el botón de registrar al centro. Se oculta mientras se registra un gasto. */}
      <nav aria-label="Principal" hidden={registering} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1">
          {tabs.slice(0, 2).map((i) => (
            <TabItem key={i.href} item={i} active={active(i)} />
          ))}
          <li className="flex flex-1 justify-center">
              <Link
                href={registerHref}
                aria-label={registerLabel}
                className="-mt-5 grid size-[60px] place-items-center rounded-full bg-brand text-white shadow-float ring-4 ring-ground transition-transform active:scale-95"
              >
                <Plus className="size-7" strokeWidth={2.4} aria-hidden />
              </Link>
          </li>
          {tabs.slice(2).map((i) => (
            <TabItem key={i.href} item={i} active={active(i)} />
          ))}
        </ul>
      </nav>
    </>
  );
}

function TabItem({ item, active }: { item: Item; active: boolean }) {
  return (
    <li className="flex flex-1">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cx("flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[11.5px] font-semibold", active ? "text-brand" : "text-ink-3")}
      >
        <item.icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.9} aria-hidden />
        {item.label}
      </Link>
    </li>
  );
}
