'use client'

import { useState } from 'react'
import { Pencil, Plus, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateBankAccount,
  useCreateSupplier,
  useReverseTransaction,
  useUpsertFinanceProfile,
} from '@/hooks/useFinance'
import { formatRSD, parseMoneyInput } from '@/lib/format'
import type { FinanceEntity, FinanceTransaction } from '@/lib/types'
import { Field, FormError } from './form'

const optional = (s: string) => s.trim() || undefined

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

  const termValid = /^d{1,3}$/.test(form.paymentTermDays) && Number(form.paymentTermDays) <= 365
  const valid =
    form.legalName.trim() && form.pib.trim() && form.maticniBroj.trim() && form.booksStartDate && termValid

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
            <Field id="fp-pib" label="PIB">
              <Input id="fp-pib" inputMode="numeric" value={form.pib} onChange={set('pib')} maxLength={9} />
            </Field>
            <Field id="fp-mb" label="Matični broj">
              <Input id="fp-mb" inputMode="numeric" value={form.maticniBroj} onChange={set('maticniBroj')} maxLength={8} />
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
            <input
              type="checkbox"
              checked={form.autoGenerateCharges}
              onChange={(e) => setForm({ ...form, autoGenerateCharges: e.target.checked })}
              className="w-4 h-4 accent-primary"
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

export function BankAccountDialog({ buildingId }: { buildingId: string }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ bankName: '', accountNumber: '', openingBalance: '', isPrimary: false })
  const create = useCreateBankAccount(buildingId)
  const openingBalance = parseMoneyInput(form.openingBalance)

  function handleOpen() {
    setForm({ bankName: '', accountNumber: '', openingBalance: '0', isPrimary: false })
    create.reset()
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!openingBalance) return
    create.mutate(
      {
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        openingBalance,
        isPrimary: form.isPrimary || undefined,
      },
      { onSuccess: () => setOpen(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        <Plus />
        Račun
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novi tekući račun</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="ba-bank" label="Banka">
            <Input id="ba-bank" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} autoFocus />
          </Field>
          <Field id="ba-number" label="Broj računa" hint="Npr. 160-12345-95">
            <Input
              id="ba-number"
              className="font-mono"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
            />
          </Field>
          <Field id="ba-opening" label="Početno stanje (RSD)" hint="Stanje na dan početka evidencije.">
            <Input
              id="ba-opening"
              inputMode="decimal"
              className="font-mono"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              aria-invalid={form.openingBalance !== '' && !openingBalance}
            />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            Primarni račun
          </label>
          <FormError error={create.error} />
          <DialogFooter>
            <Button
              type="submit"
              disabled={!form.bankName.trim() || !form.accountNumber.trim() || !openingBalance || create.isPending}
              className="w-full sm:w-auto"
            >
              {create.isPending ? 'Čuvanje…' : 'Dodaj račun'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SupplierDialog({ buildingId }: { buildingId: string }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', pib: '', maticniBroj: '', bankAccount: '' })
  const create = useCreateSupplier(buildingId)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleOpen() {
    setForm({ name: '', pib: '', maticniBroj: '', bankAccount: '' })
    create.reset()
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    create.mutate(
      {
        name: form.name.trim(),
        pib: optional(form.pib),
        maticniBroj: optional(form.maticniBroj),
        bankAccount: optional(form.bankAccount),
      },
      { onSuccess: () => setOpen(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        <Plus />
        Dobavljač
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novi dobavljač</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="sp-name" label="Naziv">
            <Input id="sp-name" value={form.name} onChange={set('name')} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="sp-pib" label="PIB (opciono)">
              <Input id="sp-pib" inputMode="numeric" value={form.pib} onChange={set('pib')} maxLength={9} />
            </Field>
            <Field id="sp-mb" label="Matični broj (opciono)">
              <Input id="sp-mb" inputMode="numeric" value={form.maticniBroj} onChange={set('maticniBroj')} maxLength={8} />
            </Field>
          </div>
          <Field id="sp-account" label="Račun (opciono)">
            <Input id="sp-account" className="font-mono" value={form.bankAccount} onChange={set('bankAccount')} />
          </Field>
          <FormError error={create.error} />
          <DialogFooter>
            <Button type="submit" disabled={!form.name.trim() || create.isPending} className="w-full sm:w-auto">
              {create.isPending ? 'Čuvanje…' : 'Dodaj dobavljača'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ReverseTransactionDialog({ buildingId, tx }: { buildingId: string; tx: FinanceTransaction }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const reverse = useReverseTransaction(buildingId)

  function handleOpen() {
    setReason('')
    reverse.reset()
    setOpen(true)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="xs" variant="ghost" onClick={handleOpen}>
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
            reverse.mutate({ id: tx.id, reason: optional(reason) }, { onSuccess: () => setOpen(false) })
          }}
        >
          <p className="text-sm text-muted-foreground">
            Biće knjižena suprotna stavka od <span className="font-mono">{formatRSD(tx.amount)}</span> sa
            današnjim datumom. Originalna transakcija ostaje vidljiva kao stornirana
            {tx.invoicePayments.length > 0 && ', a povezane fakture ponovo postaju otvorene'}.
          </p>
          <Field id="rv-reason" label="Razlog (opciono)">
            <Textarea id="rv-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="resize-none" />
          </Field>
          <FormError error={reverse.error} />
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={reverse.isPending} className="w-full sm:w-auto">
              {reverse.isPending ? 'Storniranje…' : 'Storniraj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
