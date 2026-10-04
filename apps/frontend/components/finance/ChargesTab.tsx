'use client'

import { useState } from 'react'
import { AlertTriangle, Pencil, Plus, ReceiptText } from 'lucide-react'
import { unitTypeLabel } from '@/app/(super-admin)/create/units'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocuments } from '@/hooks/useDocuments'
import {
  useChargesPreview,
  useCreateFeeRule,
  useFeeRules,
  useGenerateCharges,
  useUpdateFeeRule,
} from '@/hooks/useFinance'
import { financeFundLabel } from '@/lib/chips'
import { formatPeriod, formatRSD, parseMoneyInput, plural, todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChargeLineStatus, FeeMethod, FeeRule, FinanceFund, UnitType } from '@/lib/types'
import { ArrearsTable } from './Arrears'
import { Field, FormError, NativeSelect } from './form'
import { UnitLedgerSheet } from './UnitLedger'

const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500'
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/

const methodSuffix: Record<FeeMethod, string> = { PER_UNIT: 'po jedinici', PER_SQM: 'po m²' }

/** Staff "Zaduženja" tab: fee rules, monthly generation and per-unit balances. */
export function ChargesTab({ buildingId, canWrite }: { buildingId: string; canWrite: boolean }) {
  const [unitId, setUnitId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={eyebrow}>Pravila zaduženja</p>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              <FeeRuleDialog buildingId={buildingId} />
              <GenerateChargesDialog buildingId={buildingId} />
            </div>
          )}
        </div>
        <FeeRulesList buildingId={buildingId} canWrite={canWrite} />
      </section>

      <section className="space-y-2">
        <p className={eyebrow}>Stanje po stanovima</p>
        <ArrearsTable buildingId={buildingId} onOpen={setUnitId} />
      </section>

      <UnitLedgerSheet buildingId={buildingId} unitId={unitId} canWrite={canWrite} onClose={() => setUnitId(null)} />
    </div>
  )
}

function FeeRulesList({ buildingId, canWrite }: { buildingId: string; canWrite: boolean }) {
  const { data: rules, isLoading } = useFeeRules(buildingId)

  if (isLoading || !rules) return <Skeleton className="h-24 w-full rounded-lg" />
  if (rules.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Nema pravila. Dodajte iznos mesečnog zaduženja po fondu da biste mogli da izdajete zaduženja.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {rules.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {financeFundLabel[r.fund]}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {r.unitType ? unitTypeLabel[r.unitType] : 'Sve jedinice'}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Od {formatPeriod(r.validFrom)}
              {r.validTo ? ` do ${formatPeriod(r.validTo)}` : ''}
              {r.decisionDocument && ` · ${r.decisionDocument.title}`}
            </p>
          </div>
          <p className="text-sm font-mono tabular-nums text-foreground">
            {formatRSD(r.amount)} <span className="font-sans text-xs text-muted-foreground">{methodSuffix[r.method]}</span>
          </p>
          {canWrite && <FeeRuleDialog buildingId={buildingId} rule={r} />}
        </li>
      ))}
    </ul>
  )
}

