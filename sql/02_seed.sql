-- ============================================================
-- Demo data — mirrors the worked example in the source doc:
-- 2 plants, 3 products, 4 customers, 2 fiscal periods (Jan/Feb 2026)
-- SAP actual sales vs Anaplan BUDGET sales plan.
-- ============================================================

-- ---------- SAP_RAW ----------
INSERT INTO sap_raw.sales_actual_raw
  (sales_date, company_code, plant, product_id, customer_id, sales_region, actual_revenue, actual_quantity, actual_cogs)
VALUES
('2026-01-31','1000','P001','MAT001','C001','West', 1200000,1000,840000),
('2026-01-31','1000','P001','MAT002','C002','West',  800000, 600,560000),
('2026-01-31','1000','P002','MAT001','C003','South', 950000, 700,665000),
('2026-01-31','1000','P002','MAT003','C004','South', 600000, 400,420000),
('2026-02-28','1000','P001','MAT001','C001','West', 1350000,1100,945000),
('2026-02-28','1000','P001','MAT002','C002','West',  750000, 550,525000),
('2026-02-28','1000','P002','MAT001','C003','South', 900000, 650,630000),
('2026-02-28','1000','P002','MAT003','C004','South', 580000, 390,406000);

-- ---------- ANAPLAN_RAW ----------
INSERT INTO anaplan_raw.sales_plan_raw
  (plan_date, plan_version, scenario, company_code, plant, product_id, customer_id, sales_region, planned_revenue, planned_quantity)
VALUES
('2026-01-31','V1','BUDGET','1000','P001','MAT001','C001','West', 1300000,1050),
('2026-01-31','V1','BUDGET','1000','P001','MAT002','C002','West',  850000, 620),
('2026-01-31','V1','BUDGET','1000','P002','MAT001','C003','South', 900000, 680),
('2026-01-31','V1','BUDGET','1000','P002','MAT003','C004','South', 650000, 430),
('2026-02-28','V1','BUDGET','1000','P001','MAT001','C001','West', 1250000,1000),
('2026-02-28','V1','BUDGET','1000','P001','MAT002','C002','West',  820000, 600),
('2026-02-28','V1','BUDGET','1000','P002','MAT001','C003','South', 950000, 700),
('2026-02-28','V1','BUDGET','1000','P002','MAT003','C004','South', 620000, 420);

-- ---------- CONFORMED dimensions ----------
INSERT INTO conformed.dim_product (product_id, product_name, product_category) VALUES
('MAT001','Industrial Motor','Motors'),
('MAT002','Industrial Pump','Pumps'),
('MAT003','Control System','Automation');

INSERT INTO conformed.dim_customer (customer_id, customer_name, region) VALUES
('C001','ABC Manufacturing','West'),
('C002','XYZ Engineering','West'),
('C003','Global Industries','South'),
('C004','Precision Components','South');

INSERT INTO conformed.dim_organization (plant, plant_name, company_code, company_name) VALUES
('P001','Pune Manufacturing Plant','1000','Demo Manufacturing India'),
('P002','Chennai Manufacturing Plant','1000','Demo Manufacturing India');

INSERT INTO conformed.dim_date (date_key, calendar_year, month_name, fiscal_year, fiscal_period) VALUES
('2026-01-31',2026,'January',2026,1),
('2026-02-28',2026,'February',2026,2);

-- ---------- CONFORMED facts (loaded from *_raw) ----------
INSERT INTO conformed.fact_sales_actual
  (date_key, company_code, plant, product_id, customer_id, sales_region, actual_revenue, actual_quantity, actual_cogs, source_system)
SELECT
  sales_date, company_code, plant, product_id, customer_id, sales_region,
  actual_revenue, actual_quantity, actual_cogs, 'SAP_S4HANA'
FROM sap_raw.sales_actual_raw;

INSERT INTO conformed.fact_sales_plan
  (date_key, plan_version, scenario, company_code, plant, product_id, customer_id, sales_region, planned_revenue, planned_quantity, source_system)
SELECT
  plan_date, plan_version, scenario, company_code, plant, product_id, customer_id, sales_region,
  planned_revenue, planned_quantity, 'ANAPLAN'
FROM anaplan_raw.sales_plan_raw
WHERE scenario = 'BUDGET';
