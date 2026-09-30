import { faker } from '@faker-js/faker';
import { PrismaClient, ThreadCategory, ThreadStatus } from '@prisma/client';

const SAMPLE_TITLES: Record<ThreadCategory, string[]> = {
  MAINTENANCE: [
    'Kvar na liftu — ne radi već tri dana',
    'Pukla cev u hodniku na drugom spratu',
    'Oštećen krov — prokišnjava u stanu',
    'Pokvareno grejanje — ceo riser hladan',
    'Ulazna vrata se ne zatvaraju — brava pokvarena',
    'Interfon ne radi u više stanova',
  ],
  COMPLAINT: [
    'Buka iz stana iznad svake noći',
    'Nepropisno parkiranje u dvorištu',
    'Nered u podrumu — tuđi nameštaj',
    'Bicikli zauzeli ceo ulaz',
    'Pas bez povodca u zajedničkim prostorijama',
  ],
  QUESTION: [
    'Kada je sledeća skupština stanara?',
    'Ko je odgovoran za održavanje krova?',
    'Kako prijaviti kvar u zajedničkim prostorijama?',
    'Da li je moguće postaviti video nadzor na ulazu?',
    'Šta je uključeno u mesečnu naknadu za održavanje?',
  ],
  GENERAL: [
    'Predlog za uređenje zajedničkog dvorišta',
    'Organizacija akcije čišćenja dvorišta',
    'Tražim preporuku za majstora vodoinstalatera',
    'Čestitke povodom novogodišnjih praznika',
    'Predlog: zajednička bašta na krovu',
  ],
};

const SAMPLE_BODIES: Record<ThreadCategory, string[]> = {
  MAINTENANCE: [
    'Lift ne radi već treći dan zaredom. Majstor koji je dolazio juče nije rešio problem. Molim upravnika da hitno kontaktira servisnu službu jer imamo starije stanare i stanare sa smanjenom pokretljivošću u zgradi.',
    'Primetio sam da voda curi iz cevi između trećeg i četvrtog sprata. Pod u hodniku je mokar i postoji ozbiljna opasnost od klizanja. Molim da se urgentno pošalje majstor — situacija se pogoršava.',
    'Grejanje u stanu jedva radi, temperatura ne prelazi 16 stepeni čak i kad je napolju minus. Komšija sa istog risera ima isti problem. Riser verovatno nije ispravno proradio nakon letnjeg servisa.',
    'Brava na ulaznim vratima je pokvarena — vrata se ne zatvaraju posle 22h. To znači da svako može da uđe u zgradu, što je ozbiljan bezbednosni problem. Molim hitnu popravku.',
    'Interfon mi ne radi već mesec dana. Ne mogu da pustim goste ni dostavljače bez izlaska do ulaza. Molim proveru je li problem u instalaciji ili u samom aparatu stana.',
  ],
  COMPLAINT: [
    'Komšija iz stana iznad svake noći od ponoći sluša glasnu muziku i organizuje žurke. Razgovarao sam lično s njim dva puta, ali bez efekta. Molim formalnu intervenciju i pisano upozorenje.',
    'Neko redovno parkira automobil na mestu za invalide u dvorištu. Taj parking prostor koristi stanarica sa trećeg sprata koja ima trajnu invalidnost. Molim da se utvrdi ko to radi i interveniše.',
    'Neko je u podrum doneo stari nameštaj, frižider i gomilu kutija i zauzeo zajednički prostor koji smo svi plaćali. Predlažem da upravnik utvrdi ko je to uradio i nalozi hitno uklanjanje.',
    'Bicikli su potpuno zakrčili ulaz u zgradu. Pri ulasku sa kolicima ili u slučaju hitne evakuacije to je opasno. Predlažem da se organizuje poseban prostor za bicikle u dvorištu ili podrumu.',
    'Vlasnik stana 2-4 redovno hoda sa psom bez povodca po stepeništu i holu. Pas je već dva puta skočio na decu u zgradi. Postoji li kućni pravilnik o kućnim ljubimcima u zajedničkim prostorijama?',
  ],
  QUESTION: [
    'Kada je planirana sledeća skupština stanara? Imam pitanje u vezi s fondom za hitne intervencije i hteo bih da ga uvrstimo na dnevni red na vreme.',
    'Ko je tačno odgovoran za prokišnjavanje krova? Stan na poslednjem spratu ima vlagu na stropu već godinu dana, ali nikako da se utvrdi ko treba da snosni troškove popravke.',
    'Kako formalno prijaviti kvar u zajedničkim prostorijama — kroz portal ili lično? Postoji li rok u kom upravnik mora da reaguje na prijavu?',
    'Da li postoji mogućnost postavljanja video nadzora na ulazu u zgradu? U poslednjih mesec dana desilo se nekoliko sitnih kraža iz podruma i hodnika.',
    'Šta tačno pokriva mesečna naknada za održavanje? Dobio sam račun s povišicom ali niko nije objasnio šta je promenio.',
  ],
  GENERAL: [
    'Predlažem da uredimo zajedničko dvorište — mogli bismo zasaditi cveće uz ogradu, postaviti klupe i mali sto za šah. Troškovi bi bili minimalni. Ko je zainteresovan da se priključi inicijativi?',
    'Organizujem dobrovoljnu akciju čišćenja dvorišta i prikupljanja starih stvari za donaciju za sledeću subotu u 10h. Ko želi da pomogne, neka mi javi ovde ili na interfon stana 1-3.',
    'Ima li neko iskustvo sa dobrim majstorom za vodoinstalacije u Novom Sadu? Treba mi za privatnu popravku, ali nisam siguran kome da se obratim. Svaka preporuka je dobrodošla.',
    'Srećna Nova Godina svim stanarima i porodicama! Nadam se da ćemo i ove godine uspešno sarađivati i da ćemo zajedno unaprediti naš stambeni prostor.',
    'Predlog: zajednička bašta sa gredicama na ravnom krovu Lamele. Znam da ima sličnih primera u gradu koji odlično funkcionišu. Ko bi bio zainteresovan — javite se pa da vidimo koliko nas je.',
  ],
};

