// Builds the real ontology graph in Neo4j from the live MySQL conformed
// model — not synthetic sample data. Idempotent (MERGE throughout), so
// it's safe to re-run after the MySQL data changes.

import { runQuery } from "@/lib/db";
import { runCypher } from "@/lib/neo4j";

export async function seedOntologyGraph() {
  const stats: Record<string, number> = {};

  for (const label of ["Company", "Plant", "CostCenter", "ProfitCenter", "GLAccount", "Product", "Customer", "Vendor"]) {
    await runCypher(`CREATE CONSTRAINT ${label.toLowerCase()}_id IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE;`).catch(() => {});
  }

  const companies = await runQuery<{ company_code: string; company_name: string }>(
    `SELECT company_code, company_name FROM conformed.dim_company;`
  );
  await runCypher(
    `UNWIND $rows AS r MERGE (c:Company {id: r.company_code}) SET c.name = r.company_name`,
    { rows: companies }
  );
  stats.Company = companies.length;

  const plants = await runQuery<{ plant: string; plant_name: string; company_code: string }>(
    `SELECT plant, plant_name, company_code FROM conformed.dim_plant;`
  );
  await runCypher(
    `UNWIND $rows AS r
     MERGE (p:Plant {id: r.plant}) SET p.name = r.plant_name
     MERGE (c:Company {id: r.company_code})
     MERGE (p)-[:BELONGS_TO]->(c)`,
    { rows: plants }
  );
  stats.Plant = plants.length;

  const costCenters = await runQuery<{ cost_center: string; cost_center_name: string; company_code: string }>(
    `SELECT cost_center, cost_center_name, company_code FROM conformed.dim_cost_center;`
  );
  await runCypher(
    `UNWIND $rows AS r
     MERGE (cc:CostCenter {id: r.cost_center}) SET cc.name = r.cost_center_name
     MERGE (c:Company {id: r.company_code})
     MERGE (cc)-[:BELONGS_TO]->(c)`,
    { rows: costCenters }
  );
  stats.CostCenter = costCenters.length;

  const profitCenters = await runQuery<{ profit_center: string; profit_center_name: string; company_code: string }>(
    `SELECT profit_center, profit_center_name, company_code FROM conformed.dim_profit_center;`
  );
  await runCypher(
    `UNWIND $rows AS r
     MERGE (pc:ProfitCenter {id: r.profit_center}) SET pc.name = r.profit_center_name
     MERGE (c:Company {id: r.company_code})
     MERGE (pc)-[:BELONGS_TO]->(c)`,
    { rows: profitCenters }
  );
  stats.ProfitCenter = profitCenters.length;

  const glAccounts = await runQuery<{ gl_account: string; gl_account_name: string; account_type: string }>(
    `SELECT gl_account, gl_account_name, account_type FROM conformed.dim_gl_account;`
  );
  await runCypher(
    `UNWIND $rows AS r MERGE (g:GLAccount {id: r.gl_account}) SET g.name = r.gl_account_name, g.accountType = r.account_type`,
    { rows: glAccounts }
  );
  stats.GLAccount = glAccounts.length;

  const products = await runQuery<{ product_id: string; product_name: string; product_category: string }>(
    `SELECT product_id, product_name, product_category FROM conformed.dim_product;`
  );
  await runCypher(
    `UNWIND $rows AS r MERGE (p:Product {id: r.product_id}) SET p.name = r.product_name, p.category = r.product_category`,
    { rows: products }
  );
  stats.Product = products.length;

  const customers = await runQuery<{ customer_id: string; customer_name: string; region: string }>(
    `SELECT customer_id, customer_name, region FROM conformed.dim_customer;`
  );
  await runCypher(
    `UNWIND $rows AS r MERGE (c:Customer {id: r.customer_id}) SET c.name = r.customer_name, c.region = r.region`,
    { rows: customers }
  );
  stats.Customer = customers.length;

  const vendors = await runQuery<{ vendor_id: string; vendor_name: string; country: string }>(
    `SELECT vendor_id, vendor_name, country FROM conformed.dim_vendor;`
  );
  await runCypher(
    `UNWIND $rows AS r MERGE (v:Vendor {id: r.vendor_id}) SET v.name = r.vendor_name, v.country = r.country`,
    { rows: vendors }
  );
  stats.Vendor = vendors.length;

  // Fact relationships, aggregated so the graph stays small and readable.
  const plantProduct = await runQuery<{ plant: string; product_id: string; actual_revenue: number; budget_revenue: number }>(`
    SELECT plant, product_id, SUM(actual_revenue) AS actual_revenue, SUM(budget_revenue) AS budget_revenue
    FROM conformed.sales_performance GROUP BY plant, product_id;
  `);
  await runCypher(
    `UNWIND $rows AS r
     MATCH (pl:Plant {id: r.plant}), (pr:Product {id: r.product_id})
     MERGE (pl)-[s:SOLD]->(pr)
     SET s.actualRevenue = r.actual_revenue, s.budgetRevenue = r.budget_revenue`,
    { rows: plantProduct }
  );
  stats.SOLD = plantProduct.length;

  const plantCustomer = await runQuery<{ plant: string; customer_id: string; actual_revenue: number }>(`
    SELECT plant, customer_id, SUM(actual_revenue) AS actual_revenue
    FROM conformed.sales_performance GROUP BY plant, customer_id;
  `);
  await runCypher(
    `UNWIND $rows AS r
     MATCH (pl:Plant {id: r.plant}), (cu:Customer {id: r.customer_id})
     MERGE (pl)-[s:SOLD_TO]->(cu)
     SET s.actualRevenue = r.actual_revenue`,
    { rows: plantCustomer }
  );
  stats.SOLD_TO = plantCustomer.length;

  const costCenterGl = await runQuery<{ cost_center: string; gl_account: string; actual_amount: number; budget_amount: number }>(`
    SELECT cc.cost_center, fa.gl_account, SUM(fa.actual_amount) AS actual_amount, SUM(fp.plan_amount) AS budget_amount
    FROM conformed.fact_finance_actual fa
    JOIN conformed.dim_cost_center cc ON fa.cost_center = cc.cost_center
    LEFT JOIN conformed.fact_finance_plan fp
      ON fa.cost_center = fp.cost_center AND fa.gl_account = fp.gl_account AND fp.scenario = 'BUDGET'
    GROUP BY cc.cost_center, fa.gl_account;
  `);
  await runCypher(
    `UNWIND $rows AS r
     MATCH (cc:CostCenter {id: r.cost_center}), (g:GLAccount {id: r.gl_account})
     MERGE (cc)-[p:POSTED]->(g)
     SET p.actualAmount = r.actual_amount, p.budgetAmount = r.budget_amount`,
    { rows: costCenterGl }
  );
  stats.POSTED = costCenterGl.length;

  const vendorMaterial = await runQuery<{ vendor_id: string; product_id: string; ppv: number; ppv_percent: number }>(`
    SELECT vendor_id, product_id, SUM(ppv) AS ppv, AVG(ppv_percent) AS ppv_percent
    FROM conformed.fact_purchase_order GROUP BY vendor_id, product_id;
  `);
  await runCypher(
    `UNWIND $rows AS r
     MATCH (v:Vendor {id: r.vendor_id}), (m:Product {id: r.product_id})
     MERGE (v)-[s:SUPPLIES]->(m)
     SET s.ppv = r.ppv, s.ppvPercent = r.ppv_percent`,
    { rows: vendorMaterial }
  );
  stats.SUPPLIES = vendorMaterial.length;

  return stats;
}

