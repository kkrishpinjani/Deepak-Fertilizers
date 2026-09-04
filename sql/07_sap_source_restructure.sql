-- ============================================================
-- Restructures sap_raw from the simplified single-table shape
-- into the doc's actual SAP source-object split:
--   FI_DOCUMENTS + FI_DOCUMENT_LINES   (finance postings)
--   SALES_ORDERS + SALES_ORDER_ITEMS   (order volume)
--   BILLING_DOCUMENTS + BILLING_ITEMS  (revenue/COGS — the doc
--     explicitly prefers billing over order value for revenue)
-- conformed.fact_finance_actual / fact_sales_actual are then
-- rebuilt from these instead of the old flat raw tables.
-- ============================================================

DROP TABLE IF EXISTS sap_raw.finance_actual_raw;
DROP TABLE IF EXISTS sap_raw.sales_actual_raw;

-- ---------- FI: header + lines ----------
CREATE TABLE sap_raw.fi_documents (
    accounting_document_id  VARCHAR(20) PRIMARY KEY,
    company_code            VARCHAR(10) NOT NULL,
    fiscal_year              INT NOT NULL,
    document_type            VARCHAR(10) NOT NULL DEFAULT 'SA',
    document_date            DATE NOT NULL,
    posting_date             DATE NOT NULL,
    currency                 VARCHAR(5)  NOT NULL DEFAULT 'INR',
    header_text               VARCHAR(255)
);

CREATE TABLE sap_raw.fi_document_lines (
    accounting_document_id   VARCHAR(20) NOT NULL,
    accounting_document_line INT NOT NULL,
    cost_center               VARCHAR(20) NOT NULL,
    profit_center              VARCHAR(20) NOT NULL,
    gl_account                 VARCHAR(20) NOT NULL,
    product_id                 VARCHAR(30) NULL,
    customer_id                VARCHAR(30) NULL,
    debit_amount                DECIMAL(18,2) NOT NULL,
    credit_amount                DECIMAL(18,2) NOT NULL,
    amount                       DECIMAL(18,2) NOT NULL,
    PRIMARY KEY (accounting_document_id, accounting_document_line),
    CONSTRAINT fk_fi_line_doc FOREIGN KEY (accounting_document_id)
        REFERENCES sap_raw.fi_documents (accounting_document_id)
);

-- ---------- Sales orders: header + items ----------
CREATE TABLE sap_raw.sales_orders (
    sales_document_id     VARCHAR(20) PRIMARY KEY,
    company_code          VARCHAR(10) NOT NULL,
    customer_id           VARCHAR(30) NOT NULL,
    sales_organization    VARCHAR(20) NOT NULL DEFAULT '1000',
    distribution_channel  VARCHAR(20) NOT NULL DEFAULT '10',
    division              VARCHAR(20) NOT NULL DEFAULT '00',
    sales_region          VARCHAR(50) NOT NULL,
    order_date             DATE NOT NULL,
    currency                VARCHAR(5)  NOT NULL DEFAULT 'INR'
);

CREATE TABLE sap_raw.sales_order_items (
    sales_document_id    VARCHAR(20) NOT NULL,
    sales_document_item  INT NOT NULL,
    product_id            VARCHAR(30) NOT NULL,
    plant                  VARCHAR(20) NOT NULL,
    customer_id             VARCHAR(30) NOT NULL,
    order_quantity           DECIMAL(18,4) NOT NULL,
    net_value                 DECIMAL(18,2) NOT NULL,
    PRIMARY KEY (sales_document_id, sales_document_item),
    CONSTRAINT fk_so_item_header FOREIGN KEY (sales_document_id)
        REFERENCES sap_raw.sales_orders (sales_document_id)
);

-- ---------- Billing: header + items (revenue source of truth) ----------
CREATE TABLE sap_raw.billing_documents (
    billing_document_id  VARCHAR(20) PRIMARY KEY,
    company_code         VARCHAR(10) NOT NULL,
    customer_id           VARCHAR(30) NOT NULL,
    billing_date           DATE NOT NULL,
    currency                VARCHAR(5)  NOT NULL DEFAULT 'INR'
);

