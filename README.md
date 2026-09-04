# SAP S/4HANA + Anaplan Finance Intelligence (MySQL edition)

Implements the architecture from `SAP ANaplan Snowflake Cortex Agent.txt`,
translated from Snowflake to MySQL (no Snowflake/Cortex Analyst account
required — this environment only had MySQL credentials):

```
SAP S/4HANA (simulated)  --> sap_raw.fi_documents + fi_document_lines      (finance postings)
                          --> sap_raw.sales_orders + sales_order_items     (order volume)
                          --> sap_raw.billing_documents + billing_items    (revenue/COGS source of truth)
Anaplan (simulated)      --> anaplan_raw.sales_plan_raw                    (BUDGET + FORECAST + TARGET)
                          --> anaplan_raw.finance_plan_raw                 (BUDGET + FORECAST)
                          --> anaplan_raw.headcount_plan_raw               (BUDGET, no SAP actual source)
                          --> anaplan_raw.working_capital_plan_raw         (BUDGET, no SAP actual source)
                                    |
                                    v
     conformed.dim_product / dim_customer / dim_company / dim_plant / dim_date
     conformed.dim_cost_center / dim_profit_center / dim_gl_account / dim_scenario
     conformed.fx_rate (currency -> USD)
     conformed.fact_sales_actual / fact_sales_plan
     conformed.fact_finance_actual / fact_finance_plan
     conformed.fact_headcount_plan / fact_working_capital_plan
                                    |
                                    v
     conformed.sales_performance      (actual vs budget vs forecast, variance %,
                                        attainment %, gross margin %, COGS %, USD)
     conformed.finance_performance    (actual vs budget/forecast by cost center + GL account)
     conformed.pl_summary             (Revenue - COGS - OPEX - Payroll = EBITDA)
     conformed.executive_outlook      (YTD attainment, AT RISK / WATCH / ON TRACK)
     conformed.headcount_summary      (planned headcount + compensation by cost center)
     conformed.working_capital_summary (AR / AP / inventory / net working capital)
     conformed.business_glossary      (term -> definition -> business rule)
                                    |
                                    v
     Next.js API (/api/query, /api/ask, /api/glossary) --> React + MUI dashboard
```

SAP is treated as the source of truth for **actuals**; Anaplan is treated as
the source of truth for **budget/forecast/target/headcount/working-capital**,
matching the doc's rule: "Never describe Anaplan budget or forecast values
as actuals."

## 1. Database setup

Already run against `127.0.0.1:3306` with user `root`. To (re)build from scratch, run in order:

```bash
mysql -uroot -p < sql/01_schema.sql
mysql -uroot -p < sql/02_seed.sql
mysql -uroot -p < sql/03_view.sql
mysql -uroot -p < sql/04_finance_schema.sql
mysql -uroot -p < sql/05_seed_extended.sql
mysql -uroot -p < sql/06_views_extended.sql
mysql -uroot -p < sql/07_sap_source_restructure.sql
mysql -uroot -p < sql/08_dims_currency_pl.sql
mysql -uroot -p < sql/09_headcount_workingcapital.sql
mysql -uroot -p < sql/10_ontology_domains.sql
mysql -uroot -p < sql/11_ontology_views.sql
```

This creates three databases — `sap_raw`, `anaplan_raw`, `conformed` — mirroring
the Snowflake `SAP_RAW` / `ANAPLAN_RAW` / `CONFORMED` schemas in the doc.

## 2. App setup

```bash
docker compose up -d   # starts this project's own Neo4j container
npm install
npm run dev
```

Open http://localhost:3000. Credentials are read from `.env.local` — see
`.env.example`. MySQL and Neo4j are required (`docker compose up -d` starts
Neo4j; MySQL must already be running). Ollama is optional — `/api/ask` and
`/copilot` fall back to rule-based matching if it's not running locally.

## Design

The UI is written for a business audience, not engineers: plain-English
labels and section names throughout (e.g. "Sales Performance" not "SAP
sales_performance query"), technical details (raw SQL, execution time, data
source names) tucked behind a "Technical details" toggle instead of shown
by default, color-coded numbers (green/red for variance, status chips for
risk), mini progress bars on attainment metrics, and a light/dark mode
toggle in the top bar (persists across visits via the browser).

