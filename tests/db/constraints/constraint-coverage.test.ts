import * as assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ConstraintEntry = {
  id: string;
  type: 'UNIQUE' | 'FOREIGN_KEY' | 'CHECK' | 'NOT_NULL';
  name?: string;
  table?: string;
  columns?: string[];
};

const CONSTRAINTS: ConstraintEntry[] = [
  {
    "id": "CHECK:amount_cents_nonnegative",
    "type": "CHECK",
    "name": "amount_cents_nonnegative",
    "table": "RecommendationSession"
  },
  {
    "id": "CHECK:cherry_point_ledger__status_posted_at_revoked_at__check",
    "type": "CHECK",
    "name": "cherry_point_ledger__status_posted_at_revoked_at__check",
    "table": "CherryPointLedger"
  },
  {
    "id": "CHECK:points_nonnegative",
    "type": "CHECK",
    "name": "points_nonnegative",
    "table": "CherryPointLedger"
  },
  {
    "id": "CHECK:recommendation_session__status_verified_at_rejected_at__check",
    "type": "CHECK",
    "name": "recommendation_session__status_verified_at_rejected_at__check",
    "table": "RecommendationSession"
  },
  {
    "id": "FOREIGN_KEY:Account_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "Account_userId_fkey",
    "table": "Account"
  },
  {
    "id": "FOREIGN_KEY:AlertEvent_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "AlertEvent_userId_fkey",
    "table": "AlertEvent"
  },
  {
    "id": "FOREIGN_KEY:AutopilotCommit_sessionId_fkey",
    "type": "FOREIGN_KEY",
    "name": "AutopilotCommit_sessionId_fkey",
    "table": "AutopilotCommit"
  },
  {
    "id": "FOREIGN_KEY:AutopilotCommit_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "AutopilotCommit_userId_fkey",
    "table": "AutopilotCommit"
  },
  {
    "id": "FOREIGN_KEY:BankTransaction_merchantObservationId_fkey",
    "type": "FOREIGN_KEY",
    "name": "BankTransaction_merchantObservationId_fkey",
    "table": "BankTransaction"
  },
  {
    "id": "FOREIGN_KEY:BankTransaction_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "BankTransaction_userId_fkey",
    "table": "BankTransaction"
  },
  {
    "id": "FOREIGN_KEY:Bucket_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "Bucket_userId_fkey",
    "table": "Bucket"
  },
  {
    "id": "FOREIGN_KEY:Card_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "Card_userId_fkey",
    "table": "Card"
  },
  {
    "id": "FOREIGN_KEY:CategoryPreference_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "CategoryPreference_userId_fkey",
    "table": "CategoryPreference"
  },
  {
    "id": "FOREIGN_KEY:CherryPointLedger_cardId_fkey",
    "type": "FOREIGN_KEY",
    "name": "CherryPointLedger_cardId_fkey",
    "table": "CherryPointLedger"
  },
  {
    "id": "FOREIGN_KEY:CherryPointLedger_merchantObservationId_fkey",
    "type": "FOREIGN_KEY",
    "name": "CherryPointLedger_merchantObservationId_fkey",
    "table": "CherryPointLedger"
  },
  {
    "id": "FOREIGN_KEY:CherryPointLedger_sessionId_fkey",
    "type": "FOREIGN_KEY",
    "name": "CherryPointLedger_sessionId_fkey",
    "table": "CherryPointLedger"
  },
  {
    "id": "FOREIGN_KEY:CherryPointLedger_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "CherryPointLedger_userId_fkey",
    "table": "CherryPointLedger"
  },
  {
    "id": "FOREIGN_KEY:DailyState_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "DailyState_userId_fkey",
    "table": "DailyState"
  },
  {
    "id": "FOREIGN_KEY:HistoricalBucketTemplate_regimeId_fkey",
    "type": "FOREIGN_KEY",
    "name": "HistoricalBucketTemplate_regimeId_fkey",
    "table": "HistoricalBucketTemplate"
  },
  {
    "id": "FOREIGN_KEY:HistoricalBucketTemplate_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "HistoricalBucketTemplate_userId_fkey",
    "table": "HistoricalBucketTemplate"
  },
  {
    "id": "FOREIGN_KEY:HistoricalEngineEvaluation_bankTransactionId_fkey",
    "type": "FOREIGN_KEY",
    "name": "HistoricalEngineEvaluation_bankTransactionId_fkey",
    "table": "HistoricalEngineEvaluation"
  },
  {
    "id": "FOREIGN_KEY:HistoricalEngineEvaluation_regimeId_fkey",
    "type": "FOREIGN_KEY",
    "name": "HistoricalEngineEvaluation_regimeId_fkey",
    "table": "HistoricalEngineEvaluation"
  },
  {
    "id": "FOREIGN_KEY:HistoricalEngineEvaluation_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "HistoricalEngineEvaluation_userId_fkey",
    "table": "HistoricalEngineEvaluation"
  },
  {
    "id": "FOREIGN_KEY:HistoricalIncomeRegime_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "HistoricalIncomeRegime_userId_fkey",
    "table": "HistoricalIncomeRegime"
  },
  {
    "id": "FOREIGN_KEY:MccToRewardCategory_mccCode_fkey",
    "type": "FOREIGN_KEY",
    "name": "MccToRewardCategory_mccCode_fkey",
    "table": "MccToRewardCategory"
  },
  {
    "id": "FOREIGN_KEY:MerchantObservation_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "MerchantObservation_userId_fkey",
    "table": "MerchantObservation"
  },
  {
    "id": "FOREIGN_KEY:RecommendationSession_recommendedBucketId_fkey",
    "type": "FOREIGN_KEY",
    "name": "RecommendationSession_recommendedBucketId_fkey",
    "table": "RecommendationSession"
  },
  {
    "id": "FOREIGN_KEY:RecommendationSession_recommendedCardId_fkey",
    "type": "FOREIGN_KEY",
    "name": "RecommendationSession_recommendedCardId_fkey",
    "table": "RecommendationSession"
  },
  {
    "id": "FOREIGN_KEY:RecommendationSession_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "RecommendationSession_userId_fkey",
    "table": "RecommendationSession"
  },
  {
    "id": "FOREIGN_KEY:RewardRule_cardId_fkey",
    "type": "FOREIGN_KEY",
    "name": "RewardRule_cardId_fkey",
    "table": "RewardRule"
  },
  {
    "id": "FOREIGN_KEY:Session_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "Session_userId_fkey",
    "table": "Session"
  },
  {
    "id": "FOREIGN_KEY:SimulatedTransaction_bucketId_fkey",
    "type": "FOREIGN_KEY",
    "name": "SimulatedTransaction_bucketId_fkey",
    "table": "SimulatedTransaction"
  },
  {
    "id": "FOREIGN_KEY:SimulatedTransaction_chosenCardId_fkey",
    "type": "FOREIGN_KEY",
    "name": "SimulatedTransaction_chosenCardId_fkey",
    "table": "SimulatedTransaction"
  },
  {
    "id": "FOREIGN_KEY:SimulatedTransaction_simulationId_fkey",
    "type": "FOREIGN_KEY",
    "name": "SimulatedTransaction_simulationId_fkey",
    "table": "SimulatedTransaction"
  },
  {
    "id": "FOREIGN_KEY:SimulatedTransaction_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "SimulatedTransaction_userId_fkey",
    "table": "SimulatedTransaction"
  },
  {
    "id": "FOREIGN_KEY:Simulation_userId_fkey",
    "type": "FOREIGN_KEY",
    "name": "Simulation_userId_fkey",
    "table": "Simulation"
  },
  {
    "id": "NOT_NULL:0177742787c9",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "verdict"
    ]
  },
  {
    "id": "NOT_NULL:01ac442fa17a",
    "type": "NOT_NULL",
    "table": "RewardRule",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:02f9ee2d47c4",
    "type": "NOT_NULL",
    "table": "CherryPointLedger",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:08475a5f7827",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "source"
    ]
  },
  {
    "id": "NOT_NULL:094c4067101f",
    "type": "NOT_NULL",
    "table": "CherryPointLedger",
    "columns": [
      "points"
    ]
  },
  {
    "id": "NOT_NULL:0a15f00ced3a",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "direction"
    ]
  },
  {
    "id": "NOT_NULL:0a6e63f1220e",
    "type": "NOT_NULL",
    "table": "HistoricalIncomeRegime",
    "columns": [
      "avgFreeCashCents"
    ]
  },
  {
    "id": "NOT_NULL:0bda83bdc03e",
    "type": "NOT_NULL",
    "table": "Simulation",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:0c50994fc035",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "spentCents"
    ]
  },
  {
    "id": "NOT_NULL:0c95b0fc26a8",
    "type": "NOT_NULL",
    "table": "VineDevice",
    "columns": [
      "deviceId"
    ]
  },
  {
    "id": "NOT_NULL:0d307202a6f7",
    "type": "NOT_NULL",
    "table": "DailyState",
    "columns": [
      "computedAt"
    ]
  },
  {
    "id": "NOT_NULL:0d54252f859b",
    "type": "NOT_NULL",
    "table": "HistoricalEngineEvaluation",
    "columns": [
      "rawDecision"
    ]
  },
  {
    "id": "NOT_NULL:0dffa04493bc",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:1011f669b776",
    "type": "NOT_NULL",
    "table": "IdempotencyKey",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:11865a7c3172",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:13f817771e80",
    "type": "NOT_NULL",
    "table": "IdempotencyKey",
    "columns": [
      "key"
    ]
  },
  {
    "id": "NOT_NULL:15ad2511d106",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "reasonCodes"
    ]
  },
  {
    "id": "NOT_NULL:15ca7013fab1",
    "type": "NOT_NULL",
    "table": "Card",
    "columns": [
      "nickname"
    ]
  },
  {
    "id": "NOT_NULL:166256f58e56",
    "type": "NOT_NULL",
    "table": "HistoricalEngineEvaluation",
    "columns": [
      "decisionType"
    ]
  },
  {
    "id": "NOT_NULL:1844a8755990",
    "type": "NOT_NULL",
    "table": "SimulatedTransaction",
    "columns": [
      "amount"
    ]
  },
  {
    "id": "NOT_NULL:19f1b331b5ca",
    "type": "NOT_NULL",
    "table": "VerificationToken",
    "columns": [
      "identifier"
    ]
  },
  {
    "id": "NOT_NULL:1b5c2a7fa4e8",
    "type": "NOT_NULL",
    "table": "Simulation",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:1cce668d3ce1",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "amountMinor"
    ]
  },
  {
    "id": "NOT_NULL:1e4159b3791f",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "incomeKind"
    ]
  },
  {
    "id": "NOT_NULL:2159ec9c03eb",
    "type": "NOT_NULL",
    "table": "Card",
    "columns": [
      "network"
    ]
  },
  {
    "id": "NOT_NULL:23beb3513cbc",
    "type": "NOT_NULL",
    "table": "HistoricalBucketTemplate",
    "columns": [
      "bucketKey"
    ]
  },
  {
    "id": "NOT_NULL:23d4d74f656e",
    "type": "NOT_NULL",
    "table": "RewardRule",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:24008cb6f73e",
    "type": "NOT_NULL",
    "table": "DailyState",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:24ec374ba3b8",
    "type": "NOT_NULL",
    "table": "User",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:2826eb38a412",
    "type": "NOT_NULL",
    "table": "CherryPointLedger",
    "columns": [
      "reason"
    ]
  },
  {
    "id": "NOT_NULL:297ce24461b4",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "category"
    ]
  },
  {
    "id": "NOT_NULL:2b837b4d413b",
    "type": "NOT_NULL",
    "table": "Simulation",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:2c041d04ea1a",
    "type": "NOT_NULL",
    "table": "DailyState",
    "columns": [
      "date"
    ]
  },
  {
    "id": "NOT_NULL:2e8885585c13",
    "type": "NOT_NULL",
    "table": "Account",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:2f8fd8103be0",
    "type": "NOT_NULL",
    "table": "VineDevice",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:30f6939e8633",
    "type": "NOT_NULL",
    "table": "AlertEvent",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:3322de3dd6e7",
    "type": "NOT_NULL",
    "table": "CherryPointLedger",
    "columns": [
      "awardedAt"
    ]
  },
  {
    "id": "NOT_NULL:339bf884d977",
    "type": "NOT_NULL",
    "table": "AutopilotCommit",
    "columns": [
      "decisionId"
    ]
  },
  {
    "id": "NOT_NULL:36564c91cf4e",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "accountId"
    ]
  },
  {
    "id": "NOT_NULL:37e66cb17f87",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "orderToken"
    ]
  },
  {
    "id": "NOT_NULL:394ab350d923",
    "type": "NOT_NULL",
    "table": "Session",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:3951ff519868",
    "type": "NOT_NULL",
    "table": "HistoricalIncomeRegime",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:3b837b838f71",
    "type": "NOT_NULL",
    "table": "MerchantCategory",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:3bfef9de40c7",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:3f48b4cf60d0",
    "type": "NOT_NULL",
    "table": "HistoricalBucketTemplate",
    "columns": [
      "regimeId"
    ]
  },
  {
    "id": "NOT_NULL:3f824b80e5ff",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "amountCents"
    ]
  },
  {
    "id": "NOT_NULL:42380f43b507",
    "type": "NOT_NULL",
    "table": "CategoryPreference",
    "columns": [
      "mode"
    ]
  },
  {
    "id": "NOT_NULL:4346ce40dddf",
    "type": "NOT_NULL",
    "table": "Session",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:43670df1698c",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "status"
    ]
  },
  {
    "id": "NOT_NULL:45496933b525",
    "type": "NOT_NULL",
    "table": "MerchantCategory",
    "columns": [
      "mccCode"
    ]
  },
  {
    "id": "NOT_NULL:45566009ed18",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:45d2f946b307",
    "type": "NOT_NULL",
    "table": "HistoricalIncomeRegime",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:462976585a83",
    "type": "NOT_NULL",
    "table": "MerchantCategory",
    "columns": [
      "networkTsys"
    ]
  },
  {
    "id": "NOT_NULL:517d03ecb7ef",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:557ba68c51cc",
    "type": "NOT_NULL",
    "table": "RewardRule",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:57518f752803",
    "type": "NOT_NULL",
    "table": "IdempotencyKey",
    "columns": [
      "payload"
    ]
  },
  {
    "id": "NOT_NULL:57e7868d84b9",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "p2pKind"
    ]
  },
  {
    "id": "NOT_NULL:5890b3cea5e0",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "amountCents"
    ]
  },
  {
    "id": "NOT_NULL:5967e3ccb3fa",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:5aebf1e9357d",
    "type": "NOT_NULL",
    "table": "CherryPointLedger",
    "columns": [
      "isAnomalous"
    ]
  },
  {
    "id": "NOT_NULL:5c090eb8d464",
    "type": "NOT_NULL",
    "table": "Account",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:5d76b9b4f80d",
    "type": "NOT_NULL",
    "table": "HistoricalEngineEvaluation",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:5fd20ec88fd2",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "periodEnd"
    ]
  },
  {
    "id": "NOT_NULL:60450b8b8791",
    "type": "NOT_NULL",
    "table": "HistoricalEngineEvaluation",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:613d81b0f9e6",
    "type": "NOT_NULL",
    "table": "RewardRule",
    "columns": [
      "category"
    ]
  },
  {
    "id": "NOT_NULL:627cbb0e7c33",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "postedAt"
    ]
  },
  {
    "id": "NOT_NULL:657d6a57d503",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "periodStart"
    ]
  },
  {
    "id": "NOT_NULL:68025a846919",
    "type": "NOT_NULL",
    "table": "SimulatedTransaction",
    "columns": [
      "resolvedCategory"
    ]
  },
  {
    "id": "NOT_NULL:6a049aa9f815",
    "type": "NOT_NULL",
    "table": "HistoricalIncomeRegime",
    "columns": [
      "startMonth"
    ]
  },
  {
    "id": "NOT_NULL:6b18f55580ed",
    "type": "NOT_NULL",
    "table": "HistoricalIncomeRegime",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:6b3a27102e4d",
    "type": "NOT_NULL",
    "table": "User",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:6c6e4dda90b3",
    "type": "NOT_NULL",
    "table": "HistoricalEngineEvaluation",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:6cc96b593748",
    "type": "NOT_NULL",
    "table": "Session",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:6d0afceef710",
    "type": "NOT_NULL",
    "table": "DailyState",
    "columns": [
      "status"
    ]
  },
  {
    "id": "NOT_NULL:6d8efccb92d8",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "severity"
    ]
  },
  {
    "id": "NOT_NULL:6e8487a96adf",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "inputsVersion"
    ]
  },
  {
    "id": "NOT_NULL:6f3b6db35124",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "anomalyCode"
    ]
  },
  {
    "id": "NOT_NULL:6f92a7355ea5",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "strictMode"
    ]
  },
  {
    "id": "NOT_NULL:7006212d29aa",
    "type": "NOT_NULL",
    "table": "SimulatedTransaction",
    "columns": [
      "status"
    ]
  },
  {
    "id": "NOT_NULL:7397ba44d80d",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:791a6bf0f1a9",
    "type": "NOT_NULL",
    "table": "CherryPointLedger",
    "columns": [
      "anomalyCode"
    ]
  },
  {
    "id": "NOT_NULL:796296d097ab",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "budgetVerdict"
    ]
  },
  {
    "id": "NOT_NULL:79d3c89af23a",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:7a726aa7ffcc",
    "type": "NOT_NULL",
    "table": "AutopilotCommit",
    "columns": [
      "sessionId"
    ]
  },
  {
    "id": "NOT_NULL:7b7374ad9617",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "currency"
    ]
  },
  {
    "id": "NOT_NULL:7cffe1e34632",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "category"
    ]
  },
  {
    "id": "NOT_NULL:7d8fd2ca4d16",
    "type": "NOT_NULL",
    "table": "MccToRewardCategory",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:7dddd44fbd86",
    "type": "NOT_NULL",
    "table": "Card",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:7e91d47f0793",
    "type": "NOT_NULL",
    "table": "VineDevice",
    "columns": [
      "secret"
    ]
  },
  {
    "id": "NOT_NULL:804d1d4804bf",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:809a8cecb847",
    "type": "NOT_NULL",
    "table": "SimulatedTransaction",
    "columns": [
      "currency"
    ]
  },
  {
    "id": "NOT_NULL:82912aedec04",
    "type": "NOT_NULL",
    "table": "SimulatedTransaction",
    "columns": [
      "strictDecline"
    ]
  },
  {
    "id": "NOT_NULL:83d906cca35e",
    "type": "NOT_NULL",
    "table": "CategoryPreference",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:86f085c9efd3",
    "type": "NOT_NULL",
    "table": "CherryPointLedger",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:8887af723524",
    "type": "NOT_NULL",
    "table": "CategoryPreference",
    "columns": [
      "category"
    ]
  },
  {
    "id": "NOT_NULL:89d37a5f5b93",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "externalId"
    ]
  },
  {
    "id": "NOT_NULL:89fc155ce22e",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "verificationStatus"
    ]
  },
  {
    "id": "NOT_NULL:8b43f6e5c7b0",
    "type": "NOT_NULL",
    "table": "HistoricalBucketTemplate",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:8db0b1c48c18",
    "type": "NOT_NULL",
    "table": "MccToRewardCategory",
    "columns": [
      "mccCode"
    ]
  },
  {
    "id": "NOT_NULL:8e7396ffe6e3",
    "type": "NOT_NULL",
    "table": "DailyState",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:8ecad36f41a7",
    "type": "NOT_NULL",
    "table": "MccToRewardCategory",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:92c917ad2741",
    "type": "NOT_NULL",
    "table": "Account",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:93f54b6b1cf1",
    "type": "NOT_NULL",
    "table": "VineDevice",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:9638c69a4256",
    "type": "NOT_NULL",
    "table": "HistoricalIncomeRegime",
    "columns": [
      "endMonth"
    ]
  },
  {
    "id": "NOT_NULL:97c5dbc0015a",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "currency"
    ]
  },
  {
    "id": "NOT_NULL:9821c2cb4d54",
    "type": "NOT_NULL",
    "table": "MerchantObservation",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:983d5215a556",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:986e5fe2205e",
    "type": "NOT_NULL",
    "table": "AlertEvent",
    "columns": [
      "date"
    ]
  },
  {
    "id": "NOT_NULL:988cf8eb1491",
    "type": "NOT_NULL",
    "table": "DailyState",
    "columns": [
      "source"
    ]
  },
  {
    "id": "NOT_NULL:988df6b64356",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "budgetAmount"
    ]
  },
  {
    "id": "NOT_NULL:994e0a77446b",
    "type": "NOT_NULL",
    "table": "MerchantObservation",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:9a06ad670e97",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "surface"
    ]
  },
  {
    "id": "NOT_NULL:9b9d41cc5b6c",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "currentAmount"
    ]
  },
  {
    "id": "NOT_NULL:9d029dfc25d7",
    "type": "NOT_NULL",
    "table": "HistoricalIncomeRegime",
    "columns": [
      "avgFixedCostsCents"
    ]
  },
  {
    "id": "NOT_NULL:a25b377f4121",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:a28e2e0acfde",
    "type": "NOT_NULL",
    "table": "MccToRewardCategory",
    "columns": [
      "isDefault"
    ]
  },
  {
    "id": "NOT_NULL:a313e5e298f5",
    "type": "NOT_NULL",
    "table": "Card",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:a4d8e7cb7bdf",
    "type": "NOT_NULL",
    "table": "Account",
    "columns": [
      "providerAccountId"
    ]
  },
  {
    "id": "NOT_NULL:a5b0e18ec220",
    "type": "NOT_NULL",
    "table": "HistoricalBucketTemplate",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:a8ac1b552c8c",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "coverageMode"
    ]
  },
  {
    "id": "NOT_NULL:a9b210d27d9a",
    "type": "NOT_NULL",
    "table": "VineDevice",
    "columns": [
      "isActive"
    ]
  },
  {
    "id": "NOT_NULL:aa3a23e7797b",
    "type": "NOT_NULL",
    "table": "Account",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:aab47ebe6e2f",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "cardVerdict"
    ]
  },
  {
    "id": "NOT_NULL:aab637fd51a0",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:ab81b80bd103",
    "type": "NOT_NULL",
    "table": "MccToRewardCategory",
    "columns": [
      "category"
    ]
  },
  {
    "id": "NOT_NULL:abf249cfaf2b",
    "type": "NOT_NULL",
    "table": "CategoryPreference",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:ad4fe30ee91d",
    "type": "NOT_NULL",
    "table": "User",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:ae431b2bd205",
    "type": "NOT_NULL",
    "table": "CategoryPreference",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:afdd3c222c28",
    "type": "NOT_NULL",
    "table": "VerificationToken",
    "columns": [
      "token"
    ]
  },
  {
    "id": "NOT_NULL:b146280f09dd",
    "type": "NOT_NULL",
    "table": "Card",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:b1b9c00372aa",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:b254978d0f2a",
    "type": "NOT_NULL",
    "table": "SimulatedTransaction",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:b2aeefde4e91",
    "type": "NOT_NULL",
    "table": "RewardRule",
    "columns": [
      "cardId"
    ]
  },
  {
    "id": "NOT_NULL:b3d3cb2a8e28",
    "type": "NOT_NULL",
    "table": "HistoricalBucketTemplate",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:b3ff6ec6961b",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "period"
    ]
  },
  {
    "id": "NOT_NULL:b44df511b41b",
    "type": "NOT_NULL",
    "table": "User",
    "columns": [
      "email"
    ]
  },
  {
    "id": "NOT_NULL:b66481da92b1",
    "type": "NOT_NULL",
    "table": "HistoricalIncomeRegime",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:b693a18b1027",
    "type": "NOT_NULL",
    "table": "HistoricalIncomeRegime",
    "columns": [
      "avgNetIncomeCents"
    ]
  },
  {
    "id": "NOT_NULL:b734432f1a03",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "name"
    ]
  },
  {
    "id": "NOT_NULL:b750944d813a",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "cherryPointsOffered"
    ]
  },
  {
    "id": "NOT_NULL:b8109dea2ae5",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "bucketSpendReversed"
    ]
  },
  {
    "id": "NOT_NULL:ba1839e9b3ac",
    "type": "NOT_NULL",
    "table": "MerchantCategory",
    "columns": [
      "networkVisa"
    ]
  },
  {
    "id": "NOT_NULL:bcde65c95c1a",
    "type": "NOT_NULL",
    "table": "VineDevice",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:bdda32f94311",
    "type": "NOT_NULL",
    "table": "HistoricalBucketTemplate",
    "columns": [
      "avgSpendCents"
    ]
  },
  {
    "id": "NOT_NULL:c09e8d467591",
    "type": "NOT_NULL",
    "table": "DailyState",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:c0fa227b65b8",
    "type": "NOT_NULL",
    "table": "Account",
    "columns": [
      "provider"
    ]
  },
  {
    "id": "NOT_NULL:c248e32f1d09",
    "type": "NOT_NULL",
    "table": "AlertEvent",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:c5ebcad1c3e8",
    "type": "NOT_NULL",
    "table": "MerchantObservation",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:c69a58260418",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "expiresAt"
    ]
  },
  {
    "id": "NOT_NULL:c6a8eba89306",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:c6ab988ddb7b",
    "type": "NOT_NULL",
    "table": "DailyState",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:c957309ccf16",
    "type": "NOT_NULL",
    "table": "MerchantCategory",
    "columns": [
      "description"
    ]
  },
  {
    "id": "NOT_NULL:ca983d515bd6",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "amount"
    ]
  },
  {
    "id": "NOT_NULL:cad699bbc471",
    "type": "NOT_NULL",
    "table": "SimulatedTransaction",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:cc6644202cb8",
    "type": "NOT_NULL",
    "table": "CherryPointLedger",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:ce7723710097",
    "type": "NOT_NULL",
    "table": "MerchantObservation",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:d08b9cdfdf53",
    "type": "NOT_NULL",
    "table": "BankTransaction",
    "columns": [
      "source"
    ]
  },
  {
    "id": "NOT_NULL:d465a730e790",
    "type": "NOT_NULL",
    "table": "MccToRewardCategory",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:d5cf302cca62",
    "type": "NOT_NULL",
    "table": "VerificationToken",
    "columns": [
      "expires"
    ]
  },
  {
    "id": "NOT_NULL:d73ae247c985",
    "type": "NOT_NULL",
    "table": "HistoricalEngineEvaluation",
    "columns": [
      "runId"
    ]
  },
  {
    "id": "NOT_NULL:d7e6976738dd",
    "type": "NOT_NULL",
    "table": "Card",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:d832ce5cd2b3",
    "type": "NOT_NULL",
    "table": "HistoricalBucketTemplate",
    "columns": [
      "monthlyLimitCents"
    ]
  },
  {
    "id": "NOT_NULL:d844d2c0d29f",
    "type": "NOT_NULL",
    "table": "AutopilotCommit",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:da33a4aeaaf8",
    "type": "NOT_NULL",
    "table": "HistoricalEngineEvaluation",
    "columns": [
      "bankTransactionId"
    ]
  },
  {
    "id": "NOT_NULL:da44390d502b",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "reasonCode"
    ]
  },
  {
    "id": "NOT_NULL:dc934becc8d0",
    "type": "NOT_NULL",
    "table": "SimulatedTransaction",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:e228dd99a35c",
    "type": "NOT_NULL",
    "table": "Session",
    "columns": [
      "expires"
    ]
  },
  {
    "id": "NOT_NULL:e2a40c15690d",
    "type": "NOT_NULL",
    "table": "AutopilotCommit",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:e645938df25b",
    "type": "NOT_NULL",
    "table": "Session",
    "columns": [
      "sessionToken"
    ]
  },
  {
    "id": "NOT_NULL:e6e2535caa27",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "category"
    ]
  },
  {
    "id": "NOT_NULL:e73728ea5ba5",
    "type": "NOT_NULL",
    "table": "Bucket",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:e77caec454a7",
    "type": "NOT_NULL",
    "table": "Account",
    "columns": [
      "type"
    ]
  },
  {
    "id": "NOT_NULL:ea57bb7f08ce",
    "type": "NOT_NULL",
    "table": "Card",
    "columns": [
      "issuer"
    ]
  },
  {
    "id": "NOT_NULL:eb2862bde742",
    "type": "NOT_NULL",
    "table": "CherryPointLedger",
    "columns": [
      "id"
    ]
  },
  {
    "id": "NOT_NULL:ef3a56b2224a",
    "type": "NOT_NULL",
    "table": "Session",
    "columns": [
      "updatedAt"
    ]
  },
  {
    "id": "NOT_NULL:ef6a9c5ae5f6",
    "type": "NOT_NULL",
    "table": "IdempotencyKey",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:f3a7b34a68d2",
    "type": "NOT_NULL",
    "table": "AutopilotCommit",
    "columns": [
      "userId"
    ]
  },
  {
    "id": "NOT_NULL:f4e18c5127a5",
    "type": "NOT_NULL",
    "table": "CategoryPreference",
    "columns": [
      "createdAt"
    ]
  },
  {
    "id": "NOT_NULL:f6ed19217b06",
    "type": "NOT_NULL",
    "table": "MerchantCategory",
    "columns": [
      "networkMastercard"
    ]
  },
  {
    "id": "NOT_NULL:f7319ee1c125",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "verdict"
    ]
  },
  {
    "id": "NOT_NULL:f755026615e1",
    "type": "NOT_NULL",
    "table": "AlertEvent",
    "columns": [
      "kind"
    ]
  },
  {
    "id": "NOT_NULL:f75e69fdfb18",
    "type": "NOT_NULL",
    "table": "Card",
    "columns": [
      "isCredit"
    ]
  },
  {
    "id": "NOT_NULL:f7a6b4f83eac",
    "type": "NOT_NULL",
    "table": "CherryPointLedger",
    "columns": [
      "status"
    ]
  },
  {
    "id": "NOT_NULL:f91b5c50ae44",
    "type": "NOT_NULL",
    "table": "AlertEvent",
    "columns": [
      "sentAt"
    ]
  },
  {
    "id": "NOT_NULL:faa48ba70d37",
    "type": "NOT_NULL",
    "table": "RecommendationSession",
    "columns": [
      "overallVerdict"
    ]
  },
  {
    "id": "NOT_NULL:fd34a72dac7c",
    "type": "NOT_NULL",
    "table": "DecisionEvent",
    "columns": [
      "counterfactuals"
    ]
  },
  {
    "id": "NOT_NULL:ff269988461d",
    "type": "NOT_NULL",
    "table": "HistoricalBucketTemplate",
    "columns": [
      "id"
    ]
  },
  {
    "id": "UNIQUE:Account_provider_providerAccountId_key",
    "type": "UNIQUE",
    "name": "Account_provider_providerAccountId_key"
  },
  {
    "id": "UNIQUE:AlertEvent_userId_date_kind_key",
    "type": "UNIQUE",
    "name": "AlertEvent_userId_date_kind_key"
  },
  {
    "id": "UNIQUE:AutopilotCommit_userId_decisionId_key",
    "type": "UNIQUE",
    "name": "AutopilotCommit_userId_decisionId_key"
  },
  {
    "id": "UNIQUE:BankTransaction_userId_externalId",
    "type": "UNIQUE",
    "name": "BankTransaction_userId_externalId"
  },
  {
    "id": "UNIQUE:cherry_point_ledger__session_id__unique",
    "type": "UNIQUE",
    "name": "cherry_point_ledger__session_id__unique"
  },
  {
    "id": "UNIQUE:CategoryPreference_userId_category_key",
    "type": "UNIQUE",
    "name": "CategoryPreference_userId_category_key"
  },
  {
    "id": "UNIQUE:DailyState_userId_date_key",
    "type": "UNIQUE",
    "name": "DailyState_userId_date_key"
  },
  {
    "id": "UNIQUE:HistoricalEngineEvaluation_runId_bankTransactionId_key",
    "type": "UNIQUE",
    "name": "HistoricalEngineEvaluation_runId_bankTransactionId_key"
  },
  {
    "id": "UNIQUE:MccToRewardCategory_mccCode_isDefault_key",
    "type": "UNIQUE",
    "name": "MccToRewardCategory_mccCode_isDefault_key"
  },
  {
    "id": "UNIQUE:MerchantCategory_mccCode_key",
    "type": "UNIQUE",
    "name": "MerchantCategory_mccCode_key"
  },
  {
    "id": "UNIQUE:RecommendationSession_orderToken_key",
    "type": "UNIQUE",
    "name": "RecommendationSession_orderToken_key"
  },
  {
    "id": "UNIQUE:RecommendationSession_userId_source_engineDecisionId_key",
    "type": "UNIQUE",
    "name": "RecommendationSession_userId_source_engineDecisionId_key"
  },
  {
    "id": "UNIQUE:Session_sessionToken_key",
    "type": "UNIQUE",
    "name": "Session_sessionToken_key"
  },
  {
    "id": "UNIQUE:User_email_key",
    "type": "UNIQUE",
    "name": "User_email_key"
  },
  {
    "id": "UNIQUE:user_merchant_mcc_unique",
    "type": "UNIQUE",
    "name": "user_merchant_mcc_unique"
  },
  {
    "id": "UNIQUE:user_order_token_unique",
    "type": "UNIQUE",
    "name": "user_order_token_unique"
  },
  {
    "id": "UNIQUE:VerificationToken_identifier_token_key",
    "type": "UNIQUE",
    "name": "VerificationToken_identifier_token_key"
  },
  {
    "id": "UNIQUE:VerificationToken_token_key",
    "type": "UNIQUE",
    "name": "VerificationToken_token_key"
  },
  {
    "id": "UNIQUE:VineDevice_deviceId_key",
    "type": "UNIQUE",
    "name": "VineDevice_deviceId_key"
  }
];

