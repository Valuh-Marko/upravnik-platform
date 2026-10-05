-- CreateEnum
CREATE TYPE "FeeMethod" AS ENUM ('PER_UNIT', 'PER_SQM');

-- CreateEnum
CREATE TYPE "UnitChargeType" AS ENUM ('MONTHLY', 'OPENING', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "finance_entities" ADD COLUMN     "autoGenerateCharges" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentTermDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "units" ADD COLUMN     "lastReminderAt" TIMESTAMP(3),
ADD COLUMN     "paymentReference" TEXT;

-- CreateTable
CREATE TABLE "fee_rules" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fund" "FinanceFund" NOT NULL,
    "method" "FeeMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "unitType" "UnitType",
    "validFrom" TEXT NOT NULL,
    "validTo" TEXT,
    "decisionDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_charges" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" "UnitChargeType" NOT NULL,
    "period" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "fund" "FinanceFund",
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "unit_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_rules_entityId_idx" ON "fee_rules"("entityId");

-- CreateIndex
CREATE INDEX "unit_charges_unitId_idx" ON "unit_charges"("unitId");

-- CreateIndex
CREATE INDEX "unit_charges_entityId_period_idx" ON "unit_charges"("entityId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "units_buildingId_paymentReference_key" ON "units"("buildingId", "paymentReference");

-- AddForeignKey
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "finance_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_decisionDocumentId_fkey" FOREIGN KEY ("decisionDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_charges" ADD CONSTRAINT "unit_charges_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "finance_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_charges" ADD CONSTRAINT "unit_charges_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_charges" ADD CONSTRAINT "unit_charges_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Not expressible in Prisma.
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "fee_rules" ADD CONSTRAINT "fee_rules_period_check" CHECK ("validTo" IS NULL OR "validTo" >= "validFrom");
ALTER TABLE "unit_charges" ADD CONSTRAINT "unit_charges_amount_check" CHECK ("amount" <> 0);
ALTER TABLE "finance_entities" ADD CONSTRAINT "finance_entities_payment_term_check" CHECK ("paymentTermDays" BETWEEN 0 AND 365);
