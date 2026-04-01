-- ==========================================
-- 4. HISTORIQUE + SOFT DELETE DES SIGNALMENTS
-- ==========================================
--
-- Cette migration :
-- - ajoute updated_at / deleted_at sur reports
-- - conserve un historique des modifications et suppressions
-- - permet la modification / suppression publique dans le MVP actuel
--
-- À durcir plus tard si une authentification ou une modération est ajoutée.

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE reports
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('update', 'delete')),
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_set_updated_at ON reports;
CREATE TRIGGER reports_set_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION set_reports_updated_at();

CREATE OR REPLACE FUNCTION log_report_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO report_history (report_id, action, snapshot)
  VALUES (
    OLD.id,
    CASE
      WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'delete'
      ELSE 'update'
    END,
    to_jsonb(OLD)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_log_history ON reports;
CREATE TRIGGER reports_log_history
BEFORE UPDATE ON reports
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION log_report_history();

DROP POLICY IF EXISTS "Modification de ses propres signalements" ON reports;
DROP POLICY IF EXISTS "Suppression de ses propres signalements" ON reports;

CREATE POLICY "Modification publique de signalements" ON reports
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Suppression publique de signalements" ON reports
FOR DELETE
TO anon, authenticated
USING (true);
