import { useState, useRef } from 'react';
import {
  PEOPLE, PROJECTS, mkTasks, INITIAL_REVISIONS, INITIAL_DEALS,
  STAGES, BD_ROSTER, NOTE_TAGS, WEEKDAY_LABELS,
  INITIAL_BID_PROJECTS, BID_LEVELS, DECLINE_REASONS,
  money, num, gpPct, gpNum, statusColor, statusShort, personName, personFirst, personInitials,
  taskDate, seedShiftDate, ymd, prettyShort, mondayOf, addDays,
  type Task, type TaskStatus, type CrmStage, type Deal, type Revision,
  type FollowUp, type NoteEntry, type Person, type Project, type BidProject, type BidStatus,
} from './data';
import { Button, Seg, Chip, StatusLight, KpiStrip, ListRow, Field, PageHeader, Rule, T, STATUS, inputStyle, type StatusKey } from './design/ui';

// ─── tiny helpers ─────────────────────────────────────────────────────────────
function today0(): Date { const d = new Date(); d.setHours(0,0,0,0); return d; }

function projStatusKey(openTasks: Task[]): StatusKey {
  const t0 = today0(); const soon = addDays(t0, 2);
  const live = openTasks.filter(t => t.status !== 'Complete');
  if (!live.length) return 'idle';
  const overdue = live.some(t => { const d = taskDate(t); return d && d <= t0 && t.status !== 'Awaiting Response'; });
  if (overdue) return 'urgent';
  const waiting = live.some(t => t.status === 'Awaiting Response');
  if (waiting) return 'awaiting';
  return 'good';
}
type OverrideKey = 'todo' | 'awaiting' | 'comeback' | 'good';
const OVERRIDE_META: Record<OverrideKey, { label: string; color: string; statusKey: StatusKey }> = {
  todo:     { label: 'TO-DO',        color: 'var(--color-accent)',   statusKey: 'urgent'   },
  awaiting: { label: 'AWAITING',     color: STATUS.awaiting,        statusKey: 'awaiting' },
  comeback: { label: 'COME BACK',    color: 'oklch(0.50 0.18 240)', statusKey: 'idle'     },
  good:     { label: 'GOOD FOR NOW', color: STATUS.good,            statusKey: 'good'     },
};

function projStatusWord(k: StatusKey): string {
  return k === 'urgent' ? 'NEEDS WORK' : k === 'awaiting' ? 'AWAITING' : k === 'good' ? 'GOOD FOR NOW' : 'TO-DO';
}
function dueColor(t: Task): string {
  if (t.status === 'Complete') return STATUS.good;
  if (t.status === 'Awaiting Response') return STATUS.awaiting;
  const d = taskDate(t);
  if (d && d <= today0()) return STATUS.urgent;
  return 'var(--color-text)';
}

const inp = inputStyle;

// ─── types ────────────────────────────────────────────────────────────────────
type View = 'myday' | 'overview' | 'calendar' | 'capacity' | 'projects';
type AppTab = 'board' | 'tracker' | 'crm';
type CrmView = 'home' | 'followups' | 'list' | 'record';
type IssueRecord = { id: string; taskId: string; from: string; text: string; when: string; status: 'open' | 'resolved'; replies: NoteEntry[]; };
type ProjNote = NoteEntry & { tag: string; label: string; };

interface AppState {
  userId: string; app: AppTab; view: View;
  tasks: Task[]; projectId: string; focusProjectId: string | null;
  myDayMode: 'focus' | 'columns'; openTaskId: string | null;
  closedProjects: Record<string, string>;
  deals: Record<string, Deal>;
  revisions: Record<string, Revision[]>;
  followUps: Record<string, FollowUp[]>;
  projNotes: Record<string, ProjNote[]>;
  issues: IssueRecord[]; showIssues: boolean; replyFor: string | null;
  showQuickNote: boolean; quickNote: { projectId: string; text: string; tag: string; };
  showNewTask: boolean; newTaskDraft: { title: string; projectId: string; who: string; day: string; hrs: string; note: string; };
  confirmClose: string | null;
  crmView: CrmView; dealId: string; crmPane: 'info' | 'pricing' | 'followup';
  crmStage: string; crmBd: string; crmSearch: string;
  followDate: string; followNote: string; followWho: string;
  revDraft: { label: string; price: string; cost: string; note: string; };
  projNoteDraft: string; projNoteTag: string;
  overviewMode: 'signals' | 'swimlanes' | 'teamcal';
  calOff: number; capOff: number;
  expandedProj: Record<string, boolean>;
  noteLogDraft: Record<string, string>;
  toast: string; listening: boolean;
  newTaskSelfOnly: boolean;
  helpRequests: Array<{ id: string; from: string; fromName: string; projectId: string; when: string; read: boolean; }>;
  projStatusOverride: Record<string, 'todo' | 'awaiting' | 'comeback' | 'good'>;
  bidProjects: BidProject[];
}

function initState(userId: string): AppState {
  const tasks = mkTasks();
  const projects = PROJECTS.filter(p => !INITIAL_DEALS[p.id] || true);
  const firstProj = projects[0]?.id || 'cedar';
  return {
    userId, app: 'tracker', view: 'myday',
    tasks, projectId: 'cedar', focusProjectId: null,
    myDayMode: 'focus', openTaskId: null,
    closedProjects: {},
    deals: { ...INITIAL_DEALS },
    revisions: { ...INITIAL_REVISIONS },
    followUps: {},
    projNotes: {
      cedar: [
        { who: 'Allen Poole', when: 'Mon 4:02p', text: 'Dana confirmed the atrium is bid as an alternate. Oldcastle quote due Wednesday.', tag: 'gc', label: 'GC CALL' },
        { who: 'Blake Nicholson', when: 'Fri 20:20p', text: 'Asked about the Cedar Point bid form — they will send Addendum 3 Monday.', tag: 'spec', label: 'SPEC' },
      ],
    },
    issues: [], showIssues: false, replyFor: null,
    showQuickNote: false, quickNote: { projectId: firstProj, text: '', tag: 'spec' },
    showNewTask: false, newTaskDraft: { title: '', projectId: firstProj, who: userId, day: 'Mon', hrs: '2', note: '' },
    confirmClose: null,
    crmView: 'home', dealId: 'cedar', crmPane: 'info',
    crmStage: 'All', crmBd: 'All', crmSearch: '',
    followDate: '', followNote: '', followWho: 'All',
    revDraft: { label: '', price: '', cost: '', note: '' },
    projNoteDraft: '', projNoteTag: 'spec',
    overviewMode: 'signals',
    calOff: 0, capOff: 0,
    expandedProj: {},
    noteLogDraft: {},
    toast: '', listening: false,
    newTaskSelfOnly: false,
    helpRequests: [],
    projStatusOverride: {},
    bidProjects: INITIAL_BID_PROJECTS.map(b => ({ ...b })),
  };
}

// ─── Bid Board ────────────────────────────────────────────────────────────────
const BID_STATUS_COLOR: Record<BidStatus, string> = {
  pending: 'var(--color-text)',
  accepted: '#1f7a4d',
  declined: 'var(--color-accent)',
};
const BID_STATUS_LABEL: Record<BidStatus, string> = {
  pending: 'AWAITING', accepted: 'ACCEPTED', declined: 'DECLINED',
};

const emptyDraft = (): Partial<BidProject> => ({
  name: '', gc: '', bidDate: '', level: '100% CD', location: '',
  scope: '', planRoom: '', info: '', notes: '',
  status: 'pending', assignees: [], declineReason: '', declineNote: '', notified: false,
});