Each page is a real route (`/`, `/ask`, `/sales`, `/finance`, `/planning`,
`/outlook`, `/glossary`), not a single page with scroll-jump anchors — the
sidebar highlights whichever page is active, and the header/sidebar shell
(`components/AppShell.tsx`) is shared across all of them via the root layout.

Every page with numeric results also carries a chart, not just a table:
`components/charts/GroupedBarChart.tsx` (actual vs plan, side-by-side bars)
and `components/charts/DivergingBarChart.tsx` (variance bars growing left/red
or right/green from a zero baseline) — both custom SVG, hover tooltips,
legends, theme-aware colors (light/dark), and a fixed color order (blue =
actual, teal = plan) so the same series always reads the same color
everywhere. Cost variance charts flip the color rule (`invert`) since
spending *over* budget is bad, unlike revenue being *over* plan.

## Supply chain / "ontology" domain (from the V3-V17 narrative doc)

`New Anaplan Osi SAP S4hana tables_quries.txt` is a transcript describing 15
increasingly elaborate versions of an "Enterprise CFO Copilot" — Neo4j graph
ontology, Snowflake Cortex Agents/Search, live SAP OData + Anaplan API
connectors, autonomous investigation agents with MCP servers. Almost none of
that is buildable here (needs a Neo4j account, Snowflake Cortex Agents, live
SAP/Anaplan systems, and an LLM for the reasoning layer — none available).

What *was* buildable: the underlying business domains those versions kept
introducing — inventory, vendors/purchase orders, production orders, AR/AP
aging, capex — as real MySQL tables (`sql/10_ontology_domains.sql`), plus 13
new reports covering purchase price variance, production cost variance,
inventory exposure, slow-moving stock, order-to-cash leakage, revenue
recognition, customer cash risk, AP/procurement cash, working capital
bridge, capex economics, scenario EBITDA stress test, and a ranked
root-cause view across every dimension at once (`sql/11_ontology_views.sql`).
Live on the new **Supply Chain & Root-Cause** page (`/ontology`). The
"ontology" relationships are the plain foreign keys in these tables — there
is no separate Neo4j graph database.

## The V3–V17 zip lineage ("All Version" folder)

17 zips, each a full standalone snapshot rather than a diff. Confirmed by
extracting and diffing all of them: `enterprise-cfo-copilot-v7` through
`-v17` is one cumulative lineage — v17's zip fully contains v8 through v16's
files re-bundled inside it (file names like `neo4j/v8_governance.cypher`,
`backend/ontology/v10Engine.ts`, `snowflake/v14_agent_spec.yml` all still
present in v17). So only v17 needed reading, not all eleven. `v3` through
`v6` and the standalone `neo4j-enterprise-ontology-max-v1` are a *separate*,
non-overlapping lineage (different naming, different file structure) — v3
is PI/OSIsoft industrial dashboards; v4–v6's core 20-query material is the
same content covered by `sql/10_ontology_domains.sql` and
`sql/11_ontology_views.sql` above. Two things from this lineage were
initially left out as "different subject / just documentation" — on review
that wasn't actually a good reason (see below): both got built for real.

