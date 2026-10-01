"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useMyTickets, useAllTickets } from "@/hooks/useTickets";
import { UserMenu } from "@/components/UserMenu";
import { Megaphone, MessagesSquare, Ticket, MessageSquare } from "lucide-react";
import { formatTimestamp } from "@/lib/format";
import { ticketCategory, ticketStatus } from "@/lib/chips";

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
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
          Moji zahtevi
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
        <p className="text-xs text-muted-foreground px-1 py-2">Nemate zahteva.</p>
      ) : (
        <div className="space-y-1">
          {recent.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="block rounded-md px-2 py-2 hover:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ticketStatus[t.status].className}`}>
                  {ticketStatus[t.status].label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {ticketCategory[t.category].label}
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
    <aside className="hidden xl:flex flex-col h-full min-h-0 py-3">
      <div className="flex flex-col h-full overflow-y-auto bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-sm p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="pb-3 border-b border-[var(--border)]">
          <UserMenu />
        </div>

        <nav className="space-y-1 mt-3 mb-4">
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
              Zahtevi
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
      </div>
    </aside>
  );
}
