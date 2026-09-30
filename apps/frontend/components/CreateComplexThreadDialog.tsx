'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateComplexThread } from '@/hooks/useThreads'
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
import type { ThreadCategory } from '@/lib/types'

const categories: { value: ThreadCategory; label: string }[] = [
  { value: 'GENERAL', label: 'Opšte' },
  { value: 'MAINTENANCE', label: 'Održavanje' },
  { value: 'COMPLAINT', label: 'Žalba' },
  { value: 'QUESTION', label: 'Pitanje' },
]

interface Props {
  complexId: string
}

export function CreateComplexThreadDialog({ complexId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<ThreadCategory>('GENERAL')

  const { mutate, isPending } = useCreateComplexThread(complexId)

  function handleOpen() {
    setTitle('')
    setBody('')
    setCategory('GENERAL')
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    mutate(
      { title: title.trim(), body: body.trim(), category },
      {
        onSuccess: (thread) => {
          setOpen(false)
          router.push(`/complexes/${complexId}/forum/${thread.id}`)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={handleOpen}>
        <Plus className="w-4 h-4 mr-2" />
        Nova tema
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova diskusija</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="cthread-title">Naslov</Label>
            <Input
              id="cthread-title"
              placeholder="Kratki opis problema ili teme…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cthread-category">Kategorija</Label>
            <select
              id="cthread-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ThreadCategory)}
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
            <Label htmlFor="cthread-body">Opis</Label>
            <Textarea
              id="cthread-body"
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
              {isPending ? 'Slanje…' : 'Objavi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
