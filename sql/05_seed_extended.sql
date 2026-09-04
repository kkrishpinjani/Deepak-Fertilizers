-- ============================================================
-- Extended demo data: currency, FORECAST/TARGET scenarios,
-- finance actuals vs plan by cost center/GL account, new
-- dimension rows, business glossary, fiscal calendar detail.
-- ============================================================

-- ---------- currency columns (doc carries CURRENCY throughout) ----------
ALTER TABLE sap_raw.sales_actual_raw   ADD COLUMN currency VARCHAR(5) NOT NULL DEFAULT 'INR';
ALTER TABLE anaplan_raw.sales_plan_raw ADD COLUMN currency VARCHAR(5) NOT NULL DEFAULT 'INR';
ALTER TABLE conformed.fact_sales_actual ADD COLUMN currency VARCHAR(5) NOT NULL DEFAULT 'INR';
ALTER TABLE conformed.fact_sales_plan   ADD COLUMN currency VARCHAR(5) NOT NULL DEFAULT 'INR';

-- ---------- fiscal calendar detail ----------
UPDATE conformed.dim_date SET fiscal_quarter = 'Q1', fiscal_year_period = '2026-P01' WHERE date_key = '2026-01-31';
UPDATE conformed.dim_date SET fiscal_quarter = 'Q1', fiscal_year_period = '2026-P02' WHERE date_key = '2026-02-28';

-- ---------- dim_scenario ----------
INSERT INTO conformed.dim_scenario (scenario, scenario_name, scenario_type) VALUES
('BUDGET','Approved Budget','PLAN'),
('FORECAST','Latest Forecast','PLAN'),
('TARGET','Stretch Target','PLAN');

-- ---------- dim_cost_center / dim_profit_center / dim_gl_account ----------
INSERT INTO conformed.dim_cost_center (cost_center, cost_center_name, company_code) VALUES
('CC-PUNE-MFG','Pune Manufacturing','1000'),
('CC-CHN-MFG','Chennai Manufacturing','1000'),
('CC-CORP-SGA','Corporate SG&A','1000');

INSERT INTO conformed.dim_profit_center (profit_center, profit_center_name, company_code) VALUES
('PC-MOTORS','Motors & Pumps Division','1000'),
('PC-AUTOMATION','Automation Division','1000'),
('PC-CORP','Corporate','1000');

INSERT INTO conformed.dim_gl_account (gl_account, gl_account_name, account_type) VALUES
('GL-4000','Cost of Goods Sold','COGS'),
('GL-6100','Manufacturing Overhead','OPEX'),
('GL-6200','Payroll & Benefits','PAYROLL'),
('GL-6300','SG&A Expense','OPEX');

-- ---------- ANAPLAN_RAW: add FORECAST + TARGET sales scenarios ----------
INSERT INTO anaplan_raw.sales_plan_raw
  (plan_date, plan_version, scenario, company_code, plant, product_id, customer_id, sales_region, planned_revenue, planned_quantity, currency)
VALUES
-- FORECAST (latest view, slightly tighter to actuals than budget)
('2026-01-31','V2','FORECAST','1000','P001','MAT001','C001','West', 1230000,1020,'INR'),
('2026-01-31','V2','FORECAST','1000','P001','MAT002','C002','West',  820000, 610,'INR'),
('2026-01-31','V2','FORECAST','1000','P002','MAT001','C003','South', 930000, 690,'INR'),
('2026-01-31','V2','FORECAST','1000','P002','MAT003','C004','South', 610000, 405,'INR'),
('2026-02-28','V2','FORECAST','1000','P001','MAT001','C001','West', 1320000,1080,'INR'),
('2026-02-28','V2','FORECAST','1000','P001','MAT002','C002','West',  770000, 560,'INR'),
('2026-02-28','V2','FORECAST','1000','P002','MAT001','C003','South', 910000, 660,'INR'),
('2026-02-28','V2','FORECAST','1000','P002','MAT003','C004','South', 590000, 395,'INR'),
-- TARGET (stretch goals, above budget)
('2026-01-31','V1','TARGET','1000','P001','MAT001','C001','West', 1400000,1150,'INR'),
('2026-01-31','V1','TARGET','1000','P001','MAT002','C002','West',  900000, 660,'INR'),
('2026-01-31','V1','TARGET','1000','P002','MAT001','C003','South', 970000, 720,'INR'),
('2026-01-31','V1','TARGET','1000','P002','MAT003','C004','South', 700000, 460,'INR'),
('2026-02-28','V1','TARGET','1000','P001','MAT001','C001','West', 1350000,1100,'INR'),
('2026-02-28','V1','TARGET','1000','P001','MAT002','C002','West',  880000, 640,'INR'),
('2026-02-28','V1','TARGET','1000','P002','MAT001','C003','South', 1020000, 750,'INR'),
('2026-02-28','V1','TARGET','1000','P002','MAT003','C004','South', 670000, 450,'INR');

