-- ============================================================
-- Real persistent conversation threads (V14/V15/V17's "Cortex
-- Threads" equivalent). A thread groups a sequence of
-- investigations so a follow-up question can reference "that"
-- driver or "the previous answer" — the LLM rationale step gets
-- the prior Q&A as real context, not just the current question.
-- ============================================================

CREATE TABLE conformed.copilot_threads (
    id          VARCHAR(40) PRIMARY KEY,
    title       VARCHAR(255) NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conformed.copilot_thread_messages (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    thread_id         VARCHAR(40) NOT NULL,
    seq               INT NOT NULL,
    question          VARCHAR(500) NOT NULL,
    drill_dimension   VARCHAR(255) NULL,
    kpi_name          VARCHAR(255) NULL,
    kpi_actual        DECIMAL(20,2) NULL,
    kpi_plan          DECIMAL(20,2) NULL,
    top_driver        VARCHAR(255) NULL,
    answer_summary    TEXT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_thread FOREIGN KEY (thread_id) REFERENCES conformed.copilot_threads (id),
    UNIQUE KEY uq_thread_seq (thread_id, seq)
);
