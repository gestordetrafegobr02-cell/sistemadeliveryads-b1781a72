UPDATE public.stores
SET whatsapp = '55' || regexp_replace(whatsapp, '\D', '', 'g')
WHERE whatsapp IS NOT NULL
  AND whatsapp <> ''
  AND length(regexp_replace(whatsapp, '\D', '', 'g')) BETWEEN 10 AND 11
  AND left(regexp_replace(whatsapp, '\D', '', 'g'), 2) <> '55';

UPDATE public.global_settings
SET value = '55' || regexp_replace(value, '\D', '', 'g')
WHERE key = 'owner_whatsapp'
  AND value IS NOT NULL
  AND length(regexp_replace(value, '\D', '', 'g')) BETWEEN 10 AND 11
  AND left(regexp_replace(value, '\D', '', 'g'), 2) <> '55';