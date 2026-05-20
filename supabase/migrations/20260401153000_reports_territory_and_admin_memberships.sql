-- ==========================================
-- 25. TERRITOIRES NORMALISES + GESTION ADMIN
-- ==========================================

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS address_text TEXT,
ADD COLUMN IF NOT EXISTS territory_name TEXT,
ADD COLUMN IF NOT EXISTS territory_key TEXT;

CREATE INDEX IF NOT EXISTS reports_territory_key_idx
ON public.reports (territory_key, created_at DESC);

CREATE OR REPLACE FUNCTION public.normalize_territory_label(input_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    regexp_replace(
      lower(
        translate(
          coalesce(trim(input_value), ''),
          'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØŒÙÚÛÜÝŸàáâãäåæçèéêëìíîïðñòóôõöøœùúûüýÿ''’',
          'aaaaaaaceeeeiiiidnoooooooeuuuuyyaaaaaaaceeeeiiiidnoooooooeuuuuyy  '
        )
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    ''
  );
$$;

UPDATE public.reports
SET address_text = COALESCE(
      NULLIF(address_text, ''),
      NULLIF(
        btrim(
          substring(description FROM 'Adresse indiquée :([^\n]+)')
        ),
        ''
      )
    )
WHERE address_text IS NULL
   OR address_text = '';

UPDATE public.reports
SET territory_name = COALESCE(
      NULLIF(territory_name, ''),
      NULLIF(
        initcap(
          btrim(
            regexp_replace(
              split_part(COALESCE(address_text, ''), ',', 2),
              '^[0-9]{4,5}\s+',
              ''
            )
          )
        ),
        ''
      )
    )
WHERE territory_name IS NULL
   OR territory_name = '';

UPDATE public.reports
SET territory_key = COALESCE(
      NULLIF(territory_key, ''),
      public.normalize_territory_label(territory_name)
    )
WHERE territory_key IS NULL
   OR territory_key = '';
