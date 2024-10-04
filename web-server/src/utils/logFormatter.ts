interface ParsedLog {
    timestamp: string;
    logLevel: string;
    message: string;
    ip?: string;
    metadata?: Record<string, any>;
  }
  
  export const parseLogLine = (rawLogLine: string): ParsedLog | null => {
    const generalLogRegex =
      /^\[(.*?)\] \[(\d+)\] \[(INFO|ERROR|WARN|DEBUG|WARNING|CRITICAL)\] (.+)$/;
    const generalLogMatch = rawLogLine.match(generalLogRegex);
  
    if (generalLogMatch) {
      const [, timestamp, id, logLevel, message] = generalLogMatch;
      const metadata: Record<string, any> = {};
      if (id) metadata.id = id;
      return {
        timestamp,
        logLevel,
        message,
        ...(Object.keys(metadata).length > 0 && { metadata })
      };
    }
  
    const httpLogRegex =
      /(\d+\.\d+\.\d+\.\d+) - - \[(.*?)\] "(GET|POST|PUT|DELETE) (.+?) (HTTP\/\d\.\d)" (\d+) (\d+)/;
    const httpLogMatch = rawLogLine.match(httpLogRegex);
  
    if (httpLogMatch) {
      const [, ip, timestamp, method, path, , status, size] = httpLogMatch;
      const metadata: Record<string, any> = {};
      if (size) metadata.size = size;
      return {
        timestamp,
        logLevel: 'INFO', // Assuming all HTTP logs are INFO level
        message: `${method} ${path} ${status}`,
        ip,
        ...(Object.keys(metadata).length > 0 && { metadata })
      };
    }
  
    const redisLogRegex =
      /^(\d+):([CMS]) (\d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2})\.\d{3} ([#*]) (.+)$/;
    const redisLogMatch = rawLogLine.match(redisLogRegex);
  
    if (redisLogMatch) {
      const [, pid, role, timestamp, logType, message] = redisLogMatch;
      const metadata: Record<string, any> = {};
      if (pid) metadata.pid = pid;
  
      let logLevel: string;
      switch (role) {
        case 'M':
          logLevel = 'MAIN';
          break;
        case 'C':
          logLevel = 'CHILD';
          break;
        case 'S':
          logLevel = 'SENTINEL';
          break;
        default:
          logLevel = 'UNKNOWN';
      }
  
      logLevel += logType === '#' ? '_INFO' : '_SYSTEM';
  
      return {
        timestamp,
        logLevel,
        message,
        ...(Object.keys(metadata).length > 0 && { metadata })
      };
    }
  
    const postgresLogRegex =
      /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} UTC) \[(\d+)\] (\w+): (.+)$/;
    const postgresLogMatch = rawLogLine.match(postgresLogRegex);
  
    if (postgresLogMatch) {
      const [, timestamp, pid, logLevel, message] = postgresLogMatch;
      const metadata: Record<string, any> = {};
      if (pid) metadata.pid = pid;
  
      const validLogLevels = [
        'DEBUG',
        'INFO',
        'NOTICE',
        'WARNING',
        'ERROR',
        'LOG',
        'FATAL',
        'PANIC'
      ];
      const normalizedLogLevel = logLevel.toUpperCase();
  
      return {
        timestamp,
        logLevel: validLogLevels.includes(normalizedLogLevel)
          ? normalizedLogLevel
          : 'INFO',
        message,
        ...(Object.keys(metadata).length > 0 && { metadata })
      };
    }
  
    return null;
  };