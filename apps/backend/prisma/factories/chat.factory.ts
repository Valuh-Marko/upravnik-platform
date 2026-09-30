import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const CHAT_MESSAGES = [
  'Pozdrav svima!',
  'Da li neko zna kada dolazi majstor za lift?',
  'Hvala na obaveštenju, vidimo se na skupštini.',
  'Slažem se sa predlogom u potpunosti.',
  'Kada je sledeće generalno čišćenje?',
  'Lift opet ne radi od jutra...',
  'Ko je ostavio bicikl ispred ulaza?',
  'Skupština je u petak u 19h u prizemlju.',
  'Može li neko da mi pomogne sa selidbom u subotu?',
  'Voda je isključena od 9 do 14h zbog radova.',
  'Hvala upravniku što se brzo reagovalo na kvar.',
  'Ima li neko preporuku za majstora za parket?',
  'Parking ispred zgrade je slobodan od večeras.',
  'Deca su opet razbila sijalicu na ulazu.',
  'Skupštinom je usvojen predlog za uređenje dvorišta!',
  'Ko je naručio kamin sendvič, stoji na interfonu.',
  'Molim sve da zaključavaju podrumska vrata noću.',
  'Hvala komšiji iz 3-2 što je pomogao sa selidbom!',
  'Struja će biti isključena sutra od 10 do 12h.',
  'Novi interfon je odličan, bravo za inicijativu!',
];

export function createChatMessage(prisma: PrismaClient, buildingId: string, senderId: string) {
  return prisma.chatMessage.create({
    data: {
      buildingId,
      senderId,
      body: faker.helpers.arrayElement(CHAT_MESSAGES),
    },
  });
}
