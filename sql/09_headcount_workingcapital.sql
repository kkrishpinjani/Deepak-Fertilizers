-- ============================================================
-- Headcount planning + working-capital planning — Anaplan-only
-- per the doc (no SAP actual source for either), so these are
-- plan tables/views with no actual-vs-plan variance.
-- ============================================================

CREATE TABLE anaplan_raw.headcount_plan_raw (
    plan_date              DATE NOT NULL,
    plan_version            VARCHAR(20) NOT NULL,
    scenario                 VARCHAR(20) NOT NULL,
    company_code              VARCHAR(10) NOT NULL,
    cost_center                 VARCHAR(20) NOT NULL,
    profit_center                VARCHAR(20) NOT NULL,
    planned_headcount              DECIMAL(18,4) NOT NULL,
    planned_compensation             DECIMAL(18,2) NOT NULL,
    currency                          VARCHAR(5) NOT NULL DEFAULT 'INR',
    anaplan_load_ts                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE anaplan_raw.working_capital_plan_raw (
    plan_date         DATE NOT NULL,
    plan_version        VARCHAR(20) NOT NULL,
    scenario              VARCHAR(20) NOT NULL,
    company_code            VARCHAR(10) NOT NULL,
    metric_name               VARCHAR(50) NOT NULL,  -- AR / AP / INVENTORY
    planned_amount              DECIMAL(18,2) NOT NULL,
    currency                      VARCHAR(5) NOT NULL DEFAULT 'INR',
    anaplan_load_ts                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO anaplan_raw.headcount_plan_raw (plan_date, plan_version, scenario, company_code, cost_center, profit_center, planned_headcount, planned_compensation, currency) VALUES
('2026-01-31','V1','BUDGET','1000','CC-PUNE-MFG','PC-MOTORS',85,1700000,'INR'),
('2026-01-31','V1','BUDGET','1000','CC-CHN-MFG','PC-AUTOMATION',52,1040000,'INR'),
('2026-01-31','V1','BUDGET','1000','CC-CORP-SGA','PC-CORP',18,720000,'INR'),
('2026-02-28','V1','BUDGET','1000','CC-PUNE-MFG','PC-MOTORS',87,1740000,'INR'),
('2026-02-28','V1','BUDGET','1000','CC-CHN-MFG','PC-AUTOMATION',53,1060000,'INR'),
('2026-02-28','V1','BUDGET','1000','CC-CORP-SGA','PC-CORP',18,720000,'INR');

INSERT INTO anaplan_raw.working_capital_plan_raw (plan_date, plan_version, scenario, company_code, metric_name, planned_amount, currency) VALUES
('2026-01-31','V1','BUDGET','1000','ACCOUNTS_RECEIVABLE',1850000,'INR'),
('2026-01-31','V1','BUDGET','1000','ACCOUNTS_PAYABLE', 980000,'INR'),
('2026-01-31','V1','BUDGET','1000','INVENTORY',        1420000,'INR'),
('2026-02-28','V1','BUDGET','1000','ACCOUNTS_RECEIVABLE',1930000,'INR'),
('2026-02-28','V1','BUDGET','1000','ACCOUNTS_PAYABLE', 1010000,'INR'),
('2026-02-28','V1','BUDGET','1000','INVENTORY',        1465000,'INR');

CREATE TABLE conformed.fact_headcount_plan (
    date_key             DATE NOT NULL,
    plan_version           VARCHAR(20) NOT NULL,
    scenario                 VARCHAR(20) NOT NULL,
    company_code               VARCHAR(10) NOT NULL,
    cost_center                  VARCHAR(20) NOT NULL,
    profit_center                  VARCHAR(20) NOT NULL,
    planned_headcount                DECIMAL(18,4) NOT NULL,
    planned_compensation               DECIMAL(18,2) NOT NULL,
    currency                             VARCHAR(5) NOT NULL,
    source_system                          VARCHAR(30) NOT NULL DEFAULT 'ANAPLAN',
    PRIMARY KEY (date_key, plan_version, scenario, company_code, cost_center, profit_center)
);

CREATE TABLE conformed.fact_working_capital_plan (
    date_key         DATE NOT NULL,
    plan_version        VARCHAR(20) NOT NULL,
    scenario               VARCHAR(20) NOT NULL,
    company_code              VARCHAR(10) NOT NULL,
    metric_name                 VARCHAR(50) NOT NULL,
    planned_amount                DECIMAL(18,2) NOT NULL,
    currency                        VARCHAR(5) NOT NULL,
    source_system                     VARCHAR(30) NOT NULL DEFAULT 'ANAPLAN',
    PRIMARY KEY (date_key, plan_version, scenario, company_code, metric_name)
);

INSERT INTO conformed.fact_headcount_plan
  (date_key, plan_version, scenario, company_code, cost_center, profit_center, planned_headcount, planned_compensation, currency, source_system)
SELECT plan_date, plan_version, scenario, company_code, cost_center, profit_center, planned_headcount, planned_compensation, currency, 'ANAPLAN'
FROM anaplan_raw.headcount_plan_raw;

INSERT INTO conformed.fact_working_capital_plan
  (date_key, plan_version, scenario, company_code, metric_name, planned_amount, currency, source_system)
SELECT plan_date, plan_version, scenario, company_code, metric_name, planned_amount, currency, 'ANAPLAN'
FROM anaplan_raw.working_capital_plan_raw;

-- ---------- summary views ----------
CREATE VIEW conformed.headcount_summary AS
SELECT
    hp.date_key,
    cc.cost_center_name,
    pc.profit_center_name,
    hp.planned_headcount,
    hp.planned_compensation,
    CASE WHEN hp.planned_headcount = 0 THEN NULL
         ELSE hp.planned_compensation / hp.planned_headcount
    END AS compensation_per_head
FROM conformed.fact_headcount_plan hp
LEFT JOIN conformed.dim_cost_center cc   ON hp.cost_center = cc.cost_center
LEFT JOIN conformed.dim_profit_center pc ON hp.profit_center = pc.profit_center
WHERE hp.scenario = 'BUDGET';

CREATE VIEW conformed.working_capital_summary AS
SELECT
    date_key,
    SUM(CASE WHEN metric_name = 'ACCOUNTS_RECEIVABLE' THEN planned_amount ELSE 0 END) AS accounts_receivable,
    SUM(CASE WHEN metric_name = 'ACCOUNTS_PAYABLE'    THEN planned_amount ELSE 0 END) AS accounts_payable,
    SUM(CASE WHEN metric_name = 'INVENTORY'            THEN planned_amount ELSE 0 END) AS inventory,
    SUM(CASE WHEN metric_name = 'ACCOUNTS_RECEIVABLE' THEN planned_amount ELSE 0 END)
      + SUM(CASE WHEN metric_name = 'INVENTORY' THEN planned_amount ELSE 0 END)
      - SUM(CASE WHEN metric_name = 'ACCOUNTS_PAYABLE' THEN planned_amount ELSE 0 END) AS net_working_capital
FROM conformed.fact_working_capital_plan
WHERE scenario = 'BUDGET'
GROUP BY date_key;