-- ---------- SAP_RAW: finance actuals (COGS + OPEX + Payroll by cost center) ----------
INSERT INTO sap_raw.finance_actual_raw
  (posting_date, company_code, cost_center, profit_center, gl_account, product_id, customer_id, currency, amount, debit_amount, credit_amount)
VALUES
('2026-01-31','1000','CC-PUNE-MFG','PC-MOTORS','GL-4000','MAT001','C001','INR', 840000, 840000, 0),
('2026-01-31','1000','CC-PUNE-MFG','PC-MOTORS','GL-6100',NULL,NULL,'INR', 210000, 210000, 0),
('2026-01-31','1000','CC-PUNE-MFG','PC-MOTORS','GL-6200',NULL,NULL,'INR', 180000, 180000, 0),
('2026-01-31','1000','CC-CHN-MFG','PC-AUTOMATION','GL-4000','MAT003','C004','INR', 420000, 420000, 0),
('2026-01-31','1000','CC-CHN-MFG','PC-AUTOMATION','GL-6100',NULL,NULL,'INR', 130000, 130000, 0),
('2026-01-31','1000','CC-CHN-MFG','PC-AUTOMATION','GL-6200',NULL,NULL,'INR', 110000, 110000, 0),
('2026-01-31','1000','CC-CORP-SGA','PC-CORP','GL-6300',NULL,NULL,'INR', 260000, 260000, 0),
('2026-02-28','1000','CC-PUNE-MFG','PC-MOTORS','GL-4000','MAT001','C001','INR', 945000, 945000, 0),
('2026-02-28','1000','CC-PUNE-MFG','PC-MOTORS','GL-6100',NULL,NULL,'INR', 225000, 225000, 0),
('2026-02-28','1000','CC-PUNE-MFG','PC-MOTORS','GL-6200',NULL,NULL,'INR', 185000, 185000, 0),
('2026-02-28','1000','CC-CHN-MFG','PC-AUTOMATION','GL-4000','MAT003','C004','INR', 406000, 406000, 0),
('2026-02-28','1000','CC-CHN-MFG','PC-AUTOMATION','GL-6100',NULL,NULL,'INR', 125000, 125000, 0),
('2026-02-28','1000','CC-CHN-MFG','PC-AUTOMATION','GL-6200',NULL,NULL,'INR', 112000, 112000, 0),
('2026-02-28','1000','CC-CORP-SGA','PC-CORP','GL-6300',NULL,NULL,'INR', 270000, 270000, 0);

-- ---------- ANAPLAN_RAW: finance plan (BUDGET + FORECAST) ----------
INSERT INTO anaplan_raw.finance_plan_raw
  (plan_date, plan_version, scenario, company_code, cost_center, profit_center, gl_account, currency, amount)
VALUES
('2026-01-31','V1','BUDGET','1000','CC-PUNE-MFG','PC-MOTORS','GL-4000','INR', 800000),
('2026-01-31','V1','BUDGET','1000','CC-PUNE-MFG','PC-MOTORS','GL-6100','INR', 200000),
('2026-01-31','V1','BUDGET','1000','CC-PUNE-MFG','PC-MOTORS','GL-6200','INR', 175000),
('2026-01-31','V1','BUDGET','1000','CC-CHN-MFG','PC-AUTOMATION','GL-4000','INR', 400000),
('2026-01-31','V1','BUDGET','1000','CC-CHN-MFG','PC-AUTOMATION','GL-6100','INR', 120000),
('2026-01-31','V1','BUDGET','1000','CC-CHN-MFG','PC-AUTOMATION','GL-6200','INR', 105000),
('2026-01-31','V1','BUDGET','1000','CC-CORP-SGA','PC-CORP','GL-6300','INR', 240000),
('2026-02-28','V1','BUDGET','1000','CC-PUNE-MFG','PC-MOTORS','GL-4000','INR', 880000),
('2026-02-28','V1','BUDGET','1000','CC-PUNE-MFG','PC-MOTORS','GL-6100','INR', 215000),
('2026-02-28','V1','BUDGET','1000','CC-PUNE-MFG','PC-MOTORS','GL-6200','INR', 180000),
('2026-02-28','V1','BUDGET','1000','CC-CHN-MFG','PC-AUTOMATION','GL-4000','INR', 390000),
('2026-02-28','V1','BUDGET','1000','CC-CHN-MFG','PC-AUTOMATION','GL-6100','INR', 118000),
('2026-02-28','V1','BUDGET','1000','CC-CHN-MFG','PC-AUTOMATION','GL-6200','INR', 108000),
('2026-02-28','V1','BUDGET','1000','CC-CORP-SGA','PC-CORP','GL-6300','INR', 250000),

