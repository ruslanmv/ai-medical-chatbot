'use client';

import { TOKENS } from '../../lib/tokens';
import { CHILDREN, type Dose, type DoseStatus } from '../../lib/data';
import { btnGhost } from '../../lib/styles';
import { Icon } from '../Icon';
import { Card } from '../Primitives';

import { ChildHero } from '../widgets/ChildHero';
import { DoseRow } from '../widgets/DoseRow';
import { UpcomingVaccines } from '../widgets/UpcomingVaccines';
import { SeasonalCard } from '../widgets/SeasonalCard';
import { OutbreakCard } from '../widgets/OutbreakCard';
import { QuickActions } from '../widgets/QuickActions';
import { LocalNewsCard } from '../widgets/LocalNewsCard';
import { AppointmentsCard } from '../widgets/AppointmentsCard';
import { DoctorSummary } from '../widgets/DoctorSummary';
import { RemindersCard } from '../widgets/RemindersCard';
import { WidgetWrapper } from '../widgets/WidgetWrapper';

import type { Widgets } from '../../lib/useWidgets';

interface Props {
  doses: Dose[];
  mark: (id: string, status: DoseStatus) => void;
  widgets: Widgets;
  setWidgets: (next: Widgets) => void;
  onCustomize: () => void;
}

export function HomePage({ doses, mark, widgets, setWidgets, onCustomize }: Props) {
  const takenCount = doses.filter((d) => d.status === 'taken').length;

  // Row 2 visibility — only render row when at least one widget in it is on.
  const row2On = widgets.seasonal || widgets.outbreak;

  // Row 3 visibility / column count.
  const row3On = widgets.quickactions || widgets.news || widgets.appointments;
  const row3Cols = [widgets.quickactions, widgets.news, widgets.appointments].filter(Boolean).length;

  // Row 4.
  const row4On = widgets.doctor || widgets.reminders;

  // Row 1: medicines + vaccines.
  const row1On = widgets.medicines || widgets.vaccines;

  return (
    <div data-screen-label="Desktop · Home">
      {/* greeting */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: TOKENS.ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Thursday · May 7
        </div>
        <h1 style={{
          fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400,
          fontSize: 30, color: TOKENS.ink, margin: '6px 0 4px', letterSpacing: -0.2,
        }}>Good morning, Marco.</h1>
        <div style={{ fontSize: 14, color: TOKENS.ink2 }}>
          Two children, one calm dashboard. Here&apos;s what needs your attention today.
        </div>
      </div>

      {/* customize bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={onCustomize} style={btnGhost}>
          <Icon name="gear" size={13}/> Customize dashboard
        </button>
      </div>

      {/* hero children */}
      <WidgetWrapper id="children" widgets={widgets} setWidgets={setWidgets}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
          {CHILDREN.map((c) => <ChildHero key={c.id} child={c}/>)}
        </div>
      </WidgetWrapper>

      {row1On && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: widgets.medicines && widgets.vaccines ? '1.4fr 1fr' : '1fr',
          gap: 16, marginBottom: 18,
        }}>
          <WidgetWrapper id="medicines" widgets={widgets} setWidgets={setWidgets}>
            <Card
              title="Today's medicines"
              action={<span style={{ fontSize: 12, color: TOKENS.ink3 }}>{takenCount}/{doses.length} done</span>}
            >
              {doses.map((d) => <DoseRow key={d.id} dose={d} onMark={mark}/>)}
              <div style={{ marginTop: 10, fontSize: 11, color: TOKENS.ink3, lineHeight: 1.5 }}>
                Doses are based on schedules you saved. Adjust only with your pediatrician&apos;s instructions.
              </div>
            </Card>
          </WidgetWrapper>
          <WidgetWrapper id="vaccines" widgets={widgets} setWidgets={setWidgets}>
            <UpcomingVaccines/>
          </WidgetWrapper>
        </div>
      )}

      {row2On && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: widgets.seasonal && widgets.outbreak ? '1fr 1fr' : '1fr',
          gap: 16, marginBottom: 18,
        }}>
          <WidgetWrapper id="seasonal" widgets={widgets} setWidgets={setWidgets}><SeasonalCard/></WidgetWrapper>
          <WidgetWrapper id="outbreak" widgets={widgets} setWidgets={setWidgets}><OutbreakCard/></WidgetWrapper>
        </div>
      )}

      {row3On && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${row3Cols}, 1fr)`,
          gap: 16, marginBottom: 18,
        }}>
          <WidgetWrapper id="quickactions" widgets={widgets} setWidgets={setWidgets}><QuickActions/></WidgetWrapper>
          <WidgetWrapper id="news"         widgets={widgets} setWidgets={setWidgets}><LocalNewsCard/></WidgetWrapper>
          <WidgetWrapper id="appointments" widgets={widgets} setWidgets={setWidgets}><AppointmentsCard/></WidgetWrapper>
        </div>
      )}

      {row4On && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: widgets.doctor && widgets.reminders ? '1fr 1fr' : '1fr',
          gap: 16,
        }}>
          <WidgetWrapper id="doctor"    widgets={widgets} setWidgets={setWidgets}><DoctorSummary/></WidgetWrapper>
          <WidgetWrapper id="reminders" widgets={widgets} setWidgets={setWidgets}><RemindersCard/></WidgetWrapper>
        </div>
      )}

      <footer style={{
        marginTop: 28, padding: '14px 18px', background: TOKENS.surfaceMuted,
        border: `1px solid ${TOKENS.border}`, borderRadius: 11,
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        fontSize: 11.5, color: TOKENS.ink3,
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: TOKENS.ink2 }}>
          <Icon name="heart" size={13}/> Your family&apos;s health, organized simply.
        </span>
        <span>Sources · ECDC · WHO · Min. della Salute · ASL Roma 1</span>
        <span style={{ marginLeft: 'auto' }}>Synced · Today, 8:42</span>
      </footer>
    </div>
  );
}
