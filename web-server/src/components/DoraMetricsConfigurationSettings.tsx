import SettingsIcon from '@mui/icons-material/Settings';
import { Button, Menu, MenuItem } from '@mui/material';
import { useCallback, useRef, useEffect } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { TeamProductionBranchSelector } from '@/components/TeamProductionBranchSelector';
import { isRoleLessThanEM } from '@/constants/useRoute';
import { useModal } from '@/contexts/ModalContext';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState } from '@/hooks/useEasyState';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { fetchTeamReposProductionBranches } from '@/slices/team';
import { useDispatch } from '@/store';

export const DoraMetricsConfigurationSettings = () => {
  const dispatch = useDispatch();
  const { addModal, closeModal } = useModal();
  const { singleTeamId } = useSingleTeamConfig();
  const { role } = useAuth();
  const isEng = isRoleLessThanEM(role);
  useEffect(() => {
    dispatch(fetchTeamReposProductionBranches({ team_id: singleTeamId }));
  }, [dispatch, singleTeamId]);

  const openProductionBranchSelectorModal = useCallback(async () => {
    const modal = addModal({
      title: `Set default production branches`,
      body: (
        <TeamProductionBranchSelector onClose={() => closeModal(modal.key)} />
      ),
      showCloseIcon: true
    });
  }, [addModal, closeModal]);

  const anchorEl = useRef(null);
  const open = useBoolState(false);

  if (isEng) return;

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        sx={{
          whiteSpace: 'nowrap'
        }}
        onClick={open.true}
        ref={anchorEl}
      >
        <FlexBox alignCenter gap1>
          <SettingsIcon fontSize="small" />
          Settings
        </FlexBox>
      </Button>
      <Menu
        anchorEl={anchorEl.current}
        open={open.value}
        onClose={open.false}
        MenuListProps={{
          sx: {
            padding: 0
          }
        }}
        sx={{
          padding: 0
        }}
      >
        <MenuItem
          onClick={() => {
            open.false();
            openProductionBranchSelectorModal();
          }}
        >
          Configure Production Branches
        </MenuItem>
      </Menu>
    </>
  );
};
