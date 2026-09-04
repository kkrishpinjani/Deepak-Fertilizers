-- ============================================================
-- V3's three genuinely new dashboards: OEE, predictive
-- maintenance risk, energy-to-margin. The other two V3
-- dashboards (Plan-to-Actual Digital Thread, Working Capital &
-- Operational Risk) reuse conformed.production_plan_attainment
-- and conformed.working_capital_bridge — already built, not
-- duplicated here.
-- ============================================================

-- ---------- 1. OEE by plant/process/product ----------
DROP VIEW IF EXISTS conformed.oee_by_process;
CREATE VIEW conformed.oee_by_process AS
SELECT
    pr.process_name,
    o.plant_name,
    p.product_name,
    SUM(f.planned_hours) AS planned_hours,
    SUM(f.downtime_hours) AS downtime_hours,
    CASE WHEN SUM(f.planned_hours) = 0 THEN NULL
         ELSE (SUM(f.planned_hours) - SUM(f.downtime_hours)) / SUM(f.planned_hours) * 100
    END AS availability_percent,
    CASE WHEN SUM(f.planned_qty) = 0 THEN NULL
         ELSE SUM(f.actual_qty) / SUM(f.planned_qty) * 100
    END AS performance_percent,
    CASE WHEN SUM(f.actual_qty) = 0 THEN NULL
         ELSE (SUM(f.actual_qty) - SUM(f.defect_qty)) / SUM(f.actual_qty) * 100
    END AS quality_percent
FROM conformed.fact_production_order f
JOIN conformed.dim_product p ON f.product_id = p.product_id
JOIN conformed.dim_plant o ON f.plant = o.plant
-- Match a production order to a process by plant + rough product mapping
-- (MAT001/MAT002 -> Pune processes, MAT003 -> Chennai process).
JOIN conformed.dim_process pr
  ON pr.plant = f.plant
 AND ((f.product_id = 'MAT001' AND pr.process_id = 'PROC-P001-A')
   OR (f.product_id = 'MAT002' AND pr.process_id = 'PROC-P001-B')
   OR (f.product_id = 'MAT003' AND pr.process_id = 'PROC-P002-A'))
GROUP BY pr.process_name, o.plant_name, p.product_name;

DROP VIEW IF EXISTS conformed.oee_summary;
CREATE VIEW conformed.oee_summary AS
SELECT
    process_name,
    plant_name,
    availability_percent,
    performance_percent,
    quality_percent,
    (availability_percent / 100) * (performance_percent / 100) * (quality_percent / 100) * 100 AS oee_percent
FROM conformed.oee_by_process;

-- ---------- 2. Predictive maintenance risk ----------
DROP VIEW IF EXISTS conformed.predictive_maintenance_risk;
CREATE VIEW conformed.predictive_maintenance_risk AS
SELECT
    a.asset_name,
    a.asset_type,
    a.criticality,
    o.plant_name,
    s.sensor_type,
    latest.value AS latest_reading,
    s.alarm_threshold,
    COUNT(DISTINCT ev.event_id) AS open_events,
    SUM(CASE WHEN ev.severity = 'ALERT' THEN 1 ELSE 0 END) AS alert_count,
    MAX(ev.event_time) AS last_event_time,
    CASE
        WHEN latest.value >= s.alarm_threshold THEN 'HIGH'
        WHEN latest.value >= s.warn_threshold THEN 'MEDIUM'
        ELSE 'LOW'
    END AS risk_level
FROM conformed.dim_asset a
JOIN conformed.dim_plant o ON a.plant = o.plant
JOIN conformed.dim_sensor s ON s.asset_id = a.asset_id
LEFT JOIN conformed.fact_sensor_event ev ON ev.sensor_id = s.sensor_id
LEFT JOIN (
    SELECT r1.sensor_id, r1.value
    FROM conformed.fact_sensor_reading r1
    JOIN (SELECT sensor_id, MAX(reading_time) AS max_t FROM conformed.fact_sensor_reading GROUP BY sensor_id) r2
      ON r1.sensor_id = r2.sensor_id AND r1.reading_time = r2.max_t
) latest ON latest.sensor_id = s.sensor_id
GROUP BY a.asset_name, a.asset_type, a.criticality, o.plant_name, s.sensor_type, latest.value, s.alarm_threshold, s.warn_threshold
ORDER BY FIELD(risk_level, 'HIGH', 'MEDIUM', 'LOW'), alert_count DESC;

-- ---------- 3. Energy-to-margin ----------
DROP VIEW IF EXISTS conformed.energy_to_margin;
CREATE VIEW conformed.energy_to_margin AS
SELECT
    e.plant,
    o.plant_name,
    e.reading_date,
    e.energy_kwh,
    e.energy_cost,
    s.actual_revenue,
    s.actual_quantity,
    CASE WHEN s.actual_quantity = 0 THEN NULL ELSE e.energy_cost / s.actual_quantity END AS energy_cost_per_unit,
    s.gross_margin_percent
FROM conformed.fact_energy_consumption e
JOIN conformed.dim_plant o ON e.plant = o.plant
JOIN (
    SELECT plant, date_key, SUM(actual_revenue) AS actual_revenue, SUM(actual_quantity) AS actual_quantity,
           AVG(gross_margin_percent) AS gross_margin_percent
    FROM conformed.sales_performance
    GROUP BY plant, date_key
) s ON e.plant = s.plant AND e.reading_date = s.date_key;

-- ---------- sensor time series (for charting) ----------
DROP VIEW IF EXISTS conformed.sensor_timeseries;
CREATE VIEW conformed.sensor_timeseries AS
SELECT
    a.asset_name,
    sn.sensor_type,
    sn.unit,
    r.reading_time,
    r.value,
    sn.warn_threshold,
    sn.alarm_threshold
FROM conformed.fact_sensor_reading r
JOIN conformed.dim_sensor sn ON r.sensor_id = sn.sensor_id
JOIN conformed.dim_asset a ON sn.asset_id = a.asset_id;