('2026-01-31','V2','FORECAST','1000','CC-PUNE-MFG','PC-MOTORS','GL-4000','INR', 830000),
('2026-01-31','V2','FORECAST','1000','CC-CHN-MFG','PC-AUTOMATION','GL-4000','INR', 415000),
('2026-02-28','V2','FORECAST','1000','CC-PUNE-MFG','PC-MOTORS','GL-4000','INR', 930000),
('2026-02-28','V2','FORECAST','1000','CC-CHN-MFG','PC-AUTOMATION','GL-4000','INR', 400000);

-- ---------- business glossary ----------
INSERT INTO conformed.business_glossary (term, definition, business_rule, source_system, metric_name, priority) VALUES
('Revenue','Actual invoiced sales.','Revenue always comes from SAP actual sales, never from Anaplan.','SAP S/4HANA','actual_revenue',10),
('Actual','A SAP S/4HANA posted transaction.','SAP is the authoritative source for actuals.','SAP S/4HANA',NULL,10),
('Budget','Anaplan approved BUDGET scenario.','Use when the user says "budget" or "actual vs budget".','ANAPLAN','budget_amount / budget_revenue',20),
('Forecast','Anaplan latest FORECAST scenario.','Use when the user says "forecast" or "actual vs forecast".','ANAPLAN','forecast_amount / forecast_revenue',20),
('Target','Anaplan stretch TARGET scenario.','Use only when the user explicitly asks about targets.','ANAPLAN','target_amount',30),
('Plan','Anaplan planning scenario in general.','Use the Anaplan planned value unless Budget/Forecast/Target is specified.','ANAPLAN',NULL,20),
('Variance','Actual minus Plan.','Positive = above plan (beat plan). Negative = below plan (missed plan).',NULL,'revenue_variance / financial_variance',10),
('Attainment','Actual divided by Plan, expressed as a percentage.','Revenue attainment = Actual Revenue / Planned Revenue * 100.',NULL,'revenue_attainment_percent',10),
('Missed Plan','Negative variance (actual below plan).','Sort ascending (most negative first) when asked for "worst" or "underperforming".',NULL,NULL,15),
('Beat Plan','Positive variance (actual above plan).','Sort descending when asked for "top" or "best".',NULL,NULL,15),
('Gross Margin','Gross Profit divided by Revenue, as a percentage.','Gross Profit = Actual Revenue - Actual COGS.',NULL,'gross_margin_percent',10),
('COGS','Cost of Goods Sold, from SAP actual sales.','Always an actual figure from SAP, never planned.','SAP S/4HANA','actual_cogs',20);

-- ---------- reload conformed facts to include ALL scenarios + currency ----------
TRUNCATE TABLE conformed.fact_sales_plan;
INSERT INTO conformed.fact_sales_plan
  (date_key, plan_version, scenario, company_code, plant, product_id, customer_id, sales_region, planned_revenue, planned_quantity, currency, source_system)
SELECT
  plan_date, plan_version, scenario, company_code, plant, product_id, customer_id, sales_region,
  planned_revenue, planned_quantity, currency, 'ANAPLAN'
FROM anaplan_raw.sales_plan_raw;

INSERT INTO conformed.fact_finance_actual
  (date_key, company_code, cost_center, profit_center, gl_account, product_id, customer_id, currency, actual_amount, debit_amount, credit_amount, source_system)
SELECT
  posting_date, company_code, cost_center, profit_center, gl_account, product_id, customer_id, currency,
  amount, debit_amount, credit_amount, 'SAP_S4HANA'
FROM sap_raw.finance_actual_raw;

INSERT INTO conformed.fact_finance_plan
  (date_key, plan_version, scenario, company_code, cost_center, profit_center, gl_account, currency, plan_amount, source_system)
SELECT
  plan_date, plan_version, scenario, company_code, cost_center, profit_center, gl_account, currency,
  amount, 'ANAPLAN'
FROM anaplan_raw.finance_plan_raw;
