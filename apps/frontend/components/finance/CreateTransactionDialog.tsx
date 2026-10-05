'use client'

import { useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCreateTransaction, useFinance, useFinanceCategories, useInvoices } from '@/hooks/useFinance'
import { useUnits } from '@/hooks/useUnits'
import { unitTypeLabel } from '@/lib/chips'
import { formatAccountNumber, formatRSD, parseMoneyInput, toParas, todayISO } from '@/lib/format'
import type { FinanceDirection, Invoice } from '@/lib/types'
import { Field, FormError, guardDirty, NativeSelect, NoAccountHint, Segmented } from './form'

const EMPTY = {
  bankAccountId: '',
  categoryId: '',
  amount: '',
  valueDate: '',
  description: '',
  counterpartyName: '',
  counterpartyAccount: '',
  reference: '',
  unitId: '',
  invoiceId: '',
  invoiceAmount: '',
}

// An owner payment saved on purpose without a unit, to be sorted out later.
const UNKNOWN_UNIT = 'unknown'

/** A new transaction. With `payInvoice` it opens as an expense paying that invoice's open amount. */
export function CreateTransactionDialog({ buildingId, payInvoice }: { buildingId: string; payInvoice?: Invoice }) {
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState<FinanceDirection>('INCOME')
  const [form, setForm] = useState(EMPTY)
  // The form as opened. Every edit makes a new object, so `form !== start` means the user changed something.
  const [start, setStart] = useState(EMPTY)
  const create = useCreateTransaction(buildingId)
  const { data: overview } = useFinance(buildingId)
  const { data: categories } = useFinanceCategories(buildingId, open)
  const { data: units } = useUnits(open ? buildingId : '')
  const { data: invoices } = useInvoices(buildingId, {}, open && direction === 'EXPENSE')

  const finance = overview?.configured ? overview : undefined
  const booksStart = finance?.entity.booksStartDate.slice(0, 10)
  const activeAccounts = (finance?.bankAccounts ?? []).filter((a) => a.isActive)
  const account = activeAccounts.find((a) => a.id === form.bankAccountId)
  const options = (categories ?? []).filter((c) => c.isActive && c.direction === direction)
  const category = options.find((c) => c.id === form.categoryId)
  const listed = (invoices ?? []).filter((i) => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID')
  // The invoice being paid may sit beyond the first page of the list.
  const openInvoices =
    payInvoice && !listed.some((i) => i.id === payInvoice.id) ? [payInvoice, ...listed] : listed
  const invoice = openInvoices.find((i) => i.id === form.invoiceId)
  const amount = parseMoneyInput(form.amount)
  const amountValid = !!amount && toParas(amount) > 0
  const invoiceAmount = parseMoneyInput(form.invoiceAmount)
  // An invoice payment can't exceed the transaction or what is still open on the invoice.
  const invoiceMax =
    invoice && amount && toParas(amount) < toParas(invoice.openAmount) ? amount : invoice?.openAmount
  const invoiceAmountValid =
    !!invoiceAmount && !!invoiceMax && toParas(invoiceAmount) > 0 && toParas(invoiceAmount) <= toParas(invoiceMax)
  const beforeBooks = !!booksStart && !!form.valueDate && form.valueDate < booksStart
  // An owner payment needs a unit, or the deliberate "unknown" choice.
  const unitMissing = !!category?.isOwnerPayment && !form.unitId
  const unit = units?.find((u) => u.id === form.unitId)
  const set = (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleOpen() {
    const next = {
      ...EMPTY,
      bankAccountId: activeAccounts[0]?.id ?? '',
      valueDate: todayISO(),
      ...(payInvoice && {
        categoryId: payInvoice.categoryId,
        amount: payInvoice.openAmount,
        description: `Plaćanje fakture ${payInvoice.number}`,
        counterpartyName: payInvoice.supplier.name,
        invoiceId: payInvoice.id,
        invoiceAmount: payInvoice.openAmount,
      }),
    }
    setDirection(payInvoice ? 'EXPENSE' : 'INCOME')
    setForm(next)
    setStart(next)
    create.reset()
    setOpen(true)
  }

  function changeDirection(next: FinanceDirection) {
    setDirection(next)
    setForm((f) => ({ ...f, categoryId: '', unitId: '', invoiceId: '', invoiceAmount: '' }))
  }

  function pickInvoice(id: string) {
    const picked = openInvoices.find((i) => i.id === id)
    // Default to paying what is still open, capped at the transaction amount.
    const pay = !picked
      ? ''
      : amount && toParas(amount) < toParas(picked.openAmount)
        ? amount
        : picked.openAmount
    setForm((f) => ({
      ...f,
      invoiceId: id,
      invoiceAmount: pay,
      counterpartyName: f.counterpartyName.trim() || !picked ? f.counterpartyName : picked.supplier.name,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount) return
    create.mutate(
      {
        bankAccountId: form.bankAccountId,
        categoryId: form.categoryId,
        amount,
        valueDate: form.valueDate,
        description: form.description.trim(),
        counterpartyName: form.counterpartyName.trim() || undefined,
        counterpartyAccount: form.counterpartyAccount.trim() || undefined,
        reference: form.reference.trim() || undefined,
        unitId: category?.isOwnerPayment && form.unitId !== UNKNOWN_UNIT ? form.unitId : undefined,
        invoicePayments:
          invoice && invoiceAmount ? [{ invoiceId: invoice.id, amount: invoiceAmount }] : undefined,
      },
      { onSuccess: () => setOpen(false) }
    )
  }

  const valid =
    form.bankAccountId &&
    category &&
    amountValid &&
    form.valueDate &&
    !beforeBooks &&
    !unitMissing &&
    form.description.trim() &&
    (!invoice || invoiceAmountValid)

  return (
    <Dialog open={open} onOpenChange={guardDirty(setOpen, form !== start)}>
      {payInvoice ? (
        <Button size="sm" onClick={handleOpen} disabled={activeAccounts.length === 0}>
          <Wallet />
          Evidentiraj plaćanje
        </Button>
      ) : (
        <Button size="sm" onClick={handleOpen} disabled={activeAccounts.length === 0}>
          <Plus />
          Transakcija
        </Button>
      )}
      {activeAccounts.length === 0 && <NoAccountHint />}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova transakcija</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Segmented
            label="Vrsta"
            value={direction}
            onChange={changeDirection}
            options={[
              { value: 'INCOME', label: 'Prihod' },
              { value: 'EXPENSE', label: 'Rashod' },
            ]}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="tx-account" label="Račun">
              <NativeSelect id="tx-account" value={form.bankAccountId} onChange={set('bankAccountId')}>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} · {formatAccountNumber(a.accountNumber)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="tx-category" label="Kategorija">
              <NativeSelect id="tx-category" value={form.categoryId} onChange={set('categoryId')}>
                <option value="">Izaberite…</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="tx-amount" label="Iznos (RSD)" hint="Npr. 12.500,00">
              <Input
                id="tx-amount"
                inputMode="decimal"
                className="font-mono"
                value={form.amount}
                onChange={set('amount')}
                aria-invalid={form.amount !== '' && !amountValid}
              />
            </Field>
            <Field
              id="tx-date"
              label="Datum valute"
              hint={beforeBooks ? 'Datum ne može biti pre početka evidencije.' : undefined}
            >
              <Input
                id="tx-date"
                type="date"
                min={booksStart}
                max={todayISO()}
                value={form.valueDate}
                onChange={set('valueDate')}
                aria-invalid={beforeBooks}
              />
            </Field>
          </div>

          {category?.isOwnerPayment && (
            <Field
              id="tx-unit"
              label="Stan"
              hint={
                form.unitId === UNKNOWN_UNIT
                  ? 'Bez stana uplata ulazi u prihode zgrade, ali ne umanjuje dug nijednog vlasnika.'
                  : 'Stanari vide ovu uplatu kao „Uplata – stan …“, bez imena uplatioca.'
              }
            >
              <NativeSelect id="tx-unit" value={form.unitId} onChange={set('unitId')} aria-invalid={unitMissing}>
                <option value="" disabled>
                  Izaberite stan…
                </option>
                {(units ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {unitTypeLabel[u.type]} {u.unitNumber}
                  </option>
                ))}
                <option value={UNKNOWN_UNIT}>Nepoznat stan — razvrstaću kasnije</option>
              </NativeSelect>
            </Field>
          )}

          <Field id="tx-description" label="Opis (svrha plaćanja)">
            <Input id="tx-description" value={form.description} onChange={set('description')} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="tx-cp-name" label={direction === 'INCOME' ? 'Uplatilac (opciono)' : 'Primalac (opciono)'}>
              <Input id="tx-cp-name" value={form.counterpartyName} onChange={set('counterpartyName')} />
            </Field>
            <Field id="tx-cp-account" label="Račun (opciono)">
              <Input id="tx-cp-account" className="font-mono" value={form.counterpartyAccount} onChange={set('counterpartyAccount')} />
            </Field>
          </div>
          <Field id="tx-reference" label="Poziv na broj (opciono)">
            <Input id="tx-reference" className="font-mono" value={form.reference} onChange={set('reference')} />
          </Field>

          {direction === 'EXPENSE' && (
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <Field id="tx-invoice" label="Plaća fakturu (opciono)">
                <NativeSelect id="tx-invoice" value={form.invoiceId} onChange={(e) => pickInvoice(e.target.value)}>
                  <option value="">Bez fakture</option>
                  {openInvoices.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.supplier.name} · {i.number} · preostalo {formatRSD(i.openAmount)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {invoice && (
                <Field
                  id="tx-invoice-amount"
                  label="Iznos za fakturu"
                  hint={invoiceMax && `Najviše ${formatRSD(invoiceMax)}`}
                >
                  <Input
                    id="tx-invoice-amount"
                    inputMode="decimal"
                    className="font-mono"
                    value={form.invoiceAmount}
                    onChange={set('invoiceAmount')}
                    aria-invalid={!invoiceAmountValid}
                  />
                </Field>
              )}
            </div>
          )}

          {valid && account && amount && (
            <p className="text-sm text-muted-foreground">
              {direction === 'INCOME' ? 'Uplata' : 'Isplata'} <span className="font-mono">{formatRSD(amount)}</span>{' '}
              {direction === 'INCOME' ? 'na' : 'sa'} {account.bankName}
              {category?.isOwnerPayment &&
                ` · ${unit ? `${unitTypeLabel[unit.type]} ${unit.unitNumber}` : 'nepoznat stan'}`}
              {category && ` · ${category.name}`}
              {invoice && ` · faktura ${invoice.number}`}
            </p>
          )}
          <FormError error={create.error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Otkaži
            </Button>
            <Button type="submit" disabled={!valid || create.isPending} className="w-full sm:w-auto">
              {create.isPending ? 'Čuvanje…' : 'Proknjiži'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