const SAMPLE_REPLIES = [
  'Slažem se potpuno, isti problem imamo i mi na ovom spratu.',
  'Javio sam se upravniku, rekao je da majstor dolazi sutra pre podne.',
  'Hvala na informaciji, nisam znao za ovo. Biću tu u petak.',
  'Podržavam predlog u potpunosti — mislim da bi to mnogo pomoglo.',
  'Isti problem imam već mesec dana, baš me veseli što neko pokrenuo temu.',
  'Kontaktirao sam servis direktno, doći će u petak pre podne.',
  'Nadam se da će se situacija uskoro rešiti, počelo je da smeta.',
  'Da, i ja sam primetio isto. Treba hitna intervencija.',
  'Zamolio bih da se u što kraćem roku preduzmu mere, situacija nije bezazlena.',
  'Hvala upravniku što je brzo reagovalo, problem je rešen!',
  'Podržavam inicijativu, javite kada treba da se pojavljamo.',
  'Mogao bih da doprinesem s alatom ako je potrebno za akciju čišćenja.',
  'Preporučujem majstora Gorana — radio je u našem stanu i zadovoljni smo. Telefon mogu da dam u privatnoj poruci.',
  'Dobra ideja, samo treba videti šta kažu propisi o korišćenju krova.',
  'Kontaktirajte JKP Vodovod direktno ako upravnik ne reaguje u roku od 48h.',
];

export async function createThread(
  prisma: PrismaClient,
  buildingId: string,
  authorId: string,
  overrides: { category?: ThreadCategory } = {},
) {
  const category = overrides.category ?? faker.helpers.enumValue(ThreadCategory);

  return prisma.thread.create({
    data: {
      buildingId,
      authorId,
      title: faker.helpers.arrayElement(SAMPLE_TITLES[category]),
      body: faker.helpers.arrayElement(SAMPLE_BODIES[category]),
      category,
      status: ThreadStatus.OPEN,
    },
  });
}

export function createReply(prisma: PrismaClient, threadId: string, authorId: string) {
  return prisma.threadReply.create({
    data: { threadId, authorId, body: faker.helpers.arrayElement(SAMPLE_REPLIES) },
  });
}