async function checkUnique(name: string): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    "SELECT COUNT(*)::int AS count FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1",
    name
  );
  const row = rows[0];
  const count = row === undefined ? 0 : Number(row.count);
  assert.ok(count > 0, 'missing unique index: ' + name);
}

async function checkForeignKey(name: string): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    "SELECT COUNT(*)::int AS count FROM pg_constraint WHERE conname = $1 AND contype = 'f'",
    name
  );
  const row = rows[0];
  const count = row === undefined ? 0 : Number(row.count);
  assert.ok(count > 0, 'missing foreign key: ' + name);
}

async function checkCheck(name: string): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    "SELECT COUNT(*)::int AS count FROM pg_constraint WHERE conname = $1 AND contype = 'c'",
    name
  );
  const row = rows[0];
  const count = row === undefined ? 0 : Number(row.count);
  assert.ok(count > 0, 'missing check constraint: ' + name);
}

async function checkNotNull(table: string, column: string): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ is_nullable: 'YES' | 'NO' }>>(
    "SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2",
    table,
    column
  );
  const row = rows[0];
  const value = row === undefined ? undefined : row.is_nullable;
  assert.equal(value, 'NO', 'missing NOT NULL: ' + table + '.' + column);
}

async function run(): Promise<void> {
  const uniques = CONSTRAINTS.filter((entry) => entry.type === 'UNIQUE');
  const foreignKeys = CONSTRAINTS.filter((entry) => entry.type === 'FOREIGN_KEY');
  const checks = CONSTRAINTS.filter((entry) => entry.type === 'CHECK');
  const notNulls = CONSTRAINTS.filter((entry) => entry.type === 'NOT_NULL');

  for (const entry of uniques) {
    if (entry.name === undefined) {
      throw new Error('Missing unique name for ' + entry.id);
    }
    await checkUnique(entry.name);
  }

  for (const entry of foreignKeys) {
    if (entry.name === undefined) {
      throw new Error('Missing foreign key name for ' + entry.id);
    }
    await checkForeignKey(entry.name);
  }

  for (const entry of checks) {
    if (entry.name === undefined) {
      throw new Error('Missing check name for ' + entry.id);
    }
    await checkCheck(entry.name);
  }

  for (const entry of notNulls) {
    const table = entry.table;
    const column = entry.columns?.[0];
    if (
      table === undefined ||
      table.length === 0 ||
      column === undefined ||
      column.length === 0
    ) {
      throw new Error('Missing NOT NULL metadata for ' + entry.id);
    }
    await checkNotNull(table, column);
  }

  console.warn('db-constraints-coverage: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
