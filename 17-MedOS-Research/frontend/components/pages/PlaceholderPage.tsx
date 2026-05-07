'use client';

import { Panel, PageHeader, ResearchOnlyFooter, ScreenWrap } from '../Primitives';

export function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <ScreenWrap>
      <PageHeader title={title} subtitle={subtitle}/>
      <Panel title="Coming up next batch">
        <div style={{ padding: 8, color: 'var(--ink-3)', fontSize: 13 }}>
          This page is wired into the shell. Content lands in upcoming batches.
        </div>
      </Panel>
      <ResearchOnlyFooter/>
    </ScreenWrap>
  );
}
