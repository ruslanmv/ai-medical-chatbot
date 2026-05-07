'use client';

import { TOKENS } from '../../lib/tokens';
import { Card, PageHeader } from '../Primitives';

export function PlaceholderPage({
  eyebrow, title, subtitle,
}: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle}/>
      <Card>
        <div style={{ padding: 24, textAlign: 'center', color: TOKENS.ink3, fontSize: 13 }}>
          Coming up next batch.
        </div>
      </Card>
    </div>
  );
}
