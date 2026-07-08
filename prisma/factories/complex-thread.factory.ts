import { faker } from '@faker-js/faker';
import { PrismaClient, ThreadCategory, ThreadStatus } from '@prisma/client';

const SAMPLE_TITLES: Record<ThreadCategory, string[]> = {
  GENERAL: [
    'Zajednički parking za sve lamele',
    'Predlog: zajednička sala za priredbe',
    'Organizacija dana kompleksa — zabava za stanare',
    'Uvođenje sistema za reciklažu u kompleksu',
    'Zajednički bazen — da ili ne?',
  ],
  MAINTENANCE: [
    'Rekonstrukcija zajedničke kotlarnice',
    'Oštećena ograda između lamelа — ko plaća?',
    'Sistem za navodnjavanje zajedničkog dvorišta ne radi',
    'Osvetljenje parkirališta kompleksa — zamena',
  ],
  COMPLAINT: [
    'Buka sa parkinga noću — automobili sa modifikovanim ispustima',
    'Nepropisno odlaganje kabastog otpada u zajedničkom dvorištu',
    'Psi bez povodca u zajedničkom parku kompleksa',
  ],
  QUESTION: [
    'Ko je odgovoran za zajednički prostor između lamela?',
    'Da li postoji plan upravljanja za ceo kompleks?',
    'Kada se planira skupština kompleksa?',
    'Kako se raspodeljuju troškovi zajedničkih prostora?',
  ],
};

const SAMPLE_BODIES: Record<ThreadCategory, string[]> = {
  GENERAL: [
    'Predlažem da se organizuje zajednički sistem naizmjeničnog parkinga između svih lamela. Lamela 1 ima višak parking mesta noću, dok Lamela 3 nema dovoljno tokom dana. Zajednička regulativa bi svima koristila.',
    'Imamo neiskorišćen prostor u prizemlju između Lamele 2 i 3. Predlažem da se prenameni u zajedničku salu za priredbe, skupštine i okupljanja stanara. Ko podržava ideju, javi se.',
    'Ove godine bih voleo da organizujemo zajednički dan kompleksa — roštilj u dvorištu, muzika, malo zabave za decu. Ko bi bio voljan da pomogne s organizacijom? Predlažem prvu subotu u junu.',
    'Kompleks trenutno nema organizovan sistem za reciklažu. Predlažem da se postave kontejneri za papir, plastiku i staklo na centralno mesto u dvorištu. Troškove bismo podelili između svih lamela.',
    'Ima li interesovanja za izgradnju malog bazena za decu u zajedničkom dvorištu? Znam da je projekat veći, ali ako se troškovi podele na sve stanare četiri lamele, ispada sasvim prihvatljivo.',
  ],
  MAINTENANCE: [
    'Zajednička kotlarnica kompleksa ima kvar na cirkulacionoj pumpi. Servis je obavešten ali čekamo procenu troškova. Predlažem da se troškovi podele srazmerno broju stanova u svakoj lameli.',
    'Ograda između Lamele 2 i 3 je oštećena na tri mesta — verovatno od snega prošle zime. Treba utvrditi ko je vlasnik te ograde pre nego što krenemo s popravkom. Da li neko ima uvid u akt o podeli?',
    'Sistem za automatsko navodnjavanje zajedničkog travnjaka ne radi od proljeća. Travnjak se suši. Treba hitno popraviti pre nego što ne ostane ništa za spasavanje.',
    'Osvetljenje na parkingu kompleksa ima pokvarenih 6 od 12 lampi. Predlažem kolektivnu nabavku LED zamena — izlazi jeftinije nego pojedinačno.',
  ],
  COMPLAINT: [
    'Svake noći između 23h i 2h nekoliko automobila sa modifikovanim ispustima pravi buku na parkingu kompleksa. Pretpostavljam da su stanari jedne od lamela. Molim da se utvrdi o kome se radi i preduzmu mere.',
    'Neko iz kompleksa redovno ostavlja kabasti otpad (stari nameštaj, uređaje) pored kontejnera za smeće, a ne na predviđeno mesto. Molim da se postavi kamera ili neka druga mera.',
    'Više stanara se žalilo na pse bez povodca u zajedničkom parku kompleksa. Deca se plaše. Predlažem da se postavi tabla s pravilima i da upravnik uputi pisano obaveštenje svim vlasnicima pasa.',
  ],
  QUESTION: [
    'Ko je tačno odgovoran za zajednički prostor između lamela — upravnik svake lamele zasebno ili postoji neka forma zajedničkog upravljanja? Zanima me u slučaju oštećenja ili spora.',
    'Da li postoji dokument koji reguliše upravljanje zajedničkim delovima kompleksa (parking, dvorište, kotlarnica)? Nisam uspeo da pronađem ništa u arhivi portala.',
    'Kada se planira prva skupština svih stanara kompleksa? Imam nekoliko pitanja koja su relevantna za sve lamele, ne samo za moju.',
    'Kako se tačno raspodeljuju troškovi održavanja zajedničkih prostora kompleksa? Da li je to proporcionalno broju stanova ili broju stanara?',
  ],
};

const SAMPLE_REPLIES = [
  'Podržavam ideju, i mi iz Lamele 2 smo zainteresovani.',
  'Slažem se potpuno. Ovaj problem nas muči već duže vreme.',
  'Odlična inicijativa! Javite kada treba glasati.',
  'I mi iz Lamele 4 imamo isti problem. Solidarišemo se.',
  'Trebalo bi prvo pitati upravnika šta kaže na ovo.',
  'Znam majstora koji bi to mogao da uradi povoljno — pišite mi.',
  'Predlažem da se stvar pokrene formalno kroz skupštinu kompleksa.',
  'Nisam siguran da je to u nadležnosti stanara, ali podrška postoji.',
  'Hvala što si pokrenuo temu, dugo se čekalo na ovo.',
  'Iz Lamele 3 — u potpunosti smo za ovaj predlog.',
  'Možemo li organizovati anketu pre nego što krenemo dalje?',
  'Što pre se reši, to bolje. Podržavam hitno postupanje.',
];

export async function createComplexThread(
  prisma: PrismaClient,
  complexId: string,
  authorId: string,
  overrides: { category?: ThreadCategory } = {},
) {
  const category = overrides.category ?? faker.helpers.enumValue(ThreadCategory);

  return prisma.complexThread.create({
    data: {
      complexId,
      authorId,
      title: faker.helpers.arrayElement(SAMPLE_TITLES[category]),
      body: faker.helpers.arrayElement(SAMPLE_BODIES[category]),
      category,
      status: ThreadStatus.OPEN,
    },
  });
}

export function createComplexReply(prisma: PrismaClient, threadId: string, authorId: string) {
  return prisma.complexThreadReply.create({
    data: { threadId, authorId, body: faker.helpers.arrayElement(SAMPLE_REPLIES) },
  });
}
