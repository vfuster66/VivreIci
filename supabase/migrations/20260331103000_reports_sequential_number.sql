-- ==========================================
-- 5. NUMÉROTATION ASCENDANTE DES SIGNALMENTS
-- ==========================================
--
-- Ajoute un numéro public croissant, unique et sans doublon pour les
-- signalements. Ce numéro est conservé même si le type change ensuite.

CREATE SEQUENCE IF NOT EXISTS reports_public_number_seq;

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS report_number BIGINT;

WITH ordered_reports AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS next_number
  FROM reports
  WHERE report_number IS NULL
)
UPDATE reports
SET report_number = ordered_reports.next_number
FROM ordered_reports
WHERE reports.id = ordered_reports.id;

SELECT setval(
  'reports_public_number_seq',
  COALESCE((SELECT MAX(report_number) FROM reports), 0),
  true
);

ALTER TABLE reports
ALTER COLUMN report_number SET DEFAULT nextval('reports_public_number_seq');

CREATE OR REPLACE FUNCTION set_reports_public_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_number IS NULL THEN
    NEW.report_number := nextval('reports_public_number_seq');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_set_public_number ON reports;
CREATE TRIGGER reports_set_public_number
BEFORE INSERT ON reports
FOR EACH ROW
EXECUTE FUNCTION set_reports_public_number();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reports_report_number_key'
  ) THEN
    ALTER TABLE reports
    ADD CONSTRAINT reports_report_number_key UNIQUE (report_number);
  END IF;
END $$;

ALTER TABLE reports
ALTER COLUMN report_number SET NOT NULL;
