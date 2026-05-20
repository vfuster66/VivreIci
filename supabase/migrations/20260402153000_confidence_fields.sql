ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS confidence_level TEXT,
  ADD COLUMN IF NOT EXISTS confidence_reasons JSONB,
  ADD COLUMN IF NOT EXISTS confidence_version TEXT,
  ADD COLUMN IF NOT EXISTS confidence_updated_at TIMESTAMPTZ;

ALTER TABLE public.help_posts
  ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS confidence_level TEXT,
  ADD COLUMN IF NOT EXISTS confidence_reasons JSONB,
  ADD COLUMN IF NOT EXISTS confidence_version TEXT,
  ADD COLUMN IF NOT EXISTS confidence_updated_at TIMESTAMPTZ;

ALTER TABLE public.lost_pets
  ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS confidence_level TEXT,
  ADD COLUMN IF NOT EXISTS confidence_reasons JSONB,
  ADD COLUMN IF NOT EXISTS confidence_version TEXT,
  ADD COLUMN IF NOT EXISTS confidence_updated_at TIMESTAMPTZ;

ALTER TABLE public.animal_alerts
  ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS confidence_level TEXT,
  ADD COLUMN IF NOT EXISTS confidence_reasons JSONB,
  ADD COLUMN IF NOT EXISTS confidence_version TEXT,
  ADD COLUMN IF NOT EXISTS confidence_updated_at TIMESTAMPTZ;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_confidence_level_check;
ALTER TABLE public.help_posts
  DROP CONSTRAINT IF EXISTS help_posts_confidence_level_check;
ALTER TABLE public.lost_pets
  DROP CONSTRAINT IF EXISTS lost_pets_confidence_level_check;
ALTER TABLE public.animal_alerts
  DROP CONSTRAINT IF EXISTS animal_alerts_confidence_level_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_confidence_level_check
    CHECK (confidence_level IS NULL OR confidence_level IN ('low', 'medium', 'high'));
ALTER TABLE public.help_posts
  ADD CONSTRAINT help_posts_confidence_level_check
    CHECK (confidence_level IS NULL OR confidence_level IN ('low', 'medium', 'high'));
ALTER TABLE public.lost_pets
  ADD CONSTRAINT lost_pets_confidence_level_check
    CHECK (confidence_level IS NULL OR confidence_level IN ('low', 'medium', 'high'));
ALTER TABLE public.animal_alerts
  ADD CONSTRAINT animal_alerts_confidence_level_check
    CHECK (confidence_level IS NULL OR confidence_level IN ('low', 'medium', 'high'));

WITH report_counts AS (
  SELECT
    r.id,
    COALESCE(rc.confirm_count, 0) AS confirmation_count,
    COALESCE(ra.abuse_count, 0) AS abuse_count
  FROM public.reports r
  LEFT JOIN (
    SELECT report_id, COUNT(*)::INT AS confirm_count
    FROM public.report_confirmations
    GROUP BY report_id
  ) rc ON rc.report_id = r.id
  LEFT JOIN (
    SELECT report_id, COUNT(*)::INT AS abuse_count
    FROM public.report_abuse_flags
    GROUP BY report_id
  ) ra ON ra.report_id = r.id
), report_scores AS (
  SELECT
    id,
    GREATEST(
      0,
      LEAST(
        100,
        ROUND(
          45
          + LEAST(30, confirmation_count * 12)
          - LEAST(40, abuse_count * 18)
          + CASE
              WHEN (SELECT status FROM public.reports WHERE public.reports.id = report_counts.id) = 'in_progress' THEN 10
              WHEN (SELECT status FROM public.reports WHERE public.reports.id = report_counts.id) = 'resolved' THEN 16
              WHEN (SELECT status FROM public.reports WHERE public.reports.id = report_counts.id) = 'archived' THEN 4
              ELSE 0
            END
          - CASE
              WHEN (SELECT status FROM public.reports WHERE public.reports.id = report_counts.id) = 'open'
                AND (SELECT created_at FROM public.reports WHERE public.reports.id = report_counts.id) < now() - interval '30 days'
              THEN 8
              ELSE 0
            END
        )
      )
    )::INT AS score,
    to_jsonb(
      array_remove(
        ARRAY[
          CASE WHEN confirmation_count > 0 THEN confirmation_count::TEXT || ' confirmation(s) voisine(s)' END,
          CASE WHEN abuse_count = 0 THEN 'Aucun abus signalé' ELSE abuse_count::TEXT || ' abus signalé(s)' END,
          CASE
            WHEN (SELECT status FROM public.reports WHERE public.reports.id = report_counts.id) = 'resolved' THEN 'Signalement résolu'
            WHEN (SELECT status FROM public.reports WHERE public.reports.id = report_counts.id) = 'in_progress' THEN 'Signalement pris en charge'
            WHEN (SELECT status FROM public.reports WHERE public.reports.id = report_counts.id) = 'archived' THEN 'Signalement archivé'
            ELSE 'Signalement encore ouvert'
          END,
          CASE
            WHEN (SELECT created_at FROM public.reports WHERE public.reports.id = report_counts.id) >= now() - interval '7 days' THEN 'Publication récente'
          END
        ],
        NULL
      )
    ) AS reasons
  FROM report_counts
)
UPDATE public.reports r
SET
  confidence_score = s.score,
  confidence_level = CASE
    WHEN s.score >= 75 THEN 'high'
    WHEN s.score >= 45 THEN 'medium'
    ELSE 'low'
  END,
  confidence_reasons = s.reasons,
  confidence_version = 'v1',
  confidence_updated_at = now()
