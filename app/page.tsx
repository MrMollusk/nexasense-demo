'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type RoomState = 'normal' | 'watch' | 'alert' | 'acknowledged' | 'escalated';
type EventKind = 'fall' | 'bedExit' | 'longLie' | 'falseAlert' | 'managerReview';
type ManualStage = 'idle' | 'running' | 'alertLive' | 'acknowledged' | 'escalated' | 'closed';

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

type Scenario = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  roomId: string;
  eventKind: EventKind;
  watchDelayMs?: number;
  watchLabel?: string;
  alert: Omit<Alert, 'status' | 'since'>;
};

type SummaryState = {
  alertsToday: number;
  unresolved: number;
  falseDismissed: number;
  averageResponse: string;
  acknowledgedWithin2Min: string;
};

const DEMO_VERSION = 'manual-v3';

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
    description: 'Runs to the live alert, then stops. The alert will not acknowledge, escalate, or resolve until you tap.',
    roomId: '105',
    eventKind: 'fall',
    watchDelayMs: 900,
    watchLabel: 'Unusual movement pattern detected',
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
  {
    id: 'bed-exit-102',
    title: 'Bed exit at night',
    subtitle: 'Room 102 · Patrick Byrne',
    description: 'Shows an exception-based targeted check. Alert remains live until you choose the next step.',
    roomId: '102',
    eventKind: 'bedExit',
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
  {
    id: 'long-lie-109',
    title: 'Long-lie / no recovery',
    subtitle: 'Room 109 · Tom Duffy',
    description: 'Persistence-based alert. You decide if it is acknowledged, escalated, or resolved.',
    roomId: '109',
    eventKind: 'longLie',
    watchDelayMs: 900,
    watchLabel: 'Floor-level posture persists beyond threshold',
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
  {
    id: 'false-alert-111',
    title: 'False alert dismissal',
    subtitle: 'Room 111 · Michael Quinn',
    description: 'Medium-confidence alert that you can acknowledge briefly and dismiss without escalation.',
    roomId: '111',
    eventKind: 'falseAlert',
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
  {
    id: 'manager-review',
    title: 'Manager next-morning review',
    subtitle: 'Shift handover summary',
    description: 'Manager-facing review screen update.',
    roomId: '108',
    eventKind: 'managerReview',
    alert: {
      id: 'manager-review',
      roomId: '108',
      roomLabel: 'Wing A',
      resident: 'Shift summary',
      eventKind: 'managerReview',
      title: 'Morning manager review',
      confidence: 100,
      note: 'Incident queue, response times, and unresolved items reviewed in one place.',
      urgency: 'medium',
    },
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
  if (alert.status === 'active') return 'Live alert raised. Nothing else will happen until you tap a button.';
  if (alert.status === 'acknowledged') return 'Alert acknowledged. You can now escalate or resolve it.';
  if (alert.status === 'escalated') return 'Alert escalated. Resolve or dismiss when ready.';
  return 'Event closed. Reset the demo or run another scenario.';
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
  const [manualStage, setManualStage] = useState<ManualStage>('idle');
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(currentClock()), 20000);
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
    setManualStage('idle');
    setPresenterNote(`Reset complete. ${DEMO_VERSION}`);
  }

  function updateRoom(roomId: string, state: RoomState, lastEvent: string) {
    setRooms((previous) =>
      previous.map((room) =>
        room.id === roomId
          ? { ...room, state, lastEvent, updatedAt: currentClock() }
          : room,
      ),
    );
  }

  function addTimeline(roomLabel: string, resident: string, title: string, status: string, note: string) {
    setTimeline((previous) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: currentClock(),
        roomLabel,
        resident,
        title,
        status,
        note,
      },
      ...previous,
    ]);
  }

  function launchAlert(scenario: Scenario) {
    setActiveAlert({ ...scenario.alert, status: 'active', since: currentClock() });
    updateRoom(scenario.roomId, 'alert', scenario.alert.title);
    setSummary((previous) => ({ ...previous, alertsToday: previous.alertsToday + 1, unresolved: previous.unresolved + 1 }));
    setRunningScenarioId(null);
    setManualStage('alertLive');
    setPresenterNote(`LIVE ALERT · ${scenario.title} · ${DEMO_VERSION}`);
  }

  function runScenario(scenario: Scenario) {
    resetDemo();
    setRunningScenarioId(scenario.id);
    setManualStage('running');
    setPresenterNote(`Running scenario: ${scenario.title} · ${DEMO_VERSION}`);

    if (scenario.eventKind === 'managerReview') {
      const timeoutId = window.setTimeout(() => {
        setSummary((previous) => ({ ...previous, alertsToday: 9, unresolved: 0, averageResponse: '01:31', acknowledgedWithin2Min: '89%' }));
        addTimeline('Wing A', 'Shift summary', 'Morning manager review', 'Review', 'Incident queue, response times, and unresolved items reviewed in one place.');
        setRunningScenarioId(null);
        setManualStage('closed');
        setPresenterNote(`Manager review updated · ${DEMO_VERSION}`);
      }, 900);
      timeoutsRef.current.push(timeoutId);
      return;
    }

    if (scenario.watchDelayMs && scenario.watchLabel) {
      updateRoom(scenario.roomId, 'watch', scenario.watchLabel);
      const timeoutId = window.setTimeout(() => launchAlert(scenario), scenario.watchDelayMs);
      timeoutsRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => launchAlert(scenario), 800);
    timeoutsRef.current.push(timeoutId);
  }

  function handleAcknowledge() {
    if (!activeAlert || manualStage !== 'alertLive') return;
    setActiveAlert((previous) => previous ? { ...previous, status: 'acknowledged', note: previous.eventKind === 'falseAlert' ? 'Reviewed by staff. Quick check underway before dismissal decision.' : 'Healthcare assistant acknowledged and is attending the room now.' } : previous);
    updateRoom(activeAlert.roomId, 'acknowledged', 'Acknowledged manually');
    addTimeline(activeAlert.roomLabel, activeAlert.resident, `${activeAlert.title} acknowledged`, 'Acknowledged', 'Manual acknowledgement during demo.');
    setSummary((previous) => ({ ...previous, averageResponse: '01:24', acknowledgedWithin2Min: '90%' }));
    setManualStage('acknowledged');
    setPresenterNote(`Acknowledged manually · ${DEMO_VERSION}`);
  }

  function handleEscalate() {
    if (!activeAlert || (manualStage !== 'alertLive' && manualStage !== 'acknowledged')) return;
    setActiveAlert((previous) => previous ? { ...previous, status: 'escalated', note: previous.eventKind === 'longLie' ? 'Escalated for urgent nurse review after persistent floor-level posture.' : 'Escalated for nurse assessment and incident review.' } : previous);
    updateRoom(activeAlert.roomId, 'escalated', 'Escalated manually');
    addTimeline(activeAlert.roomLabel, activeAlert.resident, `${activeAlert.title} escalated`, 'Escalated', 'Escalation triggered during demo.');
    setManualStage('escalated');
    setPresenterNote(`Escalated manually · ${DEMO_VERSION}`);
  }

  function handleResolve() {
    if (!activeAlert || (manualStage !== 'alertLive' && manualStage !== 'acknowledged' && manualStage !== 'escalated')) return;
    const wasFalse = activeAlert.eventKind === 'falseAlert';
    const nextStatus = wasFalse ? 'dismissed' : 'resolved';
    setActiveAlert((previous) => previous ? { ...previous, status: nextStatus, note: wasFalse ? 'Reviewed and dismissed. Resident was repositioning safely.' : 'Resolved and retained in the incident timeline for handover.' } : previous);
    updateRoom(activeAlert.roomId, 'normal', wasFalse ? 'False alert dismissed' : 'Resolved and logged for handover');
    addTimeline(activeAlert.roomLabel, activeAlert.resident, wasFalse ? 'False alert dismissed' : `${activeAlert.title} resolved`, wasFalse ? 'Dismissed' : 'Resolved', wasFalse ? 'No escalation required. Logged for later alert-quality review.' : 'Event closed manually during demo.');
    setSummary((previous) => ({ ...previous, unresolved: Math.max(previous.unresolved - 1, 0), falseDismissed: wasFalse ? previous.falseDismissed + 1 : previous.falseDismissed }));
    setManualStage('closed');
    setPresenterNote(`${wasFalse ? 'Dismissed' : 'Resolved'} manually · ${DEMO_VERSION}`);
  }

  return (
    <main className="appShell">
      <section className="topBar">
        <div>
          <div className="eyebrow">NexaSense demonstration · {DEMO_VERSION}</div>
          <h1>Exception-based care-home monitoring</h1>
          <p className="muted">iPad-friendly scenario demo for operational and clinical conversations.</p>
        </div>
        <div className="topBarRight">
          <div className="statusPill online">System operational</div>
          <div className="statusPill">API / worker / stream split</div>
          <div className="statusPill">Postgres truth · Redis ephemeral · object storage bytes</div>
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
                <button className="primaryButton" onClick={handleAcknowledge} disabled={manualStage !== 'alertLive'}>Acknowledge</button>
                <button className="secondaryButton" onClick={handleEscalate} disabled={manualStage !== 'alertLive' && manualStage !== 'acknowledged'}>Escalate</button>
                <button className="secondaryButton" onClick={handleResolve} disabled={manualStage !== 'alertLive' && manualStage !== 'acknowledged' && manualStage !== 'escalated'}>{activeAlert.eventKind === 'falseAlert' ? 'Dismiss' : 'Resolve'}</button>
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
            <div className="scenarioStage">Manual stage: {capitalize(manualStage)}</div>
            <div className="scenarioStage">Build: {DEMO_VERSION}</div>
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
            <div className="panelBadge">Local playback · manual branching</div>
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
