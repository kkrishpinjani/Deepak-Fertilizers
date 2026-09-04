-- ============================================================
-- Extends the conformed model with the domains the "ontology"
-- doc introduces beyond finance/sales: vendors, raw materials,
-- inventory, purchase orders (PPV), production orders, AR/AP
-- aging, capex. These are the tables the 20-query ontology list
-- actually needs — built as plain MySQL facts/dims (no Neo4j;
-- the entity relationships are the foreign keys below).
-- ============================================================

-- ---------- raw materials (extend product master) ----------
INSERT INTO conformed.dim_product (product_id, product_name, product_category) VALUES
('RM-STEEL','Steel (raw material)','Raw Material'),
('RM-COPPER','Copper (raw material)','Raw Material'),
('RM-BEARING','Bearings (raw material)','Raw Material');

-- ---------- vendors ----------
CREATE TABLE conformed.dim_vendor (
    vendor_id    VARCHAR(20) PRIMARY KEY,
    vendor_name  VARCHAR(255) NOT NULL,
    country      VARCHAR(100) NOT NULL DEFAULT 'India'
);

INSERT INTO conformed.dim_vendor (vendor_id, vendor_name, country) VALUES
('VEND-A','Steel Corp','India'),
('VEND-B','Copper Traders','India'),
('VEND-C','Bearings Inc','India');

-- ---------- inventory (SAP MM) ----------
CREATE TABLE sap_raw.inventory_raw (
    plant               VARCHAR(20) NOT NULL,
    product_id          VARCHAR(30) NOT NULL,
    as_of_date          DATE NOT NULL,
    inventory_qty       DECIMAL(18,4) NOT NULL,
    inventory_value     DECIMAL(18,2) NOT NULL,
    last_movement_date  DATE NOT NULL
);

CREATE TABLE conformed.fact_inventory (
    plant               VARCHAR(20) NOT NULL,
    product_id          VARCHAR(30) NOT NULL,
    as_of_date          DATE NOT NULL,
    inventory_qty       DECIMAL(18,4) NOT NULL,
    inventory_value     DECIMAL(18,2) NOT NULL,
    last_movement_date  DATE NOT NULL,
    days_idle           INT NOT NULL,
    source_system       VARCHAR(30) NOT NULL DEFAULT 'SAP_S4HANA',
    PRIMARY KEY (plant, product_id, as_of_date)
);

INSERT INTO sap_raw.inventory_raw (plant, product_id, as_of_date, inventory_qty, inventory_value, last_movement_date) VALUES
('P001','MAT002','2026-02-28', 210, 14800000, '2025-10-10'),
('P001','MAT001','2026-02-28', 60,  4200000, '2026-02-20'),
('P002','MAT003','2026-02-28', 340, 9600000, '2025-11-05'),
('P002','MAT001','2026-02-28', 45,  3150000, '2026-02-22'),
('P001','RM-STEEL','2026-02-28', 1200, 5400000, '2026-02-15'),
('P002','RM-COPPER','2026-02-28', 800, 5680000, '2026-02-10'),
('P001','RM-BEARING','2026-02-28', 2000, 3640000, '2026-01-05');

INSERT INTO conformed.fact_inventory (plant, product_id, as_of_date, inventory_qty, inventory_value, last_movement_date, days_idle, source_system)
SELECT plant, product_id, as_of_date, inventory_qty, inventory_value, last_movement_date,
       DATEDIFF(as_of_date, last_movement_date), 'SAP_S4HANA'
FROM sap_raw.inventory_raw;

-- ---------- purchase orders (SAP MM — for Purchase Price Variance) ----------
CREATE TABLE sap_raw.purchase_orders_raw (
    po_id            VARCHAR(20) PRIMARY KEY,
    vendor_id        VARCHAR(20) NOT NULL,
    product_id       VARCHAR(30) NOT NULL,
    plant            VARCHAR(20) NOT NULL,
    po_date          DATE NOT NULL,
    po_qty           DECIMAL(18,4) NOT NULL,
    standard_price   DECIMAL(18,2) NOT NULL,
    actual_price     DECIMAL(18,2) NOT NULL
);

CREATE TABLE conformed.fact_purchase_order (
    po_id            VARCHAR(20) PRIMARY KEY,
    vendor_id        VARCHAR(20) NOT NULL,
    product_id       VARCHAR(30) NOT NULL,
    plant            VARCHAR(20) NOT NULL,
    po_date          DATE NOT NULL,
    po_qty           DECIMAL(18,4) NOT NULL,
    standard_price   DECIMAL(18,2) NOT NULL,
    actual_price     DECIMAL(18,2) NOT NULL,
    standard_value   DECIMAL(18,2) NOT NULL,
    actual_value     DECIMAL(18,2) NOT NULL,
    ppv              DECIMAL(18,2) NOT NULL,
    ppv_percent      DECIMAL(9,4) NOT NULL,
    source_system    VARCHAR(30) NOT NULL DEFAULT 'SAP_S4HANA'
);