FROM report_scores s
WHERE r.id = s.id;

WITH help_counts AS (
  SELECT
    hp.id,
    COALESCE(hpr.response_count, 0) AS response_count
  FROM public.help_posts hp
  LEFT JOIN (
    SELECT post_id, COUNT(*)::INT AS response_count
    FROM public.help_post_responses
    GROUP BY post_id
  ) hpr ON hpr.post_id = hp.id
), help_scores AS (
  SELECT
    hp.id,
    GREATEST(
      0,
      LEAST(
        100,
        ROUND(
          40
          + LEAST(25, hc.response_count * 10)
          + CASE WHEN hp.accepted_response_id IS NOT NULL THEN 18 ELSE 0 END
          + CASE
              WHEN hp.workflow_state = 'found' THEN 20
              WHEN hp.workflow_state = 'closed' THEN 8
              ELSE 0
            END
          + CASE WHEN hp.priority = 'urgent' THEN 6 ELSE 0 END
          - CASE
              WHEN hp.created_at < now() - interval '14 days'
                AND hp.workflow_state = 'searching'
              THEN 10
              ELSE 0
            END
        )
      )
    )::INT AS score,
    to_jsonb(
      array_remove(
        ARRAY[
          CASE WHEN hc.response_count > 0 THEN hc.response_count::TEXT || ' réponse(s)' END,
          CASE WHEN hp.accepted_response_id IS NOT NULL THEN 'Une proposition a été retenue' END,
          CASE
            WHEN hp.workflow_state = 'found' THEN 'Solution trouvée'
            WHEN hp.workflow_state = 'closed' OR hp.status = 'closed' THEN 'Annonce clôturée'
            ELSE 'Recherche en cours'
          END,
          CASE WHEN hp.priority = 'urgent' THEN 'Priorité urgente' END
        ],
        NULL
      )
    ) AS reasons
  FROM public.help_posts hp
  JOIN help_counts hc ON hc.id = hp.id
)
UPDATE public.help_posts hp
SET
  confidence_score = s.score,
  confidence_level = CASE
    WHEN s.score >= 75 THEN 'high'
    WHEN s.score >= 45 THEN 'medium'
    ELSE 'low'
  END,
  confidence_reasons = s.reasons,
  confidence_version = 'v1',
  confidence_updated_at = now()
FROM help_scores s
WHERE hp.id = s.id;

