import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const SAMPLE_TITLES = [
  'Obaveštenje o čišćenju stepeništa i hodnika',
  'Redovno servisiranje lifta',
  'Skupština stanara — poziv i dnevni red',
  'Planirani nestanak struje — radovi na mreži',
  'Nova pravila kućnog reda',
  'Redovni pregled hidrantske mreže',
  'Dezinsekcija zajedničkih prostorija',
  'Zamena brojila struje — pristup stanovima',
  'Obaveštenje o zimskom čišćenju',
  'Raspored iznošenja kabastog otpada',
];

const SAMPLE_BODIES = [
  'Obaveštavamo sve stanare da će se u subotu od 9 do 13 časova vršiti generalno čišćenje zajedničkih prostorija. Molimo stanare da ne parkiraju vozila u dvorištu tokom navedenog perioda i da pripreme kese sa smećem za iznošenje.',
  'Zbog radova na vodovodnoj mreži biće isključena topla voda u periodu od utorka do četvrtka. Radovi se izvode od strane JKP Vodovod i kanalizacija i biće završeni u najkraćem mogućem roku. Molimo stanare za razumevanje i strpljenje.',
  'Skupština stanara zakazana je za petak u 19:00 časova u holu prizemlja. Na dnevnom redu su: pregled finansijskog izveštaja za prošlu godinu, plan troškova za naredni period i izbor novog predsednika skupštine. Prisustvo je obavezno.',
  'Podsetnik: zabranjeno je odlaganje kabastog otpada u hodniku i podrumu. Kabasti otpad se odlaže isključivo u posebnom kontejneru u dvorištu, svakog prvog petka u mesecu. Molimo sve stanare da poštuju ovo pravilo.',
  'Servis lifta zakazan je za ponedeljak i utorak. Za sve hitne potrebe molimo stanare da koriste stepenište. U slučaju medicinske hitnosti, molimo da kontaktirate upravnika na 060-123-4567. Zahvaljujemo na razumevanju.',
  'Obaveštavamo stanare da su nova pravila kućnog reda stupila na snagu. Molimo sve stanare da se upoznaju sa dokumentom koji je istaknut na oglasnoj tabli u prizemlju. Posebno ističemo odredbe o buci, kućnim ljubimcima i korišćenju zajedničkih prostorija.',
  'Preduzeće za dezinsekciju i deratizaciju dolazi u sredu između 10 i 14 časova. Molimo stanare da u tom periodu zatvore prozore i da sklone kućne ljubimce i hranu. Nakon tretmana, prostorije provetrite pre korišćenja.',
  'Distributer električne energije vrši zamenu digitalnih brojila u sledećoj sedmici. Tehničari će doći u svaki stan — molimo stanare da budu dostupni između 9 i 17 časova. Procedura traje oko 15 minuta po stanu.',
  'Obaveštavamo stanare da su zajednički prostori kamerno nadzirani. Sistem video nadzora je aktivan 24 sata i snimci se čuvaju 30 dana. Svrha sistema je isključivo bezbednost stanara i zgrade.',
  'Podsetnik: raspored iznošenja kabastog otpada je svaki prvi petak u mesecu. Otpad se može izneti dan ranije (četvrtak) posle 20 časova. Molimo da se ne odlažu električni uređaji sa ostatkom.',
];

export function createAnnouncement(
  prisma: PrismaClient,
  buildingId: string,
  authorId: string,
  overrides: { isPinned?: boolean } = {},
) {
  return prisma.announcement.create({
    data: {
      buildingId,
      authorId,
      title: faker.helpers.arrayElement(SAMPLE_TITLES),
      body: faker.helpers.arrayElement(SAMPLE_BODIES),
      isPinned: overrides.isPinned ?? faker.datatype.boolean({ probability: 0.2 }),
    },
  });
}
