'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Undo2 } from 'lucide-react'
import { encode } from 'uqr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useCancelCharge, useCreateAdjustment, useOpeningBalance, useUnitLedger } from '@/hooks/useFinance'
import { financeFundLabel, unitTypeLabel } from '@/lib/chips'
import { formatAccountNumber, formatDate, formatDateTime, formatPeriod, formatRSD, parseMoneyInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ipsPayload } from '@/lib/ips'
import type { LedgerEntry, UnitLedger } from '@/lib/types'
import { CopyButton, eyebrow, Field, financeCard as card, FormError, QueryError } from './form'

function entryLabel(e: LedgerEntry): string {
  if (e.kind === 'PAYMENT') return e.isReversal ? 'Storno uplate' : 'Uplata'
  if (e.type === 'OPENING') return 'Početno stanje'
  if (e.type === 'ADJUSTMENT') return e.description ?? 'Korekcija'
  return `${e.fund ? financeFundLabel[e.fund] : 'Zaduženje'} · ${formatPeriod(e.period)}`
}

/** Signed amount: "+1.000,00 RSD" raises the debt, "−2.500,00 RSD" lowers it. */
function signed(value: string): string {
  const n = Number(value)
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatRSD(String(Math.abs(n)))}`
}

function unitName(unit: UnitLedger['unit']): string {
  return `${unitTypeLabel[unit.type]} ${unit.unitNumber}`
}

/** NBS IPS QR code; always dark on white, whatever the theme, so every banking app can scan it. */
function IpsQr({ payload }: { payload: string }) {
  const qr = useMemo(() => {
    const { data } = encode(payload, { ecc: 'M', border: 2 })
    let d = ''
    data.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x} ${y}h1v1h-1z`)))
    return { d, size: data.length }
  }, [payload])
  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      role="img"
      aria-label="IPS QR kod za plaćanje"
      shapeRendering="crispEdges"
      className="size-44 rounded-md"
    >
      <rect width={qr.size} height={qr.size} fill="#fff" />
      <path d={qr.d} fill="#000" />
    </svg>
  )
}

/** A unit's balance, payment instructions and charge/payment timeline. */
export function UnitLedgerView({
  ledger,
  entryAction,
}: {
  ledger: UnitLedger
  entryAction?: (entry: LedgerEntry) => React.ReactNode
}) {
  const balance = Number(ledger.balance)
  const { payTo } = ledger
  // Entries are newest first.
  const lastPayment = ledger.entries.find((e) => e.kind === 'PAYMENT' && !e.isReversal)

  return (
    <div className="space-y-4">
      <section className={card}>
        <p className={eyebrow}>
          {unitTypeLabel[ledger.unit.type]} {ledger.unit.unitNumber}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {balance > 0 ? 'Dugovanje' : balance < 0 ? 'Pretplata' : 'Nema dugovanja'}
        </p>
        <p
          className={cn(
            'text-2xl font-semibold tracking-tight font-mono tabular-nums',
            balance > 0 ? 'text-foreground' : balance < 0 ? 'text-[var(--success-text)]' : 'text-muted-foreground'
          )}
        >
          {formatRSD(String(Math.abs(balance)))}
        </p>
        {balance === 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Sve obaveze su izmirene.
            {lastPayment && <> Poslednja uplata {formatDate(lastPayment.date)}.</>}
          </p>
        )}
        {Number(ledger.overdueAmount) > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-md bg-[var(--warning-subtle)] px-3 py-2 text-sm text-[var(--warning-text)]">
            <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" aria-hidden="true" />
            <span>
              Dospelo za plaćanje: <span className="font-mono">{formatRSD(ledger.overdueAmount)}</span>
              {ledger.overdueSince && <> (od {formatDate(ledger.overdueSince)})</>}
            </span>
          </p>
        )}
      </section>

      <section className={card}>
        <p className={eyebrow}>Podaci za uplatu</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Primalac</dt>
          <dd>{payTo.recipient}</dd>
          <dt className="text-muted-foreground">Račun</dt>
          <dd className="flex items-center gap-1">
            {payTo.accountNumber ? (
              <>
                <span className="font-mono">{formatAccountNumber(payTo.accountNumber)}</span>
                <CopyButton value={formatAccountNumber(payTo.accountNumber)} label="Kopiraj broj računa" />
              </>
            ) : (
              <span className="text-muted-foreground">Nije unet</span>
            )}
          </dd>
          <dt className="text-muted-foreground">Model</dt>
          <dd className="font-mono">{payTo.model}</dd>
          <dt className="text-muted-foreground">Poziv na broj</dt>
          <dd className="flex items-center gap-1">
            {payTo.reference ? (
              <>
                <span className="font-mono">{payTo.reference}</span>
                <CopyButton value={payTo.reference} label="Kopiraj poziv na broj" />
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          Rok plaćanja je {ledger.paymentTermDays} dana od izdavanja zaduženja.
        </p>
        {balance > 0 && payTo.accountNumber && (
          <div className="mt-4 flex flex-col items-center gap-2 border-t border-border pt-4">
            <IpsQr
              payload={ipsPayload({
                account: payTo.accountNumber,
                payee: payTo.recipient,
                amount: ledger.balance,
                purpose: `Zaduženje za ${unitName(ledger.unit)}`,
                model: payTo.model,
                reference: payTo.reference,
              })}
            />
            <p className="text-xs text-muted-foreground">
              Skenirajte u aplikaciji banke. Iznos u QR kodu:{' '}
              <span className="font-mono tabular-nums">{formatRSD(ledger.balance)}</span>
            </p>
          </div>
        )}
      </section>

      <section className={card}>
        <p className={eyebrow}>Promene</p>
        {ledger.entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nema zaduženja ni uplata.</p>
        ) : (
          <>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-mono">+</span> zaduženje · <span className="font-mono">−</span> uplata ili umanjenje
          </p>
          <ul className="mt-2 divide-y divide-border">
            {ledger.entries.map((e) => {
              const cancelled = e.kind === 'CHARGE' && !!e.cancelledAt
              return (
                <li key={`${e.kind}-${e.id}`} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn('text-sm text-foreground', cancelled && 'text-muted-foreground')}>
                        <span className={cn(cancelled && 'line-through')}>{entryLabel(e)}</span>
                        {cancelled && ' (stornirano)'}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={cn(
                          'text-sm font-mono tabular-nums',
                          cancelled
                            ? 'text-muted-foreground line-through'
                            : Number(e.amount) < 0
                              ? 'text-[var(--success-text)]'
                              : 'text-foreground'
                        )}
                      >
                        {signed(e.amount)}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-muted-foreground">
                        Saldo {formatRSD(e.balanceAfter)}
                      </p>
                    </div>
                  </div>
                  {cancelled && e.kind === 'CHARGE' && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Stornirano {formatDateTime(e.cancelledAt!)}
                      {e.cancelReason && `: ${e.cancelReason}`}
                    </p>
                  )}
                  {entryAction?.(e)}
                </li>
              )
            })}
          </ul>
          </>
        )}
      </section>
    </div>
  )
}

function LedgerSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}

/** Resident's "Moj stan" tab. */
export function MyUnitTab({ buildingId, unitId }: { buildingId: string; unitId: string }) {
  const { data: ledger, isLoading, error } = useUnitLedger(buildingId, unitId)
  if (error) return <FormError error={error} />
  if (isLoading || !ledger) return <LedgerSkeleton />
  return <UnitLedgerView ledger={ledger} />
}

/** Staff drawer with one unit's ledger; the upravnik also gets the correction tools. */
export function UnitLedgerSheet({
  buildingId,
  unitId,
  canWrite,
  onClose,
}: {
  buildingId: string
  unitId: string | null
  canWrite: boolean
  onClose: () => void
}) {
  const { data: ledger, isLoading, error, refetch } = useUnitLedger(buildingId, unitId)

  return (
    <Sheet open={!!unitId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{ledger ? `Kartica stana · ${unitName(ledger.unit)}` : 'Kartica stana'}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          {error && !ledger ? (
            <QueryError onRetry={refetch} />
          ) : isLoading || !ledger ? (
            <LedgerSkeleton />
          ) : (
            // Keyed so the forms reset when another unit opens.
            <SheetBody key={ledger.unit.id} buildingId={buildingId} ledger={ledger} canWrite={canWrite} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SheetBody({ buildingId, ledger, canWrite }: { buildingId: string; ledger: UnitLedger; canWrite: boolean }) {
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  // The correction forms stay folded away, one open at a time, so the ledger leads.
  const [tool, setTool] = useState<'opening' | 'adjustment' | null>(null)
  const cancel = useCancelCharge(buildingId)

  if (!canWrite) return <UnitLedgerView ledger={ledger} />

  const hasOpening = ledger.entries.some((e) => e.kind === 'CHARGE' && e.type === 'OPENING' && !e.cancelledAt)
  const toggle = (next: 'opening' | 'adjustment') => setTool((t) => (t === next ? null : next))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {!hasOpening && (
          <Button size="sm" variant="outline" aria-expanded={tool === 'opening'} onClick={() => toggle('opening')}>
            Početno stanje
          </Button>
        )}
        <Button size="sm" variant="outline" aria-expanded={tool === 'adjustment'} onClick={() => toggle('adjustment')}>
          Korekcija
        </Button>
      </div>
      {tool === 'opening' && !hasOpening && (
        <OpeningBalanceForm buildingId={buildingId} unitId={ledger.unit.id} unit={unitName(ledger.unit)} />
      )}
      {tool === 'adjustment' && (
        <AdjustmentForm
          buildingId={buildingId}
          unitId={ledger.unit.id}
          unit={unitName(ledger.unit)}
          onDone={() => setTool(null)}
        />
      )}
      <UnitLedgerView
        ledger={ledger}
        entryAction={(e) => {
          if (e.kind !== 'CHARGE' || e.cancelledAt) return null
          if (cancelId !== e.id) {
            return (
              <Button
                size="xs"
                variant="ghost"
                className="mt-1"
                onClick={() => {
                  setCancelId(e.id)
                  setReason('')
                  cancel.reset()
                }}
              >
                <Undo2 />
                Storniraj
              </Button>
            )
          }
          return (
            <form
              className="mt-2 space-y-2"
              onSubmit={(ev) => {
                ev.preventDefault()
                cancel.mutate({ id: e.id, reason: reason.trim() }, { onSuccess: () => setCancelId(null) })
              }}
            >
              <Input
                aria-label="Razlog storniranja"
                placeholder="Razlog storniranja…"
                value={reason}
                onChange={(ev) => setReason(ev.target.value)}
                autoFocus
              />
              <FormError error={cancel.error} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="destructive" disabled={!reason.trim() || cancel.isPending}>
                  {cancel.isPending ? 'Storniranje…' : 'Storniraj zaduženje'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setCancelId(null)}>
                  Odustani
                </Button>
              </div>
            </form>
          )
        }}
      />
    </div>
  )
}

function OpeningBalanceForm({ buildingId, unitId, unit }: { buildingId: string; unitId: string; unit: string }) {
  const [amount, setAmount] = useState('')
  const save = useOpeningBalance(buildingId)
  const parsed = parseMoneyInput(amount)
  const valid = parsed && Number(parsed) !== 0

  return (
    <form
      className={cn(card, 'space-y-3')}
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) save.mutate({ unitId, amount: parsed })
      }}
    >
      <p className={eyebrow}>Početno stanje</p>
      <Field
        id="ob-amount"
        label="Dug na dan početka evidencije (RSD)"
        hint="Npr. 12.500,00. Unosi se jednom po stanu. Negativan iznos je pretplata."
      >
        <Input
          id="ob-amount"
          inputMode="decimal"
          className="font-mono"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={amount !== '' && !parsed}
        />
      </Field>
      {valid && (
        <p className="text-sm text-foreground">
          Početno stanje <span className="font-mono tabular-nums">{signed(parsed)}</span> za {unit} — stanar će ga
          videti.
        </p>
      )}
      <FormError error={save.error} />
      <Button type="submit" size="sm" variant="outline" disabled={!valid || save.isPending}>
        {save.isPending ? 'Čuvanje…' : 'Unesi početno stanje'}
      </Button>
    </form>
  )
}

function AdjustmentForm({
  buildingId,
  unitId,
  unit,
  onDone,
}: {
  buildingId: string
  unitId: string
  unit: string
  onDone: () => void
}) {
  const [form, setForm] = useState({ amount: '', description: '' })
  const create = useCreateAdjustment(buildingId)
  const parsed = parseMoneyInput(form.amount)
  const valid = parsed && Number(parsed) !== 0 && form.description.trim()

  return (
    <form
      className={cn(card, 'space-y-3')}
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        create.mutate(
          { unitId, amount: parsed, description: form.description.trim() },
          { onSuccess: onDone }
        )
      }}
    >
      <p className={eyebrow}>Korekcija</p>
      <Field id="adj-amount" label="Iznos (RSD)" hint="Npr. 2.500,00. Pozitivan iznos povećava dug, negativan ga smanjuje.">
        <Input
          id="adj-amount"
          inputMode="decimal"
          className="font-mono"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          aria-invalid={form.amount !== '' && !parsed}
        />
      </Field>
      <Field id="adj-desc" label="Opis">
        <Input
          id="adj-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Npr. Popravka interfona"
        />
      </Field>
      {valid && (
        <p className="text-sm text-foreground">
          Korekcija <span className="font-mono tabular-nums">{signed(parsed)}</span> za {unit} — stanar će je videti.
        </p>
      )}
      <FormError error={create.error} />
      <Button type="submit" size="sm" variant="outline" disabled={!valid || create.isPending}>
        {create.isPending ? 'Čuvanje…' : 'Dodaj korekciju'}
      </Button>
    </form>
  )
}
