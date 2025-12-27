import type { DailyStateSource, DailyStateStatus } from '@prisma/client';

// If Prisma enums regress to $Enums or disappear, these declarations should fail to typecheck.
type StatusCheck = DailyStateStatus;
type SourceCheck = DailyStateSource;

export type _DailyStateTypesSentry = {
  status: StatusCheck;
  source: SourceCheck;
};
