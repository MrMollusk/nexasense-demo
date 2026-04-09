'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type RoomState = 'normal' | 'watch' | 'alert' | 'acknowledged' | 'escalated';
type EventKind = 'fall' | 'bedExit' | 'longLie' | 'falseAlert' | 'managerReview';

type Room = {
  id: string;
  label: string;
  resident: string;
  state: RoomState;
  lastEvent: string;
  updatedAt: string;
};

type Alert = {
  id: string;
  roomId: string;
  roomLabel: string;
  resident: string;
  eventKind: EventKind;
  title: string;
  confidence: number;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed' | 'escalated';
  since: string;
  note: string;
  urgency: 'medium' | 'high' | 'critical';
};

type IncidentLogEntry = {
  id: string;
  timestamp: string;
  roomLabel: string;
  resident: string;
  title: string;
  status: string;
  note: string;
};

type StepAction =
  | { type: 'roomState'; roomId: string; state: RoomState; lastEvent: string }
  | { type: 'raiseAlert'; alert: Omit<Alert, 'status' | 'since'> & { status?: Alert['status']; since?: string } }
  | { type: 'updateAlert'; status: Alert['status']; note?: string; confidence?: number }
  | { type: 'timeline'; entry: Omit<IncidentLogEntry, 'id' | 'timestamp'> & { status?: string; timestamp?: string } }
  | { type: 'managerFlash'; message: string }
  | { type: 'setSummary'; patch: Partial<SummaryState> }
  | { type: 'clearAlert' };

type ScenarioStep = {
  delayMs: number;
  label: string;
  actions: StepAction[];
};

type Scenario = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  roomId: string;
  eventKind: EventKind;
  steps: ScenarioStep[];
};

type SummaryState = {
  alertsToday: number;
  unresolved: number;
  falseDismissed: number;
  averageResponse: string;
  acknowledgedWithin2Min: string;
};

const INITIAL_SUMMARY: SummaryState = {
  alertsToday: 7,
  unresolved: 0,
  falseDismissed: 1,
  averageResponse: '01:42',
  acknowledgedWithin2Min: '86%',
};

const NOW = '02:14';

