import { faker } from '@faker-js/faker';
import { PrismaClient, DocumentCategory } from '@prisma/client';

const SAMPLE_TITLES: Record<DocumentCategory, string[]> = {
  CONTRACT: [
    'Ugovor o upravljanju zgradom 2024',
    'Ugovor sa servisom za liftove — Otis d.o.o.',
    'Ugovor o osiguranju zgrade — Dunav osiguranje',
    'Ugovor o čišćenju zajedničkih prostorija',
    'Ugovor sa firmom za fizičko obezbeđenje',
  ],
  REPORT: [
    'Godišnji finansijski izveštaj 2023',
    'Izveštaj sa skupštine stanara — jun 2024',
    'Izveštaj o redovnom održavanju — I kvartal 2024',
    'Izveštaj o vanrednim intervencijama 2023',
    'Izveštaj o stanju zajedničkih instalacija',
  ],
  DECISION: [
    'Odluka skupštine o fondu za vanredne intervencije',
    'Odluka o uvođenju video nadzora na ulazima',
    'Odluka o zameni ulaznih vrata i interfona',
    'Odluka o visini mesečne naknade za 2024. godinu',
    'Odluka o rekonstrukciji krova — plan i troškovi',
  ],
  OTHER: [
    'Kućni red zgrade',
    'Kontakti hitnih službi i JKP-a',
    'Uputstvo za korišćenje upravnik portala',
    'Plan evakuacije u slučaju požara',
    'Raspored čišćenja zajedničkih prostorija',
  ],
};

const FILE_NAMES: Record<DocumentCategory, string[]> = {
  CONTRACT: ['ugovor_upravljanje_2024.pdf', 'ugovor_lift_servis.pdf', 'ugovor_osiguranje.pdf', 'ugovor_ciscenje.pdf'],
  REPORT: ['izvestaj_finansije_2023.pdf', 'izvestaj_skupstina_jun2024.pdf', 'izvestaj_odrzavanje_q1.pdf'],
  DECISION: ['odluka_fond_interventions.pdf', 'odluka_video_nadzor.pdf', 'odluka_naknada_2024.pdf'],
  OTHER: ['kucni_red.pdf', 'kontakti_hitnih_sluzbi.pdf', 'uputstvo_portal.pdf', 'plan_evakuacije.pdf'],
};

export function createDocument(
  prisma: PrismaClient,
  buildingId: string,
  uploadedBy: string,
  overrides: { category?: DocumentCategory } = {},
) {
  const category = overrides.category ?? faker.helpers.enumValue(DocumentCategory);
  const fileName = faker.helpers.arrayElement(FILE_NAMES[category]);

  return prisma.document.create({
    data: {
      buildingId,
      uploadedBy,
      title: faker.helpers.arrayElement(SAMPLE_TITLES[category]),
      fileUrl: `https://storage.upravnik.rs/documents/${buildingId}/${fileName}`,
      fileType: 'pdf',
      category,
    },
  });
}
