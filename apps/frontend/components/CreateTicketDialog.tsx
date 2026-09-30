'use client'

import { useState } from 'react'
import { useCreateTicket } from '@/hooks/useTickets'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'
import type { TicketCategory } from '@/lib/types'

const categories: { value: TicketCategory; label: string }[] = [
  { value: 'GENERAL', label: 'Opšte' },
  { value: 'MAINTENANCE', label: 'Održavanje' },
  { value: 'COMPLAINT', label: 'Žalba' },
  { value: 'PAYMENT', label: 'Plaćanje' },
  { value: 'REQUEST', label: 'Zahtjev' },
]

interface Props {
  buildingId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateTicketDialog({ buildingId, open: externalOpen, onOpenChange: externalOnChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<TicketCategory>('GENERAL')

  const isControlled = externalOpen !== undefined
  const open = isControlled ? externalOpen! : internalOpen
  const setOpen = isControlled ? externalOnChange! : setInternalOpen

  const { mutate, isPending } = useCreateTicket(buildingId)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTitle('')
      setBody('')
      setCategory('GENERAL')
    }
    setOpen(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    mutate(
      { title: title.trim(), body: body.trim(), category },
      { onSuccess: () => handleOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novi zahtjev
        </Button>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novi zahtjev</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="ticket-title">Naslov</Label>
            <Input
              id="ticket-title"
              placeholder="Kratki opis zahtjeva…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-category">Kategorija</Label>
            <select
              id="ticket-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {categories.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-body">Opis</Label>
            <Textarea
              id="ticket-body"
              placeholder="Opišite detaljnije…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || !title.trim() || !body.trim()}
              className="w-full sm:w-auto"
            >
              {isPending ? 'Slanje…' : 'Pošalji'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
