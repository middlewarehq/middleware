import {
  ParsedLog,
  generalLogRegex,
  httpLogRegex,
  redisLogRegex,
  postgresLogRegex,
  postgresMultiLineLogRegex,
  dataSyncLogRegex,
  validLogLevels
} from '../constants/log-formatter';

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
    const [, ip, , , timestamp, request, status, bytes, referer, userAgent] =
      httpLogMatch;
    const [method, path] = request.split(' ');
    return {
      timestamp,
      logLevel: 'INFO', // Assuming all HTTP logs are INFO level
      message: `${method} ${path} ${status} ${bytes} "${referer}" "${userAgent}"`,
      ip
    };
  }

  const redisMatch = rawLogLine.match(redisLogRegex);
  if (redisMatch) {
    const { role, timestamp, loglevel, message } = redisMatch.groups;
    let logLevel: string;
    switch (loglevel) {
      case '.':
        logLevel = 'DEBUG';
        break;
      case '-':
        logLevel = 'INFO';
        break;
      case '*':
        logLevel = 'NOTICE';
        break;
      case '#':
        logLevel = 'WARNING';
        break;
      default:
        logLevel = 'INFO';
    }
    return {
      role,
      timestamp,
      logLevel,
      message: message.trim()
    };
  }

  const postgresMultiLineLogMatch = rawLogLine.match(postgresMultiLineLogRegex);
  if (postgresMultiLineLogMatch) {
    const { timestamp, loglevel, message } = postgresMultiLineLogMatch.groups;
    const normalizedLogLevel = loglevel.toUpperCase();

    return {
      timestamp: timestamp,
      logLevel: validLogLevels.has(normalizedLogLevel)
        ? normalizedLogLevel
        : 'INFO',
      message: message.trim()
    };
  }

  const postgresLogMatch = rawLogLine.match(postgresLogRegex);
  if (postgresLogMatch) {
    const [, timestamp, , logLevel, message] = postgresLogMatch;

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
