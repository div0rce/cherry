/*
  Warnings:

  - Added the required column `amountCents` to the `DecisionEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `DecisionEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `counterfactuals` to the `DecisionEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DecisionEvent" ADD COLUMN     "amountCents" INTEGER NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "counterfactuals" JSONB NOT NULL;
