import { FileText, Upload } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

export default function FilesPage() {
  return (
    <div className="pb-6">
      <PageHeader
        icon={<FileText />}
        tone="docs"
        title="Dokumenta"
        description="Svi dokumenti po zgradama — u izradi"
      />

      <div className="space-y-3">
        <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Pregled po zgradama</p>
            <p className="text-base text-muted-foreground mt-1">
              Dokumenti su vezani za konkretnu zgradu. Planirani prikaz grupiše dokumente po
              zgradama (ugovor, izveštaj, odluka, ostalo) sa filtriranjem po kategoriji.
            </p>
          </div>
        </div>

        <div className="flex gap-4 p-4 rounded-lg border border-border bg-card">
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-1">
            <Upload className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Upload dokumenata</p>
            <p className="text-base text-muted-foreground mt-1">
              Upravnik može da postavi dokument za određenu zgradu. Stanari ih vide u svom{' '}
              <span className="font-medium">Dokumenta</span> odeljku.
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-8 text-center">
        Dokumenti po zgradama su dostupni kroz stavke u bočnoj traci.
      </p>
    </div>
  )
}
