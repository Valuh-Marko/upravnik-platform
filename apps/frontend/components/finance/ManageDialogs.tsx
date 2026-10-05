'use client'

import { useState } from 'react'
import { Pencil, Plus, Settings2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateBankAccount,
  useCreateCategory,
  useCreateSupplier,
  useFinanceCategories,
  useReverseTransaction,
  useSuppliers,
  useUpdateBankAccount,
  useUpdateCategory,
  useUpdateSupplier,
  useUpsertFinanceProfile,
} from '@/hooks/useFinance'
import { financeFundLabel } from '@/lib/chips'
import { formatAccountNumber, formatRSD, parseMoneyInput } from '@/lib/format'
import type {
  BankAccount,
  FinanceCategory,
  FinanceDirection,
  FinanceEntity,
  FinanceFund,
  FinanceTransaction,
  Supplier,
  UpdateBankAccountDto,
} from '@/lib/types'
import { isValidAccountNumber, isValidMaticniBroj, isValidPib, normaliseAccountNumber } from '@/lib/validation'
import { eyebrow, Field, FormError, NativeSelect, QueryError } from './form'

const optional = (s: string) => s.trim() || undefined

const PIB_HINT = 'PIB ima 9 cifara i ispravnu kontrolnu cifru.'
const MB_HINT = 'Matični broj ima 8 cifara.'
const ACCOUNT_HINT = 'Broj računa nije ispravan. Npr. 160-12345-95, sa ispravnim kontrolnim brojem.'

export function FinanceProfileDialog({
  buildingId,
  entity,
}: {
  buildingId: string
  entity?: FinanceEntity
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    legalName: '',
    pib: '',
    maticniBroj: '',
    address: '',
    booksStartDate: '',
    paymentTermDays: '30',
    autoGenerateCharges: false,
  })
  const save = useUpsertFinanceProfile(buildingId)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleOpen() {
    setForm({
      legalName: entity?.legalName ?? '',
      pib: entity?.pib ?? '',
      maticniBroj: entity?.maticniBroj ?? '',
      address: entity?.address ?? '',
      booksStartDate: entity?.booksStartDate.slice(0, 10) ?? '',
      paymentTermDays: String(entity?.paymentTermDays ?? 30),
      autoGenerateCharges: entity?.autoGenerateCharges ?? false,
    })
    save.reset()
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    save.mutate(
      {
        legalName: form.legalName.trim(),
        pib: form.pib.trim(),
        maticniBroj: form.maticniBroj.trim(),
        address: optional(form.address),
        booksStartDate: form.booksStartDate,
        paymentTermDays: Number(form.paymentTermDays),
        autoGenerateCharges: form.autoGenerateCharges,
      },
      { onSuccess: () => setOpen(false) }
    )
  }

  const termValid = /^\d{1,3}$/.test(form.paymentTermDays) && Number(form.paymentTermDays) <= 365
  const pibInvalid = !!form.pib.trim() && !isValidPib(form.pib.trim())
  const mbInvalid = !!form.maticniBroj.trim() && !isValidMaticniBroj(form.maticniBroj.trim())
  const valid =
    form.legalName.trim() &&
    isValidPib(form.pib.trim()) &&
    isValidMaticniBroj(form.maticniBroj.trim()) &&
    form.booksStartDate &&
    termValid

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {entity ? (
        <Button size="sm" variant="outline" onClick={handleOpen}>
          <Pencil />
          Podaci zajednice
        </Button>
      ) : (
        <Button onClick={handleOpen}>Podesi finansije</Button>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stambena zajednica</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="fp-name" label="Naziv">
            <Input id="fp-name" value={form.legalName} onChange={set('legalName')} placeholder="Stambena zajednica Bulevar 12" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="fp-pib" label="PIB" hint={pibInvalid ? PIB_HINT : undefined}>
              <Input
                id="fp-pib"
                inputMode="numeric"
                value={form.pib}
                onChange={set('pib')}
                maxLength={9}
                aria-invalid={pibInvalid}
              />
            </Field>
            <Field id="fp-mb" label="Matični broj" hint={mbInvalid ? MB_HINT : undefined}>
              <Input
                id="fp-mb"
                inputMode="numeric"
                value={form.maticniBroj}
                onChange={set('maticniBroj')}
                maxLength={8}
                aria-invalid={mbInvalid}
              />
            </Field>
          </div>
          <Field id="fp-address" label="Adresa (opciono)">
            <Input id="fp-address" value={form.address} onChange={set('address')} />
          </Field>
          <Field
            id="fp-start"
            label="Početak evidencije"
            hint="Početna stanja računa važe na ovaj dan. Ne može se menjati kada postoje transakcije."
          >
            <Input id="fp-start" type="date" value={form.booksStartDate} onChange={set('booksStartDate')} />
          </Field>
          <Field id="fp-term" label="Rok plaćanja (dana)" hint="Posle ovoliko dana od izdavanja zaduženje postaje dospelo.">
            <Input
              id="fp-term"
              inputMode="numeric"
              className="w-24"
              value={form.paymentTermDays}
              onChange={set('paymentTermDays')}
              aria-invalid={!termValid}
            />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
            <Checkbox
              checked={form.autoGenerateCharges}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, autoGenerateCharges: checked }))}
            />
            Automatski izdaj mesečna zaduženja 1. u mesecu
          </label>
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

