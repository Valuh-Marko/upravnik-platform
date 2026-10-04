"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useBuildings } from "@/hooks/useBuildings";
import { useComplexes } from "@/hooks/useComplexes";
import { useMyTickets } from "@/hooks/useTickets";
import {
  Home,
  LayoutDashboard,
  Building2,
  Megaphone,
  MessagesSquare,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronRight,
  Users,
  Ticket,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Building } from "@/lib/types";

const residentNav = [
  { href: "/home", label: "Početna", icon: Home },
  { href: "/board", label: "Oglasna tabla", icon: Megaphone },
  { href: "/forum", label: "Forum", icon: MessagesSquare },
  { href: "/tickets", label: "Zahtevi", icon: Ticket },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/finances", label: "Finansije", icon: Wallet },
  { href: "/documents", label: "Dokumenta", icon: FileText },
];

const buildingSubNav = [
  { key: "board", label: "Oglasna tabla", icon: Megaphone },
  { key: "forum", label: "Forum", icon: MessagesSquare },
  { key: "tickets", label: "Zahtevi", icon: Ticket },
  { key: "members", label: "Stanari", icon: Users },
  { key: "finances", label: "Finansije", icon: Wallet },
  { key: "documents", label: "Dokumenta", icon: FileText },
];

const aggregateNav = [
  { href: "/announcements", label: "Oglasna tabla", icon: Megaphone },
  { href: "/threads", label: "Forum", icon: MessagesSquare },
  { href: "/tickets", label: "Zahtevi", icon: Ticket },
  { href: "/files", label: "Dokumenta", icon: FileText },
];

function BrandMark() {
  return (
    <span className="inline-flex items-center gap-3">
      <svg
        width="34"
        height="34"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <rect x="2" y="2" width="44" height="44" rx="12" fill="var(--brand)" />
        <g
          fill="none"
          stroke="var(--on-brand)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 38V17l10-5 10 5v21" />
          <path d="M10 38h28" />
          <rect x="18.5" y="25.5" width="4" height="4" rx="1" />
          <rect x="25.5" y="25.5" width="4" height="4" rx="1" />
          <path d="M20 21h0M28 21h0" />
          <path d="M22 38v-5.5a2 2 0 0 1 4 0V38" />
        </g>
      </svg>
      <span className="flex flex-col" style={{ lineHeight: 1.05 }}>
        <span className="text-[11px] font-medium tracking-[0.06em] uppercase text-stone-500">
          Profesionalni
        </span>
        <span className="text-[17px] font-bold tracking-[-0.02em] text-stone-900">
          Upravnik
        </span>
      </span>
    </span>
  );
}

function NavItemLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  description,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  badge?: number;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 rounded-[12px] text-[13px] transition-[background,color] duration-[140ms]",
        description ? "min-h-[48px] py-2" : "min-h-[40px]",
        active
          ? "bg-pine-50 text-pine-700 font-semibold"
          : "text-stone-600 font-medium hover:bg-stone-100 hover:text-stone-900",
      )}
    >
      <span
        className={cn(
          "inline-flex shrink-0",
          active ? "text-pine-600" : "text-stone-500",
        )}
      >
        <Icon size={18} />
      </span>
      <span className="flex-1 flex flex-col min-w-0">
        <span>{label}</span>
        {description && (
          <span className="text-[11px] font-normal text-stone-400 leading-snug mt-0.5">
            {description}
          </span>
        )}
      </span>
      {badge != null && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none",
            active ? "bg-pine-600 text-primary-foreground" : "bg-stone-200 text-stone-600",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function BuildingItem({
  building,
  expanded,
  onToggle,
  pathname,
}: {
  building: Building;
  expanded: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const isBuildingActive = pathname.startsWith(`/buildings/${building.id}`);
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-3 min-h-[40px] rounded-[12px] text-[13px] font-medium transition-[background,color] duration-[140ms] text-left",
          isBuildingActive
            ? "text-stone-900"
            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
        )}
      >
        <span
          className={cn(
            "inline-flex shrink-0",
            isBuildingActive ? "text-pine-600" : "text-stone-500",
          )}
        >
          <Building2 size={18} />
        </span>
        <span className="flex-1 truncate">{building.name}</span>
        <span className="text-stone-400 shrink-0">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {expanded && (
        <div className="ml-4 border-l border-[var(--border)] pl-2 mb-1 flex flex-col gap-1">
          {buildingSubNav.map(({ key, label, icon: Icon }) => {
            const href = `/buildings/${building.id}/${key}`;
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <NavItemLink
                key={key}
                href={href}
                label={label}
                icon={Icon}
                active={isActive}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: buildings } = useBuildings();
  const { data: complexes } = useComplexes();
  const isResident = user?.accountType === "UNIT_ACCOUNT";
  const building = buildings?.[0];
  const { data: myTickets } = useMyTickets();
  const unreadTicketCount = isResident
    ? (myTickets ?? []).filter((t) => t.isUnread).length
    : 0;

  const activeBuildingId = pathname.match(/^\/buildings\/([^/]+)/)?.[1] ?? null;
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(activeBuildingId);
  const [prevActiveBuildingId, setPrevActiveBuildingId] = useState<string | null>(activeBuildingId);

  if (activeBuildingId && activeBuildingId !== prevActiveBuildingId) {
    setPrevActiveBuildingId(activeBuildingId);
    setExpandedBuilding(activeBuildingId);
  }

  const { complexGroups, standaloneBuildings } = useMemo(() => {
    if (!buildings) return { complexGroups: [], standaloneBuildings: [] };

    const groupMap = new Map<string, { id: string; name: string; buildings: Building[] }>();
    const standaloneBuildings: Building[] = [];

    for (const b of buildings) {
      if (b.complexId) {
        const complex = complexes?.find((c) => c.id === b.complexId);
        if (complex) {
          if (!groupMap.has(complex.id)) {
            groupMap.set(complex.id, { id: complex.id, name: complex.name, buildings: [] });
          }
          groupMap.get(complex.id)!.buildings.push(b);
        } else {
          standaloneBuildings.push(b);
        }
      } else {
        standaloneBuildings.push(b);
      }
    }

    return { complexGroups: Array.from(groupMap.values()), standaloneBuildings };
  }, [buildings, complexes]);

  function toggleBuilding(id: string) {
    setExpandedBuilding((prev) => (prev === id ? null : id));
  }

  return (
    <aside className="hidden md:flex flex-col h-full py-3">
      <div className="flex flex-col h-full overflow-hidden bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-sm p-3">
        {/* Brand */}
        <div className="px-2 pb-3">
          <BrandMark />
          {isResident && (
            <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-stone-500">
                Zgrada
              </p>
              <p className="text-[13px] font-semibold text-stone-900 mt-0.5">
                {building ? `${building.name} / ${user?.username ?? ""}` : "—"}
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 flex flex-col">
          <div className="h-[85vh] overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col gap-1">
            {isResident ? (
              <>
                {residentNav.map(({ href, label, icon: Icon }) => {
                  const isActive =
                    pathname === href || pathname.startsWith(href + "/");
                  const badge =
                    href === "/tickets" && unreadTicketCount > 0
                      ? unreadTicketCount
                      : undefined;
                  return (
                    <NavItemLink
                      key={href}
                      href={href}
                      label={label}
                      icon={Icon}
                      active={isActive}
                      badge={badge}
                    />
                  );
                })}
                {building?.complexId && (
                  <>
                    <div className="my-1 border-t border-[var(--border)]" />
                    <NavItemLink
                      href={`/complexes/${building.complexId}/forum`}
                      label="Forum kompleksa"
                      icon={MessagesSquare}
                      active={pathname.startsWith(`/complexes/${building.complexId}/forum`)}
                      description="Diskusije svih stanara kompleksa"
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <NavItemLink
                  href="/dashboard"
                  label="Početna"
                  icon={LayoutDashboard}
                  active={pathname === "/dashboard"}
                />

                {buildings && buildings.length > 0 && (
                  <div className="pt-3 flex flex-col gap-1">
                    <p className="px-3 pb-1 text-[11px] font-semibold text-stone-500 uppercase tracking-[0.06em]">
                      Zgrade
                    </p>

                    {/* Buildings grouped under their complex */}
                    {complexGroups.map(({ id, name, buildings: groupBuildings }) => (
                      <div key={id}>
                        <p className="px-3 pt-1 pb-0.5 text-[11px] font-medium text-stone-400 uppercase tracking-[0.05em]">
                          {name}
                        </p>
                        {groupBuildings.map((b) => (
                          <BuildingItem
                            key={b.id}
                            building={b}
                            expanded={expandedBuilding === b.id}
                            onToggle={() => toggleBuilding(b.id)}
                            pathname={pathname}
                          />
                        ))}
                      </div>
                    ))}

                    {/* Standalone buildings (no complex) */}
                    {standaloneBuildings.map((b) => (
                      <BuildingItem
                        key={b.id}
                        building={b}
                        expanded={expandedBuilding === b.id}
                        onToggle={() => toggleBuilding(b.id)}
                        pathname={pathname}
                      />
                    ))}
                  </div>
                )}

                <div className="py-2">
                  <div className="border-t border-[var(--border)]" />
                </div>

                {aggregateNav.map(({ href, label, icon: Icon }) => {
                  const isActive =
                    pathname === href || pathname.startsWith(href + "/");
                  return (
                    <NavItemLink
                      key={href}
                      href={href}
                      label={label}
                      icon={Icon}
                      active={isActive}
                    />
                  );
                })}
                {complexGroups.length > 0 && (
                  <>
                    <div className="my-1 border-t border-[var(--border)]" />
                    {complexGroups.map(({ id, name }) => (
                      <NavItemLink
                        key={id}
                        href={`/complexes/${id}/forum`}
                        label="Forum kompleksa"
                        icon={MessagesSquare}
                        active={pathname.startsWith(`/complexes/${id}/forum`)}
                        description={name}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
}
