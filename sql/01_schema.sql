-- ============================================================
-- SAP S/4HANA + Anaplan + Conformed Model  (MySQL translation)
-- Mirrors the "basic demo architecture" described in
-- "SAP ANaplan Snowflake Cortex Agent.txt":
--   SAP_RAW      -> raw SAP actual sales
--   ANAPLAN_RAW  -> raw Anaplan sales plan (budget/forecast)
--   CONFORMED    -> shared dimensions + conformed facts + view
-- MySQL has no schema-within-database nesting like Snowflake,
-- so each Snowflake "schema" becomes its own MySQL database.
-- ============================================================

DROP DATABASE IF EXISTS sap_raw;
DROP DATABASE IF EXISTS anaplan_raw;
DROP DATABASE IF EXISTS conformed;

CREATE DATABASE sap_raw      CHARACTER SET utf8mb4;
CREATE DATABASE anaplan_raw  CHARACTER SET utf8mb4;
CREATE DATABASE conformed    CHARACTER SET utf8mb4;

-- ============================================================
-- SAP_RAW: simulated SAP S/4HANA actual sales feed
-- ============================================================

CREATE TABLE sap_raw.sales_actual_raw (
    sales_date       DATE          NOT NULL,
    company_code     VARCHAR(10)   NOT NULL,
    plant            VARCHAR(20)   NOT NULL,
    product_id       VARCHAR(30)   NOT NULL,
    customer_id      VARCHAR(30)   NOT NULL,
    sales_region     VARCHAR(50)   NOT NULL,
    actual_revenue   DECIMAL(18,2) NOT NULL,
    actual_quantity  DECIMAL(18,2) NOT NULL,
    actual_cogs      DECIMAL(18,2) NOT NULL,
    sap_load_ts      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ANAPLAN_RAW: simulated Anaplan sales plan feed
-- Scenario is retained explicitly (BUDGET / FORECAST / TARGET)
-- ============================================================

CREATE TABLE anaplan_raw.sales_plan_raw (
    plan_date         DATE          NOT NULL,
    plan_version      VARCHAR(20)   NOT NULL,
    scenario          VARCHAR(20)   NOT NULL,
    company_code      VARCHAR(10)   NOT NULL,
    plant             VARCHAR(20)   NOT NULL,
    product_id        VARCHAR(30)   NOT NULL,
    customer_id       VARCHAR(30)   NOT NULL,
    sales_region      VARCHAR(50)   NOT NULL,
    planned_revenue   DECIMAL(18,2) NOT NULL,
    planned_quantity  DECIMAL(18,2) NOT NULL,
    anaplan_load_ts   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CONFORMED: shared enterprise dimensions
-- ============================================================

CREATE TABLE conformed.dim_product (
    product_id        VARCHAR(30) PRIMARY KEY,
    product_name      VARCHAR(255) NOT NULL,
    product_category  VARCHAR(100) NOT NULL
);

CREATE TABLE conformed.dim_customer (
    customer_id    VARCHAR(30) PRIMARY KEY,
    customer_name  VARCHAR(255) NOT NULL,
    region         VARCHAR(100) NOT NULL
);

CREATE TABLE conformed.dim_organization (
    plant         VARCHAR(20) PRIMARY KEY,
    plant_name    VARCHAR(255) NOT NULL,
    company_code  VARCHAR(10)  NOT NULL,
    company_name  VARCHAR(255) NOT NULL
);

CREATE TABLE conformed.dim_date (
    date_key       DATE PRIMARY KEY,
    calendar_year  INT NOT NULL,
    month_name     VARCHAR(20) NOT NULL,
    fiscal_year    INT NOT NULL,
    fiscal_period  INT NOT NULL
);

-- ============================================================
-- CONFORMED: conformed facts (SAP actual grain conformed to
-- the shared business grain: date, company, plant, product,
-- customer, region)
-- ============================================================

CREATE TABLE conformed.fact_sales_actual (
    date_key         DATE NOT NULL,
    company_code     VARCHAR(10) NOT NULL,
    plant            VARCHAR(20) NOT NULL,
    product_id       VARCHAR(30) NOT NULL,
    customer_id      VARCHAR(30) NOT NULL,
    sales_region     VARCHAR(50) NOT NULL,
    actual_revenue   DECIMAL(18,2) NOT NULL,
    actual_quantity  DECIMAL(18,2) NOT NULL,
    actual_cogs      DECIMAL(18,2) NOT NULL,
    source_system    VARCHAR(30) NOT NULL DEFAULT 'SAP_S4HANA',
    PRIMARY KEY (date_key, company_code, plant, product_id, customer_id)
);

CREATE TABLE conformed.fact_sales_plan (
    date_key          DATE NOT NULL,
    plan_version      VARCHAR(20) NOT NULL,
    scenario          VARCHAR(20) NOT NULL,
    company_code      VARCHAR(10) NOT NULL,
    plant             VARCHAR(20) NOT NULL,
    product_id        VARCHAR(30) NOT NULL,
    customer_id       VARCHAR(30) NOT NULL,
    sales_region      VARCHAR(50) NOT NULL,
    planned_revenue   DECIMAL(18,2) NOT NULL,
    planned_quantity  DECIMAL(18,2) NOT NULL,
    source_system     VARCHAR(30) NOT NULL DEFAULT 'ANAPLAN',
    PRIMARY KEY (date_key, plan_version, scenario, company_code, plant, product_id, customer_id)
);
