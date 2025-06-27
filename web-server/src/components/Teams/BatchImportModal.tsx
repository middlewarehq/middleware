import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import {
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Alert,
  Pagination,
  Chip,
  IconButton,
  Menu,
  MenuList,
  ListItemText
} from '@mui/material';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import { FC, useEffect, useState, useRef } from 'react';

import { Integration } from '@/constants/integrations';
import { useAuth } from '@/hooks/useAuth';
import { BaseRepo } from '@/types/resources';

import { FlexBox } from '../FlexBox';

export interface BatchImportModalProps {
  onClose: () => void;
  onAdd: (repos: BaseRepo[]) => void;
  existing: BaseRepo[];
}

const PAGE_SIZE = 50;

interface PageData {
  repos: BaseRepo[];
  endCursor: string | null;
  hasNextPage: boolean;
}

export const BatchImportModal: FC<BatchImportModalProps> = ({
  onClose,
  onAdd,
  existing
}) => {
  const { orgId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [provider, setProvider] = useState<Integration>(Integration.GITHUB);
  const [orgName, setOrgName] = useState<string>('');
  const [pages, setPages] = useState<Record<number, PageData>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filtered, setFiltered] = useState<BaseRepo[]>([]);
  const [selected, setSelected] = useState<BaseRepo[]>([...existing]);
  const [loadingPage, setLoadingPage] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      setSelected([...existing]);
      didMountRef.current = true;
    }
  }, [existing]);

  const fetchPage = async (pageNum: number) => {
    if (pages[pageNum]) {
      setFiltered(pages[pageNum].repos);
      setCurrentPage(pageNum);
      return;
    }

    const prev = pages[pageNum - 1];
    const params: any = { provider, org: orgName, first: PAGE_SIZE };
    if (prev?.endCursor) {
      params.after = prev.endCursor;
    }

    setLoadingPage(true);
    try {
      const resp = await axios.get(`/api/internal/${orgId}/git_org_repos`, {
        params
      });
      const { repos, pageInfo } = resp.data;
      const pageData: PageData = {
        repos,
        endCursor: pageInfo.endCursor,
        hasNextPage: pageInfo.hasNextPage
      };
      setPages((p) => ({ ...p, [pageNum]: pageData }));
      setFiltered(repos);
      setCurrentPage(pageNum);
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Failed to load page', { variant: 'error' });
    } finally {
      setLoadingPage(false);
    }
  };

  const fetchAll = async (): Promise<BaseRepo[]> => {
    setLoadingPage(true);
    try {
      const resp = await axios.get(`/api/internal/${orgId}/git_org_repos`, {
        params: { provider, org: orgName, select_all: true }
      });
      return resp.data.repos as BaseRepo[];
    } catch {
      enqueueSnackbar('Failed to load all repos', { variant: 'error' });
      return [];
    } finally {
      setLoadingPage(false);
    }
  };

  const handleFilter = (q: string) => {
    const lower = q.toLowerCase();
    const current = pages[currentPage]?.repos || [];
    setFiltered(
      current.filter((r) =>
        `${r.parent}/${r.name}`.toLowerCase().includes(lower)
      )
    );
  };

  const toggleOne = (repo: BaseRepo) => {
    setSelected((sel) =>
      sel.some((r) => r.id === repo.id)
        ? sel.filter((r) => r.id !== repo.id)
        : [...sel, repo]
    );
  };

  const visible = filtered;
  const openMenu = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const selectVisible = () => {
    setSelected((sel) => [
      ...sel,
      ...visible.filter((r) => !sel.some((x) => x.id === r.id))
    ]);
    closeMenu();
  };
  const deselectVisible = () => {
    const visIds = new Set(visible.map((r) => r.id));
    setSelected((sel) => sel.filter((r) => !visIds.has(r.id)));
    closeMenu();
  };
  const selectEverything = async () => {
    const all = await fetchAll();
    setSelected((sel) => {
      const map = new Map<number, BaseRepo>();
      [...sel, ...all].forEach((r) => map.set(r.id as number, r));
      return Array.from(map.values());
    });
    closeMenu();
  };

  const handleAdd = () => {
    onAdd(selected);
    onClose();
  };

  return (
    <FlexBox col gap={2} p={3} maxWidth="900px" bgcolor="background.paper">
      <Box fontSize="h6.fontSize" mb={1}>
        Batch Import Repositories
      </Box>

      <Box display="flex" gap={2}>
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Provider</InputLabel>
          <Select
            value={provider}
            label="Provider"
            onChange={(e) => setProvider(e.target.value as Integration)}
          >
            <MenuItem value={Integration.GITHUB}>GitHub</MenuItem>
            <MenuItem value={Integration.GITLAB}>GitLab</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Organization"
          placeholder="e.g. my-org"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          fullWidth
        />

        <Button
          variant="contained"
          onClick={() => fetchPage(1)}
          disabled={loadingPage || !orgName.trim()}
        >
          Search
        </Button>
      </Box>

      {selected.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            overflowY: 'auto',
            maxHeight: 150,
            p: 1,
            gap: 1,
            // optional scrollbar styling:
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.3)'
            }
          }}
        >
          {selected.map((r) => (
            <Chip
              key={r.id}
              label={`${r.parent}/${r.name}`}
              onDelete={() => toggleOne(r)}
            />
          ))}
        </Box>
      )}

      {visible.length > 0 && (
        <>
          <Box display="flex" alignItems="center" gap={1}>
            <TextField
              placeholder="Filter current page"
              size="small"
              onChange={(e) => handleFilter(e.target.value)}
              fullWidth
            />
            <IconButton size="small" onClick={openMenu}>
              <MoreVertIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={closeMenu}>
              <MenuList>
                <MenuItem onClick={selectVisible}>
                  <ListItemText primary="Select current page" />
                </MenuItem>
                <MenuItem onClick={selectEverything}>
                  <ListItemText primary="Select all repos" />
                </MenuItem>
                <MenuItem onClick={deselectVisible}>
                  <ListItemText primary="Deselect current page" />
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>

          {selected.length > 10 && (
            <Alert severity="warning">
              You’ve selected {selected.length} repositories. Initial sync may
              take longer for large batches.
            </Alert>
          )}

          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Repository</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((repo) => (
                  <TableRow key={repo.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.some((r) => r.id === repo.id)}
                        onChange={() => toggleOne(repo)}
                      />
                    </TableCell>
                    <TableCell>
                      {repo.parent}/{repo.name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box display="flex" justifyContent="center" mt={1}>
            <Pagination
              count={
                pages[currentPage]?.hasNextPage ? currentPage + 1 : currentPage
              }
              page={currentPage}
              onChange={(_, p) => fetchPage(p)}
              size="small"
              disabled={loadingPage}
            />
          </Box>
        </>
      )}

      <FlexBox justifyEnd gap={1} mt={2}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={!selected.length}
        >
          Add repos
        </Button>
      </FlexBox>
    </FlexBox>
  );
};
