-- ============================================================
-- V12's verified-query evaluation/regression framework — real
-- gold questions with expected ground truth, and a log of every
-- evaluation run's pass/fail per question. Ground truth is
-- computed once from the same conformed model the copilot
-- queries, with a tolerance band (numbers drift as demo data
-- changes; the point is catching intent/routing regressions,
-- not exact-decimal matching).
-- ============================================================

CREATE TABLE conformed.copilot_gold_questions (
    id                VARCHAR(40) PRIMARY KEY,
    question          VARCHAR(255) NOT NULL,
    expected_intent   VARCHAR(40) NOT NULL,
    ground_truth_sql  TEXT NOT NULL,   -- run to compute expected_actual fresh each eval
    tolerance_percent DECIMAL(5,2) NOT NULL DEFAULT 1.00
);

CREATE TABLE conformed.copilot_eval_runs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    run_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    question_id     VARCHAR(40) NOT NULL,
    intent_actual   VARCHAR(40) NOT NULL,
    intent_pass     TINYINT(1) NOT NULL,
    kpi_expected    DECIMAL(20,2) NULL,
    kpi_actual      DECIMAL(20,2) NULL,
    kpi_pass        TINYINT(1) NOT NULL,
    guards_pass     TINYINT(1) NOT NULL,
    latency_ms      INT NOT NULL,
    overall_pass    TINYINT(1) NOT NULL
);

INSERT INTO conformed.copilot_gold_questions (id, question, expected_intent, ground_truth_sql, tolerance_percent) VALUES
('GQ-01', 'Why is EBITDA below plan?', 'variance_root_cause',
 'SELECT SUM(ebitda) AS actual FROM conformed.pl_summary;', 1.00),
('GQ-02', 'Which customers create the largest cash risk?', 'ar_risk',
 'SELECT SUM(overdue_ar) AS actual FROM conformed.customer_cash_risk;', 1.00),
('GQ-03', 'Which materials have the largest purchase price variance?', 'procurement_variance',
 'SELECT SUM(ppv) AS actual FROM conformed.purchase_price_variance;', 1.00),
('GQ-04', 'Where is production falling behind plan?', 'production_attainment',
 'SELECT SUM(actual_qty) AS actual FROM conformed.fact_production_order;', 1.00),
('GQ-05', 'Which inventory is slow moving?', 'inventory_risk',
 'SELECT SUM(excess_value) AS actual FROM conformed.inventory_exposure;', 1.00),
('GQ-06', 'What is our working capital exposure?', 'working_capital',
 'SELECT SUM(cash_conversion_exposure) AS actual FROM conformed.working_capital_bridge;', 1.00),
('GQ-07', 'What are our top revenue drivers?', 'ranked_driver',
 -- Ground truth must match what the ranked_driver resolver actually
 -- reports as its KPI (EBITDA total, same source as GQ-01) — an earlier
 -- version of this summed cfo_root_cause.ebitda_impact instead, which is
 -- a different number (sum of all driver variances, not the KPI itself)
 -- and made the eval suite fail on a resolver that was working correctly.
 'SELECT SUM(ebitda) AS actual FROM conformed.pl_summary;', 1.00);
