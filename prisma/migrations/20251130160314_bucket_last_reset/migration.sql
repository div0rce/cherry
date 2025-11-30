/*
  Warnings:

  - A unique constraint covering the columns `[userId,merchantName,mcc]` on the table `MerchantObservation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_merchant_mcc_unique" ON "MerchantObservation"("userId", "merchantName", "mcc");
