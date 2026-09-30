import { StickyNote, CheckSquare, Pin, Bell } from 'lucide-react'

const planned = [
  {
    icon: Pin,
    title: 'Prikvačeni sadržaj',
    description:
      'Brz pristup prikvačenim obaveštenjima i temama iz svih zgrada. Upravnik sam bira šta želi da prati.',
  },
  {
    icon: CheckSquare,
    title: 'Todo lista',
    description:
      'Lična lista zadataka — popravke, dopisi, rokovi. Svaki zadatak može biti vezan za konkretnu zgradu.',
  },
  {
    icon: StickyNote,
    title: 'Beleške (Sticky notes)',
    description:
      'Slobodne beleške koje upravnik ostavlja sebi — napomene, kontakti, privremene informacije.',
  },
  {
    icon: Bell,
    title: 'Aktivnost',
    description:
      'Pregled poslednjih dešavanja: novi stanari, otvoreni threadovi, istekli dokumenti.',
  },
]

export default function DashboardPage() {
  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Početna</h1>
      <p className="text-base text-muted-foreground mb-8">
        Personalizovana tabla upravnika — u izradi
      </p>

      <div className="space-y-3">
        {planned.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex gap-4 p-4 rounded-lg border border-border bg-card"
          >
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-1">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{title}</p>
              <p className="text-base text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground/60 mt-8 text-center">
        Ove funkcije će biti implementirane u narednoj fazi razvoja.
      </p>
    </div>
  )
}