/** Adds an account, or edits `account` when given. */
export function BankAccountDialog({ buildingId, account }: { buildingId: string; account?: BankAccount }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    bankName: '',
    accountNumber: '',
    openingBalance: '',
    isPrimary: false,
    isActive: true,
  })
  const create = useCreateBankAccount(buildingId)
  const update = useUpdateBankAccount(buildingId)
  const save = account ? update : create
  const openingBalance = parseMoneyInput(form.openingBalance)
  const numberInvalid = !!form.accountNumber.trim() && !isValidAccountNumber(form.accountNumber)

  function handleOpen() {
    setForm({
      bankName: account?.bankName ?? '',
      accountNumber: account ? formatAccountNumber(account.accountNumber) : '',
      openingBalance: account ? account.openingBalance : '0',
      isPrimary: account?.isPrimary ?? false,
      isActive: account?.isActive ?? true,
    })
    save.reset()
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!openingBalance) return
    const close = { onSuccess: () => setOpen(false) }
    if (!account) {
      create.mutate(
        {
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          openingBalance,
          isPrimary: form.isPrimary || undefined,
        },
        close
      )
      return
    }
    // Send the number and opening balance only when they change: the backend locks them once the account is used.
    const dto: UpdateBankAccountDto = { bankName: form.bankName.trim(), isPrimary: form.isPrimary, isActive: form.isActive }
    if (normaliseAccountNumber(form.accountNumber) !== account.accountNumber) dto.accountNumber = form.accountNumber.trim()
    if (parseMoneyInput(account.openingBalance) !== openingBalance) dto.openingBalance = openingBalance
    update.mutate({ id: account.id, dto }, close)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {account ? (
        <Button size="xs" variant="ghost" onClick={handleOpen} aria-label={`Izmeni račun ${account.bankName}`}>
          <Pencil />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={handleOpen}>
          <Plus />
          Račun
        </Button>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? 'Tekući račun' : 'Novi tekući račun'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="ba-bank" label="Banka">
            <Input id="ba-bank" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} autoFocus />
          </Field>
          <Field id="ba-number" label="Broj računa" hint={numberInvalid ? ACCOUNT_HINT : 'Npr. 160-12345-95'}>
            <Input
              id="ba-number"
              className="font-mono"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              aria-invalid={numberInvalid}
            />
          </Field>
          <Field
            id="ba-opening"
            label="Početno stanje (RSD)"
            hint={
              account
                ? 'Broj računa i početno stanje mogu se menjati samo dok račun nema transakcija.'
                : 'Stanje na dan početka evidencije, npr. 12.500,00.'
            }
          >
            <Input
              id="ba-opening"
              inputMode="decimal"
              className="font-mono"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              aria-invalid={form.openingBalance !== '' && !openingBalance}
            />
          </Field>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
              <Checkbox
                checked={form.isPrimary}
                // The backend keeps one primary account: it can only be moved, never unset, and must stay active.
                disabled={account?.isPrimary || !form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isPrimary: checked }))}
              />
              Primarni račun
            </label>
            {account && (
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <Checkbox
                  checked={form.isActive}
                  disabled={account.isPrimary}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, isActive: checked, isPrimary: checked && f.isPrimary }))
                  }
                />
                Aktivan
              </label>
            )}
            {account?.isPrimary && (
              <p className="text-xs text-muted-foreground">
                Primarni račun se ne može ugasiti. Prvo označite drugi račun kao primarni.
              </p>
            )}
          </div>
          <FormError error={save.error} />
          <DialogFooter>
            <Button
              type="submit"
              disabled={!form.bankName.trim() || !isValidAccountNumber(form.accountNumber) || !openingBalance || save.isPending}
              className="w-full sm:w-auto"
            >
              {save.isPending ? 'Čuvanje…' : account ? 'Sačuvaj' : 'Dodaj račun'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Adds a supplier, or edits `supplier` when given. `onSaved` gets the saved supplier. */
export function SupplierDialog({
  buildingId,
  supplier,
  onSaved,
}: {
  buildingId: string
  supplier?: Supplier
  onSaved?: (supplier: Supplier) => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', pib: '', maticniBroj: '', bankAccount: '', isActive: true })
  const create = useCreateSupplier(buildingId)
  const update = useUpdateSupplier(buildingId)
  const save = supplier ? update : create
  const set = (key: 'name' | 'pib' | 'maticniBroj' | 'bankAccount') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))
  const pibInvalid = !!form.pib.trim() && !isValidPib(form.pib.trim())
  const mbInvalid = !!form.maticniBroj.trim() && !isValidMaticniBroj(form.maticniBroj.trim())
  const accountInvalid = !!form.bankAccount.trim() && !isValidAccountNumber(form.bankAccount)

  function handleOpen() {
    setForm({
      name: supplier?.name ?? '',
      pib: supplier?.pib ?? '',
      maticniBroj: supplier?.maticniBroj ?? '',
      bankAccount: supplier?.bankAccount ? formatAccountNumber(supplier.bankAccount) : '',
      isActive: supplier?.isActive ?? true,
    })
    save.reset()
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // This dialog can open from inside the invoice form; React submit events bubble through portals.
    e.stopPropagation()
    const onSuccess = (saved: Supplier) => {
      setOpen(false)
      onSaved?.(saved)
    }
    if (!supplier) {
      create.mutate(
        {
          name: form.name.trim(),
          pib: optional(form.pib),
          maticniBroj: optional(form.maticniBroj),
          bankAccount: optional(form.bankAccount),
        },
        { onSuccess }
      )
      return
    }
    update.mutate(
      {
        id: supplier.id,
        dto: {
          name: form.name.trim(),
          pib: optional(form.pib) ?? null,
          maticniBroj: optional(form.maticniBroj) ?? null,
          bankAccount: optional(form.bankAccount) ?? null,
          isActive: form.isActive,
        },
      },
      { onSuccess }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {supplier ? (
        <Button size="xs" variant="ghost" type="button" onClick={handleOpen} aria-label={`Izmeni dobavljača ${supplier.name}`}>
          <Pencil />
        </Button>
      ) : (
        <Button size="sm" variant="outline" type="button" onClick={handleOpen}>
          <Plus />
          Dobavljač
        </Button>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Dobavljač' : 'Novi dobavljač'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="sp-name" label="Naziv">
            <Input id="sp-name" value={form.name} onChange={set('name')} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="sp-pib" label="PIB (opciono)" hint={pibInvalid ? PIB_HINT : undefined}>
              <Input
                id="sp-pib"
                inputMode="numeric"
                value={form.pib}
                onChange={set('pib')}
                maxLength={9}
                aria-invalid={pibInvalid}
              />
            </Field>
            <Field id="sp-mb" label="Matični broj (opciono)" hint={mbInvalid ? MB_HINT : undefined}>
              <Input
                id="sp-mb"
                inputMode="numeric"
                value={form.maticniBroj}
                onChange={set('maticniBroj')}
                maxLength={8}
                aria-invalid={mbInvalid}
              />
            </Field>
          </div>
          <Field id="sp-account" label="Račun (opciono)" hint={accountInvalid ? ACCOUNT_HINT : undefined}>
            <Input
              id="sp-account"
              className="font-mono"
              value={form.bankAccount}
              onChange={set('bankAccount')}
              aria-invalid={accountInvalid}
            />
          </Field>
          {supplier && (
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
              <Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))} />
              Aktivan
            </label>
          )}
          <FormError error={save.error} />
          <DialogFooter>
            <Button
              type="submit"
              disabled={!form.name.trim() || pibInvalid || mbInvalid || accountInvalid || save.isPending}
              className="w-full sm:w-auto"
            >
              {save.isPending ? 'Čuvanje…' : supplier ? 'Sačuvaj' : 'Dodaj dobavljača'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Adds a category, or edits `category` when given. The direction is fixed once created. */
export function CategoryDialog({ buildingId, category }: { buildingId: string; category?: FinanceCategory }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    direction: 'EXPENSE' as FinanceDirection,
    fund: '' as FinanceFund | '',
    isOwnerPayment: false,
    isMarketIncome: false,
    isActive: true,
  })
  const create = useCreateCategory(buildingId)
  const update = useUpdateCategory(buildingId)
  const save = category ? update : create
  const income = form.direction === 'INCOME'

  function handleOpen() {
    setForm({
      name: category?.name ?? '',
      direction: category?.direction ?? 'EXPENSE',
      fund: category?.fund ?? '',
      isOwnerPayment: category?.isOwnerPayment ?? false,
      isMarketIncome: category?.isMarketIncome ?? false,
      isActive: category?.isActive ?? true,
    })
    save.reset()
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const close = { onSuccess: () => setOpen(false) }
    // Only income categories may carry these flags; the backend rejects them on expenses.
    const flags = income ? { isOwnerPayment: form.isOwnerPayment, isMarketIncome: form.isMarketIncome } : {}
    if (!category) {
      create.mutate(
        { name: form.name.trim(), direction: form.direction, fund: form.fund || undefined, ...flags },
        close
      )
      return
    }
    update.mutate(
      { id: category.id, dto: { name: form.name.trim(), fund: form.fund || null, isActive: form.isActive, ...flags } },
      close
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {category ? (
        <Button size="xs" variant="ghost" onClick={handleOpen} aria-label={`Izmeni kategoriju ${category.name}`}>
          <Pencil />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={handleOpen}>
          <Plus />
          Kategorija
        </Button>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Kategorija' : 'Nova kategorija'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="ct-name" label="Naziv">
            <Input id="ct-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="ct-direction" label="Vrsta" hint={category ? 'Ne menja se posle dodavanja.' : undefined}>
              <NativeSelect
                id="ct-direction"
                value={form.direction}
                disabled={!!category}
                onChange={(e) => setForm({ ...form, direction: e.target.value as FinanceDirection })}
              >
                <option value="EXPENSE">Rashod</option>
                <option value="INCOME">Prihod</option>
              </NativeSelect>
            </Field>
            <Field id="ct-fund" label="Fond (opciono)">
              <NativeSelect
                id="ct-fund"
                value={form.fund}
                onChange={(e) => setForm({ ...form, fund: e.target.value as FinanceFund | '' })}
              >
                <option value="">Bez fonda</option>
                {Object.entries(financeFundLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="space-y-2">
            {income && (
              <>
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                  <Checkbox
                    checked={form.isOwnerPayment}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, isOwnerPayment: checked }))}
                  />
                  Uplata vlasnika (umanjuje dug stana)
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                  <Checkbox
                    checked={form.isMarketIncome}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, isMarketIncome: checked }))}
                  />
                  Tržišni prihod (npr. zakup)
                </label>
              </>
            )}
            {category && (
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))} />
                Aktivna
              </label>
            )}
          </div>
          <FormError error={save.error} />
          <DialogFooter>
            <Button type="submit" disabled={!form.name.trim() || save.isPending} className="w-full sm:w-auto">
              {save.isPending ? 'Čuvanje…' : category ? 'Sačuvaj' : 'Dodaj kategoriju'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const tag = (label: string) => <span className="ml-2 text-[11px] font-medium text-muted-foreground">{label}</span>
const manageList = 'divide-y divide-border rounded-xl border border-border'
const manageRow = 'flex items-center justify-between gap-3 px-3 py-2'

/** Accounts, suppliers and categories in one place, for staff who can write. */
export function ManageFinanceSheet({ buildingId, bankAccounts }: { buildingId: string; bankAccounts: BankAccount[] }) {
  const [open, setOpen] = useState(false)
  const suppliers = useSuppliers(buildingId, open)
  const categories = useFinanceCategories(buildingId, open)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Settings2 />
        Upravljanje
      </Button>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Upravljanje</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className={eyebrow}>Računi</h3>
              <BankAccountDialog buildingId={buildingId} />
            </div>
            <ul className={manageList}>
              {bankAccounts.map((a) => (
                <li key={a.id} className={manageRow}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {a.bankName}
                      {a.isPrimary && tag('Primarni')}
                      {!a.isActive && tag('Ugašen')}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{formatAccountNumber(a.accountNumber)}</p>
                  </div>
                  <BankAccountDialog buildingId={buildingId} account={a} />
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className={eyebrow}>Dobavljači</h3>
              <SupplierDialog buildingId={buildingId} />
            </div>
            <ManageItems query={suppliers} empty="Nema dobavljača.">
              {(s: Supplier) => (
                <li key={s.id} className={manageRow}>
                  <p className="min-w-0 text-sm font-medium text-foreground">
                    {s.name}
                    {!s.isActive && tag('Neaktivan')}
                  </p>
                  <SupplierDialog buildingId={buildingId} supplier={s} />
                </li>
              )}
            </ManageItems>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className={eyebrow}>Kategorije</h3>
              <CategoryDialog buildingId={buildingId} />
            </div>
            <ManageItems query={categories} empty="Nema kategorija.">
              {(c: FinanceCategory) => (
                <li key={c.id} className={manageRow}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {c.name}
                      {!c.isActive && tag('Neaktivna')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.direction === 'INCOME' ? 'Prihod' : 'Rashod'}
                      {c.fund && ` · ${financeFundLabel[c.fund]}`}
                    </p>
                  </div>
                  <CategoryDialog buildingId={buildingId} category={c} />
                </li>
              )}
            </ManageItems>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ManageItems<T>({
  query,
  empty,
  children,
}: {
  query: { data?: T[]; isLoading: boolean; error: unknown; refetch: () => unknown }
  empty: string
  children: (item: T) => React.ReactNode
}) {
  if (query.error && !query.data) return <QueryError onRetry={query.refetch} />
  if (query.isLoading || !query.data) return <Skeleton className="h-24 w-full rounded-xl" />
  if (query.data.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return <ul className={manageList}>{query.data.map(children)}</ul>
}

export function ReverseTransactionDialog({ buildingId, tx }: { buildingId: string; tx: FinanceTransaction }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const reverse = useReverseTransaction(buildingId)
  // An accounting record: the reason is required (the backend accepts it as optional).
  const reasonValid = reason.trim().length >= 3

  function handleOpen() {
    setReason('')
    reverse.reset()
    setOpen(true)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="ghost" onClick={handleOpen}>
        <Undo2 />
        Storno
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Storniranje transakcije</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!reasonValid) return
            reverse.mutate({ id: tx.id, reason: reason.trim() }, { onSuccess: () => setOpen(false) })
          }}
        >
          <p className="text-sm text-muted-foreground">
            Biće knjižena suprotna stavka od <span className="font-mono">{formatRSD(tx.amount)}</span> sa
            današnjim datumom. Originalna transakcija ostaje vidljiva kao stornirana
            {tx.invoicePayments.length > 0 && ', a povezane fakture ponovo postaju otvorene'}.
          </p>
          <Field id="rv-reason" label="Razlog" hint="Obavezno, najmanje 3 znaka. Ostaje zapisan uz storno.">
            <Textarea
              id="rv-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none"
              aria-invalid={reason !== '' && !reasonValid}
            />
          </Field>
          <FormError error={reverse.error} />
          <DialogFooter>
            <Button
              type="submit"
              variant="destructive"
              disabled={!reasonValid || reverse.isPending}
              className="w-full sm:w-auto"
            >
              {reverse.isPending ? 'Storniranje…' : 'Storniraj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
