'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateInvoice, useFinanceCategories, useSuppliers } from '@/hooks/useFinance'
import { filesApi } from '@/lib/api/files'
import { parseMoneyInput, todayISO } from '@/lib/format'
import { Field, FormError, NativeSelect } from './form'

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

export function CreateInvoiceDialog({ buildingId }: { buildingId: string }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  // Reused if saving the invoice fails, so a retry doesn't upload the file twice.
  const [uploaded, setUploaded] = useState<{ file: File; id: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<unknown>(null)
  const create = useCreateInvoice(buildingId)
  const { data: suppliers } = useSuppliers(buildingId, open)
  const { data: categories } = useFinanceCategories(buildingId, open)

  const expenseCategories = (categories ?? []).filter((c) => c.isActive && c.direction === 'EXPENSE')
  const activeSuppliers = (suppliers ?? []).filter((s) => s.isActive)
  const amount = parseMoneyInput(form.amount)
  const fileTooBig = !!file && file.size > MAX_BYTES
  const set = (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleOpen() {
    setForm({ ...EMPTY, issueDate: todayISO() })
    setFile(null)
    setUploaded(null)
    setUploadError(null)
    create.reset()
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

    create.mutate(
      {
        supplierId: form.supplierId,
        number: form.number.trim(),
        issueDate: form.issueDate,
        dueDate: form.dueDate || undefined,
        amount,
        categoryId: form.categoryId,
        description: form.description.trim() || undefined,
        fileId,
      },
      { onSuccess: () => setOpen(false) }
    )
  }

  const valid =
    form.supplierId && form.number.trim() && form.issueDate && amount && form.categoryId && !fileTooBig
  const pending = uploading || create.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={handleOpen}>
        <Plus />
        Faktura
      </Button>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova faktura</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            id="inv-supplier"
            label="Dobavljač"
            hint={suppliers && activeSuppliers.length === 0 ? 'Prvo dodajte dobavljača.' : undefined}
          >
            <NativeSelect id="inv-supplier" value={form.supplierId} onChange={set('supplierId')}>
              <option value="">Izaberite…</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="inv-number" label="Broj fakture">
              <Input id="inv-number" value={form.number} onChange={set('number')} />
            </Field>
            <Field id="inv-amount" label="Iznos (RSD)">
              <Input
                id="inv-amount"
                inputMode="decimal"
                className="font-mono"
                value={form.amount}
                onChange={set('amount')}
                aria-invalid={form.amount !== '' && !amount}
              />
            </Field>
            <Field id="inv-issue" label="Datum izdavanja">
              <Input id="inv-issue" type="date" value={form.issueDate} onChange={set('issueDate')} />
            </Field>
            <Field id="inv-due" label="Rok plaćanja (opciono)">
              <Input id="inv-due" type="date" min={form.issueDate} value={form.dueDate} onChange={set('dueDate')} />
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

          <Field id="inv-file" label="Fajl fakture (opciono)" hint="PDF, PNG ili JPEG, najviše 10 MB.">
            <Input
              id="inv-file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              aria-invalid={fileTooBig}
            />
          </Field>
          {fileTooBig && <p className="text-sm text-destructive">Fajl je veći od 10 MB.</p>}

          <FormError error={uploadError ?? create.error} />
          <DialogFooter>
            <Button type="submit" disabled={!valid || pending} className="w-full sm:w-auto">
              {uploading ? 'Otpremanje…' : create.isPending ? 'Čuvanje…' : 'Sačuvaj fakturu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
