import {
  CheckCircleOutlineRounded,
  EmojiEventsRounded,
  HardwareRounded,
  MilitaryTechRounded
} from '@mui/icons-material';
import { alpha, lighten } from '@mui/material';

export const commonProps = {
  elite: {
    bg: 'linear-gradient(45deg,#ffd700, #ca710d)',
    tooltip: 'This is among the fastest dev teams!',
    classification: 'Elite',
    icon: MilitaryTechRounded,
    color: lighten('#ffb74d', 0.4),
    backgroundColor: lighten(alpha('#ffd700', 0.2), 0.4),
    interval: 'week'
  },
  high: {
    bg: 'linear-gradient(45deg, #6fec9e, #205f7d)',
    tooltip: 'This is a high performing team!',
    classification: 'High',
    icon: EmojiEventsRounded,
    backgroundColor: alpha('#6fec9e', 0.2),
    color: '#6fec9e',
    interval: 'week'
  },
  medium: {
    bg: 'linear-gradient(45deg, #a4d3d3, #424242)',
    tooltip: 'This team is about average compared to industry standards',
    classification: 'Medium',
    icon: CheckCircleOutlineRounded,
    color: '#a4d3d3',
    backgroundColor: alpha('#a4d3d3', 0.2),
    interval: 'month'
  },
  low: {
    bg: 'linear-gradient(45deg, #d3989b, #bc1b68)',
    tooltip: 'This team has room to improve',
    classification: 'Low',
    icon: HardwareRounded,
    color: '#d3989b',
    backgroundColor: alpha('#d3989b', 0.2),
    interval: 'quarter'
  }
};
