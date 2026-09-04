-- ============================================================
-- Views backing the 20-query "ontology" list: inventory
-- exposure, PPV, production variance/attainment, order-to-cash,
-- revenue recognition, AR/AP, capex, cash conversion, scenario
-- EBITDA. Built on top of the domain tables from
-- 10_ontology_domains.sql plus the existing conformed model.
-- ============================================================

-- ---------- 3. Inventory value & margin exposure ----------
DROP VIEW IF EXISTS conformed.inventory_exposure;
CREATE VIEW conformed.inventory_exposure AS
SELECT
    i.plant,
    o.plant_name,
    i.product_id,
    p.product_name,
    i.inventory_value,
    i.inventory_qty,
    i.days_idle,
    COALESCE(d.demand_90d_qty, 0) AS demand_90d_qty,
    GREATEST(i.inventory_qty - COALESCE(d.demand_90d_qty, 0), 0) AS excess_qty,
    CASE WHEN i.inventory_qty = 0 THEN 0
         ELSE i.inventory_value * GREATEST(i.inventory_qty - COALESCE(d.demand_90d_qty, 0), 0) / i.inventory_qty
    END AS excess_value
FROM conformed.fact_inventory i
LEFT JOIN conformed.dim_product p ON i.product_id = p.product_id
LEFT JOIN conformed.dim_plant o ON i.plant = o.plant
LEFT JOIN (
    SELECT plant, product_id, SUM(planned_quantity) AS demand_90d_qty
    FROM conformed.fact_sales_plan
    WHERE scenario = 'FORECAST'
    GROUP BY plant, product_id
) d ON i.plant = d.plant AND i.product_id = d.product_id;

-- ---------- 4. Slow-moving / obsolete inventory (>=90 days idle) ----------
DROP VIEW IF EXISTS conformed.slow_moving_inventory;
CREATE VIEW conformed.slow_moving_inventory AS
SELECT plant_name, product_name, inventory_value, days_idle, demand_90d_qty, excess_qty, excess_value
FROM conformed.inventory_exposure
WHERE days_idle >= 90
ORDER BY days_idle DESC;

-- ---------- 7. Purchase price variance ----------
DROP VIEW IF EXISTS conformed.purchase_price_variance;
CREATE VIEW conformed.purchase_price_variance AS
SELECT
    v.vendor_name,
    p.product_name AS material_name,
    SUM(po.po_qty) AS po_qty,
    AVG(po.standard_price) AS standard_price,
    AVG(po.actual_price) AS actual_price,
    SUM(po.ppv) AS ppv,
    AVG(po.ppv_percent) AS ppv_percent
FROM conformed.fact_purchase_order po
JOIN conformed.dim_vendor v ON po.vendor_id = v.vendor_id
JOIN conformed.dim_product p ON po.product_id = p.product_id
GROUP BY v.vendor_name, p.product_name
ORDER BY ppv DESC;

-- ---------- 14. Production cost variance ----------
DROP VIEW IF EXISTS conformed.production_cost_variance;
CREATE VIEW conformed.production_cost_variance AS
SELECT
    pr.product_name,
    o.plant_name,
    SUM(f.planned_qty) AS planned_qty,
    SUM(f.actual_qty) AS actual_qty,
    SUM(f.qty_shortfall) AS qty_shortfall,
    SUM(f.standard_cost) AS standard_cost,
    SUM(f.actual_cost) AS actual_cost,
    SUM(f.cost_variance) AS cost_variance,
    SUM(f.material_variance) AS material_variance,
    SUM(f.labor_variance) AS labor_variance,
    SUM(f.machine_variance) AS machine_variance,
    SUM(f.overhead_variance) AS overhead_variance
FROM conformed.fact_production_order f
JOIN conformed.dim_product pr ON f.product_id = pr.product_id
JOIN conformed.dim_plant o ON f.plant = o.plant
GROUP BY pr.product_name, o.plant_name
ORDER BY cost_variance DESC;

-- ---------- 6. Production plan attainment ----------
DROP VIEW IF EXISTS conformed.production_plan_attainment;
CREATE VIEW conformed.production_plan_attainment AS
SELECT
    p.plant_name,
    pr.product_name,
    SUM(a.actual_qty) AS actual_units,
    SUM(pl.planned_units) AS planned_units,
    SUM(a.actual_qty) - SUM(pl.planned_units) AS unit_variance,
    CASE WHEN SUM(pl.planned_units) = 0 THEN NULL
         ELSE SUM(a.actual_qty) / SUM(pl.planned_units) * 100
    END AS attainment_percent
