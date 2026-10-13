-- A coordenação recebe o acesso por e-mail automático na abertura; a equipe não gera links manualmente.
revoke execute on function public.issue_coordination_magic_link(uuid) from authenticated;