function FeeRuleDialog({ buildingId, rule }: { buildingId: string; rule?: FeeRule }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    fund: 'TEKUCE_ODRZAVANJE' as FinanceFund,
    unitType: '' as UnitType | '',
    method: 'PER_UNIT' as FeeMethod,
    amount: '',
    validFrom: '',
    validTo: '',
    decisionDocumentId: '',
  })
  const { data: documents } = useDocuments(open ? buildingId : '')
  const create = useCreateFeeRule(buildingId)
  const update = useUpdateFeeRule(buildingId)
  const save = rule ? update : create
  const amount = parseMoneyInput(form.amount)
  const amountValid = amount !== null && !amount.startsWith('-')
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleOpen() {
    setForm({
      fund: rule?.fund ?? 'TEKUCE_ODRZAVANJE',
      unitType: rule?.unitType ?? '',
      method: rule?.method ?? 'PER_UNIT',
      amount: rule?.amount ?? '',
      validFrom: rule?.validFrom ?? todayISO().slice(0, 7),
      validTo: rule?.validTo ?? '',
      decisionDocumentId: rule?.decisionDocumentId ?? '',
    })
    create.reset()
    update.reset()
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amountValid) return
    const dto = {
      fund: form.fund,
      unitType: form.unitType || null,
      method: form.method,
      amount,
      validFrom: form.validFrom,
      validTo: form.validTo || null,
      decisionDocumentId: form.decisionDocumentId || null,
    }
    const done = { onSuccess: () => setOpen(false) }
    if (rule) update.mutate({ id: rule.id, dto }, done)
    else create.mutate(dto, done)
  }

  const valid = amountValid && PERIOD.test(form.validFrom) && (!form.validTo || PERIOD.test(form.validTo))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {rule ? (
        <Button size="xs" variant="ghost" onClick={handleOpen} aria-label="Izmeni pravilo">
          <Pencil />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={handleOpen}>
          <Plus />
          Pravilo
        </Button>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rule ? 'Izmena pravila' : 'Novo pravilo zaduženja'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="fr-fund" label="Fond">
            <NativeSelect id="fr-fund" value={form.fund} onChange={set('fund')}>
              {Object.entries(financeFundLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="fr-type" label="Važi za" hint="Pravilo za određeni tip ima prednost nad pravilom za sve jedinice.">
            <NativeSelect id="fr-type" value={form.unitType} onChange={set('unitType')}>
              <option value="">Sve jedinice</option>
              {Object.entries(unitTypeLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="fr-method" label="Obračun">
              <NativeSelect id="fr-method" value={form.method} onChange={set('method')}>
                <option value="PER_UNIT">Po jedinici</option>
                <option value="PER_SQM">Po m²</option>
              </NativeSelect>
            </Field>
            <Field id="fr-amount" label="Iznos (RSD)" hint="0 = oslobođeno">
              <Input
                id="fr-amount"
                inputMode="decimal"
                className="font-mono"
                value={form.amount}
                onChange={set('amount')}
                aria-invalid={form.amount !== '' && !amountValid}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="fr-from" label="Važi od">
              <Input id="fr-from" type="month" value={form.validFrom} onChange={set('validFrom')} />
            </Field>
            <Field id="fr-to" label="Važi do (opciono)">
              <Input id="fr-to" type="month" value={form.validTo} onChange={set('validTo')} />
            </Field>
          </div>
          <Field id="fr-doc" label="Odluka skupštine (opciono)">
            <NativeSelect id="fr-doc" value={form.decisionDocumentId} onChange={set('decisionDocumentId')}>
              <option value="">—</option>
              {documents?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <FormError error={save.error} />
          <DialogFooter>
            <Button type="submit" disabled={!valid || save.isPending} className="w-full sm:w-auto">
              {save.isPending ? 'Čuvanje…' : 'Sačuvaj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const lineStatus: Record<ChargeLineStatus, { label: string; className: string }> = {
  NEW: { label: 'novo', className: 'text-pine-700' },
  ISSUED: { label: 'izdato', className: 'text-muted-foreground' },
  CHANGED: { label: 'izmenjeno', className: 'text-[var(--warning-text)]' },
  CANCELLED: { label: 'stornirano', className: 'text-muted-foreground' },
}

function GenerateChargesDialog({ buildingId }: { buildingId: string }) {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState('')
  const validPeriod = PERIOD.test(period)
  const { data: preview, isFetching, error } = useChargesPreview(buildingId, open && validPeriod ? period : null)
  const generate = useGenerateCharges(buildingId)

  function handleOpen() {
    setPeriod(todayISO().slice(0, 7))
    generate.reset()
    setOpen(true)
  }

  const lines = preview?.units.flatMap((u) => u.lines) ?? []
  const newCount = lines.filter((l) => l.status === 'NEW').length
  const changedCount = lines.filter((l) => l.status === 'CHANGED' || l.status === 'CANCELLED').length
  const blocked = !preview?.canGenerate || (preview?.missingArea.length ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={handleOpen}>
        <ReceiptText />
        Izdaj zaduženja
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mesečno zaduženje</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="gc-period" label="Mesec">
            <Input
              id="gc-period"
              type="month"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value)
                generate.reset()
              }}
              className="w-48"
            />
          </Field>

          <FormError error={error} />

          {validPeriod && !preview && !error && <Skeleton className="h-40 w-full" />}

          {preview && (
            <>
              {preview.missingArea.length > 0 && (
                <p className="flex items-start gap-2 rounded-md bg-[var(--warning-subtle)] px-3 py-2 text-sm text-[var(--warning-text)]">
                  <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" aria-hidden="true" />
                  <span>
                    Nedostaje površina za: {preview.missingArea.join(', ')}. Unesite površinu pre izdavanja zaduženja po
                    m².
                  </span>
                </p>
              )}

              {preview.units.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nema pravila koja važe za {formatPeriod(preview.period)}.</p>
              ) : (
                <div className={cn('overflow-x-auto rounded-lg border border-border', isFetching && 'opacity-60')}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left font-medium px-3 py-2">Jedinica</th>
                        <th className="text-left font-medium px-3 py-2">Stavke</th>
                        <th className="text-right font-medium px-3 py-2">Ukupno</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.units.map((u) => (
                        <tr key={u.unitId} className="align-top">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {unitTypeLabel[u.type]} {u.unitNumber}
                            {u.areaSqm && <span className="block text-xs text-muted-foreground">{u.areaSqm} m²</span>}
                          </td>
                          <td className="px-3 py-2">
                            <ul className="space-y-0.5">
                              {u.lines.map((l) => (
                                <li key={l.fund} className="flex flex-wrap gap-x-2 text-xs">
                                  <span className="text-foreground">{financeFundLabel[l.fund]}</span>
                                  <span className="font-mono tabular-nums">
                                    {l.amount === null ? 'nema površine' : formatRSD(l.amount)}
                                  </span>
                                  {l.status === 'CHANGED' && l.issuedAmount && (
                                    <span className="font-mono tabular-nums text-muted-foreground line-through">
                                      {formatRSD(l.issuedAmount)}
                                    </span>
                                  )}
                                  <span className={lineStatus[l.status].className}>{lineStatus[l.status].label}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                            {formatRSD(u.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border font-semibold">
                        <td className="px-3 py-2" colSpan={2}>
                          Ukupno za {formatPeriod(preview.period)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                          {formatRSD(preview.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {generate.data && (
                <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                  Izdato {generate.data.issuedCount} {plural(generate.data.issuedCount, 'zaduženje', 'zaduženja', 'zaduženja')}
                  {generate.data.cancelledCount > 0 && `, stornirano ${generate.data.cancelledCount}`}. Vlasnici sa
                  nalogom su obavešteni.
                </p>
              )}
              <FormError error={generate.error} />
            </>
          )}
        </div>
        <DialogFooter className="gap-2">
          {changedCount > 0 && (
            <Button
              variant="outline"
              disabled={blocked || generate.isPending}
              onClick={() => generate.mutate({ period, regenerate: true })}
              className="w-full sm:w-auto"
            >
              Ponovni obračun ({changedCount})
            </Button>
          )}
          <Button
            disabled={!preview || blocked || newCount === 0 || generate.isPending}
            onClick={() => generate.mutate({ period, regenerate: false })}
            className="w-full sm:w-auto"
          >
            {generate.isPending ? 'Izdavanje…' : `Izdaj nova zaduženja (${newCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
