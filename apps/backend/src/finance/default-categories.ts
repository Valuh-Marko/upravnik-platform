import { FinanceDirection, FinanceFund } from '../prisma';

const { INCOME, EXPENSE } = FinanceDirection;
const {
  TEKUCE_ODRZAVANJE,
  INVESTICIONO_ODRZAVANJE,
  UPRAVLJANJE,
  HITNE_INTERVENCIJE,
  OSTALO,
} = FinanceFund;

// Copied into every new HOA; the upravnik can rename, deactivate or add more.
export const DEFAULT_CATEGORIES: {
  direction: FinanceDirection;
  fund: FinanceFund | null;
  name: string;
  isOwnerPayment?: boolean;
  isMarketIncome?: boolean;
}[] = [
  // Prihodi
  {
    direction: INCOME,
    fund: TEKUCE_ODRZAVANJE,
    name: 'Uplate vlasnika – tekuće održavanje',
    isOwnerPayment: true,
  },
  {
    direction: INCOME,
    fund: INVESTICIONO_ODRZAVANJE,
    name: 'Uplate vlasnika – investiciono održavanje',
    isOwnerPayment: true,
  },
  {
    direction: INCOME,
    fund: UPRAVLJANJE,
    name: 'Uplate vlasnika – upravljanje',
    isOwnerPayment: true,
  },
  {
    direction: INCOME,
    fund: OSTALO,
    name: 'Zakup zajedničkih prostorija i krova',
    isMarketIncome: true,
  },
  { direction: INCOME, fund: OSTALO, name: 'Kamata banke' },
  { direction: INCOME, fund: OSTALO, name: 'Ostali prihodi' },
  // Rashodi
  {
    direction: EXPENSE,
    fund: TEKUCE_ODRZAVANJE,
    name: 'Struja zajedničkih prostorija',
  },
  {
    direction: EXPENSE,
    fund: TEKUCE_ODRZAVANJE,
    name: 'Voda zajedničkih prostorija',
  },
  { direction: EXPENSE, fund: TEKUCE_ODRZAVANJE, name: 'Čišćenje' },
  { direction: EXPENSE, fund: TEKUCE_ODRZAVANJE, name: 'Održavanje lifta' },
  {
    direction: EXPENSE,
    fund: TEKUCE_ODRZAVANJE,
    name: 'Dezinsekcija, deratizacija, dezinfekcija',
  },
  {
    direction: EXPENSE,
    fund: TEKUCE_ODRZAVANJE,
    name: 'PP aparati i hidranti',
  },
  { direction: EXPENSE, fund: TEKUCE_ODRZAVANJE, name: 'Tekuće popravke' },
  { direction: EXPENSE, fund: TEKUCE_ODRZAVANJE, name: 'Osiguranje zgrade' },
  { direction: EXPENSE, fund: UPRAVLJANJE, name: 'Naknada upravniku' },
  { direction: EXPENSE, fund: UPRAVLJANJE, name: 'Bankarske provizije' },
  { direction: EXPENSE, fund: HITNE_INTERVENCIJE, name: 'Hitne intervencije' },
  {
    direction: EXPENSE,
    fund: INVESTICIONO_ODRZAVANJE,
    name: 'Investicioni radovi',
  },
  { direction: EXPENSE, fund: OSTALO, name: 'Ostali rashodi' },
];
