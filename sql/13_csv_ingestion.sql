-- ============================================================
-- Real persistence for the CSV ontology-ingestion pipeline
-- (ported from v8-v10's Profile -> Review -> Approve -> Commit
-- governance model). Uploaded tables land in their own `uploads`
-- database; lineage/mappings are tracked in `conformed` so the
-- rest of the app can see what's been ingested.
-- ============================================================

CREATE DATABASE IF NOT EXISTS uploads CHARACTER SET utf8mb4;

CREATE TABLE conformed.ingested_tables (
    id             VARCHAR(60) PRIMARY KEY,
    table_name     VARCHAR(120) NOT NULL,
    row_count      INT NOT NULL,
    primary_key    VARCHAR(120) NULL,
    entities       VARCHAR(500) NOT NULL,
    status         VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    ingested_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conformed.ontology_mappings (
    id               VARCHAR(80) PRIMARY KEY,
    source_table_id  VARCHAR(60) NOT NULL,
    from_entity      VARCHAR(100) NOT NULL,
    from_column      VARCHAR(120) NOT NULL,
    to_table         VARCHAR(120) NULL,
    to_column        VARCHAR(120) NULL,
    to_entity        VARCHAR(100) NOT NULL,
    relationship     VARCHAR(30) NOT NULL,
    confidence       DECIMAL(5,4) NOT NULL,
    status           VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mapping_table FOREIGN KEY (source_table_id) REFERENCES conformed.ingested_tables (id)
);