CREATE TABLE sap_raw.billing_items (
    billing_document_id   VARCHAR(20) NOT NULL,
    billing_document_item  INT NOT NULL,
    product_id              VARCHAR(30) NOT NULL,
    plant                    VARCHAR(20) NOT NULL,
    customer_id               VARCHAR(30) NOT NULL,
    sales_region                VARCHAR(50) NOT NULL,
    billing_quantity              DECIMAL(18,4) NOT NULL,
    net_revenue                    DECIMAL(18,2) NOT NULL,
    cogs                             DECIMAL(18,2) NOT NULL,
    PRIMARY KEY (billing_document_id, billing_document_item),
    CONSTRAINT fk_bill_item_header FOREIGN KEY (billing_document_id)
        REFERENCES sap_raw.billing_documents (billing_document_id)
);

-- ============================================================
-- Seed: FI documents/lines (mirrors the finance actuals loaded
-- in 05_seed_extended.sql, grouped into one document per
-- posting date + cost center, one line per GL account)
-- ============================================================

INSERT INTO sap_raw.fi_documents (accounting_document_id, company_code, fiscal_year, document_type, document_date, posting_date, currency, header_text) VALUES
('FI-000001','1000',2026,'SA','2026-01-31','2026-01-31','INR','Pune Manufacturing - January'),
('FI-000002','1000',2026,'SA','2026-01-31','2026-01-31','INR','Chennai Manufacturing - January'),
('FI-000003','1000',2026,'SA','2026-01-31','2026-01-31','INR','Corporate SG&A - January'),
('FI-000004','1000',2026,'SA','2026-02-28','2026-02-28','INR','Pune Manufacturing - February'),
('FI-000005','1000',2026,'SA','2026-02-28','2026-02-28','INR','Chennai Manufacturing - February'),
('FI-000006','1000',2026,'SA','2026-02-28','2026-02-28','INR','Corporate SG&A - February');

INSERT INTO sap_raw.fi_document_lines (accounting_document_id, accounting_document_line, cost_center, profit_center, gl_account, product_id, customer_id, debit_amount, credit_amount, amount) VALUES
('FI-000001',1,'CC-PUNE-MFG','PC-MOTORS','GL-4000','MAT001','C001',840000,0,840000),
('FI-000001',2,'CC-PUNE-MFG','PC-MOTORS','GL-6100',NULL,NULL,210000,0,210000),
('FI-000001',3,'CC-PUNE-MFG','PC-MOTORS','GL-6200',NULL,NULL,180000,0,180000),
('FI-000002',1,'CC-CHN-MFG','PC-AUTOMATION','GL-4000','MAT003','C004',420000,0,420000),
('FI-000002',2,'CC-CHN-MFG','PC-AUTOMATION','GL-6100',NULL,NULL,130000,0,130000),
('FI-000002',3,'CC-CHN-MFG','PC-AUTOMATION','GL-6200',NULL,NULL,110000,0,110000),
('FI-000003',1,'CC-CORP-SGA','PC-CORP','GL-6300',NULL,NULL,260000,0,260000),
('FI-000004',1,'CC-PUNE-MFG','PC-MOTORS','GL-4000','MAT001','C001',945000,0,945000),
('FI-000004',2,'CC-PUNE-MFG','PC-MOTORS','GL-6100',NULL,NULL,225000,0,225000),
('FI-000004',3,'CC-PUNE-MFG','PC-MOTORS','GL-6200',NULL,NULL,185000,0,185000),
('FI-000005',1,'CC-CHN-MFG','PC-AUTOMATION','GL-4000','MAT003','C004',406000,0,406000),
('FI-000005',2,'CC-CHN-MFG','PC-AUTOMATION','GL-6100',NULL,NULL,125000,0,125000),
('FI-000005',3,'CC-CHN-MFG','PC-AUTOMATION','GL-6200',NULL,NULL,112000,0,112000),
('FI-000006',1,'CC-CORP-SGA','PC-CORP','GL-6300',NULL,NULL,270000,0,270000);

-- ============================================================
-- Seed: sales orders/items (order volume — mirrors quantities
-- from the original sales actuals)
-- ============================================================