FROM conformed.fact_production_order a
JOIN conformed.fact_production_plan pl
  ON a.product_id = pl.product_id AND a.plant = pl.plant AND a.order_date = pl.date_key AND pl.scenario = 'BUDGET'
JOIN conformed.dim_product pr ON a.product_id = pr.product_id
JOIN conformed.dim_plant p ON a.plant = p.plant
GROUP BY p.plant_name, pr.product_name;

-- ---------- 8. Order-to-cash leakage ----------
DROP VIEW IF EXISTS conformed.order_to_cash_leakage;
CREATE VIEW conformed.order_to_cash_leakage AS
SELECT
    so.sales_document_id,
    c.customer_name,
    p.product_name,
    it.net_value AS order_value,
    it.delivered_flag,
    it.billed_flag,
    it.posted_flag,
    CASE
        WHEN it.delivered_flag = 0 THEN 'NOT DELIVERED'
        WHEN it.billed_flag = 0 THEN 'DELIVERED, NOT BILLED'
        WHEN it.posted_flag = 0 THEN 'BILLED, NOT POSTED'
        ELSE 'COMPLETE'
    END AS status
FROM sap_raw.sales_order_items it
JOIN sap_raw.sales_orders so ON it.sales_document_id = so.sales_document_id
JOIN conformed.dim_customer c ON it.customer_id = c.customer_id
JOIN conformed.dim_product p ON it.product_id = p.product_id;

DROP VIEW IF EXISTS conformed.order_to_cash_summary;
CREATE VIEW conformed.order_to_cash_summary AS
SELECT
    SUM(order_value) AS total_order_value,
    SUM(CASE WHEN status = 'DELIVERED, NOT BILLED' THEN order_value ELSE 0 END) AS delivered_not_billed,
    SUM(CASE WHEN status = 'BILLED, NOT POSTED' THEN order_value ELSE 0 END) AS billed_not_posted,
    SUM(CASE WHEN status <> 'COMPLETE' THEN order_value ELSE 0 END) AS potential_leakage
FROM conformed.order_to_cash_leakage;

-- ---------- 9. Revenue recognition reconciliation ----------
-- Approximation: billed revenue is "recognized" at 97% (small deferred
-- portion) unless the order-to-cash status shows it isn't billed/posted yet.
DROP VIEW IF EXISTS conformed.revenue_recognition;
CREATE VIEW conformed.revenue_recognition AS
SELECT
    p.product_name,
    c.customer_name,
    SUM(it.net_value) AS contracted_revenue,
    SUM(CASE WHEN it.delivered_flag = 1 THEN it.net_value ELSE 0 END) AS delivered_revenue,
    SUM(CASE WHEN it.billed_flag = 1 THEN it.net_value ELSE 0 END) AS billed_revenue,
    SUM(CASE WHEN it.posted_flag = 1 THEN it.net_value * 0.97 ELSE 0 END) AS recognized_revenue
FROM sap_raw.sales_order_items it
JOIN conformed.dim_product p ON it.product_id = p.product_id
JOIN conformed.dim_customer c ON it.customer_id = c.customer_id
GROUP BY p.product_name, c.customer_name;

-- ---------- 10. AR aging vs forecast (customer cash risk) ----------
DROP VIEW IF EXISTS conformed.customer_cash_risk;
CREATE VIEW conformed.customer_cash_risk AS
SELECT
    c.customer_name,
    ar.overdue_total AS overdue_ar,
    COALESCE(so.open_orders, 0) AS open_orders,
    COALESCE(inv.inventory_value, 0) AS inventory_value,
    COALESCE(fc.forecast_90d, 0) AS forecast_90d,
    CASE
        WHEN ar.overdue_total > 1200000 OR (fc.forecast_90d > 0 AND ar.overdue_total / fc.forecast_90d > 0.15) THEN 'HIGH'
        WHEN ar.overdue_total > 700000 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS cash_risk
FROM conformed.fact_ar_aging ar
JOIN conformed.dim_customer c ON ar.customer_id = c.customer_id
LEFT JOIN (
    SELECT customer_id, SUM(net_value) AS open_orders
    FROM sap_raw.sales_order_items
    GROUP BY customer_id
) so ON ar.customer_id = so.customer_id
LEFT JOIN (
    SELECT customer_id, SUM(inventory_value) AS inventory_value
    FROM conformed.fact_inventory fi
    JOIN sap_raw.billing_items bi ON fi.product_id = bi.product_id
    GROUP BY bi.customer_id
) inv ON ar.customer_id = inv.customer_id
LEFT JOIN (
    SELECT customer_id, SUM(planned_revenue) AS forecast_90d
    FROM conformed.fact_sales_plan
    WHERE scenario = 'FORECAST'
    GROUP BY customer_id
) fc ON ar.customer_id = fc.customer_id;

