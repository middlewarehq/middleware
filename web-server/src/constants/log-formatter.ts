export const generalLogRegex =
  /^\[(.*?)\] \[(\d+)\] \[(INFO|ERROR|WARN|DEBUG|WARNING|CRITICAL)\] (.+)$/;
export const httpLogRegex =
  /^(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\d+) "([^"]*)" "([^"]*)"$/;
export const redisLogRegex =
  /^(?<role>\d+:[XCMS]) (?<timestamp>\d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2}\.\d{3}) (?<loglevel>[\.\-\#\*]) (?<message>.*)$/;
export const postgresLogRegex =
  /^(?<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} UTC) \[\d+\] (?<loglevel>[A-Z]+):\s*(?<message>(.|\n)+?)$/;
export const dataSyncLogRegex = /\[(\w+)\]\s(.+?)\sfor\s(\w+)\s(.+)/;
