-- ============================================================
-- Extended views: sales_performance now pivots BUDGET vs
-- FORECAST scenarios (adds revenue_variance_percent,
-- forecast_variance, forecast_attainment_percent,
-- quantity_attainment_percent, cogs_percent_of_revenue).
-- Adds finance_performance (cost center / GL account actual vs
-- budget) and executive_outlook (YTD risk classification).
-- ============================================================

DROP VIEW IF EXISTS conformed.sales_performance;

CREATE VIEW conformed.sales_performance AS
SELECT
    a.date_key,
    a.company_code,
    a.plant,
    o.plant_name,
    a.product_id,
    p.product_name,
    p.product_category,
    a.customer_id,
    c.customer_name,
    a.sales_region,
    a.currency,

    a.actual_revenue,
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
LEFT JOIN conformed.dim_organization o ON a.plant        = o.plant;

-- ============================================================
-- finance_performance: SAP actual finance vs Anaplan budget,
-- by cost center / profit center / GL account.
-- ============================================================

DROP VIEW IF EXISTS conformed.finance_performance;

CREATE VIEW conformed.finance_performance AS
SELECT
    a.date_key,
    a.company_code,
    a.cost_center,
    cc.cost_center_name,
    a.profit_center,
    pc.profit_center_name,
    a.gl_account,
    g.gl_account_name,
    g.account_type,
    a.currency,

    a.actual_amount,
    bud.plan_amount                                                 AS budget_amount,
    fc.plan_amount                                                  AS forecast_amount,

    a.actual_amount - COALESCE(bud.plan_amount, 0)                  AS financial_variance,
    CASE
        WHEN bud.plan_amount IS NULL OR bud.plan_amount = 0 THEN NULL
        ELSE (a.actual_amount - bud.plan_amount) / ABS(bud.plan_amount) * 100
    END AS financial_variance_percent,
    CASE
        WHEN bud.plan_amount IS NULL OR bud.plan_amount = 0 THEN NULL
        ELSE a.actual_amount / bud.plan_amount * 100
    END AS budget_attainment_percent

FROM conformed.fact_finance_actual a
LEFT JOIN conformed.fact_finance_plan bud
    ON  a.date_key = bud.date_key AND a.company_code = bud.company_code
    AND a.cost_center = bud.cost_center AND a.profit_center = bud.profit_center AND a.gl_account = bud.gl_account
    AND bud.scenario = 'BUDGET'
LEFT JOIN conformed.fact_finance_plan fc
    ON  a.date_key = fc.date_key AND a.company_code = fc.company_code
    AND a.cost_center = fc.cost_center AND a.profit_center = fc.profit_center AND a.gl_account = fc.gl_account
    AND fc.scenario = 'FORECAST'
LEFT JOIN conformed.dim_cost_center cc    ON a.cost_center = cc.cost_center
LEFT JOIN conformed.dim_profit_center pc  ON a.profit_center = pc.profit_center
LEFT JOIN conformed.dim_gl_account g      ON a.gl_account = g.gl_account;

-- ============================================================
-- executive_outlook: YTD actual vs YTD budget by plant, with
-- AT RISK / WATCH / ON TRACK classification (doc's "Full-Year
-- Outlook & Risk" query).
-- ============================================================

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