const INITIAL_ROOMS: Room[] = [
  { id: '101', label: 'Room 101', resident: 'Mary O’Brien', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '102', label: 'Room 102', resident: 'Patrick Byrne', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '103', label: 'Room 103', resident: 'Brigid Kelly', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '104', label: 'Room 104', resident: 'John Walsh', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '105', label: 'Room 105', resident: 'Catherine Doyle', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '106', label: 'Room 106', resident: 'Eileen Murphy', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '107', label: 'Room 107', resident: 'Sean Ryan', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '108', label: 'Room 108', resident: 'Nora Flynn', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '109', label: 'Room 109', resident: 'Tom Duffy', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '110', label: 'Room 110', resident: 'Margaret Keane', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '111', label: 'Room 111', resident: 'Michael Quinn', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
  { id: '112', label: 'Room 112', resident: 'Anna Sheridan', state: 'normal', lastEvent: 'Quiet room', updatedAt: NOW },
];

const INITIAL_TIMELINE: IncidentLogEntry[] = [
  {
    id: 'seed-1',
    timestamp: '01:12',
    roomLabel: 'Room 104',
    resident: 'John Walsh',
    title: 'Bed exit detected',
    status: 'Resolved',
    note: 'Staff attended. Resident returned safely to bed.',
  },
  {
    id: 'seed-2',
    timestamp: '00:47',
    roomLabel: 'Room 108',
    resident: 'Nora Flynn',
    title: 'Fall alert reviewed',
    status: 'Escalated',
    note: 'Nurse attended. Incident note created for handover.',
  },
  {
    id: 'seed-3',
    timestamp: '23:58',
    roomLabel: 'Room 111',
    resident: 'Michael Quinn',
    title: 'False alert dismissed',
    status: 'Dismissed',
    note: 'Resident repositioned. No staff escalation needed.',
  },
];

const EVENT_LABELS: Record<EventKind, string> = {
  fall: 'Fall detected',
  bedExit: 'Bed exit at night',
  longLie: 'Long-lie risk',
  falseAlert: 'False alert',
  managerReview: 'Manager review',
};

const SCENARIOS: Scenario[] = [
  {
    id: 'fall-105',
    title: 'Resident fall detected',
    subtitle: 'Room 105 · Catherine Doyle',
    description: 'High-confidence fall alert. The script stops at the live event so you can manually acknowledge, escalate, and resolve.',
    roomId: '105',
    eventKind: 'fall',
    steps: [
      {
        delayMs: 700,
        label: 'Room enters watch state',
        actions: [
          { type: 'roomState', roomId: '105', state: 'watch', lastEvent: 'Unusual movement pattern detected' },
          { type: 'managerFlash', message: 'Room 105 movement pattern changed' },
        ],
      },
      {
        delayMs: 1800,
        label: 'High-confidence alert generated',
        actions: [
          {
            type: 'raiseAlert',
            alert: {
              id: 'fall-105',
              roomId: '105',
              roomLabel: 'Room 105',
              resident: 'Catherine Doyle',
              eventKind: 'fall',
              title: 'Possible fall detected',
              confidence: 91,
              note: 'Rapid posture change followed by floor-level persistence.',
              urgency: 'critical',
            },
          },
          { type: 'roomState', roomId: '105', state: 'alert', lastEvent: 'Possible fall detected' },
          { type: 'setSummary', patch: { alertsToday: 8, unresolved: 1 } },
        ],
      },
    ],
  },
  {
    id: 'bed-exit-102',
    title: 'Bed exit at night',
    subtitle: 'Room 102 · Patrick Byrne',
    description: 'Shows an exception-based targeted check. The alert stays live until you decide what happens next.',
    roomId: '102',
    eventKind: 'bedExit',
    steps: [
      {
        delayMs: 900,
        label: 'Bed exit detected',
        actions: [
          { type: 'roomState', roomId: '102', state: 'watch', lastEvent: 'Bed exit pattern detected' },
          {
            type: 'raiseAlert',
            alert: {
              id: 'bed-exit-102',
              roomId: '102',
              roomLabel: 'Room 102',
              resident: 'Patrick Byrne',
              eventKind: 'bedExit',
              title: 'Bed exit at night',
              confidence: 87,
              note: 'Resident exited bed and remained upright for more than 12 seconds.',
              urgency: 'high',
            },
          },
          { type: 'roomState', roomId: '102', state: 'alert', lastEvent: 'Bed exit at night' },
          { type: 'setSummary', patch: { alertsToday: 8, unresolved: 1 } },
        ],
      },
    ],
  },
  {
    id: 'long-lie-109',
    title: 'Long-lie / no recovery',
    subtitle: 'Room 109 · Tom Duffy',
    description: 'Persistence-based alert. You choose whether staff acknowledge promptly or the response escalates.',
    roomId: '109',
    eventKind: 'longLie',
    steps: [
      {
        delayMs: 800,
        label: 'Persistent floor-level posture detected',
        actions: [
          { type: 'roomState', roomId: '109', state: 'watch', lastEvent: 'Floor-level posture persists beyond threshold' },
          {
            type: 'raiseAlert',
            alert: {
              id: 'long-lie-109',
              roomId: '109',
              roomLabel: 'Room 109',
              resident: 'Tom Duffy',
              eventKind: 'longLie',
              title: 'Long-lie risk detected',
              confidence: 89,
              note: 'No recovery movement detected after 90 seconds.',
              urgency: 'critical',
            },
          },
          { type: 'roomState', roomId: '109', state: 'alert', lastEvent: 'Long-lie risk detected' },
          { type: 'setSummary', patch: { alertsToday: 8, unresolved: 1 } },
        ],
      },
    ],
  },
  {
    id: 'false-alert-111',
    title: 'False alert dismissal',
    subtitle: 'Room 111 · Michael Quinn',
    description: 'Medium-confidence alert that you can acknowledge briefly and dismiss without escalating the whole chain.',
    roomId: '111',
    eventKind: 'falseAlert',
    steps: [
      {
        delayMs: 900,
        label: 'Medium-confidence alert generated',
        actions: [
          { type: 'roomState', roomId: '111', state: 'alert', lastEvent: 'Possible fall signal detected' },
          {
            type: 'raiseAlert',
            alert: {
              id: 'false-alert-111',
              roomId: '111',
              roomLabel: 'Room 111',
              resident: 'Michael Quinn',
              eventKind: 'falseAlert',
              title: 'Possible fall signal',
              confidence: 63,
              note: 'Resident movement pattern requires quick review.',
              urgency: 'medium',
            },
          },
          { type: 'setSummary', patch: { alertsToday: 8, unresolved: 1 } },
        ],
      },
    ],
  },
  {
    id: 'manager-review',
    title: 'Manager next-morning review',
    subtitle: 'Shift handover summary',
    description: 'Highlights manager-facing review and incident visibility rather than only frontline alerts.',
    roomId: '108',
    eventKind: 'managerReview',
    steps: [
      {
        delayMs: 1000,
        label: 'Manager summary refreshed',
        actions: [
          { type: 'managerFlash', message: 'Manager summary refreshed for morning handover' },
          { type: 'setSummary', patch: { alertsToday: 9, unresolved: 0, averageResponse: '01:31', acknowledgedWithin2Min: '89%' } },
          {
            type: 'timeline',
            entry: {
              roomLabel: 'Wing A',
              resident: 'Shift summary',
              title: 'Morning manager review',
              status: 'Review',
              note: 'Incident queue, response times, and unresolved items reviewed in one place.',
            },
          },
        ],
      },
    ],
  },
];

function currentClock(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEventKind(kind: EventKind): string {
  return EVENT_LABELS[kind];
}

function nextActionHint(alert: Alert | null): string {
  if (!alert) return 'Ready for demonstration.';
  if (alert.status === 'active') {
    return 'Live alert raised. Tap Acknowledge, Escalate, or Resolve to walk through the response path manually.';
  }
  if (alert.status === 'acknowledged') {
    return 'Alert acknowledged. You can now escalate for nurse review or resolve it.';
  }
  if (alert.status === 'escalated') {
    return 'Escalated path shown. Resolve when you want to close the event and leave it in the timeline.';
  }
  if (alert.status === 'dismissed' || alert.status === 'resolved') {
    return 'Event closed. Reset the demo or run another scenario.';
  }
  return 'Ready for demonstration.';
}

export default function Page() {
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [summary, setSummary] = useState<SummaryState>(INITIAL_SUMMARY);
  const [timeline, setTimeline] = useState<IncidentLogEntry[]>(INITIAL_TIMELINE);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SCENARIOS[0].id);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [presenterNote, setPresenterNote] = useState<string>('Ready for demonstration.');
  const [clock, setClock] = useState<string>(currentClock());
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(currentClock()), 1000 * 20);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const selectedScenario = useMemo(
    () => SCENARIOS.find((scenario) => scenario.id === selectedScenarioId) ?? SCENARIOS[0],
    [selectedScenarioId],
  );

  function clearScheduledSteps() {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  }

  function resetDemo() {
    clearScheduledSteps();
    setRooms(INITIAL_ROOMS);
    setActiveAlert(null);
    setSummary(INITIAL_SUMMARY);
    setTimeline(INITIAL_TIMELINE);
    setRunningScenarioId(null);
    setPresenterNote('Reset complete. Ready for next scenario.');
  }

  function applyAction(action: StepAction) {
    switch (action.type) {
      case 'roomState': {
        setRooms((previous) =>
          previous.map((room) =>
            room.id === action.roomId
              ? {
                  ...room,
                  state: action.state,
                  lastEvent: action.lastEvent,
                  updatedAt: currentClock(),
                }
              : room,
          ),
        );
        break;
      }
      case 'raiseAlert': {
        setActiveAlert({
          ...action.alert,
          status: action.alert.status ?? 'active',
          since: action.alert.since ?? currentClock(),
        });
        break;
      }
      case 'updateAlert': {
        setActiveAlert((previous) =>
          previous
            ? {
                ...previous,
                status: action.status,
                note: action.note ?? previous.note,
                confidence: action.confidence ?? previous.confidence,
              }
            : previous,
        );
        break;
      }
      case 'timeline': {
        setTimeline((previous) => [
          {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: action.entry.timestamp ?? currentClock(),
            roomLabel: action.entry.roomLabel,
            resident: action.entry.resident,
            title: action.entry.title,
            status: action.entry.status ?? 'Logged',
            note: action.entry.note,
          },
          ...previous,
        ]);
        break;
      }
      case 'managerFlash': {
        setPresenterNote(action.message);
        break;
      }
      case 'setSummary': {
        setSummary((previous) => ({ ...previous, ...action.patch }));
        break;
      }
      case 'clearAlert': {
        setActiveAlert(null);
        break;
      }
      default:
        break;
    }
  }

  function runScenario(scenario: Scenario) {
    resetDemo();
    setRunningScenarioId(scenario.id);
    setPresenterNote(`Running scenario: ${scenario.title}`);

    scenario.steps.forEach((step, index) => {
      const timeoutId = window.setTimeout(() => {
        setPresenterNote(step.label);
        step.actions.forEach((action) => applyAction(action));

        const isFinal = index === scenario.steps.length - 1;
        if (isFinal) {
          setRunningScenarioId(null);
          const scenarioAlert = scenario.eventKind === 'managerReview' ? null : scenario.eventKind;
          if (scenarioAlert) {
            setPresenterNote('Live alert raised. Use the action buttons to walk through acknowledgement, escalation, or closure manually.');
          }
        }
      }, step.delayMs);

      timeoutsRef.current.push(timeoutId);
    });
  }

  function handleAcknowledge() {
    if (!activeAlert || activeAlert.status === 'acknowledged' || activeAlert.status === 'resolved' || activeAlert.status === 'dismissed') return;
    applyAction({
      type: 'updateAlert',
      status: 'acknowledged',
      note:
        activeAlert.eventKind === 'falseAlert'
          ? 'Reviewed by staff. Quick check underway before dismissal decision.'
          : 'Healthcare assistant acknowledged and is attending the room now.',
    });
    applyAction({ type: 'roomState', roomId: activeAlert.roomId, state: 'acknowledged', lastEvent: 'Acknowledged manually' });
    applyAction({
      type: 'timeline',
      entry: {
        roomLabel: activeAlert.roomLabel,
        resident: activeAlert.resident,
        title: `${activeAlert.title} acknowledged`,
        status: 'Acknowledged',
        note: 'Manual acknowledgement during demo.',
      },
    });
    setSummary((previous) => ({ ...previous, averageResponse: '01:24', acknowledgedWithin2Min: '90%' }));
    setPresenterNote(nextActionHint({ ...activeAlert, status: 'acknowledged' }));
  }

  function handleEscalate() {
    if (!activeAlert || activeAlert.status === 'resolved' || activeAlert.status === 'dismissed' || activeAlert.status === 'escalated') return;
    applyAction({
      type: 'updateAlert',
      status: 'escalated',
      note:
        activeAlert.eventKind === 'longLie'
          ? 'Escalated for urgent nurse review after persistent floor-level posture.'
          : 'Escalated for nurse assessment and incident review.',
    });
    applyAction({ type: 'roomState', roomId: activeAlert.roomId, state: 'escalated', lastEvent: 'Escalated manually' });
    applyAction({
      type: 'timeline',
      entry: {
        roomLabel: activeAlert.roomLabel,
        resident: activeAlert.resident,
        title: `${activeAlert.title} escalated`,
        status: 'Escalated',
        note: 'Escalation triggered during demo.',
      },
    });
    setPresenterNote(nextActionHint({ ...activeAlert, status: 'escalated' }));
  }

  function handleResolve() {
    if (!activeAlert || activeAlert.status === 'resolved' || activeAlert.status === 'dismissed') return;
    const wasFalse = activeAlert.eventKind === 'falseAlert';
    const nextStatus = wasFalse ? 'dismissed' : 'resolved';
    applyAction({
      type: 'updateAlert',
      status: nextStatus,
      note: wasFalse ? 'Reviewed and dismissed. Resident was repositioning safely.' : 'Resolved and retained in the incident timeline for handover.',
    });
    applyAction({ type: 'roomState', roomId: activeAlert.roomId, state: 'normal', lastEvent: wasFalse ? 'False alert dismissed' : 'Resolved and logged for handover' });
    applyAction({
      type: 'timeline',
      entry: {
        roomLabel: activeAlert.roomLabel,
        resident: activeAlert.resident,
        title: wasFalse ? 'False alert dismissed' : `${activeAlert.title} resolved`,
        status: wasFalse ? 'Dismissed' : 'Resolved',
        note: wasFalse ? 'No escalation required. Logged for later alert-quality review.' : 'Event closed manually during demo.',
      },
    });
    setSummary((previous) => ({
      ...previous,
      unresolved: Math.max(previous.unresolved - 1, 0),
      falseDismissed: wasFalse ? previous.falseDismissed + 1 : previous.falseDismissed,
    }));
    setPresenterNote(nextActionHint({ ...activeAlert, status: nextStatus }));
    window.setTimeout(() => setActiveAlert(null), 400);
  }

  return (
    <main className="appShell">
      <section className="topBar">
        <div>
          <div className="eyebrow">NexaSense demonstration</div>
          <h1>Exception-based care-home monitoring</h1>
          <p className="muted">iPad-friendly scenario demo for operational and clinical conversations.</p>
        </div>
        <div className="topBarRight">
          <div className="statusPill online">System operational</div>
          <div className="statusPill">API / worker / stream split</div>
          <div className="clockPill">{clock}</div>
          <button className="ghostButton" onClick={() => setShowControls((value) => !value)}>
            {showControls ? 'Hide controls' : 'Show controls'}
          </button>
        </div>
      </section>

      <section className="summaryGrid">
        <SummaryCard label="Alerts this shift" value={String(summary.alertsToday)} helper="Includes reviewed and dismissed alerts" />
        <SummaryCard label="Unresolved now" value={String(summary.unresolved)} helper="Current open items needing attention" />
        <SummaryCard label="Average response" value={summary.averageResponse} helper="Illustrative manager metric" />
        <SummaryCard label="Acknowledged within 2 min" value={summary.acknowledgedWithin2Min} helper="Shift performance example" />
      </section>

      <section className="mainGrid">
        <section className="panel wingPanel">
          <div className="panelHeader">
            <div>
              <div className="eyebrow">Live wing view</div>
              <h2>Wing A · 12 monitored rooms</h2>
            </div>
            <div className="panelBadge">Passive in-room sensing</div>
          </div>
          <div className="roomsGrid">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} isActive={activeAlert?.roomId === room.id} />
            ))}
          </div>
        </section>

        <section className="panel alertPanel">
          <div className="panelHeader">
            <div>
              <div className="eyebrow">Active workflow</div>
              <h2>Alert detail and response path</h2>
            </div>
            <div className={`panelBadge ${activeAlert ? 'badgeWarn' : ''}`}>{activeAlert ? 'Live event' : 'No live alert'}</div>
          </div>

          {activeAlert ? (
            <div className="alertCard">
              <div className="alertHeader">
                <div>
                  <div className="alertTitle">{activeAlert.title}</div>
                  <div className="alertMeta">{activeAlert.roomLabel} · {activeAlert.resident}</div>
                </div>
                <div className={`urgencyPill ${activeAlert.urgency}`}>{activeAlert.urgency}</div>
              </div>

              <div className="alertMetrics">
                <Metric label="Confidence" value={`${activeAlert.confidence}%`} />
                <Metric label="Status" value={capitalize(activeAlert.status)} />
                <Metric label="Raised" value={activeAlert.since} />
                <Metric label="Type" value={formatEventKind(activeAlert.eventKind)} />
              </div>

              <div className="noteBox">{activeAlert.note}</div>

              <div className="buttonRow">
                <button className="primaryButton" onClick={handleAcknowledge}>Acknowledge</button>
                <button className="secondaryButton" onClick={handleEscalate}>Escalate</button>
                <button className="secondaryButton" onClick={handleResolve}>{activeAlert.eventKind === 'falseAlert' ? 'Dismiss' : 'Resolve'}</button>
              </div>
            </div>
          ) : (
            <div className="emptyState">
              <div className="emptyStateTitle">No active alert</div>
              <p>The live workflow panel updates when a scenario is triggered or a manual action is taken.</p>
            </div>
          )}

          <div className="presenterStrip">
            <span className="eyebrow">Presenter note</span>
            <p>{presenterNote}</p>
          </div>
        </section>
      </section>

      <section className="bottomGrid">
        <section className="panel timelinePanel">
          <div className="panelHeader">
            <div>
              <div className="eyebrow">Incident timeline</div>
              <h2>Reviewable event history</h2>
            </div>
            <div className="panelBadge">Latest first</div>
          </div>

          <div className="timelineList">
            {timeline.map((entry) => (
              <div key={entry.id} className="timelineItem">
                <div className="timelineTime">{entry.timestamp}</div>
                <div className="timelineBody">
                  <div className="timelineTitle">{entry.title}</div>
                  <div className="timelineMeta">{entry.roomLabel} · {entry.resident} · {entry.status}</div>
                  <div className="timelineNote">{entry.note}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel controlsPanel">
          <div className="panelHeader">
            <div>
              <div className="eyebrow">Scenario controls</div>
              <h2>Tap to simulate a workflow</h2>
            </div>
            <div className="panelBadge">Local playback</div>
          </div>

          {showControls ? (
            <>
              <label className="controlLabel" htmlFor="scenario">Scenario</label>
              <select
                id="scenario"
                value={selectedScenarioId}
                className="scenarioSelect"
                onChange={(event) => setSelectedScenarioId(event.target.value)}
              >
                {SCENARIOS.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>{scenario.title}</option>
                ))}
              </select>

              <div className="scenarioPreview">
                <div className="scenarioTitle">{selectedScenario.title}</div>
                <div className="scenarioSubtitle">{selectedScenario.subtitle}</div>
                <p>{selectedScenario.description}</p>
              </div>

              <div className="buttonRow wrap">
                <button className="primaryButton" onClick={() => runScenario(selectedScenario)} disabled={Boolean(runningScenarioId)}>
                  {runningScenarioId ? 'Scenario running' : 'Run scenario'}
                </button>
                <button className="secondaryButton" onClick={resetDemo}>Reset demo</button>
              </div>

              <div className="quickScenarioGrid">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    className={`quickScenarioButton ${selectedScenarioId === scenario.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedScenarioId(scenario.id);
                      runScenario(scenario);
                    }}
                    disabled={Boolean(runningScenarioId)}
                  >
                    <span>{scenario.title}</span>
                    <small>{scenario.subtitle}</small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="emptyState compactEmpty">
              <div className="emptyStateTitle">Controls hidden</div>
              <p>Use the top-right button to reveal presenter controls again.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="summaryCard panel">
      <div className="eyebrow">{label}</div>
      <div className="summaryValue">{value}</div>
      <div className="summaryHelper">{helper}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metricBox">
      <div className="metricLabel">{label}</div>
      <div className="metricValue">{value}</div>
    </div>
  );
}

function RoomCard({ room, isActive }: { room: Room; isActive: boolean }) {
  return (
    <div className={`roomCard state-${room.state} ${isActive ? 'roomCardActive' : ''}`}>
      <div className="roomHeader">
        <div>
          <div className="roomLabel">{room.label}</div>
          <div className="roomResident">{room.resident}</div>
        </div>
        <div className={`roomStateBadge badge-${room.state}`}>{capitalize(room.state)}</div>
      </div>
      <div className="roomEvent">{room.lastEvent}</div>
      <div className="roomUpdated">Updated {room.updatedAt}</div>
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
