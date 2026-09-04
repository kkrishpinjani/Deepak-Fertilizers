-- ============================================================
-- V14/V15's "Cortex Search" evidence — unstructured documents
-- (contracts, policies) the copilot can cite alongside structured
-- data. Real MySQL FULLTEXT search, not embeddings (no embedding
-- model pulled in Ollama) — same honest tradeoff as everywhere
-- else: real search, simpler technique than the doc's Cortex
-- Search, not a fabricated stand-in.
-- ============================================================

CREATE TABLE conformed.documents (
    id            VARCHAR(20) PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    category      VARCHAR(40) NOT NULL,  -- CONTRACT | POLICY | COMMENTARY
    related_vendor_id   VARCHAR(20) NULL,
    related_customer_id VARCHAR(30) NULL,
    content       TEXT NOT NULL,
    FULLTEXT KEY ft_content (title, content)
);

INSERT INTO conformed.documents (id, title, category, related_vendor_id, related_customer_id, content) VALUES
('DOC-001', 'Steel Corp Supply Agreement — Annual Escalation Clause', 'CONTRACT', 'VEND-A', NULL,
 'This supply agreement with Steel Corp (Vendor VEND-A) for raw steel permits an annual price escalation of up to 3% tied to the benchmark steel index, reviewed each January. Any escalation beyond 3% in a single year requires written approval from procurement leadership. The February purchase order priced at 463/unit against a standard of 420/unit represents an escalation of approximately 10.2%, which exceeds the contractual 3% cap and should be raised with the vendor as a contract compliance issue, not simply absorbed as cost variance.'),
('DOC-002', 'Copper Traders Master Purchase Agreement', 'CONTRACT', 'VEND-B', NULL,
 'Copper Traders (Vendor VEND-B) supplies copper under a master agreement indexed to LME copper spot price plus a fixed 4% processing margin. Price movements tracking the LME index are expected and do not constitute a vendor performance issue. Variance analysis on this vendor should be benchmarked against LME spot price changes, not treated as pure purchase price variance.'),
('DOC-003', 'Bearings Inc Framework Contract', 'CONTRACT', 'VEND-C', NULL,
 'Bearings Inc (Vendor VEND-C) framework contract sets a volume-tiered discount: orders above 1000 units qualify for a 2% discount off standard price. Recent orders have been priced above standard despite meeting the volume tier, suggesting the discount is not being applied at time of invoicing — a billing/AP reconciliation item, not a genuine price increase.'),
('DOC-004', 'ABC Manufacturing Payment Terms Addendum', 'CONTRACT', NULL, 'C001',
 'ABC Manufacturing (Customer C001) payment terms were extended from Net 30 to Net 60 in a signed addendum effective this fiscal year, in exchange for a committed annual order volume. The extended terms explain elevated overdue AR aging for this customer relative to prior periods and should not be treated as a collections risk in the same way as an unplanned payment delay.'),
('DOC-005', 'Pune Plant Energy Efficiency Policy', 'POLICY', NULL, NULL,
 'The Pune plant energy policy targets energy cost per unit produced to remain within 5% of the trailing twelve-month average. Sustained deviations beyond this band should trigger a maintenance review of major equipment, particularly aging compressors and pumps, since equipment degradation is the most common root cause of rising energy intensity per unit.'),
('DOC-006', 'Predictive Maintenance Escalation Policy', 'POLICY', NULL, NULL,
 'Any asset sensor reading that crosses the alarm threshold (not just the warning threshold) requires a maintenance work order to be opened within 24 hours and the asset criticality reassessed. High-criticality assets — including centrifugal pumps in continuous-duty service — that show combined thermal and vibration alarms simultaneously should be scheduled for inspection at the next planned stoppage at the latest, and taken offline immediately if output quality is affected.'),
('DOC-007', 'Chennai Plant Q1 Commentary', 'COMMENTARY', NULL, NULL,
 'Chennai plant finance commentary for the first fiscal quarter notes that control-system production (Product MAT003) has been running below plan due to a component shortage from a secondary supplier, expected to resolve by the start of the next quarter. This is treated as a temporary supply constraint rather than a structural demand or pricing issue.');
