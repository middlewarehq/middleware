import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { Integration } from '@/constants/integrations';
import { useAuth } from '@/hooks/useAuth';
import { fetchTeams } from '@/slices/team';
import { useSelector } from '@/store';

export const useTeamsConfig = () => {
  const dispatch = useDispatch();
  const teamReposMaps = useSelector((s) => s.team.teamReposMaps);
  const teams = useSelector((s) => s.team.teams);
  const orgRepos = useSelector((s) => s.team.orgRepos);
  const { orgId } = useAuth();

  useEffect(() => {
    dispatch(
      fetchTeams({
        org_id: orgId,
        provider: Integration.GITHUB
      })
    );
  }, [dispatch, orgId]);

  return { teams, teamReposMaps, orgRepos };
};