INSERT INTO sap_raw.purchase_orders_raw (po_id, vendor_id, product_id, plant, po_date, po_qty, standard_price, actual_price) VALUES
('PO-1001','VEND-A','RM-STEEL','P001','2026-01-12', 600, 420, 467),
('PO-1002','VEND-A','RM-STEEL','P001','2026-02-10', 600, 420, 463),
('PO-1003','VEND-B','RM-COPPER','P002','2026-01-18', 400, 710, 774),
('PO-1004','VEND-B','RM-COPPER','P002','2026-02-15', 400, 710, 758),
('PO-1005','VEND-C','RM-BEARING','P001','2026-01-25', 1000, 1820, 1945),
('PO-1006','VEND-C','RM-BEARING','P001','2026-02-20', 1000, 1820, 1902);

INSERT INTO conformed.fact_purchase_order
  (po_id, vendor_id, product_id, plant, po_date, po_qty, standard_price, actual_price, standard_value, actual_value, ppv, ppv_percent, source_system)
SELECT
  po_id, vendor_id, product_id, plant, po_date, po_qty, standard_price, actual_price,
  po_qty * standard_price, po_qty * actual_price,
  po_qty * (actual_price - standard_price),
  (actual_price - standard_price) / standard_price * 100,
  'SAP_S4HANA'
FROM sap_raw.purchase_orders_raw;

-- ---------- production orders (SAP PP — for production cost variance + attainment) ----------
CREATE TABLE sap_raw.production_orders_raw (
    production_order_id  VARCHAR(20) PRIMARY KEY,
    product_id            VARCHAR(30) NOT NULL,
    plant                  VARCHAR(20) NOT NULL,
    order_date              DATE NOT NULL,
    planned_qty              DECIMAL(18,4) NOT NULL,
    actual_qty                DECIMAL(18,4) NOT NULL,
    standard_cost              DECIMAL(18,2) NOT NULL,
    actual_cost                DECIMAL(18,2) NOT NULL,
    material_variance            DECIMAL(18,2) NOT NULL,
    labor_variance                DECIMAL(18,2) NOT NULL,
    machine_variance                DECIMAL(18,2) NOT NULL,
    overhead_variance                 DECIMAL(18,2) NOT NULL
);

CREATE TABLE conformed.fact_production_order (
    production_order_id  VARCHAR(20) PRIMARY KEY,
    product_id            VARCHAR(30) NOT NULL,
    plant                  VARCHAR(20) NOT NULL,
    order_date              DATE NOT NULL,
    planned_qty              DECIMAL(18,4) NOT NULL,
    actual_qty                DECIMAL(18,4) NOT NULL,
    qty_shortfall              DECIMAL(18,4) NOT NULL,
    standard_cost                DECIMAL(18,2) NOT NULL,
    actual_cost                    DECIMAL(18,2) NOT NULL,
    cost_variance                    DECIMAL(18,2) NOT NULL,
    material_variance                  DECIMAL(18,2) NOT NULL,
    labor_variance                       DECIMAL(18,2) NOT NULL,
    machine_variance                       DECIMAL(18,2) NOT NULL,
    overhead_variance                        DECIMAL(18,2) NOT NULL,
    source_system                              VARCHAR(30) NOT NULL DEFAULT 'SAP_S4HANA'
);

INSERT INTO sap_raw.production_orders_raw
  (production_order_id, product_id, plant, order_date, planned_qty, actual_qty, standard_cost, actual_cost, material_variance, labor_variance, machine_variance, overhead_variance) VALUES
('PROD-2001','MAT001','P001','2026-01-31', 1080, 1000, 8400, 9180, 420, 180, 110, 70),
('PROD-2002','MAT001','P001','2026-02-28', 1150, 1100, 8400, 9050, 380, 150, 80, 40),
('PROD-2003','MAT002','P001','2026-01-31', 640, 600, 5600, 5920, 210, 70, 30, 10),
('PROD-2004','MAT002','P001','2026-02-28', 600, 550, 5600, 6010, 260, 90, 40, 20),
('PROD-2005','MAT003','P002','2026-01-31', 750, 700, 6800, 7350, 340, 120, 60, 30),
('PROD-2006','MAT003','P002','2026-02-28', 700, 650, 6800, 7480, 380, 150, 90, 60);

