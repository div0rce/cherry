/*
  Warnings:

  - The primary key for the `IdempotencyKey` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "IdempotencyKey_createdAt_idx";

-- DropIndex
DROP INDEX "IdempotencyKey_userId_idx";

-- AlterTable
ALTER TABLE "IdempotencyKey" DROP CONSTRAINT "IdempotencyKey_pkey",
ADD CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("userId", "key");