**V3's industrial dashboards** (`sql/15_industrial_ops.sql`,
`sql/16_industrial_views.sql`, page `/industrial`) — turns out v3's own
package also just simulated sensor data ("demo data so the UI works
immediately"), the same pattern this whole project uses for SAP/Anaplan, so
there was no real reason to treat it differently. Built a real
Plant→Process→Asset→Sensor hierarchy in MySQL with a genuine anomaly:
Pump P-220 develops a real thermal + vibration drift starting Feb 26 in the
seeded time series, and the risk view correctly flags it HIGH the moment
its live reading crosses the alarm threshold — verified by querying it
directly, not hardcoded. Three real dashboards: OEE (availability ×
performance × quality, computed from actual production-order downtime/
defect data), predictive maintenance risk (live sensor readings vs
thresholds), and energy-to-margin (energy cost per unit vs gross margin,
joined to the real sales data). The other two V3 dashboards
(Plan-to-Actual Digital Thread, Working Capital & Operational Risk) reuse
`production_plan_attainment` and `working_capital_bridge` — already built,
not duplicated.

**The source-table catalog** (`sql/14_source_catalog.sql`, page
`/catalog`) — the 196 candidate S/4HANA tables, 68 Anaplan platform/
planning objects, 53 ontology entities and 92 relationships from
`neo4j-enterprise-ontology-max-v1`, loaded for real into MySQL (raw CSVs
kept at `catalog/*.csv` for provenance) with an honest `implemented` flag
on every row — 49/264 source tables, 14/53 entities, 5/92 relationships
actually have a real table/view in this project; the rest are catalogued
for reference, browsable and filterable on the page, not just claimed.

**What turned out to be genuinely portable**: v17's core reasoning logic
(intent classification, SQL/ontology/result safety guards, confidence
calibration, evidence scoring, KPI reconciliation, recommendation
generation, chart-type selection, action-proposal governance) is pure
TypeScript with zero external dependencies — not narrative, not stubs. It
runs `demo!==false` by default even in the source zips. So instead of just
describing it as unbuildable, it's ported for real into `lib/copilot/` and
wired to genuine MySQL queries (replacing v17's hardcoded demo data) —
**not** to a live Neo4j graph or Snowflake Cortex Analyst, since neither is
available here. New **CFO Copilot** page (`/copilot`): ask a question, get
a real multi-step investigation — intent → SQL query against the conformed
model → safety guards → KPI reconciliation → evidence → confidence score →
recommendation → auto-selected chart → (if warranted) an action proposal
that only a human can approve, persisted for real in
`conformed.copilot_action_proposals`. Caught and fixed a real bug while
porting: the source's `numberRe`/`dateRe` regexes were double-escaped
literals (`/^-?\\d+.../`) that never matched an actual digit, and the
keyword-based intent classifier misfired on "**ar**gest" matching the "ar"
(AR/receivables) keyword — both fixed here, verified by testing all 6
intents against real questions.

Also ported for real (v8–v10's CSV ontology ingestion): upload one or more
CSVs → schema profiler infers column types/candidate keys/business entities
(SAP-style codes like `KUNNR`→Customer, `WERKS`→Plant included) → proposes
cross-table relationships (tested with a customer/order CSV pair — it
correctly found the shared `customer_id` foreign key) → **you approve** →
commits a real table into a new `uploads` MySQL database plus lineage into
`conformed.ingested_tables` / `conformed.ontology_mappings`. New
**Ontology Ingestion** page (`/ontology-upload`). v17's version of this
committed to Neo4j via Cypher `MERGE`; this one can commit to either —
see below.

## Neo4j and Ollama — now real, not dormant

Two things originally documented as "can't be done here" turned out to be
available on this machine after all:

**Neo4j** — a dedicated Docker container for *this project only*
(`docker-compose.yml`, container `sap-anaplan-neo4j`, its own named volume,
its own credentials — deliberately not sharing the pre-existing `prime-neo4j`
container found running on this machine for a different project). Start it
with `docker compose up -d`. `lib/neo4j.ts` is a real driver connection (no
demo-mode fallback — if the container's down, calls fail loudly rather than
silently faking success). `lib/copilot/neo4jSeed.ts` builds the actual
ontology graph — Company/Plant/CostCenter/ProfitCenter/GLAccount/Product/
Customer/Vendor nodes with `BELONGS_TO`/`SOLD`/`SOLD_TO`/`POSTED`/`SUPPLIES`
relationships — from a live query against the MySQL conformed model, not
synthetic sample data (`POST /api/ontology/graph` to seed/reseed; verified
by querying it directly with `cypher-shell` — e.g. Pune Manufacturing's
COGS postings match MySQL exactly). The **Ontology graph** section on
`/ontology` renders it live. The CFO Copilot's "ONTOLOGY" evidence item now
does a real graph traversal (`lib/copilot/graphContext.ts`) for the top
driver in every investigation, falling back to a text description only if
the container happens to be down.

**Ollama/Qwen** — found already running locally with `qwen2.5:7b` (plus
0.5b/3b and mistral) pulled. `lib/ollama.ts` is a real client against
`http://127.0.0.1:11434`. Wired into two places, both with the rule-based
version kept as a fallback if Ollama isn't reachable:
- `/api/ask` (`lib/copilot/llmMatch.ts`) — the LLM picks the best-matching
  verified query from the real list (semantic matching, not keyword
  overlap) and writes a real one-line summary of the actual result rows.
  It never generates free-form SQL itself, so the SQL-governance property
  holds regardless of which engine answered.
- `/copilot` (`lib/copilot/llmIntent.ts`) — real LLM intent classification,
  and a real LLM-written recommendation rationale grounded in the actual
  KPI/driver numbers (`lib/copilot/engine.ts`), replacing the templated
  one when the model responds.

Both surfaces show which engine actually answered (a "local LLM (Qwen)"
chip vs "rule-based / keyword-match, LLM unavailable") — verified by testing
both paths, including a real cold-start case where Ollama's model had been
unloaded from memory and a call timed out, correctly falling back rather
than erroring.

**What's still not built, and why**: Snowflake Cortex Agents/Search/Analyst
and Cortex Threads (no Snowflake account); live SAP OData / Anaplan API
metadata-discovery connectors (v11 — there's no real SAP or Anaplan system
here to discover, only the MySQL demo data). Those remain genuinely
credential-gated, unlike Neo4j and the LLM, which turned out to already be
available on this machine.

## What's included

- **KPI cards**: sales revenue/budget/variance/attainment, gross margin,
  finance (COGS+OPEX+Payroll) actual/budget/variance, and EBITDA/margin.
- **Ask Cortex Analyst**: free-text question box. Since there's no Snowflake
  account or LLM API key in this environment, this matches the question to
  the closest verified query by keyword/synonym overlap — the same
  "verified query" fallback pattern Cortex Analyst itself uses, just without
  the LLM doing the matching.
- **Sales Query Lab**: actual vs budget, revenue attainment, plant/product/
  customer performance, revenue miss drivers (ranked), actual vs forecast,
  gross margin, plant margin.
- **Finance vs Budget Query Lab**: actual vs budget company-wide, actual vs
  budget by cost center + GL account, EBITDA by month, revenue in USD.
- **Headcount & Working Capital**: Anaplan-only plan views (no SAP actual
  source exists for either, so no actual-vs-plan variance) — planned
  headcount/compensation by cost center, and AR/AP/inventory/net working
  capital.
- **Outlook & Risk**: YTD actual vs budget by plant, classified AT RISK
  (<95% attainment), WATCH (95–100%), or ON TRACK (≥100%).
- **Business Glossary**: the term/definition/business-rule table the doc
  recommends (Revenue, Actual, Budget, Forecast, Variance, Attainment,
  Missed Plan, Gross Margin, etc.), served from MySQL and rendered in the UI.
- **SAP source layer matches the doc's exact object split**: `FI_DOCUMENTS`
  + `FI_DOCUMENT_LINES` for finance postings, `SALES_ORDERS` +
  `SALES_ORDER_ITEMS` for order volume, `BILLING_DOCUMENTS` + `BILLING_ITEMS`
  for revenue/COGS (the doc explicitly prefers billing over order value for
  revenue — `fact_sales_actual` is built from billing, not orders).
- **Multi-currency**: every fact carries a `currency` column; `conformed.fx_rate`
  converts to USD (`actual_revenue_usd` in `sales_performance`). All demo
  data is still INR, but the conversion path is real and working.
- **Separate `dim_company` / `dim_plant`**: split out of the earlier combined
  `dim_organization`, matching the doc's production dimension list.

## Dormant Snowflake / Cortex Analyst path (v2 zip)

`sap-anaplan-cortex-demo-v2.zip` (a "live Snowflake" evolution of the
earlier zip) added a real Snowflake connector and a real Cortex Analyst
REST API client. Since there's no Snowflake account here, that code was
folded in as **dormant, env-gated capability** rather than a third running
app:

- `lib/snowflake.ts` — Snowflake Node driver, only used if `snowflakeConfigured()` is true.
- `lib/cortexAnalyst.ts` — calls Snowflake's real `/api/v2/cortex/analyst/message`, only used if `cortexConfigured()` is true.
- `lib/dataMode.ts` — `runActiveQuery()` picks MySQL (default) or Snowflake based on `DATA_MODE`.
- `/api/query` reports which mode actually ran (`dataMode: "mysql"` right now).
- `/api/ask` prefers real Cortex Analyst when `SNOWFLAKE_HOST`/`SNOWFLAKE_PAT`/`CORTEX_SEMANTIC_VIEW`
  are set; otherwise falls back to the keyword matcher against MySQL (the active behavior today).

To activate: set `DATA_MODE=snowflake` and fill in the `SNOWFLAKE_*` vars in
`.env.local` (currently blank). Note the SQL in `lib/queries.ts` was written
and tested against MySQL — it will likely run unchanged against a Snowflake
`CONFORMED` schema with matching table/view names (unquoted identifiers are
case-insensitive in both engines), but that has not been verified against a
real Snowflake account.

## Still not implemented (needs different credentials, not more effort)

- The actual Snowflake semantic-view YAML deployment and a genuinely live
  Cortex Analyst / `SYSTEM$CREATE_SEMANTIC_VIEW_FROM_YAML` — the client code
  now exists (above) but has never executed against a real account.
- Genuine NL-to-SQL generation without Snowflake — `/api/ask`'s fallback path
  is keyword-matching against a fixed query list, not an LLM.

## Note on the downloadable zips

The doc references two standalone downloadable packages
(`sap-anaplan-cortex-demo.zip`, then `sap-anaplan-cortex-demo-v2.zip`), each
with its own Next.js/MUI UI. Both were extracted and folded into this single
project rather than kept as separate running apps — they were the same
dashboard-over-the-same-data. What survived: source chips on query results,
a system-status tile row (from v1), and the dormant Snowflake/Cortex Analyst
connector described above (from v2).

## Files

```
sql/01_schema.sql                raw + conformed sales schema
sql/02_seed.sql                   sales demo data (2 plants, 3 products, 4 customers, Jan/Feb 2026)
sql/03_view.sql                    conformed.sales_performance (initial version)
sql/04_finance_schema.sql         finance raw + conformed schema, extra dimensions, glossary table
sql/05_seed_extended.sql          FORECAST/TARGET scenarios, finance data, glossary rows, currency cols
sql/06_views_extended.sql         sales_performance (pivoted budget/forecast), finance_performance, executive_outlook
sql/07_sap_source_restructure.sql FI documents/lines, sales orders/items, billing documents/items; rebuilds facts
sql/08_dims_currency_pl.sql       dim_company, dim_plant, fx_rate, pl_summary (EBITDA); repoints sales_performance
sql/09_headcount_workingcapital.sql  headcount + working-capital plan tables and summary views
lib/db.ts                         MySQL connection pool
lib/queries.ts                     16 verified queries (sales + finance + EBITDA + planning + outlook)
lib/nlMatch.ts                     keyword-based NL -> verified-query matcher
app/api/query/                      run a verified query by id
app/api/ask/                        NL question -> matched verified query -> results
app/api/glossary/                   business glossary rows
app/page.tsx                        Overview page (/) — KPIs
app/ask/page.tsx                    Ask a Question (/ask)
app/sales/page.tsx                  Sales Performance (/sales)
app/finance/page.tsx                Finance & Profitability (/finance)
app/planning/page.tsx               Headcount & Working Capital (/planning)
app/outlook/page.tsx                Outlook & Risk (/outlook)
app/glossary/page.tsx               Glossary (/glossary)
components/AppShell.tsx             shared layout: header + sidebar + content wrapper, used by every page
components/                         Sidebar, KpiCard, QueryRunner, AskCortex, OutlookRisk, BusinessGlossary, ThemeRegistry, AppHeader, ThemeToggle
```
