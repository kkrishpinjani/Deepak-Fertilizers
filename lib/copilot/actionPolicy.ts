// Ported from v17's backend/actions/actionPolicy.ts + actionProposalV17.ts,
// unchanged in spirit: the copilot may only ever *propose* an action for
// a human to approve — it can never execute one. There is no execution
// path in this codebase; approving a proposal here only flips its status
// in MySQL, it does not touch SAP, Anaplan, or anything else.

export const ACTION_POLICY = {
  allowedProposalTypes: ["CREATE_TASK", "REQUEST_APPROVAL", "PREPARE_JOURNAL_REVIEW", "PREPARE_FORECAST_SCENARIO"] as const,
  blockedTypes: ["POST_JOURNAL", "CHANGE_VENDOR_MASTER", "APPROVE_PAYMENT", "RELEASE_PO", "CHANGE_PRICING"] as const,
  requireHumanApproval: true,
};

export type ProposedAction = {
  type: string;
  target: string;
  reason: string;
};

export function validateAction(action: ProposedAction) {
  const allowed = (ACTION_POLICY.allowedProposalTypes as readonly string[]).includes(action.type);
  return {
    allowed,
    requiresHumanApproval: ACTION_POLICY.requireHumanApproval,
    reason: allowed ? "Proposal may be prepared but not executed." : "Action is not permitted by the CFO copilot policy.",
  };
}
