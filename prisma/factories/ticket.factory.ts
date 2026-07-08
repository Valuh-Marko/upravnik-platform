import { faker } from '@faker-js/faker';
import { PrismaClient, TicketCategory, TicketStatus } from '@prisma/client';

const SAMPLE_TITLES: Record<TicketCategory, string[]> = {
  MAINTENANCE: [
    'Kvar na grejanju u stanu',
    'Curenje vode iz plafona',
    'Pokvarena brava na ulazu',
    'Nefunkcionalan interfon',
    'Pukla cev ispod sudopere',
    'Problem sa elektroinstalacijom u kupatilu',
  ],
  COMPLAINT: [
    'Buka komšija noću',
    'Nepropisno odlaganje smeća u hodniku',
    'Oštećena imovina u zajedničkim prostorijama',
    'Pritužba na ponašanje stanara iz 3. sprata',
  ],
  PAYMENT: [
    'Pitanje u vezi naknade za održavanje',
    'Nerazumljiva stavka na računu za komunalije',
    'Uplata nije proknjižena u sistemu',
    'Zahtev za odloženo plaćanje',
  ],
  REQUEST: [
    'Zahtev za kopiju ugovora o upravljanju',
    'Promena kontakt podataka u sistemu',
    'Pristup arhivi dokumentacije sa skupština',
    'Potvrda o izmirenim obavezama',
  ],
  GENERAL: [
    'Opšte pitanje za upravnika',
    'Sugestija za poboljšanje zgrade',
    'Informacija o datumu skupštine',
    'Pitanje o pravilniku kućnog reda',
  ],
};

const SAMPLE_BODIES: Record<TicketCategory, string[]> = {
  MAINTENANCE: [
    'Već nedelju dana imam problem sa grejanjem u dnevnoj sobi. Temperatura pada na 14 stepeni noću čak i kada je grejanje uključeno. Radiator je jedva mlak, iako cevi nisu hladne. Molim da pošaljete majstora što pre.',
    'Pukla mi je cev ispod sudopere i voda se cedi u plakaru. Privremeno sam podmetao kantu ali situacija je hitna. Stan je na trećem spratu, ulaz broj 2. Dostupan sam svakim radnim danom od 9 do 17h.',
    'Interfon u mom stanu ne radi već mesec dana. Ne mogu da pustim goste ni dostavljače bez izlaska do ulaznih vrata. Molim da se proveri je li problem u centralnoj instalaciji ili u samom aparatu u stanu.',
    'Jutros mi iz plafona u kupatilu kaplje voda — verovatno od komšija sa sprata iznad. Odmah sam podmetao kantu. Molim hitnu intervenciju pre nego što dođe do ozbiljnijeg oštećenja.',
    'U kupatilu imam slab pritisak tople vode dok je hladna uredna. Problem je nastao pre dve nedelje. Nisam menjao nikakve instalacije. Da li bi neko mogao da proveri šta se dešava?',
  ],
  COMPLAINT: [
    'Stanari iz stana 4-3 svake noći do 2 sata slušaju glasnu muziku i organizuju žurke. Razgovarao sam lično s njima dva puta ali situacija se nije promenila. Molim formalnu intervenciju i pisano upozorenje.',
    'Neko iz zgrade redovno ostavlja smeće pored kontejnera umesto unutra, uglavnom noću. Molim pomoć u utvrđivanju ko je odgovoran i preduzimanju mera.',
    'Primetio sam da je neko oštetio poštansko sanduče stana 2-1. Sandučić je slomljen i pošta ispada. Nije jasno da li je reč o vandalizmu ili nesrećnom slučaju, ali treba ga zameniti.',
  ],
  PAYMENT: [
    'Na poslednjem računu za komunalne troškove vidim stavku "vanredni troškovi — hitne intervencije" od 4.200 dinara bez ikakve specifikacije. Molim detaljno objašnjenje šta je obuhvaćeno ovom stavkom.',
    'Uplatio sam mesečnu naknadu za održavanje pre 10 dana, ali na portalu i dalje piše da imam dugovanje. U prilogu šaljem potvrdu o uplati. Molim korekciju statusa u sistemu.',
    'Dobio sam opomenu za navodni dug koji smatram neosnovnim. Nikada nisam propustio uplatu — imam sve potvrde banke. Molim hitnu proveru i pisanu izjavu o stanju duga.',
  ],
  REQUEST: [
    'Potrebna mi je overena kopija ugovora o upravljanju zgradom za potrebe banke — apliciram za stambeni kredit i banka zahteva ovaj dokument. Može li se to urediti što pre?',
    'Molim vas da u sistemu promenite moj kontakt broj telefona. Stari broj više nije aktivan, novi je 064-123-4567. Takođe promenite i e-mail adresu.',
    'Da li je moguće dobiti pristup arhivi zapisnika sa skupština stanara za poslednjih 5 godina? Dokumenti su mi potrebni za spor sa osiguravajućom kućom.',
    'Potrebna mi je potvrda da su sve moje komunalne obaveze izmirene za potrebe kupoprodajnog ugovora. Rok je 15 dana.',
  ],
  GENERAL: [
    'Zanima me kada je planirana sledeća skupština stanara i koji su tačke dnevnog reda. Imam predlog o uvođenju sistema za sortiranje otpada koji bih voleo da uvrstimo na glasanje.',
    'Primetio sam da komšija sa petog sprata redovno vodi psa u zajednički hodnik bez povodca, a pas je već dva puta prišao deci. Postoji li pravilnik o kućnim ljubimcima?',
    'Kada se planira sledeće farbanje stepeništa? Boja puca na prvom i drugom spratu. Samo me zanima orijentacioni rok.',
  ],
};

