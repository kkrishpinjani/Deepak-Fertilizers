-- ============================================================
-- Source-table / ontology reference catalog, ported from
-- neo4j-enterprise-ontology-max-v1's CSVs (196 candidate S/4HANA
-- tables, 68 Anaplan platform + planning objects, 53 canonical
-- ontology entities, 92 relationships). This is reference data —
-- "what a full enterprise implementation's source estate looks
-- like" — with an `implemented` flag marking which of these this
-- project actually built a real table/view for, vs which remain
-- catalog-only. Raw CSVs kept at catalog/*.csv for provenance.
-- ============================================================

CREATE TABLE conformed.source_table_catalog (
    source_system VARCHAR(10) NOT NULL,      -- SAP | ANAPLAN
    code          VARCHAR(40) NOT NULL,
    description   VARCHAR(255) NOT NULL,
    domain        VARCHAR(60) NOT NULL,
    implemented   TINYINT(1) NOT NULL DEFAULT 0,
    implemented_as VARCHAR(120) NULL,
    PRIMARY KEY (source_system, code)
);

CREATE TABLE conformed.ontology_entity_catalog (
    entity        VARCHAR(60) PRIMARY KEY,
    description   VARCHAR(255) NOT NULL,
    source        VARCHAR(30) NOT NULL,
    implemented   TINYINT(1) NOT NULL DEFAULT 0,
    implemented_as VARCHAR(120) NULL
);

CREATE TABLE conformed.ontology_relationship_catalog (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    from_entity     VARCHAR(60) NOT NULL,
    relationship    VARCHAR(60) NOT NULL,
    to_entity       VARCHAR(60) NOT NULL,
    implemented     TINYINT(1) NOT NULL DEFAULT 0
);
