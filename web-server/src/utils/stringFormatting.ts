import { DatumValue } from '@nivo/core';
import pluralize from 'pluralize';
export const trimWithEllipsis = (
  text: string,
  maxTextLength: number,
  addInStart?: boolean
) => {
  const diff = text.length - maxTextLength;
  if (diff <= 3) return text;
  const textStr = addInStart
    ? `...${text.slice(text.length - maxTextLength)}`
    : `${text.slice(0, maxTextLength)}...`;
  return textStr;
};

export const pluralizePrCount = (value: number) =>
  `${value === 1 ? 'PR' : 'PRs'}`;

export const formatAsPercent = (value: DatumValue) =>
  value ? `${value}%` : `0%`;

export const formatAsDeployment = (value: number) =>
  value >= 1000
    ? `${value / 1000}k Deps`
    : `${value} ${pluralize('deps', value)}`;

export const joinNames = (names: string[]): string => {
  if (names.length === 0) {
    return '';
  } else if (names.length === 1) {
    return names[0];
  } else {
    const lastNames = names.slice(-1);
    const otherNames = names.slice(0, -1);
    return `${otherNames.join(', ')} and ${lastNames[0]}`;
  }
};