// Loads the full enterprise-scale reference catalog (264 SAP/Anaplan/
// OSIsoft source tables, 53 ontology entities, 92 entity relationships
// — conformed.source_table_catalog / ontology_entity_catalog /
// ontology_relationship_catalog) into Neo4j as real graph nodes and
// edges, so the "what's built vs what's reference-only" picture is
// browsable in the graph, not just a table on /catalog. Separate from
// seedOntologyGraph() above, which seeds the live transactional data
// this project actually built — this seeds the full target-state map.
export async function seedCatalogGraph() {
  const stats: Record<string, number> = {};

  const sourceTables = await runQuery<{
    source_system: string;
    code: string;
    description: string;
    domain: string;
    implemented: number;
    implemented_as: string | null;
  }>(`SELECT source_system, code, description, domain, implemented, implemented_as FROM conformed.source_table_catalog;`);
  await runCypher(
    `UNWIND $rows AS r
     MERGE (t:CatalogSourceTable {id: r.source_system + ':' + r.code})
     SET t.sourceSystem = r.source_system, t.code = r.code, t.description = r.description,
         t.domain = r.domain, t.implemented = r.implemented, t.implementedAs = r.implemented_as`,
    { rows: sourceTables }
  );
  stats.CatalogSourceTable = sourceTables.length;

  const entities = await runQuery<{
    entity: string;
    description: string;
    source: string;
    implemented: number;
    implemented_as: string | null;
  }>(`SELECT entity, description, source, implemented, implemented_as FROM conformed.ontology_entity_catalog;`);
  await runCypher(
    `UNWIND $rows AS r
     MERGE (e:CatalogEntity {id: r.entity})
     SET e.description = r.description, e.source = r.source, e.implemented = r.implemented, e.implementedAs = r.implemented_as`,
    { rows: entities }
  );
  stats.CatalogEntity = entities.length;

  const relationships = await runQuery<{ from_entity: string; relationship: string; to_entity: string; implemented: number }>(
    `SELECT from_entity, relationship, to_entity, implemented FROM conformed.ontology_relationship_catalog;`
  );
  await runCypher(
    `UNWIND $rows AS r
     MERGE (a:CatalogEntity {id: r.from_entity})
     MERGE (b:CatalogEntity {id: r.to_entity})
     MERGE (a)-[rel:CATALOG_RELATIONSHIP {name: r.relationship}]->(b)
     SET rel.implemented = r.implemented`,
    { rows: relationships }
  );
  stats.CATALOG_RELATIONSHIP = relationships.length;

  return stats;
}

export async function graphStats() {
  const nodeCounts = await runCypher<{ labels: string[]; count: number }>(
    `MATCH (n) RETURN labels(n) AS labels, count(*) AS count`
  );
  const relCounts = await runCypher<{ type: string; count: number }>(
    `MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS count`
  );
  return { nodeCounts, relCounts };
}
