-- ============================================================
-- Splits DIM_COMPANY / DIM_PLANT out of dim_organization (doc's
-- production schema keeps them separate). Adds a currency
-- conversion table + USD columns. Adds conformed.pl_summary
-- (Revenue - COGS - OPEX - Payroll = EBITDA).
-- ============================================================

CREATE TABLE conformed.dim_company (
    company_code  VARCHAR(10) PRIMARY KEY,
    company_name  VARCHAR(255) NOT NULL,
    country       VARCHAR(100) NOT NULL DEFAULT 'India'
);

CREATE TABLE conformed.dim_plant (
    plant         VARCHAR(20) PRIMARY KEY,
    plant_name    VARCHAR(255) NOT NULL,
    company_code  VARCHAR(10)  NOT NULL,
    country       VARCHAR(100) NOT NULL DEFAULT 'India',
    region        VARCHAR(100) NOT NULL
);

INSERT INTO conformed.dim_company (company_code, company_name, country) VALUES
('1000','Demo Manufacturing India','India');

INSERT INTO conformed.dim_plant (plant, plant_name, company_code, country, region) VALUES
('P001','Pune Manufacturing Plant','1000','India','West'),
('P002','Chennai Manufacturing Plant','1000','India','South');

-- ---------- multi-currency ----------
CREATE TABLE conformed.fx_rate (
    currency       VARCHAR(5) PRIMARY KEY,
    rate_to_usd    DECIMAL(12,6) NOT NULL,
    as_of_date     DATE NOT NULL
);

INSERT INTO conformed.fx_rate (currency, rate_to_usd, as_of_date) VALUES
('INR', 0.011400, '2026-02-28'),
('USD', 1.000000, '2026-02-28');

-- ---------- repoint sales_performance / executive_outlook at dim_plant/dim_company, add USD ----------
DROP VIEW IF EXISTS conformed.sales_performance;

CREATE VIEW conformed.sales_performance AS
SELECT
    a.date_key,
    a.company_code,
    co.company_name,
    a.plant,
    pl.plant_name,
    a.product_id,
    p.product_name,
    p.product_category,
    a.customer_id,
    c.customer_name,
    a.sales_region,
    a.currency,

    a.actual_revenue,
    a.actual_revenue * fx.rate_to_usd AS actual_revenue_usd,
    bud.planned_revenue                                            AS budget_revenue,
    fc.planned_revenue                                             AS forecast_revenue,

    a.actual_revenue - COALESCE(bud.planned_revenue, 0)             AS revenue_variance,
    CASE
        WHEN bud.planned_revenue IS NULL OR bud.planned_revenue = 0 THEN NULL
        ELSE (a.actual_revenue - bud.planned_revenue) / ABS(bud.planned_revenue) * 100
    END AS revenue_variance_percent,
    CASE
        WHEN bud.planned_revenue IS NULL OR bud.planned_revenue = 0 THEN NULL
        ELSE a.actual_revenue / bud.planned_revenue * 100
    END AS revenue_attainment_percent,

    a.actual_revenue - COALESCE(fc.planned_revenue, 0)              AS forecast_variance,
    CASE
        WHEN fc.planned_revenue IS NULL OR fc.planned_revenue = 0 THEN NULL
        ELSE a.actual_revenue / fc.planned_revenue * 100
    END AS forecast_attainment_percent,

    a.actual_quantity,
    bud.planned_quantity                                            AS budget_quantity,
    a.actual_quantity - COALESCE(bud.planned_quantity, 0)           AS quantity_variance,
    CASE
        WHEN bud.planned_quantity IS NULL OR bud.planned_quantity = 0 THEN NULL
        ELSE a.actual_quantity / bud.planned_quantity * 100
    END AS quantity_attainment_percent,

    a.actual_cogs,
    a.actual_revenue - a.actual_cogs AS gross_profit,
    CASE
        WHEN a.actual_revenue = 0 THEN NULL
        ELSE (a.actual_revenue - a.actual_cogs) / a.actual_revenue * 100
    END AS gross_margin_percent,
    CASE
        WHEN a.actual_revenue = 0 THEN NULL
        ELSE a.actual_cogs / a.actual_revenue * 100
    END AS cogs_percent_of_revenue

