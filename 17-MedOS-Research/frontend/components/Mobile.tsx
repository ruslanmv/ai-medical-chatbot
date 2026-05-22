'use client';

import { useState } from 'react';
import { MobileHome } from './mobile/MobileHome';
import { MobileLiterature } from './mobile/MobileLiterature';
import { MobileCandidates } from './mobile/MobileCandidates';
import { MobileSafety } from './mobile/MobileSafety';
import type { MTab } from './mobile/MobileBits';

export function Mobile() {
  // 'projects' and 'more' map to the candidate-comparison view in the design.
  const [tab, setTab] = useState<MTab>('home');

  if (tab === 'home')   return <MobileHome onNav={setTab}/>;
  if (tab === 'lit')    return <MobileLiterature onNav={setTab}/>;
  if (tab === 'safety') return <MobileSafety onNav={setTab}/>;
  return <MobileCandidates onNav={setTab}/>;
}
