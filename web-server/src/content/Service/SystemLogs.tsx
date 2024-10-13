import CircularProgress from '@mui/material/CircularProgress';
import { useEffect, useRef, useMemo, useState } from 'react';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { ServiceNames } from '@/constants/service';
import { useSelector } from '@/store';
import { TextField, MenuItem } from '@mui/material';

export const SystemLogs = ({ serviceName }: { serviceName: ServiceNames }) => {
  const services = useSelector((state) => state.service.services);
  const loading = useSelector((state) => state.service.loading);
  const logs = useMemo(() => services[serviceName].logs || [], [serviceName, services]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState({
    info: true,
    error: true,
    warning: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const getStyledLog = (log: string) => {
    const level = log.match(/\[(INFO|ERROR|WARNING|LOG)\]/);
    const logLevel = level ? level[0] : '';
    let logLevelColor = 'white';

    if (logLevel.includes('ERROR')) logLevelColor = '#ed131e';
    if (logLevel.includes('WARNING')) logLevelColor = '#eded13';
    if (logLevel.includes('INFO')) logLevelColor = '#13ed3b';

    const restOfLog = log.replace(logLevel, '');
    return `<span style="color: ${logLevelColor}; font-weight: bold;">${logLevel}</span>${restOfLog}`;
  };

  // Highlight HTTP methods, timestamps, and searched keywords
  const highlightKeywords = (log: string) => {
    const highlightedLog = searchTerm
      ? log.replace(
          new RegExp(searchTerm, 'gi'),
          (match) => `<span style="background-color: white; color: black;">${match}</span>`
        )
      : log;

    return highlightedLog
      .replace(/\b(GET|POST|PUT|DELETE|LOG)\b/g, '<span style="font-weight: bold; color: #13ed3b">$1</span>')
      .replace(
        /(\d{2}\/[A-Za-z]+\/\d{4}:\d{2}:\d{2}:\d{2} \+\d{4})|(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}(?: UTC)?(?: \[\d+\])?)|(\d{2}:\w{1} \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2}\.\d{3})/g,
        '<span style="color: blue;">$1$2$3</span>'
      );
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (selectedLevel !== 'all' && !log.includes(`[${selectedLevel.toUpperCase()}]`)) return false;
    if (searchTerm && !log.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (log.includes('[INFO]') && !filter.info) return false;
    if (log.includes('[ERROR]') && !filter.error) return false;
    if (log.includes('[WARNING]') && !filter.warning) return false;
    return true;
  });

  return (
    <FlexBox col>
      {loading ? (
        <FlexBox alignCenter gap2>
          <CircularProgress size="20px" />
          <Line>Loading...</Line>
        </FlexBox>
      ) : (
        services && (
          <>
            <FlexBox gap2 marginBottom="16px" style={{ marginTop: '16px', position: 'sticky', background: '#1a172f', top: 0, zIndex: 1, padding: '8px 0',}}>
              <TextField
                label="Search Logs"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginRight: '16px', flex: 1 }}
              />
              <TextField
                select
                label="Tag"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{ marginRight: '16px' }}
              >
                <MenuItem value="all">ALL</MenuItem>
                <MenuItem value="info">INFO</MenuItem>
                <MenuItem value="error">ERROR</MenuItem>
                <MenuItem value="warning">WARNING</MenuItem>
              </TextField>
            </FlexBox>

            {/* Display Logs */}
            {filteredLogs.map((log, index) => (
              <Line
                key={index}
                marginBottom="8px"
                fontSize="14px"
                fontFamily="monospace"
                dangerouslySetInnerHTML={{ __html: highlightKeywords(getStyledLog(log)) }}
              />
            ))}

            <FlexBox ref={containerRef} />
          </>
        )
      )}
    </FlexBox>
  );
};
