// Lucide-style SVG icon set ported from icons.jsx in the design handoff bundle.
import type { ReactNode } from 'react';

export type IconName =
  | 'Search' | 'Bell' | 'ChevronDown' | 'ChevronRight' | 'ChevronLeft'
  | 'Star' | 'Plus' | 'Settings' | 'Users' | 'Book' | 'Layout' | 'Target'
  | 'Pill' | 'Flask' | 'Beaker' | 'Monitor' | 'Grid' | 'Shield' | 'ShieldCheck'
  | 'FileText' | 'List' | 'Check' | 'CheckCircle' | 'X' | 'XCircle'
  | 'Alert' | 'Lightbulb' | 'Bookmark' | 'MoreVertical' | 'MoreHorizontal'
  | 'Menu' | 'Filter' | 'Home' | 'Folder' | 'HelpCircle' | 'Ear' | 'Cell'
  | 'Liver' | 'Droplet' | 'Sparkles' | 'Activity' | 'ArrowRight' | 'ArrowUpRight'
  | 'Clock' | 'Dna' | 'Microscope' | 'BarChart' | 'Scale';

interface Props {
  name: IconName;
  size?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

const PATHS: Record<IconName, ReactNode> = {
  Search:        (<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>),
  Bell:          (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>),
  ChevronDown:   (<polyline points="6 9 12 15 18 9"/>),
  ChevronRight:  (<polyline points="9 6 15 12 9 18"/>),
  ChevronLeft:   (<polyline points="15 6 9 12 15 18"/>),
  Star:          (<polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/>),
  Plus:          (<><path d="M12 5v14"/><path d="M5 12h14"/></>),
  Settings:      (<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>),
  Users:         (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
  Book:          (<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>),
  Layout:        (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>),
  Target:        (<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>),
  Pill:          (<><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></>),
  Flask:         (<><path d="M9 3h6"/><path d="M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/></>),
  Beaker:        (<><path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/></>),
  Monitor:       (<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></>),
  Grid:          (<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>),
  Shield:        (<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>),
  ShieldCheck:   (<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>),
  FileText:      (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" x2="15" y1="13" y2="13"/><line x1="9" x2="15" y1="17" y2="17"/></>),
  List:          (<><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>),
  Check:         (<polyline points="20 6 9 17 4 12"/>),
  CheckCircle:   (<><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></>),
  X:             (<><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></>),
  XCircle:       (<><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></>),
  Alert:         (<><path d="m21.7 18-9-15.5a2 2 0 0 0-3.5 0L.4 18a2 2 0 0 0 1.7 3h17.9a2 2 0 0 0 1.7-3z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12" y1="17" y2="17.01"/></>),
  Lightbulb:     (<><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.7.5 1 1.3 1 2.1V18h6v-1.2c0-.8.3-1.6 1-2.1A7 7 0 0 0 12 2z"/></>),
  Bookmark:      (<path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>),
  MoreVertical:  (<><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>),
  MoreHorizontal:(<><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>),
  Menu:          (<><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></>),
  Filter:        (<polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/>),
  Home:          (<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></>),
  Folder:        (<path d="M4 5h5l2 3h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>),
  HelpCircle:    (<><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" x2="12" y1="17" y2="17.01"/></>),
  Ear:           (<><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"/></>),
  Cell:          (<><circle cx="8" cy="8" r="3"/><circle cx="16" cy="10" r="2"/><circle cx="14" cy="16" r="2.5"/><circle cx="7" cy="15" r="1.5"/></>),
  Liver:         (<path d="M4 8c0-2 2-4 5-4 4 0 5 3 8 3 2 0 4-1 4 1v6a6 6 0 0 1-6 6h-5a6 6 0 0 1-6-6V8z"/>),
  Droplet:       (<path d="M12 2.7s-6 6.4-6 11.3a6 6 0 0 0 12 0c0-4.9-6-11.3-6-11.3z"/>),
  Sparkles:      (<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>),
  Activity:      (<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>),
  ArrowRight:    (<><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></>),
  ArrowUpRight:  (<><path d="M7 17 17 7"/><polyline points="7 7 17 7 17 17"/></>),
  Clock:         (<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>),
  Dna:           (<><path d="M2 15c4 0 6-3 10-3s6 3 10 3"/><path d="M2 9c4 0 6 3 10 3s6-3 10-3"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/><path d="M5 3c0 4 3 6 7 6s7-2 7-6"/></>),
  Microscope:    (<><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></>),
  BarChart:      (<><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></>),
  Scale:         (<><path d="M16 16h6l-3-7-3 7Z"/><path d="M2 16h6l-3-7-3 7Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="m5 9 7-2 7 2"/></>),
};

export function Icon({ name, size = 18, stroke = 'currentColor', fill = 'none', strokeWidth = 1.7, style }: Props) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke={stroke} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}
