-- AlterTable
ALTER TABLE "User" ADD COLUMN     "engineObjectiveProfile" TEXT DEFAULT 'BALANCED',
ADD COLUMN     "engineObjectiveWeights" JSONB;
