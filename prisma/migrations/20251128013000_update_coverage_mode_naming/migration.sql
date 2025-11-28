-- AlterEnum
BEGIN;
CREATE TYPE "CategoryCoverageModeDb_new" AS ENUM ('BUDGETED', 'UNBUDGETED_INTENTIONAL', 'UNCONFIGURED');
ALTER TABLE "RecommendationSession" ALTER COLUMN "coverageMode" TYPE "CategoryCoverageModeDb_new" USING ("coverageMode"::text::"CategoryCoverageModeDb_new");
ALTER TYPE "CategoryCoverageModeDb" RENAME TO "CategoryCoverageModeDb_old";
ALTER TYPE "CategoryCoverageModeDb_new" RENAME TO "CategoryCoverageModeDb";
DROP TYPE "public"."CategoryCoverageModeDb_old";
COMMIT;

