-- ============================================================
-- V3's industrial ontology (Plant OEE, Predictive Maintenance,
-- Energy-to-Margin), built the same way as everything else in
-- this project: simulated data in MySQL, real queries against
-- it — no PI historian exists here (the doc's own V3 package
-- shipped the same way: "demo data so the UI works immediately").
-- Ontology chain: Plant -> Process -> Asset -> Sensor -> Event,
-- reusing the existing Plant/Product/finance tables for the
-- "digital thread" and "working capital" dashboards instead of
-- duplicating them.
-- ============================================================

CREATE TABLE conformed.dim_process (
    process_id    VARCHAR(20) PRIMARY KEY,
    process_name  VARCHAR(120) NOT NULL,
    plant         VARCHAR(20) NOT NULL
);

CREATE TABLE conformed.dim_asset (
    asset_id      VARCHAR(20) PRIMARY KEY,
    asset_name    VARCHAR(120) NOT NULL,
    process_id    VARCHAR(20) NOT NULL,
    plant         VARCHAR(20) NOT NULL,
    asset_type    VARCHAR(60) NOT NULL,
    criticality   VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
);

CREATE TABLE conformed.dim_sensor (
    sensor_id     VARCHAR(20) PRIMARY KEY,
    asset_id      VARCHAR(20) NOT NULL,
    sensor_type   VARCHAR(40) NOT NULL,  -- TEMPERATURE | VIBRATION | PRESSURE
    unit          VARCHAR(20) NOT NULL,
    warn_threshold  DECIMAL(10,2) NOT NULL,
    alarm_threshold DECIMAL(10,2) NOT NULL
);

CREATE TABLE conformed.fact_sensor_reading (
    sensor_id     VARCHAR(20) NOT NULL,
    reading_time  DATETIME NOT NULL,
    value         DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (sensor_id, reading_time)
);

CREATE TABLE conformed.fact_sensor_event (
    event_id      VARCHAR(20) PRIMARY KEY,
    sensor_id     VARCHAR(20) NOT NULL,
    event_time    DATETIME NOT NULL,
    severity      VARCHAR(20) NOT NULL,  -- WARNING | ALERT
    description   VARCHAR(255) NOT NULL
);

CREATE TABLE conformed.fact_energy_consumption (
    plant         VARCHAR(20) NOT NULL,
    reading_date  DATE NOT NULL,
    energy_kwh    DECIMAL(14,2) NOT NULL,
    energy_cost   DECIMAL(14,2) NOT NULL,
    PRIMARY KEY (plant, reading_date)
);

-- OEE inputs: downtime + defects on top of the existing production
-- orders (which already carry planned_qty/actual_qty).
ALTER TABLE conformed.fact_production_order
    ADD COLUMN downtime_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
    ADD COLUMN planned_hours  DECIMAL(8,2) NOT NULL DEFAULT 0,
    ADD COLUMN defect_qty     DECIMAL(18,4) NOT NULL DEFAULT 0;

UPDATE conformed.fact_production_order SET planned_hours = 160, downtime_hours = 12, defect_qty = 8  WHERE production_order_id = 'PROD-2001';
UPDATE conformed.fact_production_order SET planned_hours = 168, downtime_hours = 9,  defect_qty = 6  WHERE production_order_id = 'PROD-2002';
UPDATE conformed.fact_production_order SET planned_hours = 160, downtime_hours = 6,  defect_qty = 4  WHERE production_order_id = 'PROD-2003';
UPDATE conformed.fact_production_order SET planned_hours = 160, downtime_hours = 18, defect_qty = 10 WHERE production_order_id = 'PROD-2004';
UPDATE conformed.fact_production_order SET planned_hours = 160, downtime_hours = 8,  defect_qty = 7  WHERE production_order_id = 'PROD-2005';
UPDATE conformed.fact_production_order SET planned_hours = 168, downtime_hours = 22, defect_qty = 14 WHERE production_order_id = 'PROD-2006';

-- ---------- dimensions ----------
INSERT INTO conformed.dim_process (process_id, process_name, plant) VALUES
('PROC-P001-A','Motor Assembly','P001'),
('PROC-P001-B','Pump Assembly','P001'),
('PROC-P002-A','Control Panel Assembly','P002');

INSERT INTO conformed.dim_asset (asset_id, asset_name, process_id, plant, asset_type, criticality) VALUES
('AST-M101','Motor Line CNC 1','PROC-P001-A','P001','CNC Machine','HIGH'),
('AST-M102','Motor Line Welder 1','PROC-P001-A','P001','Welding Robot','MEDIUM'),
('AST-P220','Pump P-220','PROC-P001-B','P001','Centrifugal Pump','HIGH'),
('AST-P221','Pump P-221','PROC-P001-B','P001','Centrifugal Pump','MEDIUM'),
('AST-C301','Control Assembly Line 1','PROC-P002-A','P002','Assembly Line','MEDIUM');

INSERT INTO conformed.dim_sensor (sensor_id, asset_id, sensor_type, unit, warn_threshold, alarm_threshold) VALUES
('SNS-M101-T','AST-M101','TEMPERATURE','°C',70,85),
('SNS-M101-V','AST-M101','VIBRATION','mm/s',5,7.5),
('SNS-P220-T','AST-P220','TEMPERATURE','°C',75,90),
('SNS-P220-V','AST-P220','VIBRATION','mm/s',6,8),
('SNS-P221-T','AST-P221','TEMPERATURE','°C',75,90),
('SNS-P221-V','AST-P221','VIBRATION','mm/s',6,8),
('SNS-C301-T','AST-C301','TEMPERATURE','°C',60,75);

-- ---------- energy ----------
INSERT INTO conformed.fact_energy_consumption (plant, reading_date, energy_kwh, energy_cost) VALUES
('P001','2026-01-31', 128400, 1027200),
('P001','2026-02-28', 132100, 1056800),
('P002','2026-01-31',  86200,  672360),
('P002','2026-02-28',  88950,  693210);

-- ---------- sensor events (matching the doc's P-220 narrative) ----------
INSERT INTO conformed.fact_sensor_event (event_id, sensor_id, event_time, severity, description) VALUES
('EVT-0001','SNS-P220-T','2026-02-26 14:00:00','ALERT','Thermal anomaly: sustained reading above alarm threshold'),
('EVT-0002','SNS-P220-V','2026-02-26 15:00:00','ALERT','Vibration anomaly: mechanical wear pattern detected'),
('EVT-0003','SNS-M101-V','2026-02-20 09:00:00','WARNING','Vibration trending toward warn threshold');
