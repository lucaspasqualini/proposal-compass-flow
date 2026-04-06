
DELETE FROM public.project_allocations
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, team_member_id) id
  FROM public.project_allocations
  ORDER BY project_id, team_member_id, created_at ASC
);

ALTER TABLE public.project_allocations
ADD CONSTRAINT unique_project_team_member UNIQUE (project_id, team_member_id);
