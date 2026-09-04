// Real document search — MySQL FULLTEXT (natural language mode), not
// embeddings (no embedding model pulled in Ollama). This is the
// project's stand-in for V14/V15's "Cortex Search": genuinely
// searches real document text and returns real relevance scores from
// MySQL's own ranking, it just uses a simpler retrieval technique
// than semantic/vector search.

import { runParamQuery } from "@/lib/db";

export type DocumentHit = {
  id: string;
  title: string;
  category: string;
  content: string;
  relevance: number;
};

export async function searchDocuments(query: string, limit = 3): Promise<DocumentHit[]> {
  if (!query.trim()) return [];
  const rows = await runParamQuery<DocumentHit>(
    `SELECT id, title, category, content,
            MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE) AS relevance
     FROM conformed.documents
     WHERE MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE)
     ORDER BY relevance DESC
     LIMIT ?;`,
    [query, query, limit]
  );
  return rows.filter((r) => r.relevance > 0);
}

export async function searchDocumentsForDimension(dimensionName: string, kpiName: string, limit = 2): Promise<DocumentHit[]> {
  // Prefer documents explicitly linked to a matching vendor/customer name,
  // fall back to full-text search on the dimension + KPI text.
  const linked = await runParamQuery<DocumentHit>(
    `SELECT d.id, d.title, d.category, d.content, 5.0 AS relevance
     FROM conformed.documents d
     LEFT JOIN conformed.dim_vendor v ON d.related_vendor_id = v.vendor_id
     LEFT JOIN conformed.dim_customer c ON d.related_customer_id = c.customer_id
     WHERE v.vendor_name = ? OR c.customer_name = ?
     LIMIT ?;`,
    [dimensionName, dimensionName, limit]
  );
  if (linked.length) return linked;
  return searchDocuments(`${dimensionName} ${kpiName}`, limit);
}
