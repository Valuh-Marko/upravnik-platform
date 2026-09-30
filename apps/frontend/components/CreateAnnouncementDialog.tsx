'use client'

import { useState } from 'react'
import { useCreateAnnouncement } from '@/hooks/useAnnouncements'
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
import { Pin, Plus } from 'lucide-react'

interface Props {
  buildingId: string
}

export function CreateAnnouncementDialog({ buildingId }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  const { mutate, isPending } = useCreateAnnouncement(buildingId)

  function handleOpen() {
    setTitle('')
    setBody('')
    setIsPinned(false)
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    mutate(
      { title: title.trim(), body: body.trim(), isPinned },
      { onSuccess: () => setOpen(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={handleOpen}>
        <Plus className="w-4 h-4 mr-2" />
        Novo obaveštenje
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo obaveštenje</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Naslov</Label>
            <Input
              id="ann-title"
              placeholder="Npr. Servisiranje lifta…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ann-body">Tekst</Label>
            <Textarea
              id="ann-body"
              placeholder="Sadržaj obaveštenja…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <Pin className="w-4 h-4 text-muted-foreground" />
            <span className="text-base text-foreground">Prikvači obaveštenje</span>
          </label>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || !title.trim() || !body.trim()}
              className="w-full sm:w-auto"
            >
              {isPending ? 'Objavljivanje…' : 'Objavi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
