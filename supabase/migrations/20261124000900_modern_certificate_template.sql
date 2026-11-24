begin;

alter table public.certificate_design
  drop constraint certificate_design_frame_check,
  add constraint certificate_design_frame_check check (frame in ('modern', 'classic', 'minimal')),
  alter column frame set default 'modern';

-- Upgrade the factory template while retaining customized designs and issued snapshots.
update public.certificate_design as design
set frame = 'modern'
where id and frame = 'classic'
  and title_en = '' and title_bn = '' and subtitle_en = '' and subtitle_bn = ''
  and coalesce(to_jsonb(design)->>'qualification_en', '') = ''
  and coalesce(to_jsonb(design)->>'qualification_bn', '') = ''
  and accent = '#a37139' and partner_name = '' and partner_logo = '';

commit;
