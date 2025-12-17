/*
  Warnings:

  - Added the required column `reasonCodes` to the `DecisionEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `severity` to the `DecisionEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DecisionEvent" ADD COLUMN     "reasonCodes" JSONB NOT NULL,
ADD COLUMN     "severity" INTEGER NOT NULL;
