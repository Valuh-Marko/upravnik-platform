"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useMyTickets, useAllTickets } from "@/hooks/useTickets";
import { UserMenu } from "@/components/UserMenu";
import { Megaphone, MessagesSquare, Ticket, MessageSquare } from "lucide-react";
import { formatTimestamp } from "@/lib/format";
import type { TicketStatus, TicketCategory } from "@/lib/types";

const categoryLabel: Record<TicketCategory, string> = {
  GENERAL: "Opšte",
  MAINTENANCE: "Održavanje",
  COMPLAINT: "Žalba",
  PAYMENT: "Plaćanje",
  REQUEST: "Zahtjev",
};

const statusClass: Record<TicketStatus, string> = {
  OPEN: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-stone-100 text-stone-500",
};

const statusLabel: Record<TicketStatus, string> = {
  OPEN: "Otvoreno",
  CLOSED: "Zatvoreno",
};

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function ResidentTicketsPanel() {
  const { data: tickets } = useMyTickets();

  const unreadCount = (tickets ?? []).filter((t) => t.isUnread).length;
  const recent = [...(tickets ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 uppercase tracking-[0.06em]">
          Moji zahtjevi
          <UnreadBadge count={unreadCount} />
        </span>
        <Link
          href="/tickets"
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Vidi sve
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1 py-2">Nemate zahtjeva.</p>
      ) : (
        <div className="space-y-1">
          {recent.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="block rounded-md px-2 py-2 hover:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusClass[t.status]}`}>
                  {statusLabel[t.status]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {categoryLabel[t.category]}
                </span>
              </div>
              <p className="text-xs font-medium text-foreground truncate flex items-center gap-1">
                {t.isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                {t.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatTimestamp(t.createdAt)}
                </span>
                {t._count !== undefined && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
                    <MessageSquare className="w-3 h-3" />
                    {t._count.replies}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function RightPanel() {
  const { user } = useAuth();
  const { data: allTickets } = useAllTickets();

  const threadHref =
    user?.accountType === "UNIT_ACCOUNT" ? "/forum" : "/threads";
  const canManageAnnouncements =
    user?.role === "UPRAVNIK" || user?.role === "BOARD_MEMBER";
  const isResident = user?.accountType === "UNIT_ACCOUNT";

  const staffUnread = !isResident
    ? (allTickets ?? []).filter((t) => t.isUnread).length
    : 0;

  return (
    <aside className="hidden xl:flex flex-col py-6">
      <UserMenu />

      <nav className="space-y-1 mt-4 mb-4">
        <Link
          href={threadHref}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-base text-muted-foreground hover:bg-stone-100 hover:text-stone-900 transition-colors"
        >
          <MessagesSquare className="w-4 h-4" />
          Moje teme
        </Link>
        {!isResident && (
          <Link
            href="/tickets"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-base text-muted-foreground hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <Ticket className="w-4 h-4" />
            Zahtjevi
            <UnreadBadge count={staffUnread} />
          </Link>
        )}
        {canManageAnnouncements && (
          <Link
            href="/announcements"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-base text-muted-foreground hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <Megaphone className="w-4 h-4" />
            Moje objave
          </Link>
        )}
      </nav>

      {isResident && <ResidentTicketsPanel />}
    </aside>
  );
}
