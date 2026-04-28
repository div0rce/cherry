import { classifyDocsDrift } from './docs-drift.js';
import { classifyForbiddenChange } from './forbidden-change.js';
import { classifyPrRisk } from './pr-risk.js';
import type { AutomationStatusRequest, PrClassifierInput } from './types.js';
import { PR_AUTOMATION_CLASSIFIER_VERSION } from './types.js';

export type PrAutomationClassification = {
  classifierVersion: typeof PR_AUTOMATION_CLASSIFIER_VERSION;
  risk: ReturnType<typeof classifyPrRisk>;
  forbiddenChange: ReturnType<typeof classifyForbiddenChange>;
  docsDrift: ReturnType<typeof classifyDocsDrift>;
  statusRequests: AutomationStatusRequest[];
};

export function classifyPrAutomation(input: PrClassifierInput): PrAutomationClassification {
  const risk = classifyPrRisk(input);
  const forbiddenChange = classifyForbiddenChange(input);
  const docsDrift = classifyDocsDrift(input);
  return {
    classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
    risk,
    forbiddenChange,
    docsDrift,
    statusRequests: [
      forbiddenChange.statusRequest,
      docsDrift.statusRequest,
      risk.statusRequest,
    ],
  };
}
