-- ============================================================
-- Finance side of the model (was missing): SAP finance actuals
-- vs Anaplan finance plan (BUDGET/FORECAST/TARGET) by cost
-- center / profit center / GL account. Also adds the dimensions
-- the doc specifies (GL account, cost center, profit center,
-- scenario) and extends dim_date with fiscal_quarter /
-- fiscal_year_period.
-- ============================================================

-- ---------- SAP_RAW: finance actuals ----------
CREATE TABLE sap_raw.finance_actual_raw (
    posting_date     DATE          NOT NULL,
    company_code     VARCHAR(10)   NOT NULL,
    cost_center      VARCHAR(20)   NOT NULL,
    profit_center    VARCHAR(20)   NOT NULL,
    gl_account       VARCHAR(20)   NOT NULL,
    product_id       VARCHAR(30)   NULL,
    customer_id      VARCHAR(30)   NULL,
    currency         VARCHAR(5)    NOT NULL DEFAULT 'INR',
    amount            DECIMAL(18,2) NOT NULL,
    debit_amount      DECIMAL(18,2) NOT NULL,
    credit_amount     DECIMAL(18,2) NOT NULL,
    sap_load_ts       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ---------- ANAPLAN_RAW: finance plan (budget/forecast/target) ----------
CREATE TABLE anaplan_raw.finance_plan_raw (
    plan_date        DATE          NOT NULL,
    plan_version     VARCHAR(20)   NOT NULL,
    scenario         VARCHAR(20)   NOT NULL,
    company_code     VARCHAR(10)   NOT NULL,
    cost_center      VARCHAR(20)   NOT NULL,
    profit_center    VARCHAR(20)   NOT NULL,
    gl_account       VARCHAR(20)   NOT NULL,
    product_id       VARCHAR(30)   NULL,
    customer_id      VARCHAR(30)   NULL,
    currency         VARCHAR(5)    NOT NULL DEFAULT 'INR',
    amount            DECIMAL(18,2) NOT NULL,
    anaplan_load_ts   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ---------- CONFORMED: additional dimensions ----------
CREATE TABLE conformed.dim_gl_account (
    gl_account       VARCHAR(20) PRIMARY KEY,
    gl_account_name  VARCHAR(255) NOT NULL,
    account_type     VARCHAR(50)  NOT NULL   -- REVENUE / COGS / OPEX / PAYROLL etc.
);

CREATE TABLE conformed.dim_cost_center (
    cost_center       VARCHAR(20) PRIMARY KEY,
    cost_center_name  VARCHAR(255) NOT NULL,
    company_code      VARCHAR(10)  NOT NULL
);

CREATE TABLE conformed.dim_profit_center (
    profit_center       VARCHAR(20) PRIMARY KEY,
    profit_center_name  VARCHAR(255) NOT NULL,
    company_code        VARCHAR(10)  NOT NULL
);

CREATE TABLE conformed.dim_scenario (
    scenario       VARCHAR(20) PRIMARY KEY,
    scenario_name  VARCHAR(100) NOT NULL,
    scenario_type  VARCHAR(20)  NOT NULL   -- PLAN
);

ALTER TABLE conformed.dim_date
    ADD COLUMN fiscal_quarter      VARCHAR(10)  NOT NULL DEFAULT 'Q1',
    ADD COLUMN fiscal_year_period  VARCHAR(20)  NOT NULL DEFAULT '';

-- ---------- CONFORMED: finance facts ----------
CREATE TABLE conformed.fact_finance_actual (
    date_key         DATE NOT NULL,
    company_code     VARCHAR(10) NOT NULL,
    cost_center      VARCHAR(20) NOT NULL,
    profit_center    VARCHAR(20) NOT NULL,
    gl_account       VARCHAR(20) NOT NULL,
    product_id       VARCHAR(30) NULL,
    customer_id      VARCHAR(30) NULL,
    currency         VARCHAR(5)  NOT NULL,
    actual_amount    DECIMAL(18,2) NOT NULL,
    debit_amount     DECIMAL(18,2) NOT NULL,
    credit_amount    DECIMAL(18,2) NOT NULL,
    source_system    VARCHAR(30) NOT NULL DEFAULT 'SAP_S4HANA',
    PRIMARY KEY (date_key, company_code, cost_center, profit_center, gl_account)
);

CREATE TABLE conformed.fact_finance_plan (
    date_key         DATE NOT NULL,
    plan_version     VARCHAR(20) NOT NULL,
    scenario         VARCHAR(20) NOT NULL,
    company_code     VARCHAR(10) NOT NULL,
    cost_center      VARCHAR(20) NOT NULL,
    profit_center    VARCHAR(20) NOT NULL,
    gl_account       VARCHAR(20) NOT NULL,
    currency         VARCHAR(5)  NOT NULL,
    plan_amount      DECIMAL(18,2) NOT NULL,
    source_system    VARCHAR(30) NOT NULL DEFAULT 'ANAPLAN',
    PRIMARY KEY (date_key, plan_version, scenario, company_code, cost_center, profit_center, gl_account)
);

-- ---------- CONFORMED: business glossary (Cortex Analyst layer) ----------
CREATE TABLE conformed.business_glossary (
    term            VARCHAR(100)  NOT NULL,
    definition      VARCHAR(1000) NOT NULL,
    business_rule   VARCHAR(2000) NOT NULL,
    source_system   VARCHAR(100)  NULL,
    metric_name     VARCHAR(200)  NULL,
    priority        INT           NOT NULL DEFAULT 100,
    PRIMARY KEY (term)
);