WITH pet_counts AS (
  SELECT
    lp.id,
    COALESCE(lpr.response_count, 0) AS response_count
  FROM public.lost_pets lp
  LEFT JOIN (
    SELECT pet_id, COUNT(*)::INT AS response_count
    FROM public.lost_pet_responses
    GROUP BY pet_id
  ) lpr ON lpr.pet_id = lp.id
), pet_scores AS (
  SELECT
    lp.id,
    GREATEST(
      0,
      LEAST(
        100,
        ROUND(
          42
          + LEAST(24, pc.response_count * 8)
          + CASE WHEN lp.accepted_response_id IS NOT NULL THEN 18 ELSE 0 END
          + CASE WHEN COALESCE(lp.is_found, false) THEN 20 ELSE 0 END
          + CASE WHEN lp.photo_url IS NOT NULL AND lp.photo_url <> '' THEN 8 ELSE 0 END
          - CASE
              WHEN lp.created_at < now() - interval '21 days'
                AND lp.accepted_response_id IS NULL
                AND COALESCE(lp.is_found, false) = false
              THEN 10
              ELSE 0
            END
        )
      )
    )::INT AS score,
    to_jsonb(
      array_remove(
        ARRAY[
          CASE WHEN pc.response_count > 0 THEN pc.response_count::TEXT || ' piste(s) reçue(s)' END,
          CASE WHEN lp.accepted_response_id IS NOT NULL THEN 'Une piste a été retenue' END,
          CASE WHEN COALESCE(lp.is_found, false) THEN 'Annonce clôturée avec issue connue' END,
          CASE WHEN lp.photo_url IS NOT NULL AND lp.photo_url <> '' THEN 'Photo présente' END
        ],
        NULL
      )
    ) AS reasons
  FROM public.lost_pets lp
  JOIN pet_counts pc ON pc.id = lp.id
)
UPDATE public.lost_pets lp
SET
  confidence_score = s.score,
  confidence_level = CASE
    WHEN s.score >= 75 THEN 'high'
    WHEN s.score >= 45 THEN 'medium'
    ELSE 'low'
  END,
  confidence_reasons = s.reasons,
  confidence_version = 'v1',
  confidence_updated_at = now()
FROM pet_scores s
WHERE lp.id = s.id;

WITH alert_counts AS (
  SELECT
    aa.id,
    COALESCE(aac.confirm_count, 0) AS confirm_count,
    COALESCE(aac.clear_count, 0) AS clear_count
  FROM public.animal_alerts aa
  LEFT JOIN (
    SELECT
      alert_id,
      COUNT(*) FILTER (WHERE vote = 'confirm')::INT AS confirm_count,
      COUNT(*) FILTER (WHERE vote = 'clear')::INT AS clear_count
    FROM public.animal_alert_confirmations
    GROUP BY alert_id
  ) aac ON aac.alert_id = aa.id
), alert_scores AS (
  SELECT
    aa.id,
    GREATEST(
      0,
      LEAST(
        100,
        ROUND(
          50
          + LEAST(30, ac.confirm_count * 12)
          - LEAST(36, ac.clear_count * 18)
          + CASE WHEN aa.is_verified THEN 18 ELSE 0 END
          + CASE WHEN aa.source_type = 'official' THEN 12 WHEN aa.source_type = 'system' THEN 8 ELSE 0 END
          + CASE WHEN aa.severity = 'high' THEN 4 ELSE 0 END
          - CASE WHEN aa.status = 'resolved' THEN 6 WHEN aa.status = 'expired' THEN 20 ELSE 0 END
        )
      )
    )::INT AS score,
    to_jsonb(
      array_remove(
        ARRAY[
          CASE WHEN ac.confirm_count > 0 THEN ac.confirm_count::TEXT || ' confirmation(s) terrain' END,
          CASE WHEN ac.clear_count > 0 THEN ac.clear_count::TEXT || ' signalement(s) de fin' END,
          CASE WHEN aa.is_verified THEN 'Vérifiée par un admin' END,
          CASE
            WHEN aa.source_type = 'official' THEN 'Source officielle'
            WHEN aa.source_type = 'system' THEN 'Alerte automatique'
            ELSE 'Source communautaire'
          END,
          CASE
            WHEN aa.status = 'active' THEN 'Alerte encore active'
            WHEN aa.status = 'resolved' THEN 'Alerte résolue'
            ELSE 'Alerte expirée'
          END
        ],
        NULL
      )
    ) AS reasons
  FROM public.animal_alerts aa
  JOIN alert_counts ac ON ac.id = aa.id
)
UPDATE public.animal_alerts aa
SET
  confidence_score = s.score,
  confidence_level = CASE
    WHEN s.score >= 75 THEN 'high'
    WHEN s.score >= 45 THEN 'medium'
    ELSE 'low'
  END,
  confidence_reasons = s.reasons,
  confidence_version = 'v1',
  confidence_updated_at = now()
FROM alert_scores s
WHERE aa.id = s.id;

CREATE INDEX IF NOT EXISTS reports_confidence_score_idx
ON public.reports (confidence_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS help_posts_confidence_score_idx
ON public.help_posts (confidence_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS lost_pets_confidence_score_idx
ON public.lost_pets (confidence_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS animal_alerts_confidence_score_idx
ON public.animal_alerts (confidence_score DESC NULLS LAST);
