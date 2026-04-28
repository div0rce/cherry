-- RenameForeignKey
ALTER TABLE "AccountingPosting" RENAME CONSTRAINT "accounting_posting__transaction_id__fk" TO "AccountingPosting_transactionId_fkey";

-- RenameForeignKey
ALTER TABLE "AccountingTransaction" RENAME CONSTRAINT "accounting_transaction__user_id__fk" TO "AccountingTransaction_userId_fkey";
