interface ParsedLog {
  timestamp: string;
  logLevel: string;
  message: string;
  ip?: string;
}

export const parseLogLine = (rawLogLine: string): ParsedLog | null => {
  const generalLogRegex =
    /^\[(.*?)\] \[(\d+)\] \[(INFO|ERROR|WARN|DEBUG|WARNING|CRITICAL)\] (.+)$/;
  const generalLogMatch = rawLogLine.match(generalLogRegex);

  if (generalLogMatch) {
    const [, timestamp, , logLevel, message] = generalLogMatch;
    return {
      timestamp,
      logLevel,
      message
    };
  }

  const httpLogRegex =
    /(\d+\.\d+\.\d+\.\d+) - - \[(.*?)\] "(GET|POST|PUT|DELETE) (.+?) (HTTP\/\d\.\d)" (\d+) (\d+)/;
  const httpLogMatch = rawLogLine.match(httpLogRegex);

  if (httpLogMatch) {
    const [, ip, timestamp, method, path, , status] = httpLogMatch;
    return {
      timestamp,
      logLevel: 'INFO', // Assuming all HTTP logs are INFO level
      message: `${method} ${path} ${status}`,
      ip
    };
  }

  const redisLogRegex =
    /^(\d+):([CMS]) (\d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2})\.\d{3} ([#*]) (.+)$/;
  const redisLogMatch = rawLogLine.match(redisLogRegex);

  if (redisLogMatch) {
    const [, , role, timestamp, logType, message] = redisLogMatch;

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
      message
    };
  }

  const postgresLogRegex =
    /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} UTC) \[(\d+)\] (\w+): (.+)$/;
  const postgresLogMatch = rawLogLine.match(postgresLogRegex);

  if (postgresLogMatch) {
    const [, timestamp, , logLevel, message] = postgresLogMatch;
    const validLogLevels = new Set([
      'DEBUG',
      'INFO',
      'NOTICE',
      'WARNING',
      'ERROR',
      'LOG',
      'FATAL',
      'PANIC'
    ]);

    const normalizedLogLevel = logLevel.toUpperCase();

    return {
      timestamp,
      logLevel: validLogLevels.has(normalizedLogLevel)
        ? normalizedLogLevel
        : 'INFO',
      message
    };
  }

  return null;
};