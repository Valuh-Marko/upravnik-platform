import { Badge } from '@/components/ui/badge'
import type { Chip } from '@/lib/chips'

export function ChipBadge({ chip }: { chip: Chip }) {
  const Icon = chip.icon
  return (
    <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${chip.className}`}>
      {Icon && <Icon aria-hidden="true" />}
      {chip.label}
    </Badge>
  )
}
