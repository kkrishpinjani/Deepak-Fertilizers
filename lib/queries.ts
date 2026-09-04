// Verified queries from the source doc's "basic demo" set plus the
// production-YAML set (revenue attainment, budget by cost center,
// forecast performance, plant margin, revenue miss drivers, outlook/risk),
// translated to MySQL and run against the conformed model.

export type VerifiedQuery = {
  id: string;
  question: string;
  description: string;
  synonyms: string[];
  sources: string[];
  sql: string;
};

const SALES_SOURCES = ["SAP S/4HANA Sales", "Anaplan Sales Plan", "MySQL (conformed)"];
const FINANCE_SOURCES = ["SAP S/4HANA FI", "Anaplan Finance Plan", "MySQL (conformed)"];
const OUTLOOK_SOURCES = ["SAP S/4HANA Actuals", "Anaplan Forecast", "MySQL (conformed)"];
const SUPPLY_SOURCES = ["SAP S/4HANA MM/PP", "MySQL (conformed)"];
const O2C_SOURCES = ["SAP S/4HANA SD/FI", "MySQL (conformed)"];
const CASH_SOURCES = ["SAP S/4HANA FI", "Anaplan Forecast", "MySQL (conformed)"];

export const VERIFIED_QUERIES: VerifiedQuery[] = [
  {
    id: "actual_vs_budget",
    question: "What is actual revenue versus budget?",
    description: "SAP actual revenue vs Anaplan budget, company-wide.",
    synonyms: ["actual vs budget", "revenue vs budget", "revenue vs plan", "actual versus plan"],
    sources: SALES_SOURCES,
    sql: `
      SELECT
        SUM(actual_revenue)  AS actual_revenue,
        SUM(budget_revenue)  AS budget_revenue,
        SUM(revenue_variance) AS revenue_variance,
        SUM(actual_revenue) / NULLIF(SUM(budget_revenue), 0) * 100 AS attainment_percent
      FROM conformed.sales_performance;
    `,
  },
  {
    id: "revenue_attainment",
    question: "What is our revenue attainment versus plan?",
    description: "Actual revenue as a percentage of planned (budget) revenue.",
    synonyms: ["attainment", "plan attainment", "achievement", "revenue attainment"],
    sources: SALES_SOURCES,
    sql: `
      SELECT
        SUM(actual_revenue) / NULLIF(SUM(budget_revenue), 0) * 100 AS revenue_attainment_percent
      FROM conformed.sales_performance;
    `,
  },
  {
    id: "plant_performance",
    question: "Which plants are above or below budget?",
    description: "Actual vs budget revenue variance, grouped by plant.",
    synonyms: ["plant performance", "plants missed plan", "revenue by plant"],
    sources: SALES_SOURCES,
    sql: `
      SELECT
        plant_name,
        SUM(actual_revenue)  AS actual_revenue,
        SUM(budget_revenue)  AS budget_revenue,
        SUM(revenue_variance) AS variance,
        SUM(actual_revenue) / NULLIF(SUM(budget_revenue), 0) * 100 AS attainment_percent
      FROM conformed.sales_performance
      GROUP BY plant_name
      ORDER BY variance;
    `,
  },
  {
    id: "product_performance",
    question: "Which products missed their revenue budget?",
    description: "Products with negative revenue variance vs budget.",
    synonyms: ["product performance", "products underperforming", "revenue by product", "largest negative revenue variance"],
    sources: SALES_SOURCES,
    sql: `
      SELECT
        product_name,
        SUM(actual_revenue)  AS actual_revenue,
        SUM(budget_revenue)  AS budget_revenue,
        SUM(revenue_variance) AS variance
      FROM conformed.sales_performance
      GROUP BY product_name
      HAVING SUM(revenue_variance) < 0
      ORDER BY variance;
    `,
  },
  {
    id: "customer_performance",
    question: "Which customers are below revenue budget?",
    description: "Customers with negative revenue variance vs budget.",
    synonyms: ["customer performance", "customers underperforming", "revenue by customer", "which customers drove the miss"],
    sources: SALES_SOURCES,
    sql: `
      SELECT
        customer_name,
        SUM(actual_revenue)  AS actual_revenue,
        SUM(budget_revenue)  AS budget_revenue,
        SUM(revenue_variance) AS variance
      FROM conformed.sales_performance
      GROUP BY customer_name
      HAVING SUM(revenue_variance) < 0
      ORDER BY variance;
    `,
  },
  {
    id: "revenue_miss_drivers",
    question: "Why did we miss revenue plan? Show the biggest drivers.",
    description: "Product + customer combined, ranked by most negative revenue variance (largest misses first).",
    synonyms: ["why did we miss plan", "revenue miss drivers", "biggest misses", "worst variance"],
    sources: SALES_SOURCES,
    sql: `
      SELECT
        product_name,
        customer_name,
        plant_name,
        actual_revenue,
        budget_revenue,
        revenue_variance
      FROM conformed.sales_performance
      WHERE revenue_variance < 0
      ORDER BY revenue_variance ASC
      LIMIT 20;
    `,
  },
  {
    id: "forecast_performance",
    question: "How are actual sales performing against forecast?",
    description: "Actual revenue vs latest Anaplan forecast, with variance and attainment.",
    synonyms: ["actual vs forecast", "forecast variance", "forecast attainment"],
    sources: SALES_SOURCES,
    sql: `
      SELECT
        SUM(actual_revenue)   AS actual_revenue,
        SUM(forecast_revenue) AS forecast_revenue,
        SUM(actual_revenue) - SUM(forecast_revenue) AS forecast_variance,
        SUM(actual_revenue) / NULLIF(SUM(forecast_revenue), 0) * 100 AS forecast_attainment_percent
      FROM conformed.sales_performance;
    `,
  },
  {
    id: "gross_margin",
    question: "What is our gross margin?",
    description: "Actual revenue, COGS, gross profit and gross margin %.",
    synonyms: ["gross margin", "margin percentage", "gross profit"],
    sources: SALES_SOURCES,
    sql: `
      SELECT
        SUM(actual_revenue) AS revenue,
        SUM(actual_cogs)    AS cogs,
        SUM(gross_profit)   AS gross_profit,
        SUM(gross_profit) / NULLIF(SUM(actual_revenue), 0) * 100 AS gross_margin_percent
      FROM conformed.sales_performance;
    `,
  },
  {
    id: "plant_margin",
    question: "Show gross margin by plant.",
    description: "Actual revenue, COGS, gross profit and gross margin % by plant.",
    synonyms: ["plant margin", "margin by plant"],
    sources: SALES_SOURCES,
    sql: `
      SELECT
        plant_name,
        SUM(actual_revenue) AS actual_revenue,
        SUM(actual_cogs)    AS actual_cogs,
        SUM(gross_profit)   AS gross_profit,
        SUM(gross_profit) / NULLIF(SUM(actual_revenue), 0) * 100 AS gross_margin_percent
      FROM conformed.sales_performance
      GROUP BY plant_name;
    `,
  },
  {
    id: "budget_vs_actual_finance",
    question: "Show actual spending versus budget.",
    description: "SAP actual financial postings vs Anaplan budget, company-wide.",
    synonyms: ["actual spending vs budget", "financial variance", "budget vs actual"],
    sources: FINANCE_SOURCES,
    sql: `
      SELECT
        SUM(actual_amount) AS actual_amount,
        SUM(budget_amount) AS budget_amount,
        SUM(financial_variance) AS financial_variance,
        SUM(actual_amount) / NULLIF(SUM(budget_amount), 0) * 100 AS budget_attainment_percent
      FROM conformed.finance_performance;
    `,
  },
  {
    id: "budget_by_cost_center",
    question: "Show actual versus budget by cost center.",
    description: "SAP finance actuals vs Anaplan budget, grouped by cost center and GL account.",
    synonyms: ["budget by cost center", "cost center variance", "GL account variance"],
    sources: FINANCE_SOURCES,
    sql: `
      SELECT
        cost_center_name,
        gl_account_name,
        SUM(actual_amount) AS actual_amount,
        SUM(budget_amount) AS budget_amount,
        SUM(financial_variance) AS financial_variance,
        SUM(actual_amount) / NULLIF(SUM(budget_amount), 0) * 100 AS budget_attainment_percent
      FROM conformed.finance_performance
      GROUP BY cost_center_name, gl_account_name
      ORDER BY financial_variance DESC;
    `,
  },
  {
    id: "full_year_outlook_risk",
    question: "How are we performing? Are we on track?",
    description: "YTD actual vs budget by plant, with AT RISK / WATCH / ON TRACK classification.",
    synonyms: ["are we on track", "how are we performing", "outlook", "risk", "executive summary"],
    sources: OUTLOOK_SOURCES,
    sql: `
      SELECT
        plant_name,
        ytd_actual_revenue,
        ytd_budget_revenue,
        ytd_variance,
        ytd_attainment_percent,
        risk_status
      FROM conformed.executive_outlook
      ORDER BY ytd_attainment_percent;
    `,
  },
  {
    id: "ebitda",
    question: "What is our EBITDA?",
    description: "Revenue minus COGS minus OPEX minus Payroll, by month.",
    synonyms: ["ebitda", "profit and loss", "p&l", "operating profit"],
    sources: Array.from(new Set([...SALES_SOURCES, ...FINANCE_SOURCES])),
    sql: `
      SELECT
        date_key,
        revenue,
        cogs,
        gross_profit,
        opex,
        payroll,
        ebitda,
        ebitda_margin_percent
      FROM conformed.pl_summary
      ORDER BY date_key;
    `,
  },
  {
    id: "revenue_usd",
    question: "What is our revenue in USD?",
    description: "Actual revenue converted to USD using the stored FX rate.",
    synonyms: ["revenue in usd", "usd revenue", "dollar revenue", "currency conversion"],
    sources: SALES_SOURCES,
    sql: `
      SELECT
        currency,
        SUM(actual_revenue) AS actual_revenue,
        SUM(actual_revenue_usd) AS actual_revenue_usd
      FROM conformed.sales_performance
      GROUP BY currency;
    `,
  },
  {
    id: "headcount_by_cost_center",
    question: "Show planned headcount and compensation by cost center.",
    description: "Anaplan headcount plan (BUDGET scenario) by cost center. No SAP actual headcount source exists.",
    synonyms: ["headcount", "planned headcount", "compensation by cost center", "workforce plan"],
    sources: ["Anaplan Headcount Plan", "MySQL (conformed)"],
    sql: `
      SELECT
        date_key,
        cost_center_name,
        profit_center_name,
        planned_headcount,
        planned_compensation,
        compensation_per_head
      FROM conformed.headcount_summary
      ORDER BY date_key, cost_center_name;
    `,
  },
  {
    id: "working_capital",
    question: "What is our working capital plan?",
    description: "Anaplan working-capital plan (BUDGET scenario): AR, AP, inventory, net working capital.",
    synonyms: ["working capital", "accounts receivable", "accounts payable", "inventory plan"],
    sources: ["Anaplan Working Capital Plan", "MySQL (conformed)"],
    sql: `
      SELECT
        date_key,
        accounts_receivable,
        accounts_payable,
        inventory,
        net_working_capital
      FROM conformed.working_capital_summary
      ORDER BY date_key;
    `,
  },
  {
    id: "inventory_exposure",
    question: "Which products have the highest inventory value relative to demand?",
    description: "Inventory value vs 90-day forecast demand, by plant and product — excess inventory and cash tied up.",
    synonyms: ["inventory value", "inventory exposure", "margin exposure", "excess inventory"],
    sources: SUPPLY_SOURCES,
    sql: `
      SELECT
        plant_name,
        product_name,
        inventory_value,
        inventory_qty,
        demand_90d_qty,
        excess_qty,
        excess_value
      FROM conformed.inventory_exposure
      ORDER BY inventory_value DESC;
    `,
  },
  {
    id: "slow_moving_inventory",
    question: "Which inventory has had no movement for 90+ days?",
    description: "Slow-moving / obsolete inventory ranked by days idle — potential cash release if liquidated.",
    synonyms: ["slow moving inventory", "obsolete inventory", "days idle", "dead stock"],
    sources: SUPPLY_SOURCES,
    sql: `
      SELECT plant_name, product_name, inventory_value, days_idle, demand_90d_qty, excess_value
      FROM conformed.slow_moving_inventory;
    `,
  },
  {
    id: "purchase_price_variance",
    question: "Which vendors and materials show the largest purchase price variance?",
    description: "Standard vs actual purchase price by vendor and material, and the resulting COGS/EBITDA impact.",
    synonyms: ["purchase price variance", "ppv", "vendor price variance", "material cost variance"],
    sources: SUPPLY_SOURCES,
    sql: `
      SELECT vendor_name, material_name, po_qty, standard_price, actual_price, ppv, ppv_percent
      FROM conformed.purchase_price_variance;
    `,
  },
  {
    id: "production_cost_variance",
    question: "Which production orders have actual cost above standard, and why?",
    description: "Actual vs standard production cost, broken down by material, labor, machine and overhead.",
    synonyms: ["production cost variance", "standard cost variance", "material labor machine overhead"],
    sources: SUPPLY_SOURCES,
    sql: `
      SELECT
        product_name, plant_name, planned_qty, actual_qty, qty_shortfall,
        standard_cost, actual_cost, cost_variance,
        material_variance, labor_variance, machine_variance, overhead_variance
      FROM conformed.production_cost_variance;
    `,
  },
  {
    id: "production_plan_attainment",
    question: "Where is production falling behind the Anaplan plan?",
    description: "Actual production units vs Anaplan production plan, by plant and product.",
    synonyms: ["production plan attainment", "production shortfall", "production vs plan"],
    sources: ["SAP S/4HANA PP", "Anaplan Production Plan", "MySQL (conformed)"],
    sql: `
      SELECT plant_name, product_name, actual_units, planned_units, unit_variance, attainment_percent
      FROM conformed.production_plan_attainment
      ORDER BY attainment_percent ASC;
    `,
  },
  {
    id: "order_to_cash_leakage",
    question: "Where is revenue getting stuck between delivery, billing and posting?",
    description: "Order-to-cash control tower: open order value not yet billed, billed but not posted, and total potential leakage.",
    synonyms: ["order to cash", "o2c leakage", "delivered not billed", "billed not posted", "revenue leakage"],
    sources: O2C_SOURCES,
    sql: `
      SELECT total_order_value, delivered_not_billed, billed_not_posted, potential_leakage
      FROM conformed.order_to_cash_summary;
    `,
  },
  {
    id: "revenue_recognition",
    question: "Reconcile contracted, delivered, billed and recognized revenue.",
    description: "By product and customer — where operationally delivered revenue hasn't yet been recognized.",
    synonyms: ["revenue recognition", "recognized revenue", "deferred revenue", "delivered vs billed vs recognized"],
    sources: O2C_SOURCES,
    sql: `
      SELECT product_name, customer_name, contracted_revenue, delivered_revenue, billed_revenue, recognized_revenue
      FROM conformed.revenue_recognition
      ORDER BY contracted_revenue DESC;
    `,
  },
  {
    id: "customer_cash_risk",
    question: "Which customers create the largest cash-flow risk?",
    description: "Combines overdue AR, open orders, inventory and 90-day forecast into a HIGH/MEDIUM/LOW cash-risk rating per customer.",
    synonyms: ["customer cash risk", "cash flow risk", "ar aging", "which customers are risky"],
    sources: CASH_SOURCES,
    sql: `
      SELECT customer_name, overdue_ar, open_orders, inventory_value, forecast_90d, cash_risk
      FROM conformed.customer_cash_risk
      ORDER BY overdue_ar DESC;
    `,
  },
  {
    id: "ap_procurement_cash",
    question: "What is our AP exposure and open purchase-order value by vendor?",
    description: "Accounts payable aging and open PO value, by vendor.",
    synonyms: ["accounts payable", "ap aging", "procurement cash", "vendor exposure"],
    sources: SUPPLY_SOURCES,
    sql: `
      SELECT vendor_name, current_amt, d1_30, d31_60, d60_plus, total_ap, open_po_value
      FROM conformed.ap_procurement_cash
      ORDER BY total_ap DESC;
    `,
  },
  {
    id: "working_capital_bridge",
    question: "What is our total cash-conversion exposure across AR, AP and inventory?",
    description: "End-to-end working capital: total AR + inventory - AP = cash conversion exposure.",
    synonyms: ["working capital bridge", "cash conversion exposure", "end to end working capital"],
    sources: CASH_SOURCES,
    sql: `
      SELECT total_ar, total_ap, total_inventory, cash_conversion_exposure
      FROM conformed.working_capital_bridge;
    `,
  },
  {
    id: "capex_economics",
    question: "How much revenue are we generating per rupee of capex, by plant?",
    description: "Capex, annual depreciation and revenue-per-capex-rupee, by plant asset.",
    synonyms: ["capex", "asset economics", "capital expenditure", "revenue per capex"],
    sources: ["SAP S/4HANA Asset Accounting", "MySQL (conformed)"],
    sql: `
      SELECT asset_name, plant_name, capex_amount, annual_depreciation, plant_revenue, revenue_per_capex_rupee
      FROM conformed.capex_economics;
    `,
  },
  {
    id: "scenario_ebitda",
    question: "If revenue drops 7% and raw-material COGS rises 4%, what happens to EBITDA?",
    description: "Illustrative scenario stress test: revenue -7%, COGS +4%, opex flat vs current run rate.",
    synonyms: ["scenario ebitda", "stress test", "what if revenue drops", "ebitda scenario"],
    sources: ["MySQL (conformed) — scenario"],
    sql: `
      SELECT base_revenue, base_cogs, base_opex, base_ebitda,
             scenario_revenue, scenario_cogs, scenario_opex, scenario_ebitda, ebitda_gap
      FROM conformed.scenario_ebitda;
    `,
  },
  {
    id: "cfo_root_cause",
    question: "What is driving the EBITDA and revenue variance, ranked across every dimension?",
    description: "Every plant, product, customer, cost center and GL account, ranked by financial impact — the single largest drivers first.",
    synonyms: ["root cause", "why is ebitda down", "biggest drivers", "variance drivers ranked"],
    sources: Array.from(new Set([...SALES_SOURCES, ...FINANCE_SOURCES])),
    sql: `
      SELECT dimension, driver, ebitda_impact
      FROM conformed.cfo_root_cause
      LIMIT 15;
    `,
  },
  {
    id: "oee_by_process",
    question: "What is our OEE by process?",
    description: "Overall Equipment Effectiveness (availability × performance × quality) by process and plant.",
    synonyms: ["oee", "equipment effectiveness", "plant oee", "availability performance quality"],
    sources: ["Simulated PI sensor/production data", "MySQL (conformed)"],
    sql: `
      SELECT process_name, plant_name, availability_percent, performance_percent, quality_percent, oee_percent
      FROM conformed.oee_summary
      ORDER BY oee_percent ASC;
    `,
  },
  {
    id: "predictive_maintenance_risk",
    question: "Which assets are at risk of failure?",
    description: "Live sensor readings vs warn/alarm thresholds, by asset — HIGH/MEDIUM/LOW risk ranking.",
    synonyms: ["predictive maintenance", "asset risk", "equipment at risk", "sensor alerts"],
    sources: ["Simulated PI sensor data", "MySQL (conformed)"],
    sql: `
      SELECT asset_name, sensor_type, latest_reading, alarm_threshold, alert_count, risk_level
      FROM conformed.predictive_maintenance_risk;
    `,
  },
  {
    id: "energy_to_margin",
    question: "How is energy cost affecting our margin?",
    description: "Energy cost per unit produced vs gross margin, by plant and month.",
    synonyms: ["energy to margin", "energy cost", "energy intensity", "cost per unit"],
    sources: ["Simulated PI energy data", "SAP S/4HANA Sales", "MySQL (conformed)"],
    sql: `
      SELECT plant_name, reading_date, energy_kwh, energy_cost, energy_cost_per_unit, gross_margin_percent
      FROM conformed.energy_to_margin
      ORDER BY reading_date;
    `,
  },
];

export function findQuery(id: string) {
  return VERIFIED_QUERIES.find((q) => q.id === id) || null;
}
