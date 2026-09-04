-- ============================================================
-- Real persistence for the CFO Copilot's action-proposal /
-- human-approval boundary (ported from v13-v17's governance
-- model: the copilot can PROPOSE an action, never execute one).
-- Approving here only flips status in MySQL — there is no
-- execution path to SAP/Anaplan or anywhere else.
-- ============================================================

CREATE TABLE conformed.copilot_action_proposals (
    id             VARCHAR(40) PRIMARY KEY,
    question       VARCHAR(500) NOT NULL,
    action_type    VARCHAR(50) NOT NULL,
    target         VARCHAR(255) NOT NULL,
    reason         VARCHAR(1000) NOT NULL,
    status         VARCHAR(30) NOT NULL DEFAULT 'PENDING_HUMAN_APPROVAL',
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at     TIMESTAMP NULL
);
