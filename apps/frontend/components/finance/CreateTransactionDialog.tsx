'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCreateTransaction, useFinanceCategories, useInvoices } from '@/hooks/useFinance'
import { useUnits } from '@/hooks/useUnits'
import { formatRSD, parseMoneyInput, todayISO } from '@/lib/format'
import type { BankAccount, FinanceDirection } from '@/lib/types'
import { Field, FormError, NativeSelect, Segmented } from './form'

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

export function CreateTransactionDialog({
  buildingId,
  bankAccounts,
}: {
  buildingId: string
  bankAccounts: BankAccount[]
}) {
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState<FinanceDirection>('INCOME')
  const [form, setForm] = useState(EMPTY)
  const create = useCreateTransaction(buildingId)
  const { data: categories } = useFinanceCategories(buildingId, open)
  const { data: units } = useUnits(open ? buildingId : '')
  const { data: invoices } = useInvoices(buildingId, {}, open && direction === 'EXPENSE')

  const activeAccounts = bankAccounts.filter((a) => a.isActive)
  const options = (categories ?? []).filter((c) => c.isActive && c.direction === direction)
  const category = options.find((c) => c.id === form.categoryId)
  const openInvoices = (invoices ?? []).filter(
    (i) => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID'
  )
  const invoice = openInvoices.find((i) => i.id === form.invoiceId)
  const amount = parseMoneyInput(form.amount)
  const invoiceAmount = parseMoneyInput(form.invoiceAmount)
  const set = (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleOpen() {
    setDirection('INCOME')
    setForm({ ...EMPTY, bankAccountId: activeAccounts[0]?.id ?? '', valueDate: todayISO() })
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
      : amount && Number(amount) < Number(picked.openAmount)
        ? amount
        : picked.openAmount
    setForm((f) => ({ ...f, invoiceId: id, invoiceAmount: pay }))
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
        unitId: category?.isOwnerPayment && form.unitId ? form.unitId : undefined,
        invoicePayments:
          invoice && invoiceAmount ? [{ invoiceId: invoice.id, amount: invoiceAmount }] : undefined,
      },
      { onSuccess: () => setOpen(false) }
    )
  }

  const valid =
    form.bankAccountId &&
    category &&
    amount &&
    form.valueDate &&
    form.description.trim() &&
    (!invoice || invoiceAmount)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={handleOpen} disabled={activeAccounts.length === 0}>
        <Plus />
        Transakcija
      </Button>
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
                    {a.bankName}
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
            <Field id="tx-amount" label="Iznos (RSD)">
              <Input
                id="tx-amount"
                inputMode="decimal"
                className="font-mono"
                value={form.amount}
                onChange={set('amount')}
                aria-invalid={form.amount !== '' && !amount}
              />
            </Field>
            <Field id="tx-date" label="Datum valute">
              <Input id="tx-date" type="date" max={todayISO()} value={form.valueDate} onChange={set('valueDate')} />
            </Field>
          </div>

          {category?.isOwnerPayment && (
            <Field id="tx-unit" label="Stan" hint="Stanari vide ovu uplatu kao „Uplata – stan …“, bez imena uplatioca.">
              <NativeSelect id="tx-unit" value={form.unitId} onChange={set('unitId')}>
                <option value="">Nepoznat stan</option>
                {(units ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unitNumber}
                  </option>
                ))}
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
                <Field id="tx-invoice-amount" label="Iznos za fakturu">
                  <Input
                    id="tx-invoice-amount"
                    inputMode="decimal"
                    className="font-mono"
                    value={form.invoiceAmount}
                    onChange={set('invoiceAmount')}
                    aria-invalid={!invoiceAmount}
                  />
                </Field>
              )}
            </div>
          )}

          <FormError error={create.error} />
          <DialogFooter>
            <Button type="submit" disabled={!valid || create.isPending} className="w-full sm:w-auto">
              {create.isPending ? 'Čuvanje…' : 'Proknjiži'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
