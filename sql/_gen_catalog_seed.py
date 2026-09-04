import csv

SAP_IMPLEMENTED = {
    "BKPF": "sap_raw.fi_documents",
    "BSEG": "sap_raw.fi_document_lines",
    "CSKS": "conformed.dim_cost_center",
    "CEPC": "conformed.dim_profit_center",
    "SKA1": "conformed.dim_gl_account",
    "SKB1": "conformed.dim_gl_account",
    "KNA1": "conformed.dim_customer",
    "LFA1": "conformed.dim_vendor",
    "MARA": "conformed.dim_product",
    "MARC": "conformed.dim_product (plant view, partial)",
    "T001": "conformed.dim_company",
    "VBAK": "sap_raw.sales_orders",
    "VBAP": "sap_raw.sales_order_items",
    "VBRK": "sap_raw.billing_documents",
    "VBRP": "sap_raw.billing_items",
    "EKKO": "conformed.fact_purchase_order (header+item combined)",
    "EKPO": "conformed.fact_purchase_order (header+item combined)",
    "AFKO": "sap_raw.production_orders_raw",
    "AFPO": "sap_raw.production_orders_raw",
    "MARD": "conformed.fact_inventory (partial, no storage-location split)",
    "MBEW": "conformed.fact_inventory (valuation folded in)",
    "BSID": "conformed.fact_ar_aging (aggregated, not open-item level)",
    "BSIK": "conformed.fact_ap_aging (aggregated, not open-item level)",
    "ANLA": "conformed.fact_capex (partial)",
    "COEP": "conformed.fact_finance_actual (CO grain, conceptually)",
    "ACDOCA": "conformed.fact_finance_actual (conceptually closest)",
}

ANAPLAN_IMPLEMENTED = {
    "GL_ACCOUNT": "conformed.dim_gl_account",
    "COST_CENTER": "conformed.dim_cost_center",
    "PROFIT_CENTER": "conformed.dim_profit_center",
    "LEGAL_ENTITY": "conformed.dim_company",
    "PLANT": "conformed.dim_plant",
    "PRODUCT": "conformed.dim_product",
    "CUSTOMER": "conformed.dim_customer",
    "VENDOR": "conformed.dim_vendor",
    "SCENARIO": "conformed.dim_scenario",
    "CURRENCY": "conformed.fx_rate",
    "MODEL_CALENDAR": "conformed.dim_date",
    "REVENUE_PLAN": "conformed.fact_sales_plan (planned_revenue)",
    "COGS_PLAN": "conformed.fact_finance_plan (GL-4000 budget)",
    "OPEX_PLAN": "conformed.fact_finance_plan (GL-6100/6300 budget)",
    "WORKING_CAPITAL_PLAN": "conformed.fact_working_capital_plan",
    "SALES_PLAN": "conformed.fact_sales_plan",
    "DEMAND_PLAN": "conformed.fact_sales_plan (FORECAST scenario, proxy)",
    "PRODUCTION_PLAN": "conformed.fact_production_plan",
    "HEADCOUNT_PLAN": "conformed.fact_headcount_plan",
    "FORECAST": "conformed.fact_sales_plan (FORECAST scenario)",
    "BUDGET": "conformed.fact_sales_plan / fact_finance_plan (BUDGET scenario)",
    "FORECAST_ACCURACY": "lib/queries.ts: forecast_performance",
    "VARIANCE": "conformed.sales_performance / finance_performance (variance columns)",
}

ENTITY_IMPLEMENTED = {
    "Company": "conformed.dim_company",
    "Plant": "conformed.dim_plant",
    "ProfitCenter": "conformed.dim_profit_center",
    "CostCenter": "conformed.dim_cost_center",
    "GLAccount": "conformed.dim_gl_account",
    "FiscalPeriod": "conformed.dim_date",
    "Customer": "conformed.dim_customer",
    "Vendor": "conformed.dim_vendor",
    "Material": "conformed.dim_product",
    "Inventory": "conformed.fact_inventory",
    "PurchaseOrder": "conformed.fact_purchase_order",
    "SalesOrder": "sap_raw.sales_orders",
    "BillingDocument": "sap_raw.billing_documents",
    "ProductionOrder": "conformed.fact_production_order",
}

REL_IMPLEMENTED = {
    ("Company", "HAS_PLANT", "Plant"),
    ("Plant", "HAS_PROFIT_CENTER", "ProfitCenter"),
    ("ProfitCenter", "HAS_COST_CENTER", "CostCenter"),
    ("CostCenter", "POSTS_TO", "GLAccount"),
    ("Plant", "HAS_MATERIAL", "Material"),
}


def esc(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def load_rows(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


out = []

sap_rows = load_rows("catalog/s4hana_tables.csv")
for r in sap_rows:
    impl_as = SAP_IMPLEMENTED.get(r["table"])
    out.append(
        f"INSERT INTO conformed.source_table_catalog (source_system, code, description, domain, implemented, implemented_as) "
        f"VALUES ('SAP', {esc(r['table'])}, {esc(r['description'])}, {esc(r['domain'])}, {1 if impl_as else 0}, {esc(impl_as) if impl_as else 'NULL'});"
    )

anaplan_rows = load_rows("catalog/anaplan_objects.csv")
for r in anaplan_rows:
    impl_as = ANAPLAN_IMPLEMENTED.get(r["object"])
    out.append(
        f"INSERT INTO conformed.source_table_catalog (source_system, code, description, domain, implemented, implemented_as) "
        f"VALUES ('ANAPLAN', {esc(r['object'])}, {esc(r['description'])}, {esc(r['domain'])}, {1 if impl_as else 0}, {esc(impl_as) if impl_as else 'NULL'});"
    )

entity_rows = load_rows("catalog/ontology_entities.csv")
for r in entity_rows:
    impl_as = ENTITY_IMPLEMENTED.get(r["entity"])
    out.append(
        f"INSERT INTO conformed.ontology_entity_catalog (entity, description, source, implemented, implemented_as) "
        f"VALUES ({esc(r['entity'])}, {esc(r['description'])}, {esc(r['source'])}, {1 if impl_as else 0}, {esc(impl_as) if impl_as else 'NULL'});"
    )

rel_rows = load_rows("catalog/ontology_relationships.csv")
for r in rel_rows:
    key = (r["from"], r["relationship"], r["to"])
    impl = 1 if key in REL_IMPLEMENTED else 0
    out.append(
        f"INSERT INTO conformed.ontology_relationship_catalog (from_entity, relationship, to_entity, implemented) "
        f"VALUES ({esc(r['from'])}, {esc(r['relationship'])}, {esc(r['to'])}, {impl});"
    )

with open("sql/14b_source_catalog_seed.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(out) + "\n")

print(f"Wrote {len(out)} insert statements.")
print(f"SAP: {len(sap_rows)} rows, {sum(1 for r in sap_rows if r['table'] in SAP_IMPLEMENTED)} implemented")
print(f"Anaplan: {len(anaplan_rows)} rows, {sum(1 for r in anaplan_rows if r['object'] in ANAPLAN_IMPLEMENTED)} implemented")
print(f"Entities: {len(entity_rows)} rows, {sum(1 for r in entity_rows if r['entity'] in ENTITY_IMPLEMENTED)} implemented")
print(f"Relationships: {len(rel_rows)} rows, {len(REL_IMPLEMENTED)} implemented")