INSERT INTO conformed.fact_production_order
  (production_order_id, product_id, plant, order_date, planned_qty, actual_qty, qty_shortfall, standard_cost, actual_cost, cost_variance, material_variance, labor_variance, machine_variance, overhead_variance, source_system)
SELECT
  production_order_id, product_id, plant, order_date, planned_qty, actual_qty, planned_qty - actual_qty,
  standard_cost, actual_cost, actual_cost - standard_cost,
  material_variance, labor_variance, machine_variance, overhead_variance, 'SAP_S4HANA'
FROM sap_raw.production_orders_raw;

-- ---------- Anaplan production plan (for production-plan attainment) ----------
CREATE TABLE anaplan_raw.production_plan_raw (
    plan_date     DATE NOT NULL,
    plan_version  VARCHAR(20) NOT NULL,
    scenario      VARCHAR(20) NOT NULL,
    product_id    VARCHAR(30) NOT NULL,
    plant         VARCHAR(20) NOT NULL,
    planned_units DECIMAL(18,4) NOT NULL
);

CREATE TABLE conformed.fact_production_plan (
    date_key      DATE NOT NULL,
    plan_version  VARCHAR(20) NOT NULL,
    scenario      VARCHAR(20) NOT NULL,
    product_id    VARCHAR(30) NOT NULL,
    plant         VARCHAR(20) NOT NULL,
    planned_units DECIMAL(18,4) NOT NULL,
    source_system VARCHAR(30) NOT NULL DEFAULT 'ANAPLAN',
    PRIMARY KEY (date_key, plan_version, scenario, product_id, plant)
);

INSERT INTO anaplan_raw.production_plan_raw (plan_date, plan_version, scenario, product_id, plant, planned_units) VALUES
('2026-01-31','V1','BUDGET','MAT001','P001', 1080),
('2026-02-28','V1','BUDGET','MAT001','P001', 1150),
('2026-01-31','V1','BUDGET','MAT002','P001', 640),
('2026-02-28','V1','BUDGET','MAT002','P001', 600),
('2026-01-31','V1','BUDGET','MAT003','P002', 750),
('2026-02-28','V1','BUDGET','MAT003','P002', 700);

INSERT INTO conformed.fact_production_plan (date_key, plan_version, scenario, product_id, plant, planned_units, source_system)
SELECT plan_date, plan_version, scenario, product_id, plant, planned_units, 'ANAPLAN'
FROM anaplan_raw.production_plan_raw;

-- ---------- AR aging (SAP FI — for cash risk / working capital) ----------
CREATE TABLE sap_raw.ar_aging_raw (
    customer_id   VARCHAR(30) NOT NULL,
    as_of_date    DATE NOT NULL,
    current_amt   DECIMAL(18,2) NOT NULL,
    d1_30         DECIMAL(18,2) NOT NULL,
    d31_60        DECIMAL(18,2) NOT NULL,
    d61_90        DECIMAL(18,2) NOT NULL,
    d90_plus      DECIMAL(18,2) NOT NULL
);

CREATE TABLE conformed.fact_ar_aging (
    customer_id     VARCHAR(30) NOT NULL,
    as_of_date      DATE NOT NULL,
    current_amt     DECIMAL(18,2) NOT NULL,
    d1_30           DECIMAL(18,2) NOT NULL,
    d31_60          DECIMAL(18,2) NOT NULL,
    d61_90          DECIMAL(18,2) NOT NULL,
    d90_plus        DECIMAL(18,2) NOT NULL,
    overdue_total   DECIMAL(18,2) NOT NULL,
    total_ar        DECIMAL(18,2) NOT NULL,
    source_system   VARCHAR(30) NOT NULL DEFAULT 'SAP_S4HANA',
    PRIMARY KEY (customer_id, as_of_date)
);

INSERT INTO sap_raw.ar_aging_raw (customer_id, as_of_date, current_amt, d1_30, d31_60, d61_90, d90_plus) VALUES
('C001','2026-02-28', 900000, 600000, 400000, 200000, 300000),
('C002','2026-02-28', 700000, 500000, 300000, 150000, 100000),
('C003','2026-02-28', 850000, 450000, 350000, 200000, 250000),
('C004','2026-02-28', 400000, 300000, 200000, 100000, 100000);

