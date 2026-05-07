'use client';

import { useState } from 'react';
import { AndroidFrame } from './mobile/AndroidFrame';
import { MNavBar, type MTab } from './mobile/MNavBar';
import { MHome } from './mobile/MHome';
import { MKids } from './mobile/MKids';
import { MVac } from './mobile/MVac';
import { MMed } from './mobile/MMed';
import { MAlerts } from './mobile/MAlerts';

export function Mobile() {
  const [tab, setTab] = useState<MTab>('home');
  return (
    <AndroidFrame>
      {tab === 'home' && <MHome onNav={setTab}/>}
      {tab === 'kids' && <MKids/>}
      {tab === 'vac'  && <MVac/>}
      {tab === 'med'  && <MMed/>}
      {tab === 'alt'  && <MAlerts/>}
      <MNavBar active={tab} onChange={setTab}/>
    </AndroidFrame>
  );
}
