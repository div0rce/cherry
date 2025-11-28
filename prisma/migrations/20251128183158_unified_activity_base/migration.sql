-- AlterTable
ALTER TABLE "CherryPointLedger" ADD COLUMN     "cardId" TEXT,
ADD COLUMN     "merchantObservationId" TEXT;

-- CreateTable
CREATE TABLE "MerchantObservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantName" TEXT,
    "mcc" INTEGER,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "merchantName" TEXT,
    "merchantCity" TEXT,
    "merchantRegion" TEXT,
    "merchantCountry" TEXT,
    "mcc" INTEGER,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "transactionType" TEXT,
    "isRecurring" BOOLEAN DEFAULT false,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "raw" JSONB,
    "merchantObservationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantObservation_userId_merchantName_idx" ON "MerchantObservation"("userId", "merchantName");

-- CreateIndex
CREATE INDEX "MerchantObservation_userId_merchantName_city_region_idx" ON "MerchantObservation"("userId", "merchantName", "city", "region");

-- CreateIndex
CREATE INDEX "BankTransaction_userId_idx" ON "BankTransaction"("userId");

-- CreateIndex
CREATE INDEX "BankTransaction_userId_merchantName_idx" ON "BankTransaction"("userId", "merchantName");

-- CreateIndex
CREATE INDEX "CherryPointLedger_merchantObservationId_idx" ON "CherryPointLedger"("merchantObservationId");

-- CreateIndex
CREATE INDEX "CherryPointLedger_cardId_idx" ON "CherryPointLedger"("cardId");

-- AddForeignKey
ALTER TABLE "CherryPointLedger" ADD CONSTRAINT "CherryPointLedger_merchantObservationId_fkey" FOREIGN KEY ("merchantObservationId") REFERENCES "MerchantObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CherryPointLedger" ADD CONSTRAINT "CherryPointLedger_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantObservation" ADD CONSTRAINT "MerchantObservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_merchantObservationId_fkey" FOREIGN KEY ("merchantObservationId") REFERENCES "MerchantObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
