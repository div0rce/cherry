import type { AuthorityPure, AuthorityVersion } from '../authority/config';
import { AUTHORITY_REASON_SEVERITY, AuthorityReason } from '../authority/reasonCodes.js';
import type {
  AuthorityDecision,
  SimulatedAuthorityDecision,
} from '../authority/simulateSpendAuthority';

type AssertTrue<T extends true> = T;

type VersionIsLiteral = AssertTrue<
  SimulatedAuthorityDecision['version'] extends AuthorityVersion
    ? AuthorityVersion extends SimulatedAuthorityDecision['version']
      ? true
      : false
    : false
>;

type ReasonSeverityExhaustive = AssertTrue<
  AuthorityReason extends keyof typeof AUTHORITY_REASON_SEVERITY
    ? keyof typeof AUTHORITY_REASON_SEVERITY extends AuthorityReason
      ? true
      : false
    : false
>;

type AuthorityDecisionIsBranded = AssertTrue<AuthorityDecision extends AuthorityPure ? true : false>;

// Prevent unused type errors
export type AuthorityGuardAssertions = [
  VersionIsLiteral,
  ReasonSeverityExhaustive,
  AuthorityDecisionIsBranded,
];