INSERT INTO conformed.fact_ar_aging (customer_id, as_of_date, current_amt, d1_30, d31_60, d61_90, d90_plus, overdue_total, total_ar, source_system)
SELECT
  customer_id, as_of_date, current_amt, d1_30, d31_60, d61_90, d90_plus,
  d1_30 + d31_60 + d61_90 + d90_plus,
  current_amt + d1_30 + d31_60 + d61_90 + d90_plus,
  'SAP_S4HANA'
FROM sap_raw.ar_aging_raw;

-- ---------- AP aging (SAP FI — for procurement cash) ----------
CREATE TABLE sap_raw.ap_aging_raw (
    vendor_id     VARCHAR(20) NOT NULL,
    as_of_date    DATE NOT NULL,
    current_amt   DECIMAL(18,2) NOT NULL,
    d1_30         DECIMAL(18,2) NOT NULL,
    d31_60        DECIMAL(18,2) NOT NULL,
    d60_plus      DECIMAL(18,2) NOT NULL
);

CREATE TABLE conformed.fact_ap_aging (
    vendor_id      VARCHAR(20) NOT NULL,
    as_of_date     DATE NOT NULL,
    current_amt    DECIMAL(18,2) NOT NULL,
    d1_30          DECIMAL(18,2) NOT NULL,
    d31_60         DECIMAL(18,2) NOT NULL,
    d60_plus       DECIMAL(18,2) NOT NULL,
    total_ap       DECIMAL(18,2) NOT NULL,
    source_system  VARCHAR(30) NOT NULL DEFAULT 'SAP_S4HANA',
    PRIMARY KEY (vendor_id, as_of_date)
);

INSERT INTO sap_raw.ap_aging_raw (vendor_id, as_of_date, current_amt, d1_30, d31_60, d60_plus) VALUES
('VEND-A','2026-02-28', 380000, 220000, 90000, 40000),
('VEND-B','2026-02-28', 310000, 180000, 60000, 20000),
('VEND-C','2026-02-28', 250000, 140000, 50000, 10000);

INSERT INTO conformed.fact_ap_aging (vendor_id, as_of_date, current_amt, d1_30, d31_60, d60_plus, total_ap, source_system)
SELECT vendor_id, as_of_date, current_amt, d1_30, d31_60, d60_plus,
       current_amt + d1_30 + d31_60 + d60_plus, 'SAP_S4HANA'
FROM sap_raw.ap_aging_raw;

-- ---------- capex (SAP Asset Accounting — for capex vs asset economics) ----------
CREATE TABLE sap_raw.capex_raw (
    asset_id             VARCHAR(20) PRIMARY KEY,
    asset_name           VARCHAR(255) NOT NULL,
    plant                VARCHAR(20) NOT NULL,
    capex_amount         DECIMAL(18,2) NOT NULL,
    capitalized_date     DATE NOT NULL,
    useful_life_years    INT NOT NULL
);

CREATE TABLE conformed.fact_capex (
    asset_id             VARCHAR(20) PRIMARY KEY,
    asset_name           VARCHAR(255) NOT NULL,
    plant                VARCHAR(20) NOT NULL,
    capex_amount         DECIMAL(18,2) NOT NULL,
    capitalized_date     DATE NOT NULL,
    useful_life_years    INT NOT NULL,
    annual_depreciation  DECIMAL(18,2) NOT NULL,
    source_system        VARCHAR(30) NOT NULL DEFAULT 'SAP_S4HANA'
);

INSERT INTO sap_raw.capex_raw (asset_id, asset_name, plant, capex_amount, capitalized_date, useful_life_years) VALUES
('AST-01','Pune CNC Line 2','P001', 42000000, '2024-06-01', 10),
('AST-02','Chennai Assembly Robot','P002', 28000000, '2025-01-15', 8);

INSERT INTO conformed.fact_capex (asset_id, asset_name, plant, capex_amount, capitalized_date, useful_life_years, annual_depreciation, source_system)
SELECT asset_id, asset_name, plant, capex_amount, capitalized_date, useful_life_years,
       capex_amount / useful_life_years, 'SAP_S4HANA'
FROM sap_raw.capex_raw;

-- ---------- order-to-cash status flags (extend sales_order_items) ----------
ALTER TABLE sap_raw.sales_order_items
  ADD COLUMN delivered_flag TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN billed_flag    TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN posted_flag    TINYINT(1) NOT NULL DEFAULT 1;

-- Simulate a few O2C gaps: one order not yet billed, one billed but not posted.
UPDATE sap_raw.sales_order_items SET billed_flag = 0, posted_flag = 0 WHERE sales_document_id = 'SO-000006';
UPDATE sap_raw.sales_order_items SET posted_flag = 0 WHERE sales_document_id = 'SO-000008';
