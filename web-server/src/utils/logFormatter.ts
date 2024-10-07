interface ParsedLog {
  timestamp: string;
  logLevel: string;
  message: string;
  ip?: string;
}

const generalLogRegex =/^\[(.*?)\] \[(\d+)\] \[(INFO|ERROR|WARN|DEBUG|WARNING|CRITICAL)\] (.+)$/;
const httpLogRegex =/^(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\d+) "([^"]*)" "([^"]*)"$/;
const redisLogRegex =/^(\d+):([CMS]) (\d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2})\.\d{3} ([#*]) (.+)$/;
const postgresLogRegex =/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} UTC) \[(\d+)\] (\w+): (.+)$/;
const dataSyncLogRegex = /\[(\w+)\]\s(.+?)\sfor\s(\w+)\s(.+)/;

export const parseLogLine = (rawLogLine: string): ParsedLog | null => {

  const generalLogMatch = rawLogLine.match(generalLogRegex);
  if (generalLogMatch) {
    const [, timestamp, , logLevel, message] = generalLogMatch;
    return {
      timestamp,
      logLevel,
      message
    };
  }

  const httpLogMatch = rawLogLine.match(httpLogRegex);
  if (httpLogMatch) {
    const [, ip, , , timestamp, request, status, bytes, referer, userAgent] = httpLogMatch;
    const [method, path] = request.split(' ');
    return {
      timestamp: timestamp.replace(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}:\d{2}:\d{2})/, '$3-$2-$1 $4'),
      logLevel: 'INFO', // Assuming all HTTP logs are INFO level
      message: `${method} ${path} ${status} ${bytes} "${referer}" "${userAgent}"`,
      ip
    };
  }


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


  const dataSyncLogMatch = rawLogLine.match(dataSyncLogRegex);
  if (dataSyncLogMatch) {
    const [, logLevel, action, service, message] = dataSyncLogMatch;
    return {
      timestamp: '', 
      logLevel: logLevel.toUpperCase(),
      message: `${action} for ${service} ${message}`
    };
  }


  return null;
};