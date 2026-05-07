'use client';

import { useState } from 'react';
import { btnPrimary } from '../../lib/styles';
import { Card, PageHeader } from '../Primitives';
import { Icon } from '../Icon';
import { FamilyTree } from '../family/FamilyTree';
import { MemberDetailModal } from '../family/MemberDetailModal';
import { AddMemberWizard } from '../family/AddMemberWizard';
import type { FamilyMember } from '../../lib/data';

export function FamilyPage() {
  const [openMember, setOpenMember] = useState<FamilyMember | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div data-screen-label="Desktop · Family">
      <PageHeader
        eyebrow="Romano family · Roma"
        title="Your family"
        subtitle="2 children · 2 parents · 1 grandparent. Click any member in the tree to open their profile."
        action={
          <button style={btnPrimary} onClick={() => setWizardOpen(true)}>
            <Icon name="plus" size={13}/> Add member
          </button>
        }
      />
      <Card title="Family tree" padded={false}>
        <FamilyTree onOpen={setOpenMember}/>
      </Card>
      <MemberDetailModal m={openMember} onClose={() => setOpenMember(null)}/>
      {wizardOpen && <AddMemberWizard onClose={() => setWizardOpen(false)}/>}
    </div>
  );
}
