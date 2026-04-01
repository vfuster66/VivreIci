-- ==========================================
-- 6. NUMÉROTATION ASCENDANTE PAR TYPE
-- ==========================================
--
-- Ajoute un numéro croissant par type de signalement, sans doublon au sein
-- d'un même type. Si le type change, le signalement reçoit le prochain numéro
-- disponible dans le nouveau type.

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS report_type_number BIGINT;

WITH ranked_reports AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at ASC, id ASC) AS next_number
  FROM reports
  WHERE report_type_number IS NULL
)
UPDATE reports
SET report_type_number = ranked_reports.next_number
FROM ranked_reports
WHERE reports.id = ranked_reports.id;

CREATE TABLE IF NOT EXISTS report_type_counters (
  type TEXT PRIMARY KEY,
  last_value BIGINT NOT NULL
);

INSERT INTO report_type_counters (type, last_value)
SELECT type, MAX(report_type_number)
FROM reports
GROUP BY type
ON CONFLICT (type) DO UPDATE
SET last_value = EXCLUDED.last_value;

CREATE OR REPLACE FUNCTION set_report_type_number()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.report_type_number IS NULL THEN
    INSERT INTO report_type_counters (type, last_value)
    VALUES (NEW.type, 1)
    ON CONFLICT (type)
    DO UPDATE SET last_value = report_type_counters.last_value + 1
    RETURNING last_value INTO NEW.report_type_number;
  ELSIF TG_OP = 'UPDATE' AND NEW.type IS DISTINCT FROM OLD.type THEN
    INSERT INTO report_type_counters (type, last_value)
    VALUES (NEW.type, 1)
    ON CONFLICT (type)
    DO UPDATE SET last_value = report_type_counters.last_value + 1
    RETURNING last_value INTO NEW.report_type_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_set_type_number ON reports;
CREATE TRIGGER reports_set_type_number
BEFORE INSERT OR UPDATE OF type ON reports
FOR EACH ROW
EXECUTE FUNCTION set_report_type_number();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reports_type_report_type_number_key'
  ) THEN
    ALTER TABLE reports
    ADD CONSTRAINT reports_type_report_type_number_key UNIQUE (type, report_type_number);
  END IF;
END $$;

ALTER TABLE reports
ALTER COLUMN report_type_number SET NOT NULL;
