-- AlterEnum
BEGIN;
CREATE TYPE "RecommendationStatus_new" AS ENUM ('RECOMMENDED', 'CLAIMED', 'VERIFIED', 'REJECTED', 'EXPIRED');
ALTER TABLE "RecommendationSession" ALTER COLUMN "status" TYPE "RecommendationStatus_new" USING ("status"::text::"RecommendationStatus_new");
ALTER TYPE "RecommendationStatus" RENAME TO "RecommendationStatus_old";
ALTER TYPE "RecommendationStatus_new" RENAME TO "RecommendationStatus";
DROP TYPE "public"."RecommendationStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "CherryPointLedger" ADD COLUMN     "postedAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RecommendationSession" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

