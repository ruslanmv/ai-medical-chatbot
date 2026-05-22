'use client';

import { useState } from 'react';
import { KPIS, PROJECTS, type ProjectId } from '../../lib/data';
import { Icon } from '../Icon';
import { KpiCard, Pill, PrimaryBtn, ResearchOnlyFooter, SecondaryBtn } from '../Primitives';
import { AddProjectCard, ProjectCard } from '../widgets/ProjectCard';
import { LiteraturePanel } from '../widgets/LiteraturePanel';
import { EvidenceMatrixPanel } from '../widgets/EvidenceMatrixPanel';
import { CandidatePanel } from '../widgets/CandidatePanel';
import { SimulationPanel } from '../widgets/SimulationPanel';
import { SafetyPanel } from '../widgets/SafetyPanel';
import { PublicationPanel } from '../widgets/PublicationPanel';
import { AuditPanel } from '../widgets/AuditPanel';

export function DashboardPage() {
  const [project, setProject] = useState<ProjectId>('tinnitus');

  return (
    <div data-screen-label="Desktop · 01 Research Dashboard"
      style={{ flex: 1, overflow: 'auto', padding: '24px 28px 0' }}>
      {/* Project title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h1 style={{
              margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, color: 'var(--ink)',
            }}>
              Tinnitus mechanisms — <span style={{ color: 'var(--brand-600)' }}>central gain candidates</span>
            </h1>
            <Icon name="Star" size={18} stroke="var(--ink-4)"/>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill bg="#eff6ff" fg="#1d4ed8" dot="#3b82f6">Research-only</Pill>
            <Pill bg="#ecfdf5" fg="#047857" dot="#10b981">No patient PHI</Pill>
            <Pill bg="#fff7ed" fg="#c2410c" dot="#f97316">Safety review required</Pill>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SecondaryBtn icon="Settings">Project Settings</SecondaryBtn>
          <SecondaryBtn icon="Users">Share</SecondaryBtn>
          <PrimaryBtn icon="Plus">New</PrimaryBtn>
        </div>
      </div>

      {/* Project cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        {PROJECTS.map((p) => (
          <ProjectCard
            key={p.id}
            p={p}
            active={project === p.id}
            onClick={() => setProject(p.id)}
          />
        ))}
        <AddProjectCard/>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        {KPIS.map((k) => <KpiCard key={k.label} k={k}/>)}
      </div>

      {/* Top row of panels */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.15fr 1fr 1.15fr 1fr',
        gap: 14, marginBottom: 16,
      }}>
        <LiteraturePanel/>
        <EvidenceMatrixPanel/>
        <CandidatePanel/>
        <SimulationPanel/>
      </div>

      {/* Bottom row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.4fr',
        gap: 14, marginBottom: 18,
      }}>
        <SafetyPanel/>
        <PublicationPanel/>
        <AuditPanel/>
      </div>

      <ResearchOnlyFooter/>
    </div>
  );
}