FROM conformed.fact_sales_actual a
LEFT JOIN conformed.fact_sales_plan bud
    ON  a.date_key = bud.date_key AND a.company_code = bud.company_code
    AND a.plant = bud.plant AND a.product_id = bud.product_id AND a.customer_id = bud.customer_id
    AND bud.scenario = 'BUDGET'
LEFT JOIN conformed.fact_sales_plan fc
    ON  a.date_key = fc.date_key AND a.company_code = fc.company_code
    AND a.plant = fc.plant AND a.product_id = fc.product_id AND a.customer_id = fc.customer_id
    AND fc.scenario = 'FORECAST'
LEFT JOIN conformed.dim_product p      ON a.product_id  = p.product_id
LEFT JOIN conformed.dim_customer c     ON a.customer_id = c.customer_id
LEFT JOIN conformed.dim_plant pl       ON a.plant        = pl.plant
LEFT JOIN conformed.dim_company co     ON a.company_code = co.company_code
LEFT JOIN conformed.fx_rate fx         ON a.currency     = fx.currency;

DROP VIEW IF EXISTS conformed.executive_outlook;

CREATE VIEW conformed.executive_outlook AS
SELECT
    plant_name,
    SUM(actual_revenue)  AS ytd_actual_revenue,
    SUM(budget_revenue)  AS ytd_budget_revenue,
    SUM(actual_revenue) - SUM(budget_revenue) AS ytd_variance,
    CASE
        WHEN SUM(budget_revenue) = 0 OR SUM(budget_revenue) IS NULL THEN NULL
        ELSE SUM(actual_revenue) / SUM(budget_revenue) * 100
    END AS ytd_attainment_percent,
    CASE
        WHEN SUM(budget_revenue) = 0 OR SUM(budget_revenue) IS NULL THEN 'UNKNOWN'
        WHEN SUM(actual_revenue) / SUM(budget_revenue) * 100 < 95  THEN 'AT RISK'
        WHEN SUM(actual_revenue) / SUM(budget_revenue) * 100 < 100 THEN 'WATCH'
        ELSE 'ON TRACK'
    END AS risk_status
FROM conformed.sales_performance
GROUP BY plant_name;

-- ---------- P&L / EBITDA ----------
-- Revenue and COGS come from sales (SAP billing). OPEX and
-- Payroll come from finance (SAP FI, cost centers not tied to
-- a GL-4000/COGS account). Joined at date + company grain.
DROP VIEW IF EXISTS conformed.pl_summary;

CREATE VIEW conformed.pl_summary AS
SELECT
    s.date_key,
    s.company_code,
    s.revenue,
    s.cogs,
    s.revenue - s.cogs AS gross_profit,
    CASE WHEN s.revenue = 0 THEN NULL ELSE (s.revenue - s.cogs) / s.revenue * 100 END AS gross_margin_percent,
    COALESCE(f.opex, 0)    AS opex,
    COALESCE(f.payroll, 0) AS payroll,
    (s.revenue - s.cogs) - COALESCE(f.opex, 0) - COALESCE(f.payroll, 0) AS ebitda,
    CASE
        WHEN s.revenue = 0 THEN NULL
        ELSE ((s.revenue - s.cogs) - COALESCE(f.opex, 0) - COALESCE(f.payroll, 0)) / s.revenue * 100
    END AS ebitda_margin_percent
FROM (
    SELECT date_key, company_code, SUM(actual_revenue) AS revenue, SUM(actual_cogs) AS cogs
    FROM conformed.fact_sales_actual
    GROUP BY date_key, company_code
) s
LEFT JOIN (
    SELECT
        fa.date_key, fa.company_code,
        SUM(CASE WHEN g.account_type = 'OPEX' THEN fa.actual_amount ELSE 0 END) AS opex,
        SUM(CASE WHEN g.account_type = 'PAYROLL' THEN fa.actual_amount ELSE 0 END) AS payroll
    FROM conformed.fact_finance_actual fa
    JOIN conformed.dim_gl_account g ON fa.gl_account = g.gl_account
    GROUP BY fa.date_key, fa.company_code
) f ON s.date_key = f.date_key AND s.company_code = f.company_code;