function BidBoardView({ st, setSt, me, flash, onSignOut }: {
  st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>;
  me: Person; flash: (m: string) => void; onSignOut: () => void;
}) {
  const [boardView, setBoardView] = useState<'grid' | 'byEstimator'>('grid');
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [editBid, setEditBid] = useState<BidProject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0]);
  const [declineNote, setDeclineNote] = useState('');
  const [draft, setDraft] = useState<Partial<BidProject>>(emptyDraft());
  const [itbText, setItbText] = useState('');
  const [detailBid, setDetailBid] = useState<BidProject | null>(null);

  const bids = st.bidProjects ?? INITIAL_BID_PROJECTS.map(b => ({ ...b }));
  const pending = bids.filter(b => b.status === 'pending').length;
  const accepted = bids.filter(b => b.status === 'accepted').length;
  const declined = bids.filter(b => b.status === 'declined').length;

  const filtered = bids.filter(b => {
    if (filter === 'pending' && b.status !== 'pending') return false;
    if (filter === 'accepted' && b.status !== 'accepted') return false;
    if (filter === 'declined' && b.status !== 'declined') return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.name.toLowerCase().includes(q) && !b.gc.toLowerCase().includes(q) &&
          !b.scope.toLowerCase().includes(q) && !b.location.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function patchBid(id: string, patch: Partial<BidProject>) {
    setSt(s => ({ ...s, bidProjects: s.bidProjects.map(b => b.id === id ? { ...b, ...patch } : b) }));
  }

  function openAssign(bidId: string) {
    const bid = bids.find(b => b.id === bidId);
    setAssignees(bid?.assignees || []);
    setAssignFor(bidId);
  }

  function confirmAccept() {
    const bid = bids.find(b => b.id === assignFor);
    if (!bid || !assignees.length) { flash('Select at least one team member'); return; }

    // create Project
    const projId = 'bid_' + bid.id;
    const short = bid.name.length > 22 ? bid.name.slice(0, 20) + '…' : bid.name;
    const newProj: Project = {
      id: projId, ref: 'BID ' + (2050 + Math.floor(Math.random() * 50)),
      name: bid.name, short, client: bid.gc, gc: bid.gc,
      scope: bid.scope, bidDue: bid.bidDate, value: '—', bidTab: '—',
      location: bid.location, glazier: '', sqft: '—', trade: 'glass',
      drawings: bid.level,
    };
    PROJECTS.push(newProj);

    // generate 4 tasks
    const t0 = today0();
    const bidDueDate = seedShiftDate(bid.bidDate) || addDays(t0, 14);
    const primary = assignees[0];
    function mkTask(title: string, d: Date, hrs: number): Task {
      const wd = d.getDay() === 0 ? addDays(d, 1) : d.getDay() === 6 ? addDays(d, 2) : d;
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][wd.getDay()];
      return { id: 'bt' + Date.now() + Math.random().toString(36).slice(2), title, projectId: projId, who: primary, status: 'To-Do', due: prettyShort(wd), day: dayName, date: ymd(wd), hrs, detail: '', notes: [] };
    }
    const introDate = (() => { const d = addDays(bidDueDate, -14); return d > addDays(t0, 1) ? d : addDays(t0, 1); })();
    const newTasks: Task[] = [
      mkTask('Intro email to GC', introDate, 1),
      mkTask('Takeoff + RFQs out', addDays(t0, 2), 6),
      mkTask('Estimate sheet', addDays(bidDueDate, -1), 4),
      mkTask('Finalize and submit', bidDueDate, 2),
    ];

    // create Deal
    const today = new Date().toLocaleDateString([], { month: 'short', day: '2-digit' });
    const newDeal: Deal = { estimator: primary, manager: '', bd: '', stage: 'Bidding', docStage: bid.level, price: '', cost: '', loggedAt: today, assignedAt: today };

    patchBid(bid.id, { status: 'accepted', assignees, notified: notify });
    setSt(s => ({ ...s, tasks: [...s.tasks, ...newTasks], deals: { ...s.deals, [projId]: newDeal } }));
    setAssignFor(null);
    flash('Accepted — project added to Task Tracker + CRM');
  }

  function confirmDecline() {
    if (!declineFor) return;
    patchBid(declineFor, { status: 'declined', declineReason, declineNote });
    setDeclineFor(null); setDeclineNote('');
    flash('Bid declined');
  }

  function saveDraft() {
    if (!draft.name?.trim()) { flash('Enter a project name'); return; }
    if (editBid) {
      patchBid(editBid.id, draft);
    } else {
      const nb: BidProject = { ...emptyDraft(), ...draft, id: 'bp' + Date.now(), status: 'pending', assignees: [], declineReason: '', declineNote: '', notified: false } as BidProject;
      setSt(s => ({ ...s, bidProjects: [nb, ...s.bidProjects] }));
    }
    setShowUpload(false); setEditBid(null); setDraft(emptyDraft()); setItbText('');
    flash(editBid ? 'Bid updated' : 'Bid added to board');
  }

  function parseItb() {
    // simple heuristic extraction from pasted ITB email text
    const lines = itbText.split('\n');
    const find = (re: RegExp) => { for (const l of lines) { const m = re.exec(l); if (m) return m[1].trim(); } return ''; };
    setDraft(d => ({
      ...d,
      name: find(/project[:\s]+(.+)/i) || d.name,
      gc: find(/(?:from|company|gc|contractor)[:\s]+(.+)/i) || d.gc,
      bidDate: find(/bid\s*due[:\s]+(.+)/i) || d.bidDate,
      location: find(/(?:location|address|city)[:\s]+(.+)/i) || d.location,
      scope: find(/scope[:\s]+(.+)/i) || d.scope,
      info: itbText.slice(0, 600),
    }));
    flash('Fields extracted — review and adjust');
  }

  function exportEstimatorPdf() {
    const rows = estimators.map(person => {
      const personBids = acceptedBids.filter(b => b.assignees.includes(person.id));
      if (!personBids.length) return '';
      const bidRows = personBids.map(b => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-weight:600">${b.name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd">${b.gc}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-weight:700;color:#b82a0e">${b.bidDate}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd">${b.scope}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd">${b.level}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd">${b.location}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd">${b.planRoom ? '<a href="' + b.planRoom + '">' + b.planRoom + '</a>' : '—'}</td>
        </tr>`).join('');
      const nextBid = personBids.slice().sort((a, b) => a.bidDate.localeCompare(b.bidDate))[0];
      return `
        <div style="margin-bottom:36px;page-break-inside:avoid">
          <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #201e1d;padding-bottom:8px;margin-bottom:10px">
            <div>
              <span style="font-size:16px;font-weight:800">${person.name}</span>
              <span style="font-size:11px;color:#666;margin-left:12px;letter-spacing:.1em;text-transform:uppercase">${person.role}</span>
            </div>
            <span style="font-size:11px;color:#666;font-weight:600">${personBids.length} BID${personBids.length !== 1 ? 'S' : ''} · NEXT DUE ${nextBid?.bidDate || '—'}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12.5px">
            <thead>
              <tr style="background:#f3f2f2">
                ${['PROJECT','GC','BID DATE','SCOPE','DRAWINGS','LOCATION','PLAN ROOM'].map(h => `<th style="text-align:left;padding:6px 12px;font-size:10px;letter-spacing:.12em;color:#666;font-weight:500;border-bottom:2px solid #201e1d">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${bidRows}</tbody>
          </table>
          ${personBids.some(b => b.notes) ? '<div style="margin-top:10px">' + personBids.filter(b => b.notes).map(b => `<div style="font-size:11px;color:#555;border-left:3px solid #ec3013;padding:4px 8px;margin-bottom:4px"><strong>${b.name}:</strong> ${b.notes}</div>`).join('') + '</div>' : ''}
        </div>`;
    }).join('');

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>1CG Estimator Assignments</title>
      <style>
        body { font-family: 'Arial', sans-serif; color: #201e1d; background: #fff; padding: 40px; margin: 0; }
        a { color: #b82a0e; }
        @media print { body { padding: 20px; } }
      </style>
    </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #201e1d;padding-bottom:16px;margin-bottom:32px">
        <div>
          <div style="font-size:24px;font-weight:800;letter-spacing:-.5px">1CG · ESTIMATOR ASSIGNMENTS</div>
          <div style="font-size:12px;color:#666;margin-top:4px;letter-spacing:.1em;text-transform:uppercase">Generated ${today}</div>
        </div>
        <div style="font-size:11px;color:#888;text-align:right">All active accepted bids<br>by assigned estimator</div>
      </div>
      ${rows}
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) { flash('Allow pop-ups to export PDF'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  function handlePhotoPaste(bidId: string, e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (!item) return;
    const file = item.getAsFile(); if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => patchBid(bidId, { photo: ev.target?.result as string });
    reader.readAsDataURL(file);
  }

  // by estimator view
  const estimators = PEOPLE.filter(p => p.kind === 'estimator' || p.kind === 'manager');
  const acceptedBids = bids.filter(b => b.status === 'accepted');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: 'calc(100vh - 38px)' }}>
      {/* header */}
      <div style={{ padding: '14px 28px', borderBottom: '2px solid var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div style={{ font: '800 17px/1 var(--font-heading)' }}>1CG · BIDBOARD</div>
          <Seg value={boardView} onChange={setBoardView} options={[{ value: 'grid', label: 'OPEN BIDS' }, { value: 'byEstimator', label: 'BY ESTIMATOR' }]} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { setDraft(emptyDraft()); setEditBid(null); setShowUpload(true); }} style={{ padding: '9px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '700 12px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>+ UPLOAD PROJECT</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 11px/1 var(--font-body)', color: '#fff' }}>{me.initials}</div>
            <span style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.08em' }}>{me.name.toUpperCase()}</span>
            <button onClick={onSignOut} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--color-neutral-400)', font: '600 10px/1 var(--font-body)', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>SIGN OUT</button>
          </div>
        </div>
      </div>

      {/* stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '2px solid var(--color-text)', flexShrink: 0 }}>
        {[['AWAITING DECISION', pending, 'var(--color-text)'], ['ACCEPTED', accepted, '#1f7a4d'], ['DECLINED', declined, 'var(--color-accent)']].map(([label, n, color], i) => (
          <div key={label as string} style={{ padding: '16px 28px', borderLeft: i > 0 ? '1px solid var(--color-divider)' : 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ font: '500 11px/1 var(--font-body)', letterSpacing: '.14em', color: 'var(--color-neutral-600)' }}>{label as string}</div>
            <div style={{ font: '800 34px/1 var(--font-heading)', color: color as string }}>{n as number}</div>
          </div>
        ))}
      </div>

      {boardView === 'grid' ? (
        <>
          {/* filter row */}
          <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
            <div style={{ font: '800 20px/1 var(--font-heading)' }}>Projects out for bid</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Seg value={filter} onChange={setFilter} options={[{ value: 'all', label: 'ALL' }, { value: 'pending', label: 'AWAITING' }, { value: 'accepted', label: 'ACCEPTED' }, { value: 'declined', label: 'DECLINED' }]} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search GC, scope or location" style={{ ...inp, width: 240, padding: '8px 12px' }} />
            </div>
          </div>

          {/* card grid */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
            {filtered.length === 0 && <div style={{ font: '500 14px/1.5 var(--font-body)', color: 'var(--color-neutral-600)', paddingTop: 20 }}>No bids match this filter.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {filtered.map(bid => {
                const col = BID_STATUS_COLOR[bid.status];
                const lbl = BID_STATUS_LABEL[bid.status];
                return (
                  <div key={bid.id} onClick={() => setDetailBid(bid)} style={{ border: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', cursor: 'pointer' }}>
                    {/* photo slot */}
                    <div
                      onPaste={e => { e.stopPropagation(); handlePhotoPaste(bid.id, e); }}
                      style={{ position: 'relative', height: 160, background: bid.photo ? 'none' : 'var(--color-neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', overflow: 'hidden' }}
                    >
                      {bid.photo
                        ? <img src={bid.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{ font: '500 11px/1 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-500)' }}>PASTE PHOTO</div>
                            <div style={{ font: '400 10px/1 var(--font-body)', color: 'var(--color-neutral-400)' }}>Ctrl+V / Cmd+V</div>
                          </div>
                      }
                      {/* status tag */}
                      <div style={{ position: 'absolute', top: 10, left: 10, background: col, color: '#fff', padding: '3px 8px', font: '700 10px/1 var(--font-body)', letterSpacing: '.1em' }}>{lbl}</div>
                      {/* edit/delete */}
                      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                        <button onClick={() => { setEditBid(bid); setDraft({ ...bid }); setShowUpload(true); }} style={{ padding: '4px 6px', background: 'rgba(32,30,29,.7)', border: 'none', color: '#fff', font: '600 9px/1 var(--font-body)', cursor: 'pointer', letterSpacing: '.08em' }}>EDIT</button>
                        <button onClick={() => setConfirmDelete(bid.id)} style={{ padding: '4px 6px', background: 'rgba(236,48,19,.8)', border: 'none', color: '#fff', font: '600 9px/1 var(--font-body)', cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>

                    {/* card body */}
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                      <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.14em', color: 'var(--color-accent)' }}>{bid.gc || 'GC TO BE CONFIRMED'}</div>
                      <div style={{ font: '800 15px/1.2 var(--font-heading)' }}>{bid.name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[['BID DATE', bid.bidDate || '—'], ['DRAWINGS', bid.level], ['LOCATION', bid.location || '—'], ['SCOPE', bid.scope || '—']].map(([l, v]) => (
                          <div key={l} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 6 }}>
                            <span style={{ font: '500 10px/1.4 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-600)' }}>{l}</span>
                            <span style={{ font: '400 11.5px/1.4 var(--font-body)' }}>{v}</span>
                          </div>
                        ))}
                        {bid.planRoom && <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 6 }}><span style={{ font: '500 10px/1.4 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-600)' }}>PLAN ROOM</span><a href={bid.planRoom} target="_blank" rel="noreferrer" style={{ font: '400 11.5px/1.4 var(--font-body)', color: 'var(--color-accent-700)', wordBreak: 'break-all' }}>Open ↗</a></div>}
                        {bid.notes && <div style={{ marginTop: 2, font: '400 11.5px/1.4 var(--font-body)', color: 'var(--color-neutral-700)', borderLeft: '2px solid var(--color-divider)', paddingLeft: 8 }}>{bid.notes}</div>}
                      </div>

                      {/* assignees */}
                      {bid.assignees.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
                          {bid.assignees.map(id => (
                            <div key={id} style={{ padding: '3px 8px', background: 'var(--color-neutral-200)', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', letterSpacing: '.06em' }}>{personName(id)}</div>
                          ))}
                        </div>
                      )}

                      {/* decline reason */}
                      {bid.status === 'declined' && bid.declineReason && (
                        <div style={{ font: '400 11px/1.5 var(--font-body)', color: 'var(--color-neutral-600)', borderLeft: '2px solid var(--color-accent)', paddingLeft: 8 }}>
                          {bid.declineReason}{bid.declineNote ? ' — ' + bid.declineNote : ''}
                        </div>
                      )}

                      {/* actions */}
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--color-divider)' }}>
                        {bid.status === 'pending' && <>
                          <button onClick={() => openAssign(bid.id)} style={{ flex: 1, padding: '9px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>ACCEPT</button>
                          <button onClick={() => { setDeclineFor(bid.id); setDeclineReason(DECLINE_REASONS[0]); setDeclineNote(''); }} style={{ flex: 1, padding: '9px', background: 'none', color: 'var(--color-text)', border: '1px solid var(--color-text)', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>DECLINE</button>
                        </>}
                        {bid.status === 'accepted' && (
                          <button onClick={() => openAssign(bid.id)} style={{ padding: '7px 12px', background: 'none', border: '1px solid var(--color-text)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>REASSIGN</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* BY ESTIMATOR VIEW */
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ font: '800 20px/1 var(--font-heading)' }}>Active assignments by estimator</div>
            <button onClick={exportEstimatorPdf} style={{ padding: '9px 16px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 13 }}>↓</span> EXPORT PDF
            </button>
          </div>
          {estimators.map(person => {
            const personBids = acceptedBids.filter(b => b.assignees.includes(person.id));
            if (!personBids.length) return null;
            const nextBid = personBids.slice().sort((a, b) => a.bidDate.localeCompare(b.bidDate))[0];
            return (
              <div key={person.id} style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10, paddingBottom: 8, borderBottom: '2px solid var(--color-text)' }}>
                  <div style={{ font: '800 15px/1 var(--font-heading)' }}>{person.name}</div>
                  <div style={{ font: '500 11px/1 var(--font-body)', color: 'var(--color-neutral-600)', letterSpacing: '.1em' }}>{person.role}</div>
                  <div style={{ marginLeft: 'auto', font: '600 11px/1 var(--font-body)', color: 'var(--color-neutral-600)' }}>{personBids.length} BID{personBids.length !== 1 ? 'S' : ''} · NEXT DUE {nextBid?.bidDate || '—'}</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', font: '400 12.5px/1 var(--font-body)' }}>
                  <thead>
                    <tr>
                      {['PROJECT', 'GC', 'BID DATE', 'SCOPE', 'DRAWINGS'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', font: '500 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', borderBottom: '1px solid var(--color-divider)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {personBids.map(bid => (
                      <tr key={bid.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                        <td style={{ padding: '10px', font: '600 13px/1 var(--font-body)' }}>{bid.name}</td>
                        <td style={{ padding: '10px', color: 'var(--color-neutral-700)' }}>{bid.gc}</td>
                        <td style={{ padding: '10px', font: '600 12px/1 var(--font-body)', color: 'var(--color-accent-700)' }}>{bid.bidDate}</td>
                        <td style={{ padding: '10px', color: 'var(--color-neutral-700)' }}>{bid.scope}</td>
                        <td style={{ padding: '10px', color: 'var(--color-neutral-700)' }}>{bid.level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {!estimators.some(p => acceptedBids.some(b => b.assignees.includes(p.id))) && (
            <div style={{ font: '500 14px/1.5 var(--font-body)', color: 'var(--color-neutral-600)' }}>No accepted bids yet.</div>
          )}
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {detailBid && (() => {
        const bid = detailBid;
        const col = BID_STATUS_COLOR[bid.status];
        const lbl = BID_STATUS_LABEL[bid.status];
        return (
          <div onClick={() => setDetailBid(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.6)', display: 'grid', placeItems: 'center', zIndex: 90 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 760, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* modal header */}
              <div style={{ padding: '14px 20px', borderBottom: '2px solid var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: '4px 10px', background: col, color: '#fff', font: '700 10px/1 var(--font-body)', letterSpacing: '.1em' }}>{lbl}</div>
                  <div style={{ font: '800 17px/1 var(--font-heading)' }}>{bid.name}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditBid(bid); setDraft({ ...bid }); setShowUpload(true); setDetailBid(null); }} style={{ padding: '7px 12px', background: 'none', border: '1px solid var(--color-text)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>EDIT</button>
                  <button onClick={() => setDetailBid(null)} style={{ padding: '7px 12px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>✕ CLOSE</button>
                </div>
              </div>
              {/* modal body */}
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', minHeight: 0 }}>
                {/* photo column */}
                <div style={{ width: 300, flexShrink: 0, borderRight: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column' }}>
                  <div
                    onPaste={e => handlePhotoPaste(bid.id, e)}
                    style={{ flex: 1, minHeight: 260, background: bid.photo ? 'none' : 'var(--color-neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
                  >
                    {bid.photo
                      ? <img src={bid.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24, textAlign: 'center' }}>
                          <div style={{ font: '300 32px/1', color: 'var(--color-neutral-400)' }}>⬜</div>
                          <div style={{ font: '600 11px/1.4 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-500)' }}>PASTE PHOTO HERE</div>
                          <div style={{ font: '400 10px/1.4 var(--font-body)', color: 'var(--color-neutral-400)' }}>Ctrl+V or Cmd+V to paste from clipboard</div>
                        </div>
                    }
                  </div>
                  {/* assignees under photo */}
                  {bid.assignees.length > 0 && (
                    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--color-divider)' }}>
                      <div style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', marginBottom: 8 }}>ASSIGNED TO</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {bid.assignees.map(id => (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, background: 'var(--color-text)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 9px/1 var(--font-body)', flexShrink: 0 }}>
                              {(PEOPLE.find(p => p.id === id)?.initials) || id.slice(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ font: '600 12px/1 var(--font-body)' }}>{personName(id)}</div>
                              <div style={{ font: '400 10px/1 var(--font-body)', color: 'var(--color-neutral-500)', marginTop: 2 }}>{PEOPLE.find(p => p.id === id)?.role || ''}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* info column */}
                <div style={{ flex: 1, overflow: 'auto', padding: '24px 24px' }}>
                  <div style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.14em', color: 'var(--color-accent)', marginBottom: 6 }}>{bid.gc || 'GC TO BE CONFIRMED'}</div>
                  <div style={{ font: '800 22px/1.2 var(--font-heading)', marginBottom: 20 }}>{bid.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    {[['BID DATE', bid.bidDate || '—'], ['DRAWING LEVEL', bid.level], ['LOCATION', bid.location || '—'], ['SCOPE', bid.scope || '—']].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', marginBottom: 5 }}>{l}</div>
                        <div style={{ font: '600 13px/1.4 var(--font-body)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {bid.planRoom && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', marginBottom: 5 }}>PLAN ROOM</div>
                      <a href={bid.planRoom} target="_blank" rel="noreferrer" style={{ font: '600 13px/1 var(--font-body)', color: 'var(--color-accent)', wordBreak: 'break-all' }}>Open plan room ↗</a>
                    </div>
                  )}
                  {bid.info && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', marginBottom: 8 }}>PROJECT INFO</div>
                      <div style={{ font: '400 12.5px/1.6 var(--font-body)', color: 'var(--color-neutral-800)', background: 'var(--color-neutral-100)', padding: '12px 14px', whiteSpace: 'pre-wrap' }}>{bid.info}</div>
                    </div>
                  )}
                  {bid.notes && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', marginBottom: 8 }}>INTERNAL NOTES</div>
                      <div style={{ font: '400 12.5px/1.6 var(--font-body)', borderLeft: '3px solid var(--color-accent)', paddingLeft: 12 }}>{bid.notes}</div>
                    </div>
                  )}
                  {bid.status === 'declined' && bid.declineReason && (
                    <div style={{ padding: '12px 14px', background: '#fff0ee', borderLeft: '3px solid var(--color-accent)' }}>
                      <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-accent)', marginBottom: 6 }}>DECLINED</div>
                      <div style={{ font: '400 12.5px/1.5 var(--font-body)' }}>{bid.declineReason}{bid.declineNote ? ' — ' + bid.declineNote : ''}</div>
                    </div>
                  )}
                  {/* actions */}
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-divider)', display: 'flex', gap: 10 }}>
                    {bid.status === 'pending' && <>
                      <button onClick={() => { openAssign(bid.id); setDetailBid(null); }} style={{ padding: '10px 20px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>ACCEPT BID</button>
                      <button onClick={() => { setDeclineFor(bid.id); setDeclineReason(DECLINE_REASONS[0]); setDeclineNote(''); setDetailBid(null); }} style={{ padding: '10px 20px', background: 'none', color: 'var(--color-text)', border: '1px solid var(--color-text)', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>DECLINE</button>
                    </>}
                    {bid.status === 'accepted' && (
                      <button onClick={() => { openAssign(bid.id); setDetailBid(null); }} style={{ padding: '10px 20px', background: 'none', color: 'var(--color-text)', border: '1px solid var(--color-text)', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>REASSIGN</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ASSIGN MODAL ── */}
      {assignFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.5)', display: 'grid', placeItems: 'center', zIndex: 90 }}>
          <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 500, maxWidth: '92vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--color-text)', font: '800 16px/1 var(--font-heading)' }}>ASSIGN ESTIMATOR{assignees.length > 1 ? 'S' : ''}</div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PEOPLE.filter(p => p.kind === 'estimator' || p.kind === 'manager').map(p => {
                const load = st.tasks.filter(t => t.who === p.id && t.status !== 'Complete').length;
                const on = assignees.includes(p.id);
                return (
                  <button key={p.id} onClick={() => setAssignees(prev => on ? prev.filter(x => x !== p.id) : [...prev, p.id])} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: '2px solid ' + (on ? 'var(--color-text)' : 'var(--color-divider)'), background: on ? 'var(--color-text)' : 'transparent', color: on ? '#fff' : 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 30, height: 30, background: on ? 'var(--color-accent)' : 'var(--color-neutral-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 10px/1 var(--font-body)', flexShrink: 0, color: on ? '#fff' : 'var(--color-text)' }}>{p.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ font: '700 13px/1 var(--font-heading)' }}>{p.name}</div>
                      <div style={{ font: '500 11px/1 var(--font-body)', opacity: .7, marginTop: 3 }}>{p.role}</div>
                    </div>
                    <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', opacity: .7 }}>{load} OPEN TASKS</div>
                  </button>
                );
              })}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', font: '600 12px/1 var(--font-body)' }}>
                <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
                Notify assignees by email
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button onClick={confirmAccept}>CONFIRM ACCEPT</Button>
                <Button variant="secondary" onClick={() => setAssignFor(null)}>CANCEL</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DECLINE MODAL ── */}
      {declineFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.5)', display: 'grid', placeItems: 'center', zIndex: 90 }}>
          <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 460, maxWidth: '92vw' }}>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--color-text)', font: '800 16px/1 var(--font-heading)' }}>DECLINE BID</div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="REASON">
                <select value={declineReason} onChange={e => setDeclineReason(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                  {DECLINE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="NOTE (OPTIONAL)">
                <textarea value={declineNote} onChange={e => setDeclineNote(e.target.value)} placeholder="Additional context for the record…" style={{ ...inp, minHeight: 72, resize: 'vertical' }} />
              </Field>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button onClick={confirmDecline}>CONFIRM DECLINE</Button>
                <Button variant="secondary" onClick={() => setDeclineFor(null)}>CANCEL</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD / EDIT MODAL ── */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.5)', display: 'grid', placeItems: 'center', zIndex: 90 }}>
          <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 580, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--color-text)', font: '800 16px/1 var(--font-heading)' }}>{editBid ? 'EDIT BID' : 'UPLOAD PROJECT'}</div>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* ITB paste */}
              <div style={{ background: 'var(--color-neutral-100)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.1em' }}>PASTE ITB EMAIL BODY — AUTO-FILL FIELDS</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea value={itbText} onChange={e => setItbText(e.target.value)} placeholder="Paste invitation to bid text here…" style={{ flex: 1, ...inp, minHeight: 56, resize: 'vertical', fontSize: 11 }} />
                  <button onClick={parseItb} style={{ padding: '8px 12px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', alignSelf: 'flex-start' }}>PARSE</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1/-1' }}><Field label="PROJECT NAME">
                  <input value={draft.name || ''} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={inp} autoFocus />
                </Field></div>
                <Field label="GENERAL CONTRACTOR">
                  <input value={draft.gc || ''} onChange={e => setDraft(d => ({ ...d, gc: e.target.value }))} style={inp} />
                </Field>
                <Field label="BID DATE">
                  <input value={draft.bidDate || ''} onChange={e => setDraft(d => ({ ...d, bidDate: e.target.value }))} placeholder="Sep 20" style={inp} />
                </Field>
                <Field label="DRAWING LEVEL">
                  <select value={draft.level || '100% CD'} onChange={e => setDraft(d => ({ ...d, level: e.target.value }))} style={{ ...inp, appearance: 'none' }}>
                    {BID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="LOCATION">
                  <input value={draft.location || ''} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} placeholder="City, ST" style={inp} />
                </Field>
                <div style={{ gridColumn: '1/-1' }}><Field label="SCOPE">
                  <input value={draft.scope || ''} onChange={e => setDraft(d => ({ ...d, scope: e.target.value }))} placeholder="e.g. Curtain wall & storefront" style={inp} />
                </Field></div>
                <div style={{ gridColumn: '1/-1' }}><Field label="PLAN ROOM URL">
                  <input value={draft.planRoom || ''} onChange={e => setDraft(d => ({ ...d, planRoom: e.target.value }))} placeholder="https://" style={inp} />
                </Field></div>
                <div style={{ gridColumn: '1/-1' }}><Field label="PROJECT INFO / ITB SUMMARY">
                  <textarea value={draft.info || ''} onChange={e => setDraft(d => ({ ...d, info: e.target.value }))} style={{ ...inp, minHeight: 72, resize: 'vertical' }} />
                </Field></div>
                <div style={{ gridColumn: '1/-1' }}><Field label="INTERNAL NOTES">
                  <textarea value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} style={{ ...inp, minHeight: 56, resize: 'vertical' }} />
                </Field></div>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '2px solid var(--color-text)', display: 'flex', gap: 10 }}>
              <Button onClick={saveDraft}>{editBid ? 'SAVE CHANGES' : 'ADD TO BOARD'}</Button>
              <Button variant="secondary" onClick={() => { setShowUpload(false); setEditBid(null); setDraft(emptyDraft()); setItbText(''); }}>CANCEL</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.5)', display: 'grid', placeItems: 'center', zIndex: 95 }}>
          <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 400, maxWidth: '92vw' }}>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--color-text)', font: '800 16px/1 var(--font-heading)' }}>REMOVE BID?</div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ font: '400 13.5px/1.5 var(--font-body)' }}>This removes <strong>{bids.find(b => b.id === confirmDelete)?.name}</strong> from the board permanently.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button onClick={() => { setSt(s => ({ ...s, bidProjects: s.bidProjects.filter(b => b.id !== confirmDelete) })); setConfirmDelete(null); flash('Bid removed'); }}>REMOVE</Button>
                <Button variant="secondary" onClick={() => setConfirmDelete(null)}>CANCEL</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (id: string) => void }) {
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  function doLogin() {
    const p = PEOPLE.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!p) { setError('That password does not match.'); return; }
    if (!pw) { setError('Enter your password.'); return; }
    onLogin(p.id);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 420px' }}>
      {/* left — dark brand panel */}
      <div style={{ padding: '52px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--color-text)', color: 'var(--color-neutral-100)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ font: '800 17px/1 var(--font-heading)', letterSpacing: '.02em' }}>1CG</div>
          <div style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.18em', color: 'var(--color-neutral-500)' }}>ESTIMATING PLATFORM</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: '22ch' }}>
          <div style={{ font: '800 clamp(34px,5vw,60px)/1.02 var(--font-heading)' }}>BIDS,{'\n'}TASKS{'\n'}AND THE{'\n'}PIPELINE{'\n'}IN ONE{'\n'}PLACE.</div>
          <div style={{ width: 72, height: 4, background: 'var(--color-accent)' }} />
        </div>
        <div style={{ font: '400 11.5px/1.6 var(--font-body)', color: 'var(--color-neutral-500)', maxWidth: '44ch' }}>Glass, glazing &amp; cladding — Division 08.</div>
      </div>

      {/* right — form panel */}
      <div style={{ padding: '52px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, borderLeft: '2px solid var(--color-text)', background: 'var(--color-bg)' }}>
        {mode === 'login' && <>
          <div>
            <div style={{ font: '800 26px/1.05 var(--font-heading)' }}>SIGN IN</div>
            <div style={{ ...T.meta, marginTop: 6 }}>Your work email and password.</div>
          </div>
          <Field label="GLASS1ST EMAIL">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="BlakeNicholson@Glass1st.net" style={inp} />
          </Field>
          <Field label="PASSWORD">
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="••••••••" style={inp} />
          </Field>
          {error && <div style={{ padding: '10px 12px', background: 'var(--color-accent-100)', borderLeft: '3px solid var(--color-accent)', font: '600 12px/1.45 var(--font-body)', color: 'var(--color-accent-800)' }}>{error}</div>}
          <Button onClick={doLogin} style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 16px' }}>SIGN IN</Button>
          <button onClick={() => setMode('forgot')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', font: '600 12px/1 var(--font-body)', letterSpacing: '.06em', color: 'var(--color-accent-700)', cursor: 'pointer', padding: 0 }}>Forgot your password?</button>
          <div style={{ ...T.micro, marginTop: 4 }}>First sign in sets your password on this device.</div>
        </>}
        {mode === 'forgot' && <>
          <div><div style={{ font: '800 26px/1.05 var(--font-heading)' }}>RESET PASSWORD</div><div style={{ ...T.meta, marginTop: 6 }}>We send a six-digit code to your Glass1st address.</div></div>
          <Field label="GLASS1ST EMAIL"><input value={email} onChange={e => setEmail(e.target.value)} style={inp} /></Field>
          <Button onClick={() => setMode('reset')} style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 16px' }}>SEND RESET CODE</Button>
          <button onClick={() => setMode('login')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', font: '600 12px/1 var(--font-body)', color: 'var(--color-accent-700)', cursor: 'pointer', padding: 0 }}>← Back to sign in</button>
        </>}
        {mode === 'reset' && <>
          <div><div style={{ font: '800 26px/1.05 var(--font-heading)' }}>NEW PASSWORD</div></div>
          <Field label="RESET CODE"><input placeholder="000000" style={{ ...inp, letterSpacing: '.2em', font: '600 16px/1 var(--font-body)' }} /></Field>
          <Field label="NEW PASSWORD"><input type="password" style={inp} /></Field>
          <Field label="CONFIRM PASSWORD"><input type="password" style={inp} /></Field>
          <Button onClick={() => setMode('login')} style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 16px' }}>SAVE NEW PASSWORD</Button>
        </>}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function MainApp({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const [st, setSt] = useState<AppState>(() => initState(userId));
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = PEOPLE.find(p => p.id === userId)!;
  const isManager = me.kind === 'exec' || me.kind === 'manager';
  const isExec = me.kind === 'exec';

  function flash(msg: string) {
    setSt(s => ({ ...s, toast: msg }));
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setSt(s => ({ ...s, toast: '' })), 2200);
  }
  function setTaskStatus(id: string, status: TaskStatus) {
    setSt(s => {
      const task = s.tasks.find(t => t.id === id);
      return {
        ...s,
        tasks: s.tasks.map(t => t.id === id ? { ...t, status } : t),
        // pin the current project so re-sorting allFocusProjs doesn't jump to a different job
        focusProjectId: s.focusProjectId ?? task?.projectId ?? null,
      };
    });
  }
  function addTaskNote(taskId: string, text: string) {
    const body = text.trim(); if (!body) return;
    setSt(s => ({ ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, notes: [...t.notes, { who: me.name, when: 'Just now', text: body }] } : t) }));
  }
  function raiseIssue(taskId: string, text: string) {
    const body = text.trim(); if (!body) { flash('Describe the issue first'); return; }
    const mgr = PEOPLE.find(p => p.id === me.mgr);
    setSt(s => ({
      ...s,
      issues: [...s.issues, { id: 'iss' + Date.now(), taskId, from: me.name, text: body, when: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), status: 'open', replies: [] }],
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, status: 'Awaiting Response' as TaskStatus, notes: [...t.notes, { who: me.name, when: 'Just now', text: 'ISSUE RAISED — ' + body }] } : t),
    }));
    flash('Issue raised' + (mgr ? ' to ' + mgr.first : ''));
  }
  function replyIssue(id: string, text: string) {
    const body = text.trim(); if (!body) { flash('Write a reply'); return; }
    setSt(s => {
      const iss = s.issues.find(i => i.id === id);
      return {
        ...s, replyFor: null,
        issues: s.issues.map(i => i.id === id ? { ...i, replies: [...i.replies, { who: me.name, when: 'Just now', text: body }] } : i),
        tasks: iss ? s.tasks.map(t => t.id === iss.taskId ? { ...t, notes: [...t.notes, { who: me.name, when: 'Just now', text: 'REPLY — ' + body }] } : t) : s.tasks,
      };
    });
    flash('Reply sent');
  }
  function addNewTask() {
    const d = st.newTaskDraft; if (!d.title.trim()) { flash('Enter a title'); return; }
    const dayOff: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };
    const wk = mondayOf(today0()); const dt = addDays(wk, dayOff[d.day] ?? 0); dt.setHours(0, 0, 0, 0);
    const nt: Task = { id: 'nt' + Date.now(), title: d.title.trim(), projectId: d.projectId, who: d.who || userId, status: 'To-Do', due: prettyShort(dt), day: d.day, date: ymd(dt), hrs: parseInt(d.hrs) || 2, detail: d.note, notes: [] };
    setSt(s => ({ ...s, tasks: [...s.tasks, nt], showNewTask: false, newTaskDraft: { ...s.newTaskDraft, title: '', note: '' } }));
    flash('Task created');
  }
  function closeOut(id: string) {
    setSt(s => ({ ...s, closedProjects: { ...s.closedProjects, [id]: prettyShort(new Date()) }, deals: { ...s.deals, [id]: { ...(s.deals[id] || {}), stage: 'Sold' } as Deal }, confirmClose: null }));
    flash((PROJECTS.find(p => p.id === id)?.short || id) + ' closed → CRM');
  }
  function logNote(projectId: string, text: string, tag: string) {
    const body = text.trim(); if (!body) { flash('Write the note first'); return; }
    const tagObj = NOTE_TAGS.find(t => t.id === tag) || NOTE_TAGS[0];
    const entry: ProjNote = { who: me.name, when: new Date().toLocaleDateString([], { month: 'short', day: '2-digit' }) + ' · ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), text: body, tag, label: tagObj.label };
    setSt(s => ({ ...s, projNotes: { ...s.projNotes, [projectId]: [...(s.projNotes[projectId] || []), entry] } }));
    return true;
  }
  function addRevision() {
    const d = st.revDraft; const id = st.dealId;
    if (!num(d.price)) { flash('Enter the sell price'); return; }
    if (!num(d.cost)) { flash('Cost is required — a revision must carry a real GP'); return; }
    const revList = st.revisions[id] || [];
    const rev = 'R' + revList.length;
    const when = new Date().toLocaleString([], { month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' });
    const entry: Revision = { rev, label: d.label.trim() || 'Revision', price: String(num(d.price)), cost: String(num(d.cost)), when, who: me.name, note: d.note.trim() };
    setSt(s => ({ ...s, revisions: { ...s.revisions, [id]: [...(s.revisions[id] || []), entry] }, revDraft: { label: '', price: '', cost: '', note: '' }, deals: { ...s.deals, [id]: { ...s.deals[id], price: entry.price, cost: entry.cost } as Deal } }));
    flash(rev + ' logged · ' + money(num(entry.price)));
  }
  function addFollowUp() {
    if (!st.followDate) { flash('Pick a date'); return; }
    const id = st.dealId;
    const entry: FollowUp = { id: 'fu' + Date.now(), date: st.followDate, note: st.followNote, by: me.name, done: false };
    setSt(s => ({ ...s, followDate: '', followNote: '', followUps: { ...s.followUps, [id]: [...(s.followUps[id] || []), entry] } }));
    flash('Follow-up set for ' + st.followDate);
  }
  function saveQuickNote() {
    const ok = logNote(st.quickNote.projectId, st.quickNote.text, st.quickNote.tag);
    if (ok) setSt(s => ({ ...s, showQuickNote: false, quickNote: { ...s.quickNote, text: '' } }));
  }
  function startDictate() {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) { flash('Speech recognition not available'); return; }
    const rec = new Ctor(); rec.lang = 'en-US'; rec.interimResults = false;
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setSt(s => ({ ...s, quickNote: { ...s.quickNote, text: (s.quickNote.text + ' ' + t).trim() }, listening: false })); };
    rec.onerror = () => { setSt(s => ({ ...s, listening: false })); flash('Could not start mic'); };
    rec.onend = () => setSt(s => ({ ...s, listening: false }));
    try { rec.start(); setSt(s => ({ ...s, listening: true })); flash('Listening…'); } catch { setSt(s => ({ ...s, listening: false })); }
  }

  function visibleProjects() {
    const closed = st.closedProjects;
    if (isManager) return PROJECTS.filter(p => !closed[p.id]);
    const mine = new Set(st.tasks.filter(t => t.who === userId).map(t => t.projectId));
    return PROJECTS.filter(p => mine.has(p.id) && !closed[p.id]);
  }
  function teamOf(): Person[] {
    if (isExec) return PEOPLE.filter(p => p.kind !== 'exec');
    if (isManager) return PEOPLE.filter(p => p.mgr === userId);
    return [me];
  }
  function effStage(id: string): CrmStage {
    if (st.closedProjects[id]) return 'Sold';
    const d = st.deals[id];
    const manual: CrmStage[] = ['Feeling Good', 'Neutral', 'At Risk', 'Sold', 'Lost', 'No bid'];
    if (d && manual.includes(d.stage)) return d.stage;
    return st.tasks.some(t => t.projectId === id && t.status !== 'Complete') ? 'Bidding' : 'Neutral';
  }

  const projects = visibleProjects();
  const openIssues = st.issues.filter(i => i.status === 'open');
  const followCount = Object.values(st.followUps).reduce((a, fus) => a + fus.filter(fu => !fu.done).length, 0);
  const mgrPerson = PEOPLE.find(p => p.id === me.mgr);

  const allFocusProjs = projects.map(p => {
    const ts = st.tasks.filter(t => t.projectId === p.id && (isManager || t.who === userId));
    if (!ts.length) return null;
    const override = st.projStatusOverride[p.id] as OverrideKey | undefined;
    const meta = override ? OVERRIDE_META[override] : null;
    const k: StatusKey = meta ? meta.statusKey : projStatusKey(ts);
    const displayColor = meta ? meta.color : STATUS[k];
    const displayLabel = meta ? meta.label : projStatusWord(k);
    return { id: p.id, key: k, override: override || null, displayColor, displayLabel, rank: k === 'urgent' ? 0 : k === 'awaiting' ? 1 : k === 'good' ? 2 : 3 };
  }).filter((x): x is NonNullable<typeof x> => x !== null).sort((a, b) => a.rank - b.rank);
  const focusId = st.focusProjectId || allFocusProjs[0]?.id || projects[0]?.id || null;
  const focusProject = projects.find(p => p.id === focusId);
  const focusTasks = st.tasks.filter(t => t.projectId === focusId);
  const openTask = st.openTaskId ? st.tasks.find(t => t.id === st.openTaskId) : undefined;

  function setDeal(id: string, patch: Partial<Deal>) {
    setSt(s => ({ ...s, deals: { ...s.deals, [id]: { ...(s.deals[id] || {}), ...patch } as Deal } }));
  }

  const navItems: Array<[View, string, number]> = isManager
    ? [['myday', 'My day', st.tasks.filter(t => t.who === userId && t.status !== 'Complete').length],
      ['overview', 'Management overview', st.tasks.filter(t => t.status !== 'Complete' && teamOf().some(p => p.id === t.who)).length],
      ['calendar', 'Calendar', 0], ['capacity', 'Capacity', 0],
      ['projects', 'Projects', projects.length]]
    : [['myday', 'My day', st.tasks.filter(t => t.who === userId && t.status !== 'Complete').length],
      ['calendar', 'Calendar', 0], ['projects', 'Projects', projects.length],
      ['capacity', 'My capacity', 0]];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>
      {/* ── top tab strip ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: 38, background: 'var(--color-text)', flexShrink: 0, zIndex: 50 }}>
        {(['board', 'tracker', 'crm'] as AppTab[]).map(a => (
          <button key={a} onClick={() => setSt(s => ({ ...s, app: a }))} style={{ padding: '0 22px', border: 'none', cursor: 'pointer', background: st.app === a ? 'var(--color-accent)' : 'transparent', color: '#fff', font: '600 11px/1 var(--font-body)', letterSpacing: '.12em' }}>
            {a === 'board' ? 'BID BOARD' : a === 'tracker' ? 'TASK TRACKER' : 'CRM'}
          </button>
        ))}
      </div>

      {st.app === 'board' ? (
        <BidBoardView st={st} setSt={setSt} me={me} flash={flash} onSignOut={onSignOut} />
      ) : st.app === 'tracker' ? (
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', height: 'calc(100vh - 38px)' }}>
          {/* ── sidebar ── */}
          <div style={{ width: 240, flexShrink: 0, borderRight: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column', background: 'var(--color-neutral-100)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--color-divider)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, background: 'var(--color-accent)', flexShrink: 0 }} />
                <div>
                  <div style={{ font: '800 14px/1 var(--font-heading)' }}>1CG</div>
                  <div style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.14em', color: 'var(--color-neutral-600)', marginTop: 3 }}>TASK TRACKER</div>
                </div>
              </div>
              <div style={{ marginTop: 10, font: '800 13px/1.2 var(--font-heading)' }}>{me.name}</div>
              <div style={{ font: '500 10.5px/1 var(--font-body)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent-700)', marginTop: 2 }}>{me.role}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {navItems.map(([v, label, count]) => (
                <button key={v} onClick={() => setSt(s => ({ ...s, view: v }))} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '13px 18px', background: st.view === v ? 'var(--color-text)' : 'transparent', color: st.view === v ? 'var(--color-neutral-100)' : 'var(--color-text)', border: 'none', borderBottom: '1px solid var(--color-divider)', font: '600 12.5px/1 var(--font-body)', textAlign: 'left', cursor: 'pointer' }}>
                  <span>{label}</span>
                  {count > 0 && <span style={{ font: '600 11px/1 var(--font-body)', opacity: .7 }}>{count}</span>}
                </button>
              ))}
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '2px solid var(--color-text)', flexShrink: 0 }}>
              <div style={{ ...T.label, marginBottom: 2 }}>QUICK ADD</div>
              <button onClick={() => setSt(s => ({ ...s, showNewTask: true, newTaskSelfOnly: !isManager }))} style={{ width: '100%', padding: '10px 14px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '600 12px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', textAlign: 'left' }}>+ NEW TASK</button>
              <button onClick={() => setSt(s => ({ ...s, showQuickNote: true }))} style={{ width: '100%', padding: '10px 14px', background: 'none', border: '1px solid var(--color-text)', font: '600 12px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', textAlign: 'left' }}>+ QUICK NOTE</button>
            </div>
          </div>

          {/* ── main content ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            {/* issue alert banner */}
            {isManager && (openIssues.length > 0 || st.helpRequests.filter(h => !h.read).length > 0) && (
              <button onClick={() => setSt(s => ({ ...s, showIssues: openIssues.length > 0, view: s.view === 'overview' ? s.view : s.helpRequests.filter(h=>!h.read).length > 0 ? 'overview' : s.view }))} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 28px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderBottom: '2px solid var(--color-text)', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ width: 7, height: 7, background: '#fff', display: 'inline-block' }} />
                <span style={{ font: '600 11.5px/1 var(--font-body)', letterSpacing: '.12em' }}>
                  {[openIssues.length > 0 && `${openIssues.length} ISSUE${openIssues.length > 1 ? 'S' : ''}`, st.helpRequests.filter(h=>!h.read).length > 0 && `${st.helpRequests.filter(h=>!h.read).length} HELP REQUEST${st.helpRequests.filter(h=>!h.read).length > 1 ? 'S' : ''}`].filter(Boolean).join(' · ')} — GO TO MANAGEMENT OVERVIEW
                </span>
              </button>
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              {st.view === 'myday' && <MyDayView st={st} setSt={setSt} me={me} isManager={isManager} onSignOut={onSignOut} focusId={focusId} focusProject={focusProject} focusTasks={focusTasks} allFocusProjs={allFocusProjs} projects={projects} setTaskStatus={setTaskStatus} flash={flash} />}
              {st.view === 'overview' && isManager && <OverviewView st={st} setSt={setSt} me={me} isExec={isExec} onSignOut={onSignOut} projects={projects} setTaskStatus={setTaskStatus} flash={flash} openIssues={openIssues} />}
              {st.view === 'calendar' && <CalendarView st={st} setSt={setSt} me={me} isManager={isManager} onSignOut={onSignOut} flash={flash} />}
              {st.view === 'capacity' && <CapacityView st={st} setSt={setSt} me={me} isManager={isManager} team={teamOf()} onSignOut={onSignOut} />}
              {st.view === 'projects' && <ProjectsView st={st} setSt={setSt} me={me} isManager={isManager} projects={projects} setTaskStatus={setTaskStatus} flash={flash} logNote={logNote} onSignOut={onSignOut} />}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', height: 'calc(100vh - 38px)' }}>
          <CrmSection st={st} setSt={setSt} me={me} projects={PROJECTS} effStage={effStage} addRevision={addRevision} addFollowUp={addFollowUp} flash={flash} followCount={followCount} setDeal={setDeal} logNote={logNote} />
        </div>
      ) }

      {/* ── task panel ── */}
      {openTask && <TaskPanel task={openTask} me={me} isManager={isManager} st={st} setSt={setSt} setTaskStatus={setTaskStatus} addTaskNote={addTaskNote} raiseIssue={raiseIssue} mgrPerson={mgrPerson} />}

      {/* ── issues tray ── */}
      {st.showIssues && <IssuesTray st={st} setSt={setSt} me={me} replyIssue={replyIssue} setTaskStatus={setTaskStatus} />}

      {/* ── new task modal ── */}
      {st.showNewTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.45)', display: 'grid', placeItems: 'center', zIndex: 70 }}>
          <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 520, maxWidth: '92vw', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--color-text)', font: '800 16px/1 var(--font-heading)' }}>NEW TASK</div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="TASK"><input value={st.newTaskDraft.title} onChange={e => setSt(s => ({ ...s, newTaskDraft: { ...s.newTaskDraft, title: e.target.value } }))} placeholder="e.g. Price interior glazing package" style={inp} autoFocus /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="PROJECT">
                  <select value={st.newTaskDraft.projectId} onChange={e => setSt(s => ({ ...s, newTaskDraft: { ...s.newTaskDraft, projectId: e.target.value } }))} style={{ ...inp, appearance: 'none' }}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.short || p.name}</option>)}
                  </select>
                </Field>
                <Field label="OWNER">
                  <select value={st.newTaskDraft.who} onChange={e => setSt(s => ({ ...s, newTaskDraft: { ...s.newTaskDraft, who: e.target.value } }))} style={{ ...inp, appearance: 'none' }}>
                    {(st.newTaskSelfOnly || !isManager ? [me] : teamOf()).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="DAY">
                  <select value={st.newTaskDraft.day} onChange={e => setSt(s => ({ ...s, newTaskDraft: { ...s.newTaskDraft, day: e.target.value } }))} style={{ ...inp, appearance: 'none' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="HOURS"><input value={st.newTaskDraft.hrs} onChange={e => setSt(s => ({ ...s, newTaskDraft: { ...s.newTaskDraft, hrs: e.target.value } }))} style={inp} /></Field>
              </div>
              <Field label="FIRST NOTE · OPTIONAL"><textarea value={st.newTaskDraft.note} onChange={e => setSt(s => ({ ...s, newTaskDraft: { ...s.newTaskDraft, note: e.target.value } }))} placeholder="Context for whoever picks this up…" style={{ ...inp, minHeight: 68, resize: 'vertical' }} /></Field>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button onClick={addNewTask}>CREATE TASK</Button>
                <Button variant="secondary" onClick={() => setSt(s => ({ ...s, showNewTask: false, newTaskSelfOnly: false }))}>CANCEL</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── quick note modal ── */}
      {st.showQuickNote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 75, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setSt(s => ({ ...s, showQuickNote: false }))} style={{ position: 'absolute', inset: 0, background: 'rgba(32,30,29,.4)' }} />
          <div style={{ position: 'relative', width: 520, maxWidth: '92vw', background: 'var(--color-bg)', border: '2px solid var(--color-text)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--color-text)', font: '800 16px/1 var(--font-heading)' }}>QUICK NOTE</div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="JOB">
                <select value={st.quickNote.projectId} onChange={e => setSt(s => ({ ...s, quickNote: { ...s.quickNote, projectId: e.target.value } }))} style={{ ...inp, appearance: 'none' }}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.short || p.name}</option>)}
                </select>
              </Field>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ ...T.label, letterSpacing: '.12em' }}>KIND OF NOTE</span>
                <Seg value={st.quickNote.tag} onChange={v => setSt(s => ({ ...s, quickNote: { ...s.quickNote, tag: v } }))} options={NOTE_TAGS.map(t => ({ value: t.id, label: t.label }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ ...T.label, letterSpacing: '.12em' }}>NOTE</span>
                  <button onClick={startDictate} style={{ padding: '5px 9px', background: 'none', border: '1px solid var(--color-divider)', font: '600 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', color: st.listening ? 'var(--color-accent)' : 'var(--color-neutral-700)' }}>{st.listening ? '● LISTENING…' : '🎤 DICTATE'}</button>
                </div>
                <textarea value={st.quickNote.text} onChange={e => setSt(s => ({ ...s, quickNote: { ...s.quickNote, text: e.target.value } }))} placeholder="Type it, hit a snippet, or use the mic…" style={{ ...inp, minHeight: 110, resize: 'vertical' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={T.micro}>SNIPPETS</span>
                  {NOTE_TAGS.map(t => <button key={t.id} onClick={() => setSt(s => ({ ...s, quickNote: { ...s.quickNote, text: (s.quickNote.text ? s.quickNote.text + ' ' : '') + t.snippet } }))} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10.5px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', color: 'var(--color-accent-700)' }}>+ {t.label}</button>)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button onClick={saveQuickNote}>SAVE TO JOB</Button>
                <Button variant="secondary" onClick={() => setSt(s => ({ ...s, showQuickNote: false }))}>CANCEL</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── close confirm ── */}
      {st.confirmClose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.45)', display: 'grid', placeItems: 'center', zIndex: 85 }}>
          <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 440, maxWidth: '92vw' }}>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--color-text)', font: '800 17px/1 var(--font-heading)' }}>CLOSE OUT THIS BID?</div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={T.body}>This moves <strong>{PROJECTS.find(p => p.id === st.confirmClose)?.short}</strong> to the CRM. This cannot be undone.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button onClick={() => closeOut(st.confirmClose!)}>CLOSE OUT</Button>
                <Button variant="secondary" onClick={() => setSt(s => ({ ...s, confirmClose: null }))}>CANCEL</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── toast ── */}
      {st.toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--color-text)', color: 'var(--color-neutral-100)', padding: '10px 18px', font: '500 13px/1.4 var(--font-body)', boxShadow: 'var(--shadow-md)', zIndex: 2000, pointerEvents: 'none' }}>{st.toast}</div>}
    </div>
  );
}

// ─── ViewHeader ────────────────────────────────────────────────────────────────
function ViewHeader({ title, sub, me, onSignOut, right }: { title: string; sub?: string; me: Person; onSignOut: () => void; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, padding: '14px 28px', borderBottom: '2px solid var(--color-text)', flexShrink: 0, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div style={T.pageTitle}>{title}</div>
        {sub && <div style={T.meta}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {right}
        <span style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-600)' }}>{me.name.toUpperCase()} · {me.role.toUpperCase()}</span>
        <button onClick={onSignOut} style={{ padding: '5px 8px', background: 'none', border: '1px solid var(--color-neutral-500)', font: '600 10.5px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>SIGN OUT</button>
      </div>
    </div>
  );
}

// ─── My Day ────────────────────────────────────────────────────────────────────
function MyDayView({ st, setSt, me, isManager, onSignOut, focusId, focusProject, focusTasks, allFocusProjs, projects, setTaskStatus, flash }: {
  st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; isManager: boolean; onSignOut: () => void;
  focusId: string | null; focusProject: Project | undefined; focusTasks: Task[];
  allFocusProjs: Array<{ id: string; key: StatusKey; override: OverrideKey | null; displayColor: string; displayLabel: string; rank: number }>; projects: Project[];
  setTaskStatus: (id: string, s: TaskStatus) => void; flash: (m: string) => void;
}) {
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const t0 = today0(); const wkStart = mondayOf(t0);
  const weekBars = WEEKDAY_LABELS.map((d, i) => {
    const date = addDays(wkStart, i); const key = ymd(date);
    const tasks = st.tasks.filter(t => t.who === me.id && t.date === key && t.status !== 'Complete');
    const hrs = tasks.reduce((a, t) => a + t.hrs, 0);
    return { d, hrs, date, isToday: key === ymd(t0), tasks };
  });
  const maxHrs = Math.max(...weekBars.map(b => b.hrs), 8);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const fkRow = allFocusProjs.find(r => r.id === focusId);
  const statusK: StatusKey = fkRow?.key || 'idle';
  const openTasks = focusTasks.filter(t => t.status !== 'Complete');
  const totalHrs = openTasks.reduce((a, t) => a + t.hrs, 0);

  const weekLabel = 'WEEK OF ' + prettyShort(wkStart).toUpperCase();
  const dateLabel = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

  const STATUSES: TaskStatus[] = ['To-Do', 'In Progress', 'Awaiting Response', 'Complete'];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <ViewHeader title="My day" sub={'What\'s on you today, ' + me.first} me={me} onSignOut={onSignOut} />
      {/* mode row */}
      <div style={{ padding: '10px 28px', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Seg value={st.myDayMode} onChange={v => setSt(s => ({ ...s, myDayMode: v }))} options={[{ value: 'focus', label: 'FOCUS' }, { value: 'columns', label: 'COLUMNS' }]} />
        <span style={{ ...T.micro }}>{dateLabel} · {weekLabel}</span>
      </div>

      {st.myDayMode === 'focus' ? (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', minHeight: 0, overflow: 'hidden' }}>
          {/* left: task list */}
          <div style={{ overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid var(--color-divider)' }}>
            {!focusProject ? (
              <div style={{ paddingTop: 32 }}>
                <div style={{ font: '800 20px/1.15 var(--font-heading)' }}>NO BIDS ASSIGNED YET</div>
                <div style={{ ...T.body, marginTop: 10, maxWidth: '52ch' }}>When your manager assigns a bid, it lands here with its tasks already scheduled.</div>
              </div>
            ) : (
              <>
                {/* project header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <StatusLight status={statusK} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: '800 20px/1.1 var(--font-heading)', textWrap: 'pretty' }}>{focusProject.name}</div>
                      <div style={{ ...T.micro, marginTop: 4 }}>{focusProject.ref} · bid due {focusProject.bidDue} · {openTasks.length} open · {totalHrs} h remaining</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Button variant="secondary" size="sm" onClick={() => setSt(s => ({ ...s, view: 'projects', projectId: focusId! }))}>OPEN PROJECT</Button>
                    {!isManager && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        const proj = PROJECTS.find(p => p.id === focusId);
                        setSt(s => ({
                          ...s,
                          helpRequests: [...s.helpRequests, { id: 'hr' + Date.now(), from: me.id, fromName: me.name, projectId: focusId!, when: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), read: false }],
                        }));
                        flash('Help request sent to ' + (PEOPLE.find(p => p.id === me.mgr)?.first || 'your manager'));
                      }}>ASK FOR HELP</Button>
                    )}
                    <Button size="sm" onClick={() => setSt(s => ({ ...s, showNewTask: true, newTaskSelfOnly: true, newTaskDraft: { ...s.newTaskDraft, projectId: focusId!, who: me.id } }))}>ADD TASK</Button>
                  </div>
                </div>
                {/* tasks */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 0 }}>
                    <div style={{ font: '800 14px/1 var(--font-heading)' }}>TASKS ON {(focusProject.short || focusProject.name).toUpperCase()}</div>
                    <div style={T.micro}>{focusTasks.length} total</div>
                  </div>
                  <div style={{ borderTop: '2px solid var(--color-text)', marginTop: 10 }}>
                    {focusTasks.map(t => {
                      const done = t.status === 'Complete';
                      const lastNote = t.notes.length ? t.notes[t.notes.length - 1].text : '';
                      return (
                        <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 90px', alignItems: 'start', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--color-divider)' }}>
                          <button onClick={() => setTaskStatus(t.id, done ? 'To-Do' : 'Complete')} style={{ width: 20, height: 20, marginTop: 2, border: '2px solid ' + (done ? STATUS.good : 'var(--color-divider)'), background: done ? STATUS.good : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                            {done && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                          </button>
                          <button onClick={() => setSt(s => ({ ...s, openTaskId: t.id }))} style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, padding: 0 }}>
                            <span style={{ font: '600 13.5px/1.3 var(--font-body)', textDecoration: done ? 'line-through' : 'none', opacity: done ? .55 : 1 }}>{t.title}</span>
                            <span style={T.micro}>· {t.status} · {personFirst(t.who)} · {t.hrs}h</span>
                            {lastNote && <span style={{ ...T.meta, marginTop: 1 }}>{lastNote.slice(0, 80)}{lastNote.length > 80 ? '…' : ''}</span>}
                          </button>
                          <button onClick={() => setSt(s => ({ ...s, openTaskId: t.id }))} style={{ padding: '5px 8px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10.5px/1 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-accent-700)', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t.notes.length ? t.notes.length + ' NOTES' : '+ NOTE'}</button>
                          <span style={{ font: '600 13px/1 var(--font-body)', color: dueColor(t), textAlign: 'right' }}>{t.due}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* right: MY WEEK + IN FOCUS */}
          <div style={{ overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 22, background: 'var(--color-neutral-100)' }}>
            <div>
              <div style={{ font: '800 14px/1 var(--font-heading)', marginBottom: 14 }}>MY WEEK</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, alignItems: 'end', height: 110 }}>
                {weekBars.map((b, i) => (
                  <div key={b.d} onMouseEnter={() => setHoverDay(i)} onMouseLeave={() => setHoverDay(null)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: b.hrs ? (b.hrs / maxHrs * 90) + '%' : '3px', minHeight: '3px', background: b.isToday ? 'var(--color-accent)' : 'var(--color-text)' }} />
                    </div>
                    <div style={{ font: '500 10.5px/1 var(--font-body)', letterSpacing: '.08em', color: b.isToday ? 'var(--color-accent)' : 'var(--color-neutral-600)', textAlign: 'center' }}>{b.d}</div>
                    <div style={{ font: '600 12px/1 var(--font-body)', textAlign: 'center' }}>{b.hrs ? b.hrs + 'h' : '—'}</div>
                  </div>
                ))}
              </div>
              {/* tooltip rendered BELOW the bar grid, inside the scrollable panel */}
              {hoverDay !== null && (() => {
                const b = weekBars[hoverDay];
                const anchorRight = hoverDay >= 3;
                return (
                  <div style={{ position: 'relative', height: 0, zIndex: 20 }}>
                    <div style={{ position: 'absolute', top: 4, ...(anchorRight ? { right: 0 } : { left: hoverDay * (100 / 5) + '%' }), minWidth: 230, maxWidth: 280, border: '1px solid var(--color-text)', background: 'var(--color-bg)', boxShadow: 'var(--shadow-lg)', maxHeight: 260, overflowY: 'auto' }}>
                      <div style={{ padding: '7px 10px', background: 'var(--color-text)', color: 'var(--color-neutral-100)', font: '600 10.5px/1 var(--font-body)', letterSpacing: '.12em', position: 'sticky', top: 0 }}>{b.d} · {b.hrs ? b.hrs + 'H PLANNED' : 'CLEAR'}</div>
                      {b.tasks.length === 0
                        ? <div style={{ padding: '10px', ...T.meta }}>Nothing scheduled.</div>
                        : b.tasks.map(t => {
                            const k: StatusKey = t.status === 'Complete' ? 'good' : t.status === 'Awaiting Response' ? 'awaiting' : t.status === 'In Progress' ? 'urgent' : 'idle';
                            return (
                              <button key={t.id} onClick={() => setSt(s => ({ ...s, openTaskId: t.id }))} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', borderBottom: '1px solid var(--color-divider)', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ width: 8, height: 8, flexShrink: 0, background: STATUS[k], marginTop: 3 }} />
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                                  <span style={{ font: '600 12px/1.25 var(--font-body)' }}>{t.title}</span>
                                  <span style={T.micro}>{PROJECTS.find(p => p.id === t.projectId)?.short} · {t.hrs}h · {statusShort(t.status)}</span>
                                </span>
                              </button>
                            );
                          })
                      }
                    </div>
                  </div>
                );
              })()}
            </div>
            <Rule strong />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ font: '800 14px/1 var(--font-heading)' }}>IN FOCUS</div>
                <span style={T.micro}>HOVER TO EXPAND</span>
              </div>
              <div style={{ borderTop: '2px solid var(--color-text)' }}>
                {allFocusProjs.length === 0 && <div style={{ ...T.meta, padding: '16px 0' }}>No active bids assigned.</div>}
                {allFocusProjs.map(row => {
                  const proj = PROJECTS.find(p => p.id === row.id)!;
                  const selected = row.id === focusId;
                  const current = row.override as OverrideKey | null;
                  return (
                    <div key={row.id} style={{ borderBottom: '1px solid var(--color-divider)', borderLeft: selected ? '3px solid var(--color-text)' : '3px solid transparent' }}>
                      <button onClick={() => setSt(s => ({ ...s, focusProjectId: row.id }))} style={{ width: '100%', textAlign: 'left', padding: '10px 8px', background: selected ? 'var(--color-bg)' : 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
                        {/* custom dot using override color */}
                        <span style={{ width: 9, height: 9, flexShrink: 0, background: row.displayColor }} />
                        <span style={{ font: '600 13px/1 var(--font-body)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.short || proj.name}</span>
                        <span style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.1em', color: row.displayColor, flexShrink: 0 }}>{row.displayLabel}</span>
                      </button>
                      {selected && (
                        <div style={{ display: 'flex', borderTop: '1px solid var(--color-divider)' }}>
                          {(Object.entries(OVERRIDE_META) as Array<[OverrideKey, typeof OVERRIDE_META[OverrideKey]]>).map(([key, meta]) => {
                            const active = current === key;
                            return (
                              <button
                                key={key}
                                onClick={() => setSt(s => ({
                                  ...s,
                                  focusProjectId: s.focusProjectId ?? row.id,
                                  projStatusOverride: active
                                    ? (({ [row.id]: _, ...rest }) => rest)(s.projStatusOverride)
                                    : { ...s.projStatusOverride, [row.id]: key },
                                }))}
                                style={{ flex: 1, padding: '7px 4px', border: 'none', borderRight: '1px solid var(--color-divider)', background: active ? meta.color : 'var(--color-neutral-200)', color: active ? '#fff' : 'var(--color-neutral-600)', font: '600 9px/1.3 var(--font-body)', letterSpacing: '.07em', cursor: 'pointer', textAlign: 'center' }}
                              >
                                {meta.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* COLUMNS mode */
        <KanbanColumns focusProject={focusProject} focusTasks={focusTasks} openTasks={openTasks} STATUSES={STATUSES} setSt={setSt} setTaskStatus={setTaskStatus} />
      )}
    </div>
  );
}

// ─── Kanban Columns ────────────────────────────────────────────────────────────
const STATUS_ORDER: TaskStatus[] = ['To-Do', 'In Progress', 'Awaiting Response', 'Complete'];

function KanbanColumns({ focusProject, focusTasks, openTasks, STATUSES, setSt, setTaskStatus }: {
  focusProject: Project | undefined; focusTasks: Task[]; openTasks: Task[];
  STATUSES: TaskStatus[]; setSt: React.Dispatch<React.SetStateAction<AppState>>;
  setTaskStatus: (id: string, s: TaskStatus) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  function colBg(col: TaskStatus) {
    return col === 'In Progress' ? 'var(--color-accent)' : col === 'Awaiting Response' ? STATUS.awaiting : col === 'Complete' ? STATUS.good : 'var(--color-neutral-800)';
  }
  function prevStatus(col: TaskStatus): TaskStatus | null {
    const i = STATUS_ORDER.indexOf(col); return i > 0 ? STATUS_ORDER[i - 1] : null;
  }
  function nextStatus(col: TaskStatus): TaskStatus | null {
    const i = STATUS_ORDER.indexOf(col); return i < STATUS_ORDER.length - 1 ? STATUS_ORDER[i + 1] : null;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 28px', borderBottom: '1px solid var(--color-divider)', flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ font: '800 13.5px/1 var(--font-heading)' }}>{focusProject?.short || focusProject?.name || 'No project'}</span>
        <span style={T.micro}>{openTasks.length} open · drag cards or use ← → buttons · selected in IN FOCUS</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
        {STATUSES.map(col => {
          const colTasks = focusTasks.filter(t => t.status === col);
          const isOver = dragOver === col;
          const prev = prevStatus(col);
          const next = nextStatus(col);
          return (
            <div
              key={col}
              onDragOver={e => { e.preventDefault(); setDragOver(col); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                e.preventDefault();
                const id = e.dataTransfer.getData('taskId');
                if (id) setTaskStatus(id, col);
                setDragging(null); setDragOver(null);
              }}
              style={{ borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', background: isOver ? 'color-mix(in srgb, var(--color-neutral-300) 60%, transparent)' : 'transparent', transition: 'background .12s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '2px solid var(--color-text)', background: colBg(col), color: '#fff' }}>
                <span style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.12em' }}>{statusShort(col)}</span>
                <span style={{ font: '800 14px/1 var(--font-heading)' }}>{colTasks.length}</span>
              </div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {colTasks.map(t => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('taskId', t.id); setDragging(t.id); }}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    style={{ border: '1px solid var(--color-divider)', background: dragging === t.id ? 'var(--color-neutral-300)' : 'var(--color-neutral-100)', cursor: 'grab', opacity: dragging === t.id ? .5 : 1 }}
                  >
                    <button onClick={() => setSt(s => ({ ...s, openTaskId: t.id }))} style={{ width: '100%', textAlign: 'left', padding: '11px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ font: '600 13px/1.3 var(--font-body)' }}>{t.title}</span>
                      <span style={T.micro}>{PROJECTS.find(p => p.id === t.projectId)?.short} · {t.due}</span>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderTop: '1px solid var(--color-divider)', gap: 4 }}>
                      <span style={T.micro}>{t.notes.length} notes</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {prev && (
                          <button onClick={() => setTaskStatus(t.id, prev)} title={'Move to ' + prev} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', cursor: 'pointer', color: 'var(--color-neutral-700)' }}>←</button>
                        )}
                        {next && (
                          <button onClick={() => setTaskStatus(t.id, next)} title={'Move to ' + next} style={{ padding: '4px 8px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', cursor: 'pointer', color: 'var(--color-accent-700)' }}>→</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isOver && colTasks.length === 0 && (
                  <div style={{ border: '2px dashed var(--color-neutral-400)', padding: '20px 12px', textAlign: 'center', ...T.micro }}>DROP HERE</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Management Overview ───────────────────────────────────────────────────────
function OverviewView({ st, setSt, me, isExec, onSignOut, projects, setTaskStatus, flash, openIssues }: {
  st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; isExec: boolean; onSignOut: () => void;
  projects: Project[]; setTaskStatus: (id: string, s: TaskStatus) => void; flash: (m: string) => void;
  openIssues: AppState['issues'];
}) {
  const [mgrNoteDrafts, setMgrNoteDrafts] = useState<Record<string, string>>({});
  const team = isExec ? PEOPLE.filter(p => p.kind !== 'exec') : PEOPLE.filter(p => p.mgr === me.id);
  const t0 = today0();

  const openTasks = st.tasks.filter(t => t.status !== 'Complete' && team.some(p => p.id === t.who));
  const wip = openTasks.filter(t => t.status === 'In Progress').length;
  const waiting = openTasks.filter(t => t.status === 'Awaiting Response').length;
  const overdue = openTasks.filter(t => { const d = taskDate(t); return d && d <= t0 && t.status !== 'Awaiting Response'; }).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <ViewHeader title="Management overview" me={me} onSignOut={onSignOut} />
      <div style={{ padding: '10px 28px', borderBottom: '1px solid var(--color-divider)', flexShrink: 0 }}>
        <Seg value={st.overviewMode} onChange={v => setSt(s => ({ ...s, overviewMode: v }))} options={[{ value: 'signals', label: 'SIGNALS' }, { value: 'swimlanes', label: 'SWIMLANES' }, { value: 'teamcal', label: 'TEAM CALENDAR' }]} />
      </div>

      {st.overviewMode === 'signals' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* help request alerts */}
          {st.helpRequests.filter(h => !h.read).map(h => {
            const proj = PROJECTS.find(p => p.id === h.projectId);
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 24px', background: STATUS.awaiting, borderBottom: '2px solid var(--color-text)', flexShrink: 0 }}>
                <span style={{ width: 8, height: 8, background: '#fff', flexShrink: 0 }} />
                <span style={{ font: '600 12px/1 var(--font-body)', letterSpacing: '.1em', color: '#fff', flex: 1 }}>
                  {h.fromName.toUpperCase()} NEEDS HELP · {(proj?.short || proj?.name || '').toUpperCase()} · {h.when}
                </span>
                <button onClick={() => setSt(s => ({ ...s, openTaskId: st.tasks.find(t => t.projectId === h.projectId && t.who === h.from && t.status !== 'Complete')?.id || null }))} style={{ padding: '5px 10px', background: '#fff', border: 'none', font: '600 10.5px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>VIEW TASK</button>
                <button onClick={() => setSt(s => ({ ...s, helpRequests: s.helpRequests.map(r => r.id === h.id ? { ...r, read: true } : r) }))} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #fff', font: '600 10.5px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer', color: '#fff', whiteSpace: 'nowrap' }}>DISMISS</button>
              </div>
            );
          })}
          <KpiStrip large={false} items={[
            { label: 'OPEN TASKS', value: openTasks.length, note: team.length + ' people', color: 'var(--color-text)' },
            { label: 'IN PROGRESS', value: wip, note: 'Active right now', color: 'var(--color-accent)' },
            { label: 'AWAITING RESPONSE', value: waiting, note: 'Blocked on response', color: STATUS.awaiting },
            { label: 'OVERDUE', value: overdue, note: 'Due today or earlier', color: 'var(--color-accent)' },
          ]} />
          {/* person columns */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'stretch', borderTop: '1px solid var(--color-divider)' }}>
            {team.map((person, pi) => {
              const personTasks = st.tasks.filter(t => t.who === person.id && t.status !== 'Complete');
              const openHrs = personTasks.reduce((a, t) => a + t.hrs, 0);
              const personProjIds = [...new Set(personTasks.map(t => t.projectId))];
              const personProjs = PROJECTS.filter(p => personProjIds.includes(p.id));
              return (
                <div key={person.id} style={{ flex: 1, minWidth: 200, borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: '800 14px/1.1 var(--font-heading)' }}>{person.name}</div>
                      <div style={{ ...T.micro, marginTop: 4 }}>{person.role.toUpperCase()} · {openHrs}H OPEN</div>
                    </div>
                    <div style={{ font: '800 18px/1 var(--font-heading)', flexShrink: 0 }}>{personProjs.length}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 18px', borderBottom: '1px solid var(--color-divider)' }}>
                    <span style={T.label}>PROJECTS</span>
                    <span style={{ ...T.micro, fontSize: '10px' }}>CLICK A PROJECT TO EXPAND</span>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    {personProjs.length === 0 && <div style={{ ...T.meta, padding: '14px 18px' }}>No open tasks this week.</div>}
                    {personProjs.map(proj => {
                      const pt = personTasks.filter(t => t.projectId === proj.id);
                      const k = projStatusKey(pt);
                      const expanded = !!st.expandedProj[person.id + proj.id];
                      return (
                        <div key={proj.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                          <button onClick={() => setSt(s => ({ ...s, expandedProj: { ...s.expandedProj, [person.id + proj.id]: !expanded } }))} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 18px', background: expanded ? 'var(--color-neutral-200)' : 'none', border: 'none', cursor: 'pointer' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <StatusLight status={k} />
                              <span style={{ font: '600 12.5px/1 var(--font-body)' }}>{proj.short || proj.name}</span>
                            </span>
                            <span style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.1em', color: STATUS[k], whiteSpace: 'nowrap' }}>{k === 'urgent' ? 'NEEDS WORK' : k === 'awaiting' ? 'AWAITING' : 'ON PLAN'} {expanded ? '▼' : '▶'}</span>
                          </button>
                          {expanded && (
                            <div style={{ padding: '8px 18px 14px', background: 'var(--color-neutral-100)' }}>
                              {pt.map(t => (
                                <button key={t.id} onClick={() => setSt(s => ({ ...s, openTaskId: t.id }))} style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px', marginBottom: 6, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderLeft: '3px solid ' + statusColor(t.status), cursor: 'pointer' }}>
                                  <span style={{ font: '600 12.5px/1.25 var(--font-body)' }}>{t.title}</span>
                                  <span style={T.micro}>{statusShort(t.status)} · {t.due} · {t.hrs}h</span>
                                </button>
                              ))}
                              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                <input value={mgrNoteDrafts[person.id + proj.id] || ''} onChange={e => setMgrNoteDrafts(d => ({ ...d, [person.id + proj.id]: e.target.value }))} placeholder={'Note from ' + me.first + '…'} style={{ flex: 1, padding: '7px 9px', border: '1px solid var(--color-text)', background: 'var(--color-neutral-100)', font: '400 12px/1 var(--font-body)', borderRadius: 0 }} />
                                <button onClick={() => {
                                  const text = mgrNoteDrafts[person.id + proj.id] || '';
                                  if (!text.trim()) { flash('Type the note first'); return; }
                                  if (pt[0]) {
                                    setSt(s => ({ ...s, tasks: s.tasks.map(t => t.id === pt[0].id ? { ...t, notes: [...t.notes, { who: me.name + ' (manager)', when: 'Just now', text: text.trim() }] } : t) }));
                                    setMgrNoteDrafts(d => ({ ...d, [person.id + proj.id]: '' }));
                                    flash('Note sent');
                                  }
                                }} style={{ padding: '7px 11px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>POST</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {st.overviewMode === 'swimlanes' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {(() => {
            const COLS: TaskStatus[] = ['To-Do', 'In Progress', 'Awaiting Response', 'Complete'];
            return (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={{ padding: '10px 16px', borderBottom: '2px solid var(--color-text)', textAlign: 'left', ...T.label, background: 'var(--color-neutral-100)', width: 180 }}>ESTIMATOR</th>
                  {COLS.map(c => <th key={c} style={{ padding: '10px 16px', borderBottom: '2px solid var(--color-text)', textAlign: 'left', ...T.label, background: 'var(--color-neutral-100)', borderLeft: '1px solid var(--color-divider)' }}>{statusShort(c)}</th>)}
                </tr></thead>
                <tbody>
                  {team.map(person => {
                    const pts = st.tasks.filter(t => t.who === person.id);
                    return (
                      <tr key={person.id}>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)', verticalAlign: 'top' }}>
                          <div style={{ font: '800 13px/1.1 var(--font-heading)' }}>{person.first}</div>
                          <div style={T.micro}>{person.role}</div>
                        </td>
                        {COLS.map(col => (
                          <td key={col} style={{ padding: 10, borderBottom: '1px solid var(--color-divider)', borderLeft: '1px solid var(--color-divider)', verticalAlign: 'top' }}>
                            {pts.filter(t => t.status === col).map(t => (
                              <button key={t.id} onClick={() => setSt(s => ({ ...s, openTaskId: t.id }))} style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 9px', marginBottom: 5, background: 'var(--color-neutral-100)', border: '1px solid var(--color-divider)', borderLeft: '3px solid ' + statusColor(col), cursor: 'pointer' }}>
                                <span style={{ font: '600 12px/1.25 var(--font-body)' }}>{t.title}</span>
                                <span style={T.micro}>{PROJECTS.find(p => p.id === t.projectId)?.short} · {t.due}</span>
                              </button>
                            ))}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {st.overviewMode === 'teamcal' && <CalendarView st={st} setSt={setSt} me={me} isManager={true} onSignOut={onSignOut} flash={flash} teamMode team={team} />}
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
function CalendarView({ st, setSt, me, isManager, onSignOut, flash, teamMode, team }: {
  st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; isManager: boolean;
  onSignOut: () => void; flash: (m: string) => void; teamMode?: boolean; team?: Person[];
}) {
  const [personFilter, setPersonFilter] = useState<string>('ALL');
  const t0 = today0(); const wkStart = addDays(mondayOf(t0), st.calOff * 7);
  const displayTeam = teamMode && team ? team : undefined;
  const people = displayTeam || [me];
  const filteredPeople = personFilter === 'ALL' ? people : people.filter(p => p.id === personFilter);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(wkStart, i); const key = ymd(date);
    const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
    const tasks = st.tasks.filter(t =>
      filteredPeople.some(p => p.id === t.who) &&
      t.date === key && t.status !== 'Complete'
    );
    const hrs = tasks.reduce((a, t) => a + t.hrs, 0);
    return { dayName, date, key, tasks, hrs, isToday: key === ymd(t0) };
  });
  const totalHrs = days.reduce((a, d) => a + d.hrs, 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {!teamMode && <ViewHeader title="Calendar" sub="Scheduled jobs and tracked hours by week or month" me={me} onSignOut={onSignOut} />}
      {/* toolbar */}
      <div style={{ padding: '16px 28px', borderBottom: '2px solid var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: '800 20px/1 var(--font-heading)' }}>{teamMode ? 'TEAM CALENDAR' : 'MY SCHEDULE'}</div>
          <div style={{ font: '500 13px/1 var(--font-body)', letterSpacing: '.08em', color: 'var(--color-neutral-600)', marginTop: 6 }}>WEEK OF {prettyShort(wkStart).toUpperCase()} · {totalHrs} SCHEDULED</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {displayTeam && displayTeam.length > 1 && (
            <Seg value={personFilter} onChange={setPersonFilter} options={[{ value: 'ALL', label: 'ALL' + (displayTeam ? ' · ' + displayTeam.length : '') }, ...displayTeam.map(p => ({ value: p.id, label: p.initials }))]} />
          )}
          <button onClick={() => setSt(s => ({ ...s, calOff: s.calOff - 1 }))} style={{ padding: '10px 14px', border: '2px solid var(--color-text)', background: 'none', font: '700 14px/1 var(--font-body)', cursor: 'pointer' }}>◀</button>
          <button onClick={() => setSt(s => ({ ...s, calOff: 0 }))} style={{ padding: '10px 16px', border: '2px solid var(--color-text)', background: 'none', font: '700 13px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer' }}>TODAY</button>
          <button onClick={() => setSt(s => ({ ...s, calOff: s.calOff + 1 }))} style={{ padding: '10px 14px', border: '2px solid var(--color-text)', background: 'none', font: '700 14px/1 var(--font-body)', cursor: 'pointer' }}>▶</button>
          <button onClick={() => {
            const rows = st.tasks.filter(t => filteredPeople.some(p => p.id === t.who) && t.status !== 'Complete' && t.date);
            if (!rows.length) { flash('Nothing to export'); return; }
            const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//1CG//Task Tracker//EN'];
            rows.forEach(t => { const s = (t.date || '').replace(/-/g, ''); const pr = PROJECTS.find(p => p.id === t.projectId); lines.push('BEGIN:VEVENT', 'UID:' + t.id + '@1cg', 'DTSTAMP:' + s + 'T090000Z', 'DTSTART;VALUE=DATE:' + s, 'DTEND;VALUE=DATE:' + s, 'SUMMARY:' + t.title.replace(/[,;]/g, ' ') + ' (' + t.hrs + 'h)', 'DESCRIPTION:' + (pr?.short || ''), 'END:VEVENT'); });
            lines.push('END:VCALENDAR');
            const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '1cg-tasks.ics'; a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            flash(rows.length + ' events exported');
          }} style={{ padding: '10px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '700 12px/1 var(--font-body)', letterSpacing: '.09em', cursor: 'pointer', whiteSpace: 'nowrap' }}>ADD TO MY CALENDAR</button>
        </div>
      </div>
      {/* grid — only show Mon–Fri (indices 1–5) */}
      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)' }}>
        {days.filter(d => d.dayName !== 'SAT' && d.dayName !== 'SUN').map(day => (
          <div key={day.key} style={{ borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', minHeight: 320 }}>
            {/* day header — fixed height so all columns align */}
            <div style={{ height: 64, flexShrink: 0, padding: '0 16px', borderBottom: '2px solid ' + (day.isToday ? 'var(--color-accent)' : 'var(--color-divider)'), background: day.isToday ? 'var(--color-text)' : 'var(--color-neutral-100)', color: day.isToday ? '#fff' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ font: '800 15px/1 var(--font-heading)', letterSpacing: '.06em' }}>{day.dayName}</div>
                <div style={{ font: '500 12px/1 var(--font-body)', opacity: .7, marginTop: 5 }}>{prettyShort(day.date)}</div>
              </div>
              {day.hrs > 0 && <span style={{ font: '800 20px/1 var(--font-heading)', color: day.isToday ? 'var(--color-accent-300)' : 'var(--color-accent)' }}>{day.hrs}h</span>}
            </div>
            {/* task cards */}
            <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
              {day.tasks.length === 0 && (
                <div style={{ font: '500 12px/1.5 var(--font-body)', color: 'var(--color-neutral-500)', paddingTop: 8 }}>—</div>
              )}
              {day.tasks.map(t => {
                const proj = PROJECTS.find(p => p.id === t.projectId);
                return (
                  <button key={t.id} onClick={() => setSt(s => ({ ...s, openTaskId: t.id }))} style={{ textAlign: 'left', padding: '10px 12px', background: 'var(--color-bg)', borderLeft: '4px solid ' + statusColor(t.status), cursor: 'pointer', border: 'none', borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: statusColor(t.status), display: 'flex', flexDirection: 'column', gap: 5, boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
                    <span style={{ font: '600 13.5px/1.35 var(--font-body)' }}>{t.title}</span>
                    <span style={{ font: '500 11.5px/1 var(--font-body)', color: 'var(--color-neutral-600)' }}>{proj?.short || t.projectId}</span>
                    <span style={{ font: '600 11px/1 var(--font-body)', color: 'var(--color-accent-700)', letterSpacing: '.06em' }}>{personFirst(t.who)} · {t.hrs}h</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Capacity ─────────────────────────────────────────────────────────────────
const CAP_DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const DAY_TARGET = 8;

function CapBar({ hrs, isToday }: { hrs: number; isToday: boolean }) {
  const pct = Math.min(hrs / DAY_TARGET, 1.25); // cap visual at 125%
  const over = hrs > DAY_TARGET;
  const low = hrs > 0 && hrs < 5;
  const barColor = over ? 'var(--color-accent)' : low ? 'oklch(0.62 0.14 220)' : STATUS.good;
  const fillH = Math.min(pct, 1) * 100;
  const overflowH = over ? Math.min((hrs - DAY_TARGET) / DAY_TARGET, 0.25) / 0.25 * 14 : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
      {/* overflow spike above the bar */}
      <div style={{ height: 16, display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
        {over && <div style={{ width: '60%', height: overflowH + 'px', background: 'var(--color-accent)', opacity: .55, transition: 'height .3s' }} />}
      </div>
      {/* main bar track */}
      <div style={{ position: 'relative', width: '100%', flex: 1, background: 'var(--color-neutral-200)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        {/* 8h target line */}
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, height: 2, background: isToday ? 'var(--color-accent)' : 'var(--color-neutral-400)', zIndex: 2, transform: 'translateY(100%)' }} />
        <div style={{ width: '100%', height: fillH + '%', background: barColor, transition: 'height .35s cubic-bezier(.22,1,.36,1)', minHeight: hrs > 0 ? 3 : 0 }} />
      </div>
      {/* hour label */}
      <div style={{ font: '800 15px/1 var(--font-heading)', color: over ? 'var(--color-accent)' : hrs === 0 ? 'var(--color-neutral-400)' : 'var(--color-text)' }}>
        {hrs > 0 ? hrs + 'h' : '—'}
      </div>
    </div>
  );
}

function CapacityView({ st, setSt, me, isManager, team, onSignOut }: { st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; isManager: boolean; team: Person[]; onSignOut: () => void; }) {
  const t0 = today0(); const wkStart = addDays(mondayOf(t0), st.capOff * 7);
  const people = isManager ? team : [me];

  const rows = people.map(person => {
    const dayHrs = CAP_DAY_LABELS.map((_, i) => {
      const key = ymd(addDays(wkStart, i));
      return st.tasks.filter(t => t.who === person.id && t.date === key).reduce((a, t) => a + t.hrs, 0);
    });
    const total = dayHrs.reduce((a, h) => a + h, 0);
    return { person, dayHrs, total };
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <ViewHeader title={isManager ? 'Weekly capacity' : 'My capacity'} me={me} onSignOut={onSignOut} />

      {/* toolbar */}
      <div style={{ padding: '16px 32px', borderBottom: '2px solid var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ font: '800 20px/1 var(--font-heading)' }}>WEEK OF {prettyShort(wkStart).toUpperCase()}</div>
          <div style={{ font: '500 13px/1 var(--font-body)', color: 'var(--color-neutral-600)', marginTop: 5 }}>red = over · blue = light · green = on track</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setSt(s => ({ ...s, capOff: s.capOff - 1 }))} style={{ padding: '10px 14px', border: '2px solid var(--color-text)', background: 'none', font: '700 14px/1 var(--font-body)', cursor: 'pointer' }}>◀</button>
          <button onClick={() => setSt(s => ({ ...s, capOff: 0 }))} style={{ padding: '10px 16px', border: '2px solid var(--color-text)', background: 'none', font: '700 13px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer' }}>TODAY</button>
          <button onClick={() => setSt(s => ({ ...s, capOff: s.capOff + 1 }))} style={{ padding: '10px 14px', border: '2px solid var(--color-text)', background: 'none', font: '700 14px/1 var(--font-body)', cursor: 'pointer' }}>▶</button>
        </div>
      </div>

      {/* day-of-week column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(5,1fr) 100px', borderBottom: '1px solid var(--color-divider)', flexShrink: 0, background: 'var(--color-neutral-100)' }}>
        <div style={{ padding: '10px 20px', font: '600 11px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)' }}>ESTIMATOR</div>
        {CAP_DAY_LABELS.map((d, i) => {
          const date = addDays(wkStart, i);
          const isToday = ymd(date) === ymd(t0);
          return (
            <div key={d} style={{ padding: '10px 0', textAlign: 'center', borderLeft: '1px solid var(--color-divider)' }}>
              <div style={{ font: '700 12px/1 var(--font-body)', letterSpacing: '.12em', color: isToday ? 'var(--color-accent)' : 'var(--color-text)' }}>{d}</div>
              <div style={{ font: '500 11px/1 var(--font-body)', color: 'var(--color-neutral-500)', marginTop: 3 }}>{prettyShort(date)}</div>
            </div>
          );
        })}
        <div style={{ padding: '10px 0', textAlign: 'center', borderLeft: '1px solid var(--color-divider)', font: '600 11px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)' }}>TOTAL</div>
      </div>

      {/* person rows */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {rows.map(({ person, dayHrs, total }) => (
          <div key={person.id} style={{ display: 'grid', gridTemplateColumns: '200px repeat(5,1fr) 100px', borderBottom: '1px solid var(--color-divider)', flex: 1, minHeight: 120 }}>
            {/* name col */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, background: 'var(--color-neutral-100)', borderRight: '1px solid var(--color-divider)' }}>
              <div style={{ font: '800 15px/1.2 var(--font-heading)' }}>{person.name}</div>
              <div style={{ font: '500 11px/1.4 var(--font-body)', color: 'var(--color-neutral-600)', letterSpacing: '.06em' }}>{person.role}</div>
              <div style={{ font: '800 22px/1 var(--font-heading)', color: total > 40 ? 'var(--color-accent)' : total > 0 ? 'var(--color-text)' : 'var(--color-neutral-400)', marginTop: 6 }}>{total > 0 ? total + 'h' : '—'}</div>
            </div>
            {/* day bar cells */}
            {dayHrs.map((h, i) => {
              const isToday = ymd(addDays(wkStart, i)) === ymd(t0);
              return (
                <div key={i} style={{ padding: '12px 14px', borderLeft: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', background: isToday ? 'oklch(0.97 0.005 250)' : 'transparent' }}>
                  <CapBar hrs={h} isToday={isToday} />
                </div>
              );
            })}
            {/* weekly total bar */}
            <div style={{ padding: '20px 14px', borderLeft: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: '100%', height: 8, background: 'var(--color-neutral-200)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: Math.min(total / 40 * 100, 100) + '%', background: total > 40 ? 'var(--color-accent)' : STATUS.good, transition: 'width .35s cubic-bezier(.22,1,.36,1)' }} />
              </div>
              <div style={{ font: '800 20px/1 var(--font-heading)', color: total > 40 ? 'var(--color-accent)' : total > 0 ? 'var(--color-text)' : 'var(--color-neutral-400)' }}>{total > 0 ? total + 'h' : '—'}</div>
              <div style={{ font: '500 10px/1 var(--font-body)', color: 'var(--color-neutral-500)', letterSpacing: '.08em' }}>OF 40H</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────────
function ProjectsView({ st, setSt, me, isManager, projects, setTaskStatus, flash, logNote, onSignOut }: {
  st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; isManager: boolean;
  projects: Project[]; setTaskStatus: (id: string, s: TaskStatus) => void; flash: (m: string) => void;
  logNote: (pid: string, text: string, tag: string) => boolean | void; onSignOut: () => void;
}) {
  const proj = projects.find(p => p.id === st.projectId) || projects[0];
  if (!proj) return <div style={{ flex: 1, padding: 32 }}>No projects.</div>;

  const projTasks = st.tasks.filter(t => t.projectId === proj.id && (isManager || t.who === me.id));
  const projNotes = (st.projNotes[proj.id] || []) as Array<NoteEntry & { tag?: string; label?: string }>;
  const deal = st.deals[proj.id] || {} as Deal;
  const dueDate = seedShiftDate(proj.bidDue);

  const STATUS_BTNS: Array<[TaskStatus, string]> = [['In Progress', 'WIP'], ['Awaiting Response', 'WAITING'], ['Complete', 'DONE']];

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      {/* left rail */}
      <div style={{ width: 300, flexShrink: 0, borderRight: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ViewHeader title="Projects" me={me} onSignOut={onSignOut} />
        <div style={{ padding: '10px 18px', borderBottom: '2px solid var(--color-text)', ...T.label }}>ACTIVE PROJECTS · {projects.length}</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {projects.map(p => {
            const open = st.tasks.filter(t => t.projectId === p.id && t.status !== 'Complete').length;
            const pNotes = (st.projNotes[p.id] || []).length;
            const active = st.projectId === p.id;
            return (
              <div key={p.id} onClick={() => setSt(s => ({ ...s, projectId: p.id }))} style={{ borderBottom: '1px solid var(--color-divider)', borderLeft: active ? '4px solid var(--color-text)' : '4px solid transparent', background: active ? 'var(--color-neutral-200)' : 'transparent', cursor: 'pointer' }}>
                <div style={{ padding: '11px 18px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ font: '700 13px/1.25 var(--font-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.short || p.name}</span>
                    <span style={T.micro}>{p.client} · {p.scope.slice(0, 28)}</span>
                  </span>
                  <span style={{ font: '800 14px/1 var(--font-heading)', flexShrink: 0 }}>{open}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px 9px' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSt(s => ({ ...s, showQuickNote: true, quickNote: { ...s.quickNote, projectId: p.id } }))} style={{ padding: '4px 7px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-accent-700)', cursor: 'pointer' }}>+ NOTE</button>
                  {pNotes > 0 && <span style={T.micro}>{pNotes} {pNotes === 1 ? 'note' : 'notes'}</span>}
                  {isManager && <button onClick={() => setSt(s => ({ ...s, confirmClose: p.id }))} style={{ marginLeft: 'auto', padding: '4px 7px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer' }}>CLOSE OUT</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* right: project detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* project header */}
        <div style={{ padding: '20px 28px', borderBottom: '2px solid var(--color-text)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...T.micro, letterSpacing: '.16em', color: 'var(--color-accent-700)' }}>{proj.ref} · DIVISION 08</div>
              <div style={{ font: '800 26px/1.1 var(--font-heading)', marginTop: 6, textWrap: 'pretty', maxWidth: '28ch' }}>{proj.name}</div>
              <div style={{ ...T.meta, marginTop: 5 }}>{proj.client} · {proj.scope}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
              <button onClick={() => window.open('about:blank')} style={{ padding: '10px 14px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '600 12px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap' }}>OPEN ORIGINAL ITB · NOT LINKED</button>
              <button onClick={() => setSt(s => ({ ...s, showNewTask: true, newTaskDraft: { ...s.newTaskDraft, projectId: proj.id } }))} style={{ padding: '10px 14px', background: 'none', border: '1px solid var(--color-text)', font: '600 12px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap' }}>ADD TASK</button>
            </div>
          </div>
          {/* facts grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid var(--color-divider)', marginTop: 14 }}>
            {[['DRAWINGS', proj.drawings || deal.docStage || '—'], ['LOGGED IN', deal.loggedAt || '—'], ['ASSIGNED', deal.assignedAt || '—'], ['BID DUE', proj.bidDue + (dueDate ? ' · ' + dueDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')]].map(([l, v], i) => (
              <div key={l} style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 5, borderRight: i < 3 ? '1px solid var(--color-divider)' : 'none', paddingRight: i < 3 ? 16 : 0, paddingLeft: i > 0 ? 16 : 0 }}>
                <div style={T.label}>{l}</div>
                <div style={{ font: '700 14px/1.1 var(--font-heading)', color: l === 'BID DUE' && dueDate && dueDate <= today0() ? 'var(--color-accent)' : 'var(--color-text)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', overflow: 'hidden' }}>
            {/* tasks */}
            <div style={{ padding: '20px 24px', overflow: 'auto', borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ font: '800 14px/1 var(--font-heading)' }}>TASKS</div>
              <div style={{ borderTop: '2px solid var(--color-text)' }}>
                {projTasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--color-divider)', minHeight: 58 }}>
                    <button onClick={() => setSt(s => ({ ...s, openTaskId: t.id }))} style={{ flex: 1, textAlign: 'left', padding: '0 10px 0 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, minWidth: 0 }}>
                      <span style={{ font: '600 13px/1.25 var(--font-body)', textDecoration: t.status === 'Complete' ? 'line-through' : 'none', opacity: t.status === 'Complete' ? .55 : 1 }}>{t.title}</span>
                      <span style={T.micro}>{personFirst(t.who)} · {t.hrs} h · {t.due}</span>
                    </button>
                    <div style={{ display: 'flex', alignSelf: 'stretch', borderLeft: '1px solid var(--color-divider)', flexShrink: 0 }}>
                      {STATUS_BTNS.map(([s, lbl]) => (
                        <button key={s} onClick={() => setTaskStatus(t.id, s)} style={{ width: 64, border: 'none', borderRight: '1px solid var(--color-divider)', background: t.status === s ? statusColor(s) : 'transparent', color: t.status === s ? '#fff' : 'var(--color-text)', font: '600 10px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {projTasks.length === 0 && <div style={{ ...T.meta, padding: '14px 0' }}>No tasks yet.</div>}
              </div>
            </div>
            {/* project notes */}
            <div style={{ padding: '20px 24px', overflow: 'auto', background: 'var(--color-neutral-100)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ font: '800 14px/1 var(--font-heading)' }}>PROJECT NOTES</div>
                <div style={T.micro}>{projNotes.length} LOGGED</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, border: '1px solid var(--color-text)', width: 'max-content' }}>
                {NOTE_TAGS.map(t => {
                  const on = st.projNoteTag === t.id;
                  return <button key={t.id} onClick={() => setSt(s => ({ ...s, projNoteTag: t.id }))} style={{ padding: '8px 12px', border: 'none', background: on ? 'var(--color-text)' : 'transparent', color: on ? 'var(--color-neutral-100)' : 'var(--color-neutral-700)', font: '600 10.5px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer' }}>{t.label}</button>;
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea value={st.projNoteDraft} onChange={e => setSt(s => ({ ...s, projNoteDraft: e.target.value }))} placeholder={(NOTE_TAGS.find(t => t.id === st.projNoteTag) || NOTE_TAGS[0]).snippet} style={{ flex: 1, ...inp, minHeight: 66, resize: 'vertical' }} />
                <button onClick={() => {
                  if (logNote(proj.id, st.projNoteDraft, st.projNoteTag)) setSt(s => ({ ...s, projNoteDraft: '' }));
                }} style={{ padding: '8px 12px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '600 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', alignSelf: 'flex-start', marginTop: 0 }}>SAVE NOTE</button>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                {[...projNotes].reverse().map((n, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-divider)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      {n.label && <Chip tone="neutral">{n.label}</Chip>}
                      <span style={T.micro}>{n.who} · {n.when}</span>
                    </div>
                    <div style={T.body}>{n.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

// ─── Task Panel ────────────────────────────────────────────────────────────────
function TaskPanel({ task, me, isManager, st, setSt, setTaskStatus, addTaskNote, raiseIssue, mgrPerson }: {
  task: Task; me: Person; isManager: boolean; st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>;
  setTaskStatus: (id: string, s: TaskStatus) => void; addTaskNote: (id: string, t: string) => void;
  raiseIssue: (id: string, t: string) => void; mgrPerson?: Person;
}) {
  const [noteDraft, setNoteDraft] = useState('');
  const [issueDraft, setIssueDraft] = useState('');
  const proj = PROJECTS.find(p => p.id === task.projectId);
  const projTasks = st.tasks.filter(t => t.projectId === task.projectId);
  const idx = projTasks.findIndex(t => t.id === task.id);

  const SEG_STATUSES: Array<{ value: TaskStatus; label: string }> = [
    { value: 'In Progress', label: 'WIP' },
    { value: 'Awaiting Response', label: 'PENDING' },
    { value: 'Complete', label: 'DONE' },
  ];
  const segVal = SEG_STATUSES.find(s => s.value === task.status)?.value || null;

  return (
    <div style={{ position: 'fixed', top: 38, right: 0, bottom: 0, width: 440, background: 'var(--color-surface)', borderLeft: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', zIndex: 500, overflow: 'hidden' }}>
      {/* breadcrumb nav */}
      <div style={{ padding: '11px 16px', borderBottom: '2px solid var(--color-text)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={T.micro}>{idx + 1} / {projTasks.length}</span>
        <span style={{ font: '600 12px/1 var(--font-body)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj?.short || proj?.name}</span>
        <button disabled={idx === 0} onClick={() => setSt(s => ({ ...s, openTaskId: projTasks[idx - 1].id }))} style={{ padding: '5px 9px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: idx > 0 ? 'pointer' : 'default', opacity: idx === 0 ? .4 : 1 }}>← PREV</button>
        <button disabled={idx >= projTasks.length - 1} onClick={() => setSt(s => ({ ...s, openTaskId: projTasks[idx + 1].id }))} style={{ padding: '5px 9px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: idx < projTasks.length - 1 ? 'pointer' : 'default', opacity: idx >= projTasks.length - 1 ? .4 : 1 }}>NEXT →</button>
        <button onClick={() => setSt(s => ({ ...s, openTaskId: null }))} style={{ width: 26, height: 26, background: 'none', border: 'none', font: '18px/1 var(--font-body)', cursor: 'pointer', color: 'var(--color-neutral-600)', padding: 0, flexShrink: 0 }}>×</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* title */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ font: '800 18px/1.2 var(--font-heading)' }}>{task.title}</div>
        </div>

        {/* status */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ ...T.label, marginBottom: 8 }}>STATUS</div>
          <Seg value={segVal} onChange={v => setTaskStatus(task.id, v)} options={SEG_STATUSES} />
        </div>

        {/* meta */}
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-divider)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div><div style={T.label}>OWNER</div><div style={{ font: '500 13px/1 var(--font-body)', marginTop: 4 }}>{me.id === task.who ? me.first + ' (you)' : personName(task.who).replace(/(\w+)\s(\w+)/, '$1 ' + personInitials(task.who)[1])}</div></div>
          <div><div style={T.label}>DUE</div><div style={{ font: '600 13px/1 var(--font-body)', marginTop: 4, color: dueColor(task) }}>{task.due}</div></div>
          <div><div style={T.label}>HOURS</div><div style={{ font: '600 13px/1 var(--font-body)', marginTop: 4 }}>{task.hrs}</div></div>
        </div>

        {/* scope note */}
        {task.detail && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-divider)' }}>
            <div style={{ ...T.label, marginBottom: 6 }}>SCOPE NOTE</div>
            <div style={T.body}>{task.detail}</div>
          </div>
        )}

        {/* notes thread */}
        <div style={{ padding: '10px 18px 0' }}>
          <div style={{ ...T.label, marginBottom: 8 }}>NOTES</div>
          {task.notes.map((n, i) => (
            <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--color-divider)' : 'none', padding: '8px 0' }}>
              <div style={{ ...T.micro, marginBottom: 4 }}>{n.who} · {n.when}</div>
              <div style={T.body}>{n.text}</div>
            </div>
          ))}
          {task.notes.length === 0 && <div style={{ ...T.meta, paddingBottom: 8 }}>No notes yet.</div>}
        </div>

        {/* add note */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--color-divider)', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ ...T.label, marginBottom: 7 }}>ADD A NOTE</div>
          <div style={{ display: 'flex', gap: 7 }}>
            <input value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Add a note for the team…" onKeyDown={e => { if (e.key === 'Enter' && noteDraft.trim()) { addTaskNote(task.id, noteDraft); setNoteDraft(''); } }} style={{ flex: 1, ...inp, padding: '8px 10px' }} />
            <button onClick={() => { addTaskNote(task.id, noteDraft); setNoteDraft(''); }} style={{ padding: '8px 13px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '600 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>POST NOTE</button>
          </div>
        </div>

        {/* raise issue (estimators only) */}
        {!isManager && mgrPerson && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-divider)' }}>
            <div style={{ ...T.label, marginBottom: 7 }}>RAISE AN ISSUE TO {mgrPerson.first.toUpperCase()}</div>
            <textarea value={issueDraft} onChange={e => setIssueDraft(e.target.value)} placeholder="What's blocking this? Stays goes to management." style={{ ...inp, minHeight: 60, resize: 'vertical', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { raiseIssue(task.id, issueDraft); setIssueDraft(''); }} style={{ padding: '8px 12px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '600 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>SEND ISSUE TO {mgrPerson.first.toUpperCase()}</button>
              <button onClick={() => { raiseIssue(task.id, issueDraft); setIssueDraft(''); }} style={{ padding: '8px 12px', background: 'none', border: '1px solid var(--color-text)', font: '600 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>FLAG FOR {mgrPerson.first.toUpperCase()}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Issues Tray ──────────────────────────────────────────────────────────────
function IssuesTray({ st, setSt, me, replyIssue, setTaskStatus }: { st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; replyIssue: (id: string, t: string) => void; setTaskStatus: (id: string, s: TaskStatus) => void; }) {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const open = st.issues.filter(i => i.status === 'open');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
      <div onClick={() => setSt(s => ({ ...s, showIssues: false }))} style={{ position: 'absolute', inset: 0, background: 'rgba(32,30,29,.4)' }} />
      <div style={{ position: 'relative', width: 460, maxWidth: '94vw', background: 'var(--color-bg)', borderLeft: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '2px solid var(--color-text)', flexShrink: 0 }}>
          <div>
            <div style={{ font: '800 16px/1 var(--font-heading)' }}>ISSUES TO ME</div>
            <div style={{ ...T.meta, marginTop: 4 }}>{open.length} open — raised by the team</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setSt(s => ({ ...s, showIssues: false }))}>CLOSE</Button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {open.length === 0 && <div style={{ ...T.meta, padding: 24 }}>No open issues.</div>}
          {open.map(issue => {
            const t = st.tasks.find(t => t.id === issue.taskId);
            const proj = t ? PROJECTS.find(p => p.id === t.projectId) : undefined;
            const isReplying = st.replyFor === issue.id;
            return (
              <div key={issue.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-divider)', borderLeft: '3px solid var(--color-accent)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <Chip tone="accent">OPEN</Chip>
                  <span style={T.micro}>{issue.from} · {issue.when}</span>
                </div>
                <div style={{ font: '700 14px/1.3 var(--font-heading)' }}>{t?.title || '(task not found)'}</div>
                {proj && <div style={T.micro}>{proj.short || proj.name}</div>}
                <div style={T.body}>{issue.text}</div>
                {issue.replies.map((r, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: 'var(--color-neutral-100)', borderLeft: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={T.micro}>{r.who} · {r.when}</span>
                    <span style={T.body}>{r.text}</span>
                  </div>
                ))}
                {isReplying && <textarea value={replyDrafts[issue.id] || ''} onChange={e => setReplyDrafts(d => ({ ...d, [issue.id]: e.target.value }))} placeholder="Your answer — posts to the task notes…" style={{ ...inp, minHeight: 60, resize: 'vertical' }} />}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isReplying && <Button size="sm" onClick={() => { replyIssue(issue.id, replyDrafts[issue.id] || ''); setReplyDrafts(d => ({ ...d, [issue.id]: '' })); }}>SEND REPLY</Button>}
                  <Button variant="secondary" size="sm" onClick={() => setSt(s => ({ ...s, replyFor: isReplying ? null : issue.id }))}>REPLY</Button>
                  {t && <Button variant="secondary" size="sm" onClick={() => setSt(s => ({ ...s, openTaskId: t.id, showIssues: false }))}>OPEN TASK</Button>}
                  <Button variant="ghost" size="sm" onClick={() => setSt(s => ({ ...s, issues: s.issues.map(i => i.id === issue.id ? { ...i, status: 'resolved' } : i) }))}>RESOLVE</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── CRM ──────────────────────────────────────────────────────────────────────
function CrmSection({ st, setSt, me, projects, effStage, addRevision, addFollowUp, flash, followCount, setDeal, logNote }: {
  st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; projects: Project[];
  effStage: (id: string) => CrmStage; addRevision: () => void; addFollowUp: () => void; flash: (m: string) => void;
  followCount: number; setDeal: (id: string, p: Partial<Deal>) => void;
  logNote: (pid: string, text: string, tag: string) => boolean | void;
}) {
  if (st.crmView === 'home') return <CrmHome st={st} setSt={setSt} me={me} projects={projects} effStage={effStage} followCount={followCount} />;
  if (st.crmView === 'followups') return <CrmFollowUps st={st} setSt={setSt} projects={projects} />;
  if (st.crmView === 'list') return <CrmList st={st} setSt={setSt} projects={projects} effStage={effStage} />;
  if (st.crmView === 'record') return <CrmRecord st={st} setSt={setSt} me={me} projects={projects} effStage={effStage} addRevision={addRevision} addFollowUp={addFollowUp} flash={flash} setDeal={setDeal} logNote={logNote} />;
  return null;
}

function CrmHome({ st, setSt, me, projects, effStage, followCount }: { st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; projects: Project[]; effStage: (id: string) => CrmStage; followCount: number; }) {
  const sold = projects.filter(p => effStage(p.id) === 'Sold');
  const lost = projects.filter(p => effStage(p.id) === 'Lost');
  const feelingGood = projects.filter(p => effStage(p.id) === 'Feeling Good');
  const totalPriced = projects.reduce((a, p) => a + num((st.deals[p.id] || {}).price || ''), 0);
  const feelingGoodVal = feelingGood.reduce((a, p) => a + num((st.deals[p.id] || {}).price || ''), 0);
  const soldVal = sold.reduce((a, p) => a + num((st.deals[p.id] || {}).price || ''), 0);
  const lostVal = lost.reduce((a, p) => a + num((st.deals[p.id] || {}).price || ''), 0);
  const avgGp = sold.length ? sold.reduce((a, p) => { const d = st.deals[p.id] || {}; const pp = num(d.price || ''), c = num(d.cost || ''); return a + (pp && c ? (pp - c) / pp : 0); }, 0) / sold.length : 0;
  const closed = projects.filter(p => ['Sold', 'Lost'].includes(effStage(p.id)));
  const hitRate = closed.length ? Math.round(sold.length / closed.length * 100) : 0;
  const qGoal = 4500000; const yGoal = 18000000;
  const qPct = Math.min(100, Math.round(soldVal / qGoal * 100));
  const yPct = Math.min(100, Math.round(soldVal / yGoal * 100));
  const topSold = [...sold].sort((a, b) => num((st.deals[b.id] || {}).price || '') - num((st.deals[a.id] || {}).price || ''))[0];
  const topBid = [...projects].sort((a, b) => num((st.deals[b.id] || {}).price || '') - num((st.deals[a.id] || {}).price || ''))[0];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <PageHeader kicker="1CG · SALES" title="CRM OVERVIEW" actions={<><Button variant="secondary" size="sm" onClick={() => setSt(s => ({ ...s, crmView: 'followups' }))}>FOLLOW-UPS · {followCount}</Button><Button onClick={() => setSt(s => ({ ...s, crmView: 'list' }))}>OPEN THE CRM LIST →</Button></>} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <KpiStrip items={[
          { label: 'TOTAL PRICED WORK', value: money(totalPriced), note: projects.length + ' active bids' },
          { label: 'FEELING GOOD', value: money(feelingGoodVal), note: feelingGood.length + ' project' + (feelingGood.length !== 1 ? 's' : '') + ' in play', color: STATUS.good },
          { label: 'SOLD', value: money(soldVal), note: sold.length + ' awarded', color: STATUS.good },
          { label: 'LOST', value: money(lostVal), note: lost.length + ' projects elsewhere', color: 'var(--color-accent)' },
        ]} />
        <KpiStrip large={false} items={[
          { label: 'AVERAGE GP %', value: Math.round(avgGp * 100) + '%', note: 'Sold projects' },
          { label: 'HIT RATE', value: hitRate + '%', note: 'Closed bids' },
          { label: 'PROJECTS WON', value: String(sold.length), note: 'This period', color: STATUS.good },
          { label: 'PROJECTS LOST', value: String(lost.length), note: 'This period', color: 'var(--color-accent)' },
        ]} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
          <div style={{ padding: '24px 28px', borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ font: '800 16px/1 var(--font-heading)' }}>SALES TO GOAL · Q3 2026</div>
            <div style={T.micro}>% of goal</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderBottom: '1px solid var(--color-divider)' }}>
              {[['THIS QUARTER', money(soldVal), 'var(--color-text)'], ['LAST QUARTER', '$0', 'var(--color-neutral-700)'], ['QUARTER GOAL', money(qGoal), 'var(--color-accent)']].map(([l, v, c], i) => (
                <div key={l} style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 5, borderRight: i < 2 ? '1px solid var(--color-divider)' : 'none', paddingRight: i < 2 ? 14 : 0, paddingLeft: i > 0 ? 14 : 0 }}>
                  <div style={T.label}>{l}</div><div style={{ font: '800 22px/1 var(--font-heading)', color: c as string }}>{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ height: 14, background: 'var(--color-neutral-200)', border: '1px solid var(--color-text)', marginBottom: 6 }}><div style={{ height: '100%', background: 'var(--color-accent)', width: qPct + '%' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ font: '600 13px/1 var(--font-body)' }}>{money(Math.max(0, qGoal - soldVal))} to go</span><span style={T.meta}>{qPct}% of goal</span></div>
            </div>
            <Rule strong />
            <div style={{ font: '800 16px/1 var(--font-heading)' }}>YEAR TO DATE · 2026</div>
            <div style={{ ...T.micro }}>% of goal</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderBottom: '1px solid var(--color-divider)' }}>
              {[['SOLD YTD', money(soldVal), 'var(--color-text)'], ['YEARLY GOAL', money(yGoal), 'var(--color-accent)'], ['PACE', soldVal > yGoal * 7 / 12 ? 'AHEAD' : 'BEHIND', soldVal > yGoal * 7 / 12 ? STATUS.good : 'var(--color-accent)']].map(([l, v, c], i) => (
                <div key={l} style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 5, borderRight: i < 2 ? '1px solid var(--color-divider)' : 'none', paddingRight: i < 2 ? 14 : 0, paddingLeft: i > 0 ? 14 : 0 }}>
                  <div style={T.label}>{l}</div><div style={{ font: '800 22px/1 var(--font-heading)', color: c as string }}>{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ height: 14, background: 'var(--color-neutral-200)', border: '1px solid var(--color-text)', marginBottom: 6 }}><div style={{ height: '100%', background: 'var(--color-accent)', width: yPct + '%' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ font: '600 13px/1 var(--font-body)' }}>{money(Math.max(0, yGoal - soldVal))} to goal</span><span style={T.meta}>{yPct}% of yearly goal</span></div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', background: 'var(--color-neutral-100)' }}>
            <div style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '2px solid var(--color-text)', justifyContent: 'center' }}>
              <div style={T.label}>TOP COMPANY SOLD TO</div>
              <div style={{ font: '800 19px/1.15 var(--font-heading)' }}>{topSold?.client || 'Not enough history yet'}</div>
              <div style={{ font: '800 32px/1 var(--font-heading)', color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>{topSold ? money(num((st.deals[topSold.id] || {}).price || '')) : ''}</div>
              {topSold && <div style={T.micro}>{sold.length} bid{sold.length !== 1 ? 's' : ''} sold</div>}
            </div>
            <div style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
              <div style={T.label}>COMPANY WE BID THE MOST</div>
              <div style={{ font: '800 19px/1.15 var(--font-heading)' }}>{topBid?.client || 'not enough history yet'}</div>
              <div style={{ font: '800 32px/1 var(--font-heading)', whiteSpace: 'nowrap' }}>{topBid ? money(num((st.deals[topBid.id] || {}).price || '')) : ''}</div>
              {topBid && <div style={T.micro}>{projects.filter(p => p.client === topBid.client).length} bids quoted last year</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrmFollowUps({ st, setSt, projects }: { st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; projects: Project[]; }) {
  const today = ymd(today0());
  const allFUs = projects.flatMap(p => (st.followUps[p.id] || []).filter(fu => st.followWho === 'All' || fu.by === st.followWho).map(fu => ({ ...fu, project: p }))).sort((a, b) => a.date.localeCompare(b.date));
  const open = allFUs.filter(f => !f.done);
  const byList = ['All', ...Array.from(new Set(allFUs.map(f => f.by)))];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <PageHeader kicker="BUSINESS DEVELOPMENT" title={'FOLLOW-UPS · ' + open.length + ' OPEN'} actions={<><div style={{ display: 'flex', border: '1px solid var(--color-text)' }}>{byList.map(b => { const on = st.followWho === b; return <button key={b} onClick={() => setSt(s => ({ ...s, followWho: b }))} style={{ padding: '8px 12px', border: 'none', background: on ? 'var(--color-text)' : 'transparent', color: on ? 'var(--color-neutral-100)' : 'var(--color-neutral-700)', font: '600 10.5px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer' }}>{b === 'All' ? 'ALL BD' : b.toUpperCase()}</button>; })}</div><Button variant="secondary" size="sm" onClick={() => setSt(s => ({ ...s, crmView: 'home' }))}>CRM OVERVIEW</Button></>} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {open.length === 0 && <div style={{ ...T.meta, padding: 32 }}>No open follow-ups.</div>}
        {open.map(fu => (
          <div key={fu.id} style={{ display: 'grid', gridTemplateColumns: '140px minmax(0,1.4fr) minmax(0,1fr) 130px', gap: 16, padding: '15px 28px', borderBottom: '1px solid var(--color-divider)', alignItems: 'center' }}>
            <div>
              <div style={{ font: '600 12px/1 var(--font-body)', color: fu.date < today ? 'var(--color-accent)' : 'var(--color-text)' }}>{fu.date}</div>
              {fu.date < today && <div style={{ ...T.micro, color: 'var(--color-accent)', marginTop: 3 }}>OVERDUE</div>}
              <div style={{ ...T.micro, marginTop: 4 }}>by {fu.by}</div>
            </div>
            <div><div style={{ font: '600 13px/1.2 var(--font-body)', marginBottom: 3 }}>{fu.project.short || fu.project.name}</div><div style={T.body}>{fu.note}</div></div>
            <div>
              <div style={{ ...T.label, marginBottom: 4 }}>GC CONTACT</div>
              <div style={{ font: '600 13px/1.2 var(--font-body)' }}>{fu.project.client}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
                {(fu.project.gcContacts || []).slice(0, 1).map(c => (<>
                  <a key="email" href={'mailto:' + c.email} style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.06em', color: 'var(--color-accent)', textDecoration: 'none' }}>EMAIL</a>
                  <a key="call" href={'tel:' + c.phone} style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.06em', color: 'var(--color-accent)', textDecoration: 'none' }}>CALL</a>
                </>))}
              </div>
            </div>
            <button onClick={() => setSt(s => ({ ...s, followUps: { ...s.followUps, [fu.project.id]: (s.followUps[fu.project.id] || []).map(f => f.id === fu.id ? { ...f, done: true } : f) } }))} style={{ padding: '8px 12px', background: 'none', border: '1px solid var(--color-text)', font: '600 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>MARK DONE</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrmList({ st, setSt, projects, effStage }: { st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; projects: Project[]; effStage: (id: string) => CrmStage; }) {
  const t0 = today0(); const soon = addDays(t0, 7);
  const glassProj = projects.filter(p => p.trade === 'glass');
  const acmProj = projects.filter(p => p.trade === 'acm');
  const glassDue = glassProj.filter(p => { const d = seedShiftDate(p.bidDue); return d && d >= t0 && d <= soon; });
  const acmDue = acmProj.filter(p => { const d = seedShiftDate(p.bidDue); return d && d >= t0 && d <= soon; });
  const filtered = projects.filter(p =>
    (st.crmStage === 'All' || effStage(p.id) === st.crmStage) &&
    (st.crmBd === 'All' || (st.deals[p.id] || {}).bd === st.crmBd) &&
    (!st.crmSearch || (p.name + p.client + p.scope + p.location).toLowerCase().includes(st.crmSearch.toLowerCase()))
  );
  const stageChipColor = (s: CrmStage) => ({ 'Bidding': 'var(--color-accent)', 'Feeling Good': STATUS.good, 'Neutral': 'var(--color-neutral-600)', 'At Risk': STATUS.awaiting, 'Sold': STATUS.good, 'Lost': 'var(--color-neutral-500)', 'No bid': 'var(--color-neutral-500)' } as Record<string, string>)[s] || 'var(--color-neutral-500)';
  const ALL_STAGES = ['All', ...STAGES] as const;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 28px 12px', borderBottom: '2px solid var(--color-text)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
          <div>
            <button onClick={() => setSt(s => ({ ...s, crmView: 'home' }))} style={{ background: 'none', border: 'none', font: '600 11px/1 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-accent-700)', cursor: 'pointer', padding: 0, marginBottom: 6, display: 'block' }}>← ALL PROJECTS</button>
            <div style={{ font: '800 22px/1.05 var(--font-heading)' }}>CRM LIST</div>
          </div>
        </div>
        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '2px solid var(--color-text)', marginBottom: 12 }}>
          {[['ACTIVE PROJECTS · GLASS', glassProj.length, 'projects'], ['ACTIVE PROJECTS · ACM', acmProj.length, 'projects'], ['GLASS DUE THIS WEEK', glassDue.length, 'due this week'], ['ACM DUE THIS WEEK', acmDue.length, 'due this week']].map(([l, v, n], i) => (
            <div key={l as string} style={{ padding: '10px 0', borderRight: i < 3 ? '1px solid var(--color-divider)' : 'none', paddingRight: i < 3 ? 14 : 0, paddingLeft: i > 0 ? 14 : 0 }}>
              <div style={T.label}>{l}</div><div style={{ font: '800 26px/1 var(--font-heading)', margin: '4px 0 2px' }}>{v}</div><div style={T.micro}>{n}</div>
            </div>
          ))}
        </div>
        {/* filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={st.crmSearch} onChange={e => setSt(s => ({ ...s, crmSearch: e.target.value }))} placeholder="Search project, GC, scope or city…" style={{ ...inp, width: 240, padding: '7px 10px' }} />
          <div style={{ display: 'flex', border: '1px solid var(--color-text)' }}>
            {ALL_STAGES.map(s => { const on = st.crmStage === s; return <button key={s} onClick={() => setSt(ss => ({ ...ss, crmStage: s }))} style={{ padding: '8px 11px', border: 'none', background: on ? 'var(--color-text)' : 'transparent', color: on ? 'var(--color-neutral-100)' : 'var(--color-neutral-700)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', whiteSpace: 'nowrap' }}>{s === 'All' ? 'ALL' : s.length > 9 ? s.split(' ')[0].toUpperCase() : s.toUpperCase()}</button>; })}
          </div>
          <div style={{ display: 'flex', border: '1px solid var(--color-text)' }}>
            {['All', ...BD_ROSTER].map(b => { const on = st.crmBd === b; return <button key={b} onClick={() => setSt(s => ({ ...s, crmBd: b }))} style={{ padding: '8px 11px', border: 'none', background: on ? 'var(--color-text)' : 'transparent', color: on ? 'var(--color-neutral-100)' : 'var(--color-neutral-700)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>{b === 'All' ? 'ALL BD' : b.toUpperCase()}</button>; })}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ ...T.micro, padding: '7px 28px', borderBottom: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)' }}>{filtered.length} PROJECTS · {money(filtered.reduce((a, p) => a + num((st.deals[p.id] || {}).price || ''), 0))} TOTAL PRICED</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: 'var(--color-neutral-100)' }}>
            {['PROJECT', 'LOCATION', 'DRAW', 'LOGGED', 'BID DUE', 'ESTIMATOR', 'MANAGER', 'SELL PRICE', 'GP %', 'STAGE'].map(h => <th key={h} style={{ padding: '9px 12px', borderBottom: '2px solid var(--color-text)', textAlign: 'left', ...T.label }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(p => {
              const d = st.deals[p.id] || {};
              const stage = effStage(p.id);
              return (
                <tr key={p.id} onClick={() => setSt(s => ({ ...s, crmView: 'record', dealId: p.id, crmPane: 'info' }))} className="cg-row" style={{ cursor: 'pointer' }}>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-divider)' }}><div style={{ font: '600 13px/1.2 var(--font-body)' }}>{p.short || p.name}</div><div style={T.micro}>{p.client}</div></td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-divider)', ...T.body }}>{p.location}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-divider)' }}>{(p.drawings || d.docStage) && <Chip tone="neutral">{p.drawings || d.docStage}</Chip>}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-divider)', ...T.body }}>{d.loggedAt || '—'}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-divider)', ...T.body, color: (() => { const dd = seedShiftDate(p.bidDue); return dd && dd <= today0() ? 'var(--color-accent)' : 'var(--color-text)'; })() }}>{p.bidDue}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-divider)', ...T.body }}>{personName(d.estimator || '')}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-divider)', ...T.body }}>{personName(d.manager || '')}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-divider)', font: '600 13px/1 var(--font-body)' }}>{d.price ? money(num(d.price)) : '—'}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-divider)', font: '600 13px/1 var(--font-body)' }}>{gpPct(d.price || '', d.cost || '')}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-divider)' }}><span style={{ padding: '3px 8px', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', background: 'var(--color-neutral-100)', color: stageChipColor(stage) }}>{stage.toUpperCase()}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function stageChipColor(s: CrmStage): string {
  return ({ 'Bidding': 'var(--color-accent)', 'Feeling Good': STATUS.good, 'Neutral': 'var(--color-neutral-600)', 'At Risk': STATUS.awaiting, 'Sold': STATUS.good, 'Lost': 'var(--color-neutral-500)', 'No bid': 'var(--color-neutral-500)' } as Record<string, string>)[s] || 'var(--color-neutral-500)';
}

// ─── CRM Record ────────────────────────────────────────────────────────────────
function CrmRecord({ st, setSt, me, projects, effStage, addRevision, addFollowUp, flash, setDeal, logNote }: {
  st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; projects: Project[];
  effStage: (id: string) => CrmStage; addRevision: () => void; addFollowUp: () => void; flash: (m: string) => void;
  setDeal: (id: string, p: Partial<Deal>) => void;
  logNote: (pid: string, text: string, tag: string) => boolean | void;
}) {
  const proj = projects.find(p => p.id === st.dealId) || projects[0];
  if (!proj) return null;
  const deal: Deal = st.deals[proj.id] || { estimator: '', manager: '', bd: '', stage: 'Bidding', docStage: '', price: '', cost: '', loggedAt: '', assignedAt: '' };
  const stage = effStage(proj.id);
  const revList = st.revisions[proj.id] || [];
  const projNotes = (st.projNotes[proj.id] || []) as Array<NoteEntry & { tag?: string; label?: string }>;
  const [noteLogDraft, setNoteLogDraft] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTarget, setSendTarget] = useState('');
  const projTasks = st.tasks.filter(t => t.projectId === proj.id && t.status !== 'Complete');
  const dueDate = seedShiftDate(proj.bidDue);
  const finalPrice = num(deal.price);
  const finalCost = num(deal.cost);
  const grossProfit = finalPrice && finalCost ? finalPrice - finalCost : 0;
  const gpMargin = finalPrice && finalCost ? Math.round(grossProfit / finalPrice * 100) : 0;
  const GP_TARGET = 25;

  const PANES: Array<['info' | 'pricing' | 'followup', string]> = [['info', 'PROJECT INFO'], ['pricing', 'PRICING & REVISIONS'], ['followup', 'FOLLOW UP']];

  // Notes log column (always right)
  const NotesLog = () => (
    <div style={{ borderLeft: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ font: '800 14px/1 var(--font-heading)', marginBottom: 10 }}>NOTES LOG</div>
        <textarea value={noteLogDraft} onChange={e => setNoteLogDraft(e.target.value)} placeholder="Log a call, a scope change, a pricing decision…" style={{ ...inp, minHeight: 72, resize: 'vertical', marginBottom: 8 }} />
        <button onClick={() => { if (logNote(proj.id, noteLogDraft, 'spec')) { setNoteLogDraft(''); flash('Note logged'); } }} style={{ padding: '8px 14px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '600 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>LOG IT</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 18px' }}>
        {[...projNotes].reverse().map((n, i) => (
          <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-divider)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ font: '600 12px/1 var(--font-body)' }}>{n.who}</span>
              <span style={T.micro}>{n.when}</span>
            </div>
            <div style={T.body}>{n.text}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '16px 28px 12px', borderBottom: '2px solid var(--color-text)', flexShrink: 0 }}>
        <button onClick={() => setSt(s => ({ ...s, crmView: 'list' }))} style={{ background: 'none', border: 'none', font: '600 11px/1 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-accent-700)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}>← ALL PROJECTS</button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...T.micro, letterSpacing: '.14em', color: 'var(--color-accent-700)', marginBottom: 4 }}>{proj.ref} · {proj.client}</div>
            <div style={{ font: '800 24px/1.1 var(--font-heading)', textWrap: 'pretty', maxWidth: '30ch' }}>{proj.name}</div>
            <div style={{ ...T.meta, marginTop: 6 }}>{proj.scope} · {proj.location} · bid due <span style={{ color: dueDate && dueDate <= today0() ? 'var(--color-accent)' : 'var(--color-text)' }}>{proj.bidDue}</span></div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            <button style={{ padding: '6px 10px', background: 'none', border: '1px solid var(--color-text)', font: '600 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>EDIT</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--color-text)', width: 'max-content', marginTop: 14 }}>
          {PANES.map(([p, l]) => { const on = st.crmPane === p; return <button key={p} onClick={() => setSt(s => ({ ...s, crmPane: p }))} style={{ padding: '9px 14px', border: 'none', background: on ? 'var(--color-text)' : 'transparent', color: on ? 'var(--color-neutral-100)' : 'var(--color-neutral-700)', font: '600 11px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer' }}>{l}</button>; })}
        </div>
      </div>

      {/* body: 3 columns for info, 2 for pricing/followup */}
      {st.crmPane === 'info' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 320px', minHeight: 0, overflow: 'hidden' }}>
          {/* col 1: PROJECT */}
          <div style={{ overflow: 'auto', padding: '20px 24px', borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ font: '800 14px/1 var(--font-heading)', marginBottom: 4 }}>PROJECT</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Location', proj.location || '—'], ['Scope', proj.scope], ['General Contractor', proj.gc || proj.client], ['Drawing Stage', proj.drawings || deal.docStage || '—'], ['CRM Stage', stage]].map(([l, v]) => (
                <div key={l} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, borderBottom: '1px solid var(--color-divider)', paddingBottom: 8 }}>
                  <span style={T.label}>{l}</span><span style={{ font: '400 13px/1.4 var(--font-body)' }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, borderBottom: '1px solid var(--color-divider)', paddingBottom: 8 }}>
                <span style={T.label}>Estimator</span>
                <select value={deal.estimator} onChange={e => setDeal(proj.id, { estimator: e.target.value })} style={{ ...inp, padding: '4px 8px', appearance: 'none' }}>
                  {PEOPLE.filter(p => p.kind === 'estimator').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, borderBottom: '1px solid var(--color-divider)', paddingBottom: 8 }}>
                <span style={T.label}>Estimating Manager</span><span style={{ font: '400 13px/1.4 var(--font-body)' }}>{personName(deal.manager)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <span style={T.label}>BD Rep</span>
                <select value={deal.bd} onChange={e => setDeal(proj.id, { bd: e.target.value })} style={{ ...inp, padding: '4px 8px', appearance: 'none' }}>
                  <option value="">— none —</option>
                  {BD_ROSTER.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => { setSendTarget(deal.estimator || ''); setShowSendModal(true); }} style={{ padding: '10px 14px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '600 12px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', textAlign: 'left', marginTop: 8 }}>SEND TO ESTIMATOR'S QUEUE</button>
          </div>
          {/* col 2: DATES + GC + TASKS */}
          <div style={{ overflow: 'auto', padding: '20px 24px', borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={{ font: '800 13px/1 var(--font-heading)', marginBottom: 12 }}>DATES</div>
              {[['Logged In', deal.loggedAt || '—'], ['Assigned', deal.assignedAt || '—'], ['Last Price Logged', deal.lastPricedAt || '—'], ['Bid Due', proj.bidDue]].map(([l, v]) => (
                <div key={l} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, borderBottom: '1px solid var(--color-divider)', paddingBottom: 8, marginBottom: 8 }}>
                  <span style={T.label}>{l}</span><span style={{ font: '400 13px/1.3 var(--font-body)', color: l === 'Bid Due' && dueDate && dueDate <= today0() ? 'var(--color-accent)' : 'var(--color-text)' }}>{v}</span>
                </div>
              ))}
            </div>
            {(proj.gcContacts || []).length > 0 && (
              <div>
                <div style={{ font: '800 13px/1 var(--font-heading)', marginBottom: 10 }}>GC CONTACT</div>
                {(proj.gcContacts || []).map((c, i) => (
                  <div key={i} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--color-divider)' }}>
                    <div style={{ font: '600 13px/1.2 var(--font-body)' }}>{c.name} <span style={T.micro}>{c.title}</span></div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <a href={'mailto:' + c.email} style={{ ...T.micro, color: 'var(--color-accent-700)' }}>{c.email}</a>
                      <span style={T.micro}>·</span>
                      <a href={'tel:' + c.phone} style={{ ...T.micro, color: 'var(--color-accent-700)' }}>{c.phone}</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {projTasks.length > 0 && (
              <div>
                <div style={{ font: '800 13px/1 var(--font-heading)', marginBottom: 10 }}>OPEN TASKS</div>
                {projTasks.map(t => (
                  <button key={t.id} onClick={() => setSt(s => ({ ...s, app: 'tracker', view: 'projects', openTaskId: t.id }))} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-divider)', background: 'none', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--color-divider)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span style={{ font: '600 12.5px/1.25 var(--font-body)' }}>{t.title}</span>
                      <span style={T.micro}>{personFirst(t.who)} · {t.due}</span>
                    </div>
                    <span style={{ padding: '3px 8px', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', color: statusColor(t.status), background: 'var(--color-neutral-200)', flexShrink: 0 }}>{statusShort(t.status)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* col 3: Notes Log */}
          <NotesLog />
        </div>
      )}

      {st.crmPane === 'pricing' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 320px', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ overflow: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid var(--color-divider)' }}>
            {/* final pricing */}
            <div>
              <div style={{ font: '800 14px/1 var(--font-heading)', marginBottom: 14 }}>FINAL PRICING</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
                <div><div style={T.label}>SELL PRICE</div><div style={{ font: '800 28px/1 var(--font-heading)', marginTop: 6 }}>{finalPrice ? money(finalPrice) : '—'}</div></div>
                <div><div style={T.label}>COST</div><div style={{ font: '800 28px/1 var(--font-heading)', marginTop: 6 }}>{finalCost ? money(finalCost) : '—'}</div></div>
                <div><div style={T.label}>GROSS PROFIT</div><div style={{ font: '800 28px/1 var(--font-heading)', marginTop: 6 }}>{grossProfit ? money(grossProfit) : '—'}</div></div>
                <div><div style={T.label}>GP MARGIN</div><div style={{ font: '800 28px/1 var(--font-heading)', marginTop: 6, color: gpMargin < GP_TARGET ? 'var(--color-accent)' : STATUS.good }}>{gpMargin ? gpMargin + '%' : '—'}</div></div>
              </div>
              {finalPrice > 0 && <div style={{ ...T.micro, color: gpMargin >= GP_TARGET ? STATUS.good : 'var(--color-accent)' }}>All {gpMargin >= GP_TARGET ? 'at or above' : 'below'} this {GP_TARGET}% target margin.</div>}
            </div>
            <Rule strong />
            {/* log revision */}
            <div>
              <div style={{ font: '800 14px/1 var(--font-heading)', marginBottom: 12 }}>LOG A REVISION</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <Field label="REASON"><input value={st.revDraft.label} onChange={e => setSt(s => ({ ...s, revDraft: { ...s.revDraft, label: e.target.value } }))} placeholder="e.g. Addendum 3" style={inp} /></Field>
                <Field label="SELL PRICE"><input value={st.revDraft.price} onChange={e => setSt(s => ({ ...s, revDraft: { ...s.revDraft, price: e.target.value } }))} placeholder="0" style={inp} /></Field>
                <Field label="COST — REQUIRED FOR GP"><input value={st.revDraft.cost} onChange={e => setSt(s => ({ ...s, revDraft: { ...s.revDraft, cost: e.target.value } }))} placeholder="0" style={inp} /></Field>
                <Field label="NOTE"><input value={st.revDraft.note} onChange={e => setSt(s => ({ ...s, revDraft: { ...s.revDraft, note: e.target.value } }))} placeholder="What changed?" style={inp} /></Field>
              </div>
              <button onClick={addRevision} style={{ padding: '11px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '600 12px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer' }}>LOG REVISION R{revList.length}</button>
            </div>
            <Rule />
            {/* revision history */}
            <div>
              <div style={{ font: '800 14px/1 var(--font-heading)', marginBottom: 10 }}>REVISION HISTORY <span style={T.micro}>{revList.length} revision{revList.length !== 1 ? 's' : ''}</span></div>
              {revList.length === 0 ? <div style={T.meta}>No revisions logged yet.</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr>{['REV', 'REASON', 'SELL PRICE', 'COST', 'GP %', 'LOGGED'].map(h => <th key={h} style={{ padding: '7px 10px', borderBottom: '1px solid var(--color-text)', textAlign: 'left', ...T.label }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {revList.map(r => (
                      <tr key={r.rev}>
                        <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--color-divider)', font: '700 13px/1 var(--font-body)' }}>{r.rev}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--color-divider)', ...T.body }}>{r.label}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--color-divider)', font: '600 13px/1 var(--font-body)' }}>{money(num(r.price))}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--color-divider)', font: '600 13px/1 var(--font-body)' }}>{money(num(r.cost))}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--color-divider)', font: '600 13px/1 var(--font-body)' }}>{gpPct(r.price, r.cost)}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--color-divider)', ...T.micro }}>{r.when}<br />{r.who}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <Rule />
            {/* proposal upload */}
            <div>
              <div style={{ font: '800 14px/1 var(--font-heading)', marginBottom: 4 }}>PROPOSAL — UPLOAD AND AUTOFILL</div>
              <Rule />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 14 }}>
                <div>
                  <div style={{ ...T.label, marginBottom: 8 }}>UPLOAD THE PROPOSAL</div>
                  <input type="file" accept=".pdf" onChange={() => flash('PDF read — paste the scope text below to autofill')} style={{ display: 'block', marginBottom: 8 }} />
                  <div style={{ border: '2px dashed var(--color-divider)', padding: '24px 16px', textAlign: 'center', ...T.meta }}>
                    Text-based files are read directly. For a PDF, paste the scope text below — the reader cannot crack a scanned image.
                  </div>
                </div>
                <div>
                  <div style={{ ...T.label, marginBottom: 8 }}>LOGGED FROM THE PROPOSAL <span style={{ ...T.micro, marginLeft: 6 }}>nothing read yet</span></div>
                  <div style={{ ...T.meta, marginBottom: 6 }}>STATUS</div>
                  <div style={{ ...T.body, color: 'var(--color-neutral-600)' }}>Upload or paste the proposal, then hit READ THE PROPOSAL — the scope, inclusions, exclusions, alternates and any price found get logged here and into the revision draft.</div>
                </div>
              </div>
            </div>
          </div>
          <NotesLog />
        </div>
      )}

      {st.crmPane === 'followup' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 320px', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ overflow: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16, borderRight: '1px solid var(--color-divider)' }}>
            <div style={{ font: '800 14px/1 var(--font-heading)' }}>FOLLOW-UP</div>
            <Field label="FOLLOW-UP DATE"><input type="date" value={st.followDate} onChange={e => setSt(s => ({ ...s, followDate: e.target.value }))} style={inp} /></Field>
            <Field label="WHAT TO CHASE"><textarea value={st.followNote} onChange={e => setSt(s => ({ ...s, followNote: e.target.value }))} placeholder="What needs following up?" style={{ ...inp, minHeight: 70, resize: 'vertical' }} /></Field>
            <Button onClick={addFollowUp} style={{ width: 'max-content' }}>SET FOLLOW-UP</Button>
            {(st.followUps[proj.id] || []).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ ...T.label, marginBottom: 10 }}>HISTORY</div>
                {(st.followUps[proj.id] || []).map(fu => (
                  <div key={fu.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ font: '600 12px/1 var(--font-body)', textDecoration: fu.done ? 'line-through' : 'none', color: fu.done ? 'var(--color-neutral-500)' : 'var(--color-text)' }}>{fu.date}</div>
                      <div style={{ ...T.body, color: fu.done ? 'var(--color-neutral-500)' : 'var(--color-text)', marginTop: 3 }}>{fu.note}</div>
                    </div>
                    {fu.done ? <span style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', color: STATUS.good }}>DONE</span>
                      : <button onClick={() => setSt(s => ({ ...s, followUps: { ...s.followUps, [proj.id]: (s.followUps[proj.id] || []).map(f => f.id === fu.id ? { ...f, done: true } : f) } }))} style={{ padding: '5px 8px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>DONE</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <NotesLog />
        </div>
      )}

      {/* ── Send to Estimator modal ── */}
      {showSendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.5)', display: 'grid', placeItems: 'center', zIndex: 90 }}>
          <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 460, maxWidth: '92vw', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--color-text)', font: '800 16px/1 var(--font-heading)' }}>SEND TO ESTIMATOR</div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...T.body }}>Select an estimator to assign <strong>{proj.short || proj.name}</strong> to their task tracker.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PEOPLE.filter(p => p.kind === 'estimator').map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSendTarget(p.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '2px solid ' + (sendTarget === p.id ? 'var(--color-text)' : 'var(--color-divider)'), background: sendTarget === p.id ? 'var(--color-text)' : 'transparent', color: sendTarget === p.id ? '#fff' : 'var(--color-text)', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ width: 32, height: 32, background: sendTarget === p.id ? 'var(--color-accent)' : 'var(--color-neutral-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 11px/1 var(--font-body)', flexShrink: 0, color: sendTarget === p.id ? '#fff' : 'var(--color-text)' }}>{p.initials}</div>
                    <div>
                      <div style={{ font: '700 13px/1 var(--font-heading)' }}>{p.name}</div>
                      <div style={{ font: '500 11px/1 var(--font-body)', opacity: .7, marginTop: 3 }}>{p.role}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <Button
                  onClick={() => {
                    if (!sendTarget) { flash('Select an estimator first'); return; }
                    const target = PEOPLE.find(p => p.id === sendTarget)!;
                    const wk = mondayOf(today0());
                    const dt = addDays(wk, 0); dt.setHours(0, 0, 0, 0);
                    const nt: Task = {
                      id: 'crm' + Date.now(),
                      title: 'Price ' + (proj.short || proj.name),
                      projectId: proj.id,
                      who: sendTarget,
                      status: 'To-Do',
                      due: prettyShort(dt),
                      day: 'Mon',
                      date: ymd(dt),
                      hrs: 4,
                      detail: 'Sent from CRM by ' + me.name + ' · bid due ' + proj.bidDue,
                      notes: [],
                    };
                    setSt(s => ({
                      ...s,
                      tasks: [...s.tasks, nt],
                      app: 'tracker',
                      view: 'projects',
                      projectId: proj.id,
                    }));
                    setDeal(proj.id, { estimator: sendTarget, assignedAt: new Date().toLocaleDateString([], { month: 'short', day: '2-digit' }) });
                    setShowSendModal(false);
                    flash('Sent to ' + target.first + ' — task added to their tracker');
                  }}
                >
                  SEND TO TRACKER
                </Button>
                <Button variant="secondary" onClick={() => setShowSendModal(false)}>CANCEL</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  if (!userId) return <LoginScreen onLogin={setUserId} />;
  return <MainApp userId={userId} onSignOut={() => setUserId(null)} />;
}
