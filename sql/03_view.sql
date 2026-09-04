-- ============================================================
-- CONFORMED.sales_performance
-- SAP actual vs Anaplan budget, joined to shared dimensions.
-- This is the MySQL equivalent of the doc's semantic-view
-- source view (Cortex Analyst normally sits on top of this).
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

    a.actual_revenue,
    b.planned_revenue,
    a.actual_revenue - COALESCE(b.planned_revenue, 0) AS revenue_variance,
    CASE
        WHEN b.planned_revenue IS NULL OR b.planned_revenue = 0 THEN NULL
        ELSE a.actual_revenue / b.planned_revenue * 100
    END AS revenue_attainment_percent,

    a.actual_quantity,
    b.planned_quantity,
    a.actual_quantity - COALESCE(b.planned_quantity, 0) AS quantity_variance,

    a.actual_cogs,
    a.actual_revenue - a.actual_cogs AS gross_profit,
    CASE
        WHEN a.actual_revenue = 0 THEN NULL
        ELSE (a.actual_revenue - a.actual_cogs) / a.actual_revenue * 100
    END AS gross_margin_percent

FROM conformed.fact_sales_actual a
LEFT JOIN conformed.fact_sales_plan b
    ON  a.date_key      = b.date_key
    AND a.company_code   = b.company_code
    AND a.plant          = b.plant
    AND a.product_id     = b.product_id
    AND a.customer_id    = b.customer_id
LEFT JOIN conformed.dim_product p      ON a.product_id  = p.product_id
LEFT JOIN conformed.dim_customer c     ON a.customer_id = c.customer_id
LEFT JOIN conformed.dim_organization o ON a.plant        = o.plant;