const STAFF_REPLIES = [
  'Poštovani, primili smo vaš tiket i prosleđujemo ga nadležnoj osobi. Možete očekivati odgovor ili dolazak majstora u roku od 24 sata radnim danom.',
  'Zahvaljujemo na prijavi. Majstor je zakazao dolazak za sutra između 10 i 13 časova. Molimo vas da budete dostupni u stanu tokom tog perioda.',
  'Proverili smo situaciju. Problem je evidentiran i preduzmamo korake za rešavanje. Bićete obavešteni čim budu poznati detalji.',
  'Servis je kontaktiran i šalju majstora u petak pre podne između 9 i 12h. Ako vam taj termin ne odgovara, javite nam se i zakazaćemo drugi.',
  'Zahvaljujemo na strpljenju. Radovi su u toku i problem će biti otklonjen do kraja ove nedelje. Izvinjavamo se na neprijatnostima.',
  'Situacija je dokumentovana i upućeno je pisano upozorenje stanaru na kojeg se pritužba odnosi.',
  'Proverili smo u sistemu — uplata je evidentirana ali je bilo kašnjenja u ažuriranju portala. Status je ispravljen. Isprika za zabunu.',
  'Traženi dokument biće pripremljen u roku od 3 radna dana. Možete ga preuzeti lično kod upravnika.',
];

const RESIDENT_REPLIES = [
  'Hvala na brzom odgovoru! Biću kod kuće u petak pre podne, taj termin mi odgovara.',
  'Razumem, hvala na informaciji. Čekaću majstora i pobrinuću se da budem dostupan.',
  'Hvala, ali molim da se reši što pre jer situacija postaje neizdrž\'jiva.',
  'Super, hvala! Javiću se ako problem i dalje bude prisutan posle popravke.',
  'Da li ima informacija o preciznijim terminu? Trebalo bi da organizujem slobodan sat sa posla.',
  'Razumem, sačekaću. Napominjem samo da se ovo ponavlja treći mesec zaredom.',
];

export async function createTicket(
  prisma: PrismaClient,
  buildingId: string,
  authorId: string,
  overrides: { category?: TicketCategory; status?: TicketStatus } = {},
) {
  const category = overrides.category ?? faker.helpers.enumValue(TicketCategory);

  return prisma.ticket.create({
    data: {
      buildingId,
      authorId,
      title: faker.helpers.arrayElement(SAMPLE_TITLES[category]),
      body: faker.helpers.arrayElement(SAMPLE_BODIES[category]),
      category,
      status: overrides.status ?? TicketStatus.OPEN,
    },
  });
}

export function createTicketReply(
  prisma: PrismaClient,
  ticketId: string,
  authorId: string,
  isStaff = false,
) {
  const pool = isStaff ? STAFF_REPLIES : RESIDENT_REPLIES;
  return prisma.ticketReply.create({
    data: { ticketId, authorId, body: faker.helpers.arrayElement(pool) },
  });
}
