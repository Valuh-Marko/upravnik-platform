import type { Scope, BuildingDraft } from './types'

interface Props {
  scope: Scope
  complexName: string
  buildings: BuildingDraft[]
}

export function TreePreview({ scope, complexName, buildings }: Props) {
  const totalUnits = buildings.reduce((sum, b) => sum + b.units.length, 0)

  const isEmpty = buildings.length === 0 && !complexName

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
        Pregled strukture
      </p>

      {isEmpty && (
        <p className="text-sm text-muted-foreground">Popunite formu da vidite pregled.</p>
      )}

      <div className="font-mono text-sm space-y-0.5">
        {scope === 'complex' && (
          <div className="text-foreground font-medium mb-1">{complexName || 'Kompleks'}</div>
        )}

        {buildings.map((b, bi) => {
          const isLast = bi === buildings.length - 1
          const bPrefix = scope === 'complex' ? (isLast ? '└── ' : '├── ') : ''
          const uPad = scope === 'complex' ? (isLast ? '    ' : '│   ') : ''
          const visibleUnits = b.units.slice(0, 8)
          const hiddenCount = b.units.length - visibleUnits.length

          return (
            <div key={b.id}>
              <div className="text-foreground">
                <span className="text-muted-foreground select-none">{bPrefix}</span>
                {b.name || 'Zgrada'}
                <span className="text-muted-foreground text-xs ml-2 font-sans">
                  ({b.units.length} jed.)
                </span>
              </div>
              {visibleUnits.map((u, ui) => {
                const isLastUnit = ui === visibleUnits.length - 1 && hiddenCount === 0
                const uPrefix = uPad + (isLastUnit ? '└── ' : '├── ')
                return (
                  <div key={u.id} className="text-muted-foreground text-xs">
                    <span className="select-none">{uPrefix}</span>
                    {u.unitNumber || '—'}
                    {u.floor !== '' && ` (sp. ${u.floor})`}
                  </div>
                )
              })}
              {hiddenCount > 0 && (
                <div className="text-muted-foreground text-xs">
                  <span className="select-none">{uPad}└── </span>
                  … i još {hiddenCount} jedinica
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!isEmpty && (
        <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground font-sans">
          {scope === 'complex' && '1 kompleks · '}
          {buildings.length} {buildings.length === 1 ? 'zgrada' : 'zgrada'} · {totalUnits}{' '}
          {totalUnits === 1 ? 'jedinica' : 'jedinica'}
        </div>
      )}
    </div>
  )
}
