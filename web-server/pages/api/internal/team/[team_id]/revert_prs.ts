import { batchPaginatedRequest } from '@/api-helpers/internal';
import { updatePrFilterParams } from '@/api-helpers/team';
import { RevertedAndOriginalPrPair } from '@/types/resources';

export const getTeamRevertedPrs = async (
  params: Awaited<ReturnType<typeof updatePrFilterParams>> & {
    from_time: string;
    to_time: string;
    team_id: ID;
  }
) => {
  const { team_id, from_time, to_time, pr_filter } = params;

  const response = await batchPaginatedRequest<RevertedAndOriginalPrPair>(
    `/teams/${team_id}/revert_prs`,
    {
      page: 1,
      page_size: 100,
      ...{
        from_time,
        to_time,
        pr_filter
      }
    }
  ).then((r) => r.data);
  return adaptRevertedPrs(response);
};

const adaptRevertedPrs = (revertedPrsSetArray: RevertedAndOriginalPrPair[]) =>
  revertedPrsSetArray.map((revertedPrsSet) => {
    revertedPrsSet.revert_pr.original_reverted_pr =
      revertedPrsSet.original_reverted_pr;
    return revertedPrsSet.revert_pr;
  });