-- ---------- 11. AP & procurement cash ----------
DROP VIEW IF EXISTS conformed.ap_procurement_cash;
CREATE VIEW conformed.ap_procurement_cash AS
SELECT
    v.vendor_name,
    ap.current_amt,
    ap.d1_30,
    ap.d31_60,
    ap.d60_plus,
    ap.total_ap,
    COALESCE(po.open_po_value, 0) AS open_po_value
FROM conformed.fact_ap_aging ap
JOIN conformed.dim_vendor v ON ap.vendor_id = v.vendor_id
LEFT JOIN (
    SELECT vendor_id, SUM(actual_value) AS open_po_value
    FROM conformed.fact_purchase_order
    GROUP BY vendor_id
) po ON ap.vendor_id = po.vendor_id;

-- ---------- 12/13. Working capital bridge (AR + AP + Inventory) ----------
DROP VIEW IF EXISTS conformed.working_capital_bridge;
CREATE VIEW conformed.working_capital_bridge AS
SELECT
    (SELECT SUM(total_ar) FROM conformed.fact_ar_aging)         AS total_ar,
    (SELECT SUM(total_ap) FROM conformed.fact_ap_aging)          AS total_ap,
    (SELECT SUM(inventory_value) FROM conformed.fact_inventory)  AS total_inventory,
    (SELECT SUM(total_ar) FROM conformed.fact_ar_aging)
      + (SELECT SUM(inventory_value) FROM conformed.fact_inventory)
      - (SELECT SUM(total_ap) FROM conformed.fact_ap_aging)      AS cash_conversion_exposure;

-- ---------- 15. Capex vs asset economics ----------
DROP VIEW IF EXISTS conformed.capex_economics;
CREATE VIEW conformed.capex_economics AS
SELECT
    c.asset_name,
    o.plant_name,
    c.capex_amount,
    c.annual_depreciation,
    c.useful_life_years,
    s.actual_revenue AS plant_revenue,
    CASE WHEN c.capex_amount = 0 THEN NULL ELSE s.actual_revenue / c.capex_amount END AS revenue_per_capex_rupee
FROM conformed.fact_capex c
JOIN conformed.dim_plant o ON c.plant = o.plant
LEFT JOIN (
    SELECT plant, SUM(actual_revenue) AS actual_revenue
    FROM conformed.sales_performance
    GROUP BY plant
) s ON c.plant = s.plant;

-- ---------- 18. Scenario EBITDA stress test ----------
-- Parameters (revenue -7%, COGS +4%, opex flat) are illustrative,
-- matching the doc's example scenario; a real version would take
-- these as query inputs rather than hardcoded constants.
DROP VIEW IF EXISTS conformed.scenario_ebitda;
CREATE VIEW conformed.scenario_ebitda AS
SELECT
    SUM(revenue) AS base_revenue,
    SUM(cogs) AS base_cogs,
    SUM(opex) + SUM(payroll) AS base_opex,
    SUM(ebitda) AS base_ebitda,
    SUM(revenue) * 0.93 AS scenario_revenue,
    SUM(cogs) * 1.04 AS scenario_cogs,
    SUM(opex) + SUM(payroll) AS scenario_opex,
    (SUM(revenue) * 0.93 - SUM(cogs) * 1.04) - (SUM(opex) + SUM(payroll)) AS scenario_ebitda,
    ((SUM(revenue) * 0.93 - SUM(cogs) * 1.04) - (SUM(opex) + SUM(payroll))) - SUM(ebitda) AS ebitda_gap
FROM conformed.pl_summary;

-- ---------- 20. CFO root-cause chain (ranked variance across every dimension) ----------
DROP VIEW IF EXISTS conformed.cfo_root_cause;
CREATE VIEW conformed.cfo_root_cause AS
SELECT 'Plant' AS dimension, plant_name AS driver, SUM(revenue_variance) AS ebitda_impact
FROM conformed.sales_performance GROUP BY plant_name
UNION ALL
SELECT 'Product', product_name, SUM(revenue_variance)
FROM conformed.sales_performance GROUP BY product_name
UNION ALL
SELECT 'Customer', customer_name, SUM(revenue_variance)
FROM conformed.sales_performance GROUP BY customer_name
UNION ALL
SELECT 'Cost Center', cost_center_name, -SUM(financial_variance)
FROM conformed.finance_performance GROUP BY cost_center_name
UNION ALL
SELECT 'GL Account', gl_account_name, -SUM(financial_variance)
FROM conformed.finance_performance GROUP BY gl_account_name
ORDER BY ebitda_impact ASC;
