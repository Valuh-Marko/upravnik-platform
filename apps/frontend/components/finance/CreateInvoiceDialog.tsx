'use client'

import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateInvoice, useFinanceCategories, useSuppliers, useUpdateInvoice } from '@/hooks/useFinance'
import { filesApi } from '@/lib/api/files'
import { parseMoneyInput, toParas, todayISO } from '@/lib/format'
import type { Invoice } from '@/lib/types'
import { Field, FormError, guardDirty, NativeSelect } from './form'
import { SupplierDialog } from './ManageDialogs'

const MAX_BYTES = 10 * 1024 * 1024

const EMPTY = {
  supplierId: '',
  number: '',
  issueDate: '',
  dueDate: '',
  amount: '',
  categoryId: '',
  description: '',
}

/** Records a new invoice, or edits `invoice` when given (the supplier is then fixed). */
export function CreateInvoiceDialog({ buildingId, invoice }: { buildingId: string; invoice?: Invoice }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  // The form as opened. Every edit makes a new object, so `form !== start` means the user changed something.
  const [start, setStart] = useState(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  // Reused if saving the invoice fails, so a retry doesn't upload the file twice.
  const [uploaded, setUploaded] = useState<{ file: File; id: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<unknown>(null)
  const create = useCreateInvoice(buildingId)
  const update = useUpdateInvoice(buildingId)
  const save = invoice ? update : create
  const { data: suppliers } = useSuppliers(buildingId, open)
  const { data: categories } = useFinanceCategories(buildingId, open)

  const expenseCategories = (categories ?? []).filter(
    (c) => c.direction === 'EXPENSE' && (c.isActive || c.id === invoice?.categoryId)
  )
  const activeSuppliers = (suppliers ?? []).filter((s) => s.isActive)
  const amount = parseMoneyInput(form.amount)
  const amountValid = !!amount && toParas(amount) > 0
  // "YYYY-MM-DD" strings compare in calendar order.
  const dueBeforeIssue = !!form.dueDate && !!form.issueDate && form.dueDate < form.issueDate
  const fileTooBig = !!file && file.size > MAX_BYTES
  const set = (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleOpen() {
    const next = invoice
      ? {
          supplierId: invoice.supplierId,
          number: invoice.number,
          issueDate: invoice.issueDate.slice(0, 10),
          dueDate: invoice.dueDate?.slice(0, 10) ?? '',
          amount: invoice.amount,
          categoryId: invoice.categoryId,
          description: invoice.description ?? '',
        }
      : { ...EMPTY, issueDate: todayISO() }
    setForm(next)
    setStart(next)
    setFile(null)
    setUploaded(null)
    setUploadError(null)
    save.reset()
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount) return

    let fileId: string | undefined
    if (file) {
      if (uploaded?.file === file) {
        fileId = uploaded.id
      } else {
        setUploading(true)
        setUploadError(null)
        try {
          fileId = (await filesApi.upload(buildingId, file)).id
          setUploaded({ file, id: fileId })
        } catch (err) {
          setUploadError(err)
          return
        } finally {
          setUploading(false)
        }
      }
    }

    const dto = {
      number: form.number.trim(),
      issueDate: form.issueDate,
      dueDate: form.dueDate || undefined,
      amount,
      categoryId: form.categoryId,
      description: form.description.trim() || undefined,
      fileId,
    }
    const close = { onSuccess: () => setOpen(false) }
    if (invoice) update.mutate({ id: invoice.id, dto }, close)
    else create.mutate({ ...dto, supplierId: form.supplierId }, close)
  }

  const valid =
    form.supplierId &&
    form.number.trim() &&
    form.issueDate &&
    amountValid &&
    !dueBeforeIssue &&
    form.categoryId &&
    !fileTooBig
  const pending = uploading || save.isPending

  return (
    <Dialog open={open} onOpenChange={guardDirty(setOpen, form !== start || !!file)}>
      {invoice ? (
        <Button size="sm" variant="outline" onClick={handleOpen}>
          <Pencil />
          Izmeni
        </Button>
      ) : (
        <Button size="sm" onClick={handleOpen}>
          <Plus />
          Faktura
        </Button>
      )}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? `Faktura ${invoice.number}` : 'Nova faktura'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {invoice ? (
            <Field id="inv-supplier" label="Dobavljač" hint="Dobavljač se ne menja posle evidentiranja.">
              <Input id="inv-supplier" value={invoice.supplier.name} disabled />
            </Field>
          ) : (
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field id="inv-supplier" label="Dobavljač">
                  <NativeSelect id="inv-supplier" value={form.supplierId} onChange={set('supplierId')}>
                    <option value="">
                      {suppliers && activeSuppliers.length === 0 ? 'Nema dobavljača, dodajte novog' : 'Izaberite…'}
                    </option>
                    {activeSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <SupplierDialog buildingId={buildingId} onSaved={(s) => setForm((f) => ({ ...f, supplierId: s.id }))} />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="inv-number" label="Broj fakture">
              <Input id="inv-number" value={form.number} onChange={set('number')} />
            </Field>
            <Field id="inv-amount" label="Iznos (RSD)" hint="Npr. 12.500,00">
              <Input
                id="inv-amount"
                inputMode="decimal"
                className="font-mono"
                value={form.amount}
                onChange={set('amount')}
                aria-invalid={form.amount !== '' && !amountValid}
              />
            </Field>
            <Field id="inv-issue" label="Datum izdavanja">
              <Input id="inv-issue" type="date" value={form.issueDate} onChange={set('issueDate')} />
            </Field>
            <Field
              id="inv-due"
              label="Rok plaćanja (opciono)"
              hint={dueBeforeIssue ? 'Rok ne može biti pre datuma izdavanja.' : undefined}
            >
              <Input
                id="inv-due"
                type="date"
                min={form.issueDate}
                value={form.dueDate}
                onChange={set('dueDate')}
                aria-invalid={dueBeforeIssue}
              />
            </Field>
          </div>

          <Field id="inv-category" label="Kategorija">
            <NativeSelect id="inv-category" value={form.categoryId} onChange={set('categoryId')}>
              <option value="">Izaberite…</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field id="inv-description" label="Opis (opciono)">
            <Textarea id="inv-description" value={form.description} onChange={set('description')} rows={2} className="resize-none" />
          </Field>

          <Field
            id="inv-file"
            label="Fajl fakture (opciono)"
            hint={
              invoice?.file
                ? `Sada: ${invoice.file.fileName}. Novi fajl zamenjuje postojeći. PDF, PNG ili JPEG, najviše 10 MB.`
                : 'PDF, PNG ili JPEG, najviše 10 MB.'
            }
          >
            <Input
              id="inv-file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              aria-invalid={fileTooBig}
            />
          </Field>
          {fileTooBig && <p className="text-sm text-destructive">Fajl je veći od 10 MB.</p>}

          <FormError error={uploadError ?? save.error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Otkaži
            </Button>
            <Button type="submit" disabled={!valid || pending} className="w-full sm:w-auto">
              {uploading ? 'Otpremanje…' : save.isPending ? 'Čuvanje…' : 'Sačuvaj fakturu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
