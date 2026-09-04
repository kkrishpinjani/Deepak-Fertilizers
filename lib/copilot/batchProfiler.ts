// Ported from v17's backend/ontology/batchProfiler.ts (V9's multi-table
// discovery engine): profiles several CSVs together and proposes
// cross-table relationships — both via a known SAP/business-term
// dictionary (KUNNR -> Customer, WERKS -> Plant, ...) and via shared
// high-cardinality column names across tables.

import { profileCsv, parseCsvRows, CsvProfile } from "./schemaProfiler";

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

const CANONICAL: Record<string, string> = {
  customer_id: "Customer", customer: "Customer", kunnr: "Customer",
  vendor_id: "Vendor", vendor: "Vendor", supplier: "Vendor", lifnr: "Vendor",
  material_id: "Material", material: "Material", matnr: "Material", product: "Material", sku: "Material", product_id: "Material",
  plant: "Plant", werks: "Plant", site: "Plant",
  company_code: "Company", company: "Company", bukrs: "Company",
  cost_center: "CostCenter", kostl: "CostCenter",
  profit_center: "ProfitCenter", prctr: "ProfitCenter",
  gl_account: "GLAccount", saknr: "GLAccount",
  period: "FiscalPeriod", fiscal_period: "FiscalPeriod",
  purchase_order: "PurchaseOrder", po_number: "PurchaseOrder", ebeln: "PurchaseOrder",
  sales_order: "SalesOrder", so_number: "SalesOrder", vbeln: "SalesOrder",
  billing_document: "BillingDocument", invoice: "InvoiceReceipt",
  production_order: "ProductionOrder", aufnr: "ProductionOrder",
};

function entityForColumn(name: string): string | null {
  const n = norm(name);
  for (const [k, v] of Object.entries(CANONICAL)) if (n === k || n.endsWith("_" + k)) return v;
  return null;
}

function canonicalEntity(e: string): string {
  const map: Record<string, string> = {
    customer: "Customer", vendor: "Vendor", material: "Material", plant: "Plant",
    company: "Company", costcenter: "CostCenter", profitcenter: "ProfitCenter", glaccount: "GLAccount",
  };
  return map[e.toLowerCase()] || e;
}

export type ProposedRelationship = {
  fromTable: string;
  fromColumn: string;
  fromEntity: string;
  toTable: string;
  toColumn: string | null;
  toEntity: string;
  relationship: "REFERENCES" | "SHARED_KEY";
  confidence: number;
  reason: string;
};

export type BatchProfile = {
  tableCount: number;
  tables: { name: string; profile: CsvProfile }[];
  entities: string[];
  relationships: ProposedRelationship[];
};

export function profileBatch(files: { name: string; csv: string }[]): BatchProfile {
  const tables = files.map((f) => ({ name: f.name, profile: profileCsv(f.csv), rows: parseCsvRows(f.csv) }));

  const proposed: ProposedRelationship[] = [];

  for (const t of tables) {
    for (const c of t.profile.columns) {
      const entity = entityForColumn(c.name);
      if (!entity) continue;
      const target = tables.find((x) => x !== t && x.profile.entities.some((e) => canonicalEntity(e) === entity));
      if (target) {
        const targetKey = target.profile.primaryKey || target.profile.columns.find((x) => entityForColumn(x.name) === entity)?.name || null;
        proposed.push({
          fromTable: t.name, fromColumn: c.name, fromEntity: entity,
          toTable: target.name, toColumn: targetKey, toEntity: entity,
          relationship: "REFERENCES",
          confidence: Math.min(0.99, (c.keyScore || 0) + 0.4),
          reason: `Both tables expose a ${entity} identifier; ${c.name} is a candidate foreign key.`,
        });
      }
    }
  }

  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const a = tables[i], b = tables[j];
      for (const ca of a.profile.columns) {
        for (const cb of b.profile.columns) {
          if (norm(ca.name) === norm(cb.name) && ca.uniqueRate > 0.8 && cb.uniqueRate > 0.5) {
            if (!proposed.some((r) => r.fromTable === a.name && r.fromColumn === ca.name && r.toTable === b.name && r.toColumn === cb.name)) {
              proposed.push({
                fromTable: a.name, fromColumn: ca.name, fromEntity: entityForColumn(ca.name) || "Unknown",
                toTable: b.name, toColumn: cb.name, toEntity: entityForColumn(cb.name) || "Unknown",
                relationship: "SHARED_KEY", confidence: 0.82,
                reason: "Same normalized column name with high cardinality in both tables.",
              });
            }
          }
        }
      }
    }
  }

  const entitySet = [...new Set(tables.flatMap((t) => t.profile.entities))];
  return {
    tableCount: tables.length,
    tables: tables.map(({ name, profile }) => ({ name, profile })),
    entities: entitySet,
    relationships: proposed.slice(0, 250),
  };
}