INSERT INTO sap_raw.sales_orders (sales_document_id, company_code, customer_id, sales_region, order_date, currency) VALUES
('SO-000001','1000','C001','West','2026-01-28','INR'),
('SO-000002','1000','C002','West','2026-01-28','INR'),
('SO-000003','1000','C003','South','2026-01-28','INR'),
('SO-000004','1000','C004','South','2026-01-28','INR'),
('SO-000005','1000','C001','West','2026-02-25','INR'),
('SO-000006','1000','C002','West','2026-02-25','INR'),
('SO-000007','1000','C003','South','2026-02-25','INR'),
('SO-000008','1000','C004','South','2026-02-25','INR');

INSERT INTO sap_raw.sales_order_items (sales_document_id, sales_document_item, product_id, plant, customer_id, order_quantity, net_value) VALUES
('SO-000001',1,'MAT001','P001','C001',1000,1200000),
('SO-000002',1,'MAT002','P001','C002',600, 800000),
('SO-000003',1,'MAT001','P002','C003',700, 950000),
('SO-000004',1,'MAT003','P002','C004',400, 600000),
('SO-000005',1,'MAT001','P001','C001',1100,1350000),
('SO-000006',1,'MAT002','P001','C002',550, 750000),
('SO-000007',1,'MAT001','P002','C003',650, 900000),
('SO-000008',1,'MAT003','P002','C004',390, 580000);

-- ============================================================
-- Seed: billing documents/items (revenue + COGS source of truth)
-- ============================================================

INSERT INTO sap_raw.billing_documents (billing_document_id, company_code, customer_id, billing_date, currency) VALUES
('BILL-000001','1000','C001','2026-01-31','INR'),
('BILL-000002','1000','C002','2026-01-31','INR'),
('BILL-000003','1000','C003','2026-01-31','INR'),
('BILL-000004','1000','C004','2026-01-31','INR'),
('BILL-000005','1000','C001','2026-02-28','INR'),
('BILL-000006','1000','C002','2026-02-28','INR'),
('BILL-000007','1000','C003','2026-02-28','INR'),
('BILL-000008','1000','C004','2026-02-28','INR');

INSERT INTO sap_raw.billing_items (billing_document_id, billing_document_item, product_id, plant, customer_id, sales_region, billing_quantity, net_revenue, cogs) VALUES
('BILL-000001',1,'MAT001','P001','C001','West',1000,1200000,840000),
('BILL-000002',1,'MAT002','P001','C002','West', 600, 800000,560000),
('BILL-000003',1,'MAT001','P002','C003','South',700, 950000,665000),
('BILL-000004',1,'MAT003','P002','C004','South',400, 600000,420000),
('BILL-000005',1,'MAT001','P001','C001','West',1100,1350000,945000),
('BILL-000006',1,'MAT002','P001','C002','West', 550, 750000,525000),
('BILL-000007',1,'MAT001','P002','C003','South',650, 900000,630000),
('BILL-000008',1,'MAT003','P002','C004','South',390, 580000,406000);

-- ============================================================
-- Rebuild conformed facts from the new source layer
-- (same grain/PK as before, so this is a like-for-like refresh)
-- ============================================================

TRUNCATE TABLE conformed.fact_sales_actual;
INSERT INTO conformed.fact_sales_actual
  (date_key, company_code, plant, product_id, customer_id, sales_region, actual_revenue, actual_quantity, actual_cogs, currency, source_system)
SELECT
  bd.billing_date, bd.company_code, bi.plant, bi.product_id, bi.customer_id, bi.sales_region,
  bi.net_revenue, bi.billing_quantity, bi.cogs, bd.currency, 'SAP_S4HANA'
FROM sap_raw.billing_items bi
JOIN sap_raw.billing_documents bd ON bi.billing_document_id = bd.billing_document_id;

TRUNCATE TABLE conformed.fact_finance_actual;
INSERT INTO conformed.fact_finance_actual
  (date_key, company_code, cost_center, profit_center, gl_account, product_id, customer_id, currency, actual_amount, debit_amount, credit_amount, source_system)
SELECT
  fd.posting_date, fd.company_code, fl.cost_center, fl.profit_center, fl.gl_account, fl.product_id, fl.customer_id,
  fd.currency, fl.amount, fl.debit_amount, fl.credit_amount, 'SAP_S4HANA'
FROM sap_raw.fi_document_lines fl
JOIN sap_raw.fi_documents fd ON fl.accounting_document_id = fd.accounting_document_id;
