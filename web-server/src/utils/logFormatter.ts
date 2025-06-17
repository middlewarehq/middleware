import { LogLevel } from '@/types/resources';
import { ParsedLog } from '@/types/resources';

import {
  generalLogRegex,
  httpLogRegex,
  redisLogRegex,
  postgresLogRegex,
  dataSyncLogRegex
} from '../constants/log-formatter';

export const parseLogLine = (rawLogLine: string): ParsedLog | null => {
  const generalLogMatch = rawLogLine.match(generalLogRegex);
  if (generalLogMatch) {
    const [_fullLog, timestamp, pid, logLevel, message] = generalLogMatch;
    return {
      timestamp,
      pid,
      logLevel,
      message
    };
  }

  const httpLogMatch = rawLogLine.match(httpLogRegex);
  if (httpLogMatch) {
    const [
      _fullLog,
      ip,
      _,
      _username,
      timestamp,
      request,
      status,
      bytes,
      referer,
      userAgent
    ] = httpLogMatch;
    const [method, path] = request.split(' ');
    return {
      timestamp,
      logLevel: LogLevel.INFO, // Assuming all HTTP logs are INFO level
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
        logLevel = LogLevel.DEBUG;
        break;
      case '-':
        logLevel = LogLevel.INFO;
        break;
      case '*':
        logLevel = LogLevel.NOTICE;
        break;
      case '#':
        logLevel = LogLevel.WARNING;
        break;
      default:
        logLevel = LogLevel.INFO;
    }
    return {
      role,
      timestamp,
      logLevel,
      message: message.trim()
    };
  }

  const postgresLogMatch = rawLogLine.match(postgresLogRegex);
  if (postgresLogMatch) {
    const { timestamp, loglevel, message } = postgresLogMatch.groups;
    return {
      timestamp: timestamp,
      logLevel: loglevel,
      message: message.trim()
    };
  }

  const dataSyncLogMatch = rawLogLine.match(dataSyncLogRegex);
  if (dataSyncLogMatch) {
    const [_fullLog, logLevel, action, service, message] = dataSyncLogMatch;
    return {
      timestamp: '',
      logLevel: logLevel.toUpperCase(),
      message: `${action} for ${service} ${message}`
    };
  }

  return null;
};
