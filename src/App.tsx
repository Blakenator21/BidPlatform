import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  PEOPLE, PROJECTS, mkTasks, INITIAL_REVISIONS, INITIAL_DEALS,
  NOTE_TAGS, WEEKDAY_LABELS,
  INITIAL_BID_PROJECTS, BID_LEVELS, DECLINE_REASONS,
  money, num, gpPct, gpNum, statusColor, statusShort, personName, personFirst, personInitials,
  taskDate, seedShiftDate, ymd, prettyShort, mondayOf, addDays,
  emptyGc,
  type Task, type TaskStatus, type Deal, type Revision,
  type FollowUp, type NoteEntry, type Person, type Project, type BidProject, type BidStatus, type GcEntry,
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
type View = 'myday' | 'overview' | 'calendar' | 'capacity' | 'teamcapacity' | 'projects' | 'teamconnection' | 'resources' | 'meetings';
type AppTab = 'board' | 'tracker';
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
  projNoteDraft: string; projNoteTag: string;
  overviewMode: 'signals' | 'swimlanes' | 'teamcal';
  calOff: number; capOff: number;
  expandedProj: Record<string, boolean>;
  noteLogDraft: Record<string, string>;
  toast: string; listening: boolean;
  newTaskSelfOnly: boolean;
  helpRequests: Array<{ id: string; from: string; fromName: string; projectId: string; when: string; read: boolean; }>;
  projStatusOverride: Record<string, 'todo' | 'awaiting' | 'comeback' | 'good'>;
  focusProjOrder: string[];
  bidProjects: BidProject[];
  tcSelected: string;
  tcMessages: Record<string, Array<{ from: string; text: string; at: number; attachments?: Array<{ name: string; size: string; isImage: boolean; url?: string }>; }>>;
  tcReadAt: Record<string, number>;
  tcCompose: string;
  tcGifPanel: boolean;
  tcPendingFiles: Array<{ name: string; size: string; isImage: boolean; url?: string }>;
  resCategory: 'processes' | 'vendors' | 'tools' | 'training';
  resSearch: string;
  resVendorTrade: string;
  resSelectedVendor: string | null;
  resProcessReader: string | null;
  resTrainingFilter: string;
  resAddingResource: boolean;
  resVideoOpen: string | null;
  customTrainingTypes: string[];
  userTrainingVideos: Array<{ id: string; type: string; title: string; length: string; description: string; videoUrl: string; videoObjectUrl?: string; }>;
  userProcesses: Array<{ id: string; kind: 'PDF' | 'DOCX' | 'OTHER'; title: string; owner: string; summary: string; fileUrl?: string; fileName?: string; sections: Array<{ heading: string; body: string }> }>;
  userVendors: Array<{ id: string; name: string; trade: string; about: string; leadTime: string; quoteTurnaround: string; terms: string; contacts: Array<{ name: string; role: string; phone: string; email: string }> }>;
  customVendorTrades: string[];
  userTools: Array<{ id: string; name: string; kind: string; note: string; fileUrl?: string; fileName?: string; meta: string; training: string[] }>;
  memberStatuses: Record<string, MemberStatus>;
  meetingState: 'idle' | 'prompt' | 'recording' | 'processing' | 'confirming';
  meetingSource: string;
  meetingRecordingBlob: string | null;
  meetingDraft: {
    transcript: string;
    suggestedProjectId: string;
    notes: Array<{ tag: string; text: string }>;
    tasks: Array<{ title: string; who: string; hrs: number; due: string }>;
  } | null;
  meetingHistory: Array<{
    id: string; at: number; source: string; projectId: string;
    transcript: string; notesAdded: number; tasksAdded: number;
  }>;
}

type MemberStatus = 'available' | 'busy' | 'in-meeting' | 'out-of-town' | 'out-of-office' | 'do-not-disturb';
const STATUS_OPTIONS: Array<{ value: MemberStatus; label: string; color: string; dot: string }> = [
  { value: 'available',     label: 'Available',       color: '#1f7a4d', dot: '#22c55e' },
  { value: 'busy',          label: 'Busy',            color: '#b45309', dot: '#f59e0b' },
  { value: 'in-meeting',    label: 'In a Meeting',    color: '#6d28d9', dot: '#a78bfa' },
  { value: 'out-of-town',   label: 'Out of Town',     color: '#0369a1', dot: '#38bdf8' },
  { value: 'out-of-office', label: 'Out of Office',   color: '#6b7280', dot: '#9ca3af' },
  { value: 'do-not-disturb','label': 'Do Not Disturb', color: '#dc2626', dot: '#f87171' },
];

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
    projNoteDraft: '', projNoteTag: 'spec',
    overviewMode: 'signals',
    calOff: 0, capOff: 0,
    expandedProj: {},
    noteLogDraft: {},
    toast: '', listening: false,
    newTaskSelfOnly: false,
    helpRequests: [],
    projStatusOverride: {},
    focusProjOrder: [],
    bidProjects: INITIAL_BID_PROJECTS.map(b => ({ ...b })),
    tcSelected: 'ch:all',
    tcMessages: {
      'ch:all': [
        { from: 'blake', text: 'Cedar Point addendum 3 just dropped — everyone check drawings.', at: Date.now() - 3600000 * 2 },
        { from: 'ray', text: 'Thanks Blake. Let us know if scope changes.', at: Date.now() - 3600000 },
      ],
      'ch:mgrs': [
        { from: 'ray', text: 'Quick call at 2pm to review the bid pipeline?', at: Date.now() - 7200000 },
        { from: 'blake', text: 'Works for me.', at: Date.now() - 7100000 },
      ],
      'blake~eric': [
        { from: 'blake', text: 'Eric, can you get the glazing quote from Oldcastle by Wednesday?', at: Date.now() - 86400000 },
        { from: 'eric', text: 'On it — will send as soon as I hear back.', at: Date.now() - 80000000 },
      ],
    },
    tcReadAt: { 'ch:all': Date.now() - 500000 },
    tcCompose: '',
    tcGifPanel: false,
    tcPendingFiles: [],
    resCategory: 'processes',
    resSearch: '',
    resVendorTrade: 'All trades',
    resSelectedVendor: null,
    resProcessReader: null,
    resTrainingFilter: 'All training',
    resAddingResource: false,
    resVideoOpen: null,
    customTrainingTypes: [],
    userTrainingVideos: [],
    userProcesses: [],
    userVendors: [],
    userTools: [],
    customVendorTrades: [],
    memberStatuses: {},
    meetingState: 'idle',
    meetingSource: 'manual',
    meetingRecordingBlob: null,
    meetingDraft: null,
    meetingHistory: [],
  };
}

// ─── Bid Board ────────────────────────────────────────────────────────────────
const BID_STATUS_COLOR: Record<BidStatus, string> = {
  pending: 'var(--color-text)',
  accepted: '#1f7a4d',
  declined: 'var(--color-accent)',
  review: 'oklch(0.50 0.18 240)',
};
const BID_STATUS_LABEL: Record<BidStatus, string> = {
  pending: 'AWAITING', accepted: 'ACCEPTED', declined: 'DECLINED', review: 'IN REVIEW',
};
const REVIEW_REASONS = ['Still deciding', 'Deeper dive needed', 'Too full this week', 'Waiting on more info', 'Other'];

const emptyDraft = (): Partial<BidProject> => ({
  name: '', gc: '', gcs: [emptyGc()], bidDate: '', level: '100% CD', location: '',
  scope: '', planRoom: '', info: '', notes: '',
  status: 'pending', assignees: [], declineReason: '', declineNote: '', reviewReason: '', notified: false,
  archived: false,
});

function BidBoardView({ st, setSt, me, flash, onSignOut }: {
  st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>;
  me: Person; flash: (m: string) => void; onSignOut: () => void;
}) {
  const [boardView, setBoardView] = useState<'grid' | 'byEstimator'>('grid');
  const [filter, setFilter] = useState<'all' | 'pending' | 'review' | 'accepted' | 'declined' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState(REVIEW_REASONS[0]);
  const [reviewNote, setReviewNote] = useState('');
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

  // Friday auto-archive: on mount, archive any bid that has passed its bid date and is not already archived
  React.useEffect(() => {
    const now = new Date();
    const isFriday = now.getDay() === 5;
    if (!isFriday) return;
    const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).replace(/^(\w+) 0?(\d+)$/, '$1 $2');
    const toArchive = bids.filter(b => !b.archived && (b.status === 'accepted' || b.status === 'declined') && b.bidDate && b.bidDate < todayStr);
    if (!toArchive.length) return;
    setSt(s => ({ ...s, bidProjects: s.bidProjects.map(b =>
      toArchive.some(a => a.id === b.id) ? { ...b, archived: true, archivedAt: todayStr } : b
    )}));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = bids.filter(b => !b.archived && b.status === 'pending').length;
  const inReview = bids.filter(b => !b.archived && b.status === 'review').length;
  const accepted = bids.filter(b => !b.archived && b.status === 'accepted').length;
  const declined = bids.filter(b => !b.archived && b.status === 'declined').length;
  const archived = bids.filter(b => b.archived).length;

  const filtered = bids.filter(b => {
    if (filter === 'archived') return !!b.archived;
    if (b.archived) return false;
    if (filter === 'pending' && b.status !== 'pending') return false;
    if (filter === 'review' && b.status !== 'review') return false;
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

    // generate tasks anchored to assignment date and bid due date
    const t0 = today0();
    const primary = assignees[0];
    const size = bid.jobSize || 'medium';

    function nextWd(d: Date): Date {
      const nd = addDays(d, 1);
      const day = nd.getDay();
      if (day === 0) return addDays(nd, 1);
      if (day === 6) return addDays(nd, 2);
      return nd;
    }
    function prevWd(d: Date): Date {
      const pd = addDays(d, -1);
      const day = pd.getDay();
      if (day === 0) return addDays(pd, -1);
      if (day === 6) return addDays(pd, -1);
      return pd;
    }
    function nthWorkday(start: Date, n: number): Date {
      let d = new Date(start);
      for (let i = 0; i < n; i++) d = nextWd(d);
      return d;
    }
    function makeTask(title: string, d: Date, hrs: number, detail: string): Task {
      const wd = d.getDay() === 0 ? addDays(d, 1) : d.getDay() === 6 ? addDays(d, 2) : d;
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][wd.getDay()];
      return { id: 'bt' + Date.now() + Math.random().toString(36).slice(2), title, projectId: projId, who: primary, status: 'To-Do', due: prettyShort(wd), day: dayName, date: ymd(wd), hrs, detail, notes: [] };
    }

    const DAY_CAP = 8;
    const newTasks: Task[] = [];

    // Track hours used per date across existing tasks + newly queued tasks
    const dayUsed: Record<string, number> = {};
    for (const t of st.tasks.filter(t => t.who === primary)) {
      if (t.date) dayUsed[t.date] = (dayUsed[t.date] || 0) + (t.hrs || 0);
    }
    function hoursUsed(d: Date): number {
      return dayUsed[ymd(d)] || 0;
    }
    function reserveHours(d: Date, hrs: number) {
      const k = ymd(d);
      dayUsed[k] = (dayUsed[k] || 0) + hrs;
    }

    // Schedule a task starting on anchorDate, overflow to next workdays
    function scheduleTask(title: string, anchorDate: Date, totalHrs: number, detail: string) {
      let d = new Date(anchorDate);
      if (d.getDay() === 0) d = addDays(d, 1);
      if (d.getDay() === 6) d = addDays(d, 2);
      let remaining = totalHrs;
      while (remaining > 0) {
        const available = DAY_CAP - hoursUsed(d);
        if (available <= 0) { d = nextWd(d); continue; }
        const chunk = Math.min(remaining, available);
        const t = makeTask(remaining > chunk ? title + ' (cont.)' : title, d, chunk, detail);
        newTasks.push(t);
        reserveHours(d, chunk);
        remaining -= chunk;
        if (remaining > 0) d = nextWd(d);
      }
    }

    const bidDue = seedShiftDate(bid.bidDate) || nthWorkday(t0, 10);
    const day1 = nthWorkday(t0, 1);   // assignment + 1
    const day3 = nthWorkday(t0, 3);   // assignment + 3
    const day4 = nthWorkday(t0, 4);   // assignment + 4
    const dayBidMinus1 = prevWd(bidDue);
    const dayBid = bidDue.getDay() === 0 ? addDays(bidDue, 1) : bidDue.getDay() === 6 ? addDays(bidDue, 2) : bidDue;

    // Day +1: Project Acceptance, Download & Review, Vendor Distribution (all same day)
    scheduleTask('Project Acceptance and Customer Engagement', day1, 0.5, 'a. Intro Emails\nb. RFI\'s');
    scheduleTask('Download and Review Project Documents', day1, size === 'large' ? 3 : size === 'medium' ? 2 : 1, 'a. Initial review of the drawings to confirm scope\nb. Review all specifications\nc. Review Project Manual\nd. Review Addenda\ne. Review Project Schedule\nf. Review Bid Forms\ng. Create Project Folder');
    scheduleTask('Vendor Distribution', day1, 0.5, 'a. Send out RFQ\'s for Division 7 & 8');

    // Day +3: Plan Set Review & Takeoff
    scheduleTask('Plan Set Review & Takeoff', day3, size === 'large' ? 12 : size === 'medium' ? 6 : 3, 'a. Design Criteria\n  i. General Notes\n  ii. Building Code\n  iii. Design Loads\n  iv. Wind Pressures\n  v. Performance Requirements\n  vi. Fire Ratings\n  vii. Accessibility Requirements\nb. Architectural Drawings Takeoff\n  i. Overall Floor Plans\n  ii. Enlarged Floor Plans\n  iii. Overall Elevations\n  iv. Enlarged Elevations\n  v. Reflected Ceiling Plans\n  vi. Roof Plans\n  vii. Exterior Details\nc. Details\n  i. Door Schedules\n  ii. Frame Details\n  iii. Window Schedules\n  iv. Curtain Wall Schedules\n  v. Finish Schedules\n  vi. Hardware Schedules\n  vii. Glass Schedules\nd. Quantities\n  i. Curtainwall  ii. Storefront  iii. Windows  iv. Entrances  v. Doors  vi. Glass  vii. Louvers  viii. Panels  ix. Misc glazing  x. Flashings  xi. Trim  xii. Sealants  xiii. Accessories\n  xiv. Verify all quantities against schedules and drawing details\ne. Review Other Drawing Disciplines\n  i. Structural Drawings  ii. Metal Panel Drawings  iii. Waterproofing Details  iv. Interior Details\nf. Identify Drawing Conflicts\n  i. Drawings and specifications  ii. Floor plans and elevations  iii. Elevations and details  iv. Schedules and details  v. Architectural and structural  vi. Architectural and mechanical\ng. Missing Information\n  i. Request clarification from GC  ii. Submit an RFI if Necessary');

    // Day +4: Building the Costing Sheet
    scheduleTask('Building the Costing Sheet', day4, size === 'large' ? 4 : size === 'medium' ? 2 : 1, 'a. Costing Sheet\n  i. Enter all final material pricing  ii. Enter all labor hours  iii. Enter equipment costs  iv. Enter subcontractor costs  v. Verify taxes applied correctly  vi. Review final markups  vii. Confirm final selling price prior to proposal submission\nb. Bond Calculator\nc. Job Recap\n  i. Verify Labor Calculations  ii. Enter selected vendor totals  iii. Confirm glazing totals  iv. Review overall material costs  v. Verify labor hours from production rates\nd. Elevation Recap - Enter all dimensions for: Storefront, Window Wall, Curtainwall, Entrances, Sunshades, Misc Framing\ne. Equipment: Boom lifts, Scissor Lifts, Forklifts, Cranes, Specialized Installation Equipment\nf. Swing Stage: Rental Duration, Mobilization, Installation, Removal, Safety Requirements\ng. G1-G11 Glazing Tabs\n  i. Enter Glass Sizes  ii. Enter Glazing Quantities  iii. Compare Multiple Fabricator quotations  iv. Verify Glass make-up  v. Verify Low-E Coatings  vi. Verify performance requirements  vii. Verify specification compliance\nh. Vendor Quote Management\n  i. Review each quote for spec compliance  ii. Verify glass make-up, framing, finishes, accessories & exclusions  iii. Compare pricing from multiple qualified vendors  iv. Confirm quote satisfies design criteria\ni. Material Lead Times: Identify schedule risks, Assist business development, Support schedule qualifications, Coordinate procurement planning');

    // Bid date −1: Review with Manager
    scheduleTask('Review with Manager', dayBidMinus1, 1, 'a. Review final pricing and scope\nb. Confirm qualifications and exclusions\nc. Discuss strategy and presentation approach');

    // Bid date: Writing Proposal + Presentation Packet + Submission
    scheduleTask('Writing the Proposal', dayBid, size === 'large' ? 2 : size === 'medium' ? 1 : 0.5, 'a. Proposal ID\nb. Bid Date\nc. Project Name & Location\nd. Documents Provided\ne. Scope & Materials\nf. Pricing\ng. Qualifications, Inclusions & Exclusions\nh. 1CG Warranty & Disclaimer\ni. Correspondence to GC — PDF Proposal, Key mentions in email body, Presentation Packet/Takeoffs of highlighted scope');
    scheduleTask('Creating the Presentation Packet', dayBid, size === 'large' ? 1 : 0.5, 'a. Cover page\nb. Preliminary installation schedule\nc. Highlighted floor plans, elevations, and details\nd. Finish chart\ne. Product Data: Glass Type info, Every System Type\nf. Proposal Drawings\ng. 1CG Fabrications Capabilities\nh. 1CG Office locations\ni. 1CG Portfolio Pictures');
    scheduleTask('Submission of Proposal to Customer', dayBid, 0.5, 'a. Bid Forms');

    // create Deal
    const today = new Date().toLocaleDateString([], { month: 'short', day: '2-digit' });
    const newDeal: Deal = { estimator: primary, manager: '', bd: '', stage: 'Bidding', docStage: bid.level, price: '', cost: '', loggedAt: today, assignedAt: today };

    patchBid(bid.id, { status: 'accepted', assignees, notified: notify, assignedDate: today });
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
    if (!draft.jobSize) { flash('Select a job size (Large / Medium / Small)'); return; }
    const gcs = (draft.gcs && draft.gcs.length > 0) ? draft.gcs : [emptyGc()];
    const gc = gcs[0]?.company || draft.gc || '';
    if (editBid) {
      patchBid(editBid.id, { ...draft, gcs, gc });
    } else {
      const nb: BidProject = { ...emptyDraft(), ...draft, gcs, gc, id: 'bp' + Date.now(), status: 'pending', assignees: [], declineReason: '', declineNote: '', reviewReason: '', notified: false, archived: false, entryDate: new Date().toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }) } as BidProject;
      setSt(s => ({ ...s, bidProjects: [nb, ...s.bidProjects] }));
    }
    setShowUpload(false); setEditBid(null); setDraft(emptyDraft()); setItbText('');
    flash(editBid ? 'Bid updated' : 'Bid added to board');
  }

  function parseItb() {
    if (!itbText.trim()) { flash('Paste an ITB document first'); return; }
    const text = itbText;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const find = (...patterns: RegExp[]): string => {
      for (const re of patterns) {
        for (const l of lines) {
          const m = re.exec(l);
          if (m?.[1]) return m[1].trim().replace(/[<>]/g, '');
        }
      }
      return '';
    };

    // Project name — look for subject line or "Project:" label
    const projName = find(
      /subject[:\s]+(?:invitation to bid[:\s-]*|itb[:\s-]*)(.+)/i,
      /re[:\s]+(?:invitation to bid[:\s-]*|itb[:\s-]*)(.+)/i,
      /project(?:\s+name)?[:\s]+(.+)/i,
      /job(?:\s+name)?[:\s]+(.+)/i,
    );

    // GC company — from header, "from" line, or company label
    const gcCompany = find(
      /^from[:\s]+(.+?)(?:\s*<|$)/i,
      /(?:general contractor|gc|sent by|company)[:\s]+(.+)/i,
    );

    // Bid date — support many formats: "Sep 20", "09/20/2025", "September 20, 2025"
    const bidDateRaw = find(
      /bid\s*(?:due|date|deadline)[:\s]+([A-Za-z]+\.?\s+\d{1,2}(?:,?\s+\d{4})?)/i,
      /(?:due\s*date|submission\s*date)[:\s]+([A-Za-z]+\.?\s+\d{1,2}(?:,?\s+\d{4})?)/i,
      /bid\s*(?:due|date|deadline)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    );
    // Normalize date to "Mon DD" format
    let bidDate = bidDateRaw;
    if (bidDateRaw) {
      try {
        const parsed = new Date(bidDateRaw);
        if (!isNaN(parsed.getTime())) {
          bidDate = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      } catch { /* leave as-is */ }
    }

    // Drawing level
    const levelRaw = find(
      /(?:drawing|document|doc)\s*(?:stage|level|set)[:\s]+(.+)/i,
      /(\d{2,3}%\s*(?:CD|DD|SD|CDs?|DDs?|SDs?)(?:\s*\+\s*add(?:endum)?\.?\s*\d+)?)/i,
      /(?:100|90|75|50)%\s*(?:CD|DD|SD)/i,
    );
    // Match against known levels or keep raw
    const matchedLevel = BID_LEVELS.find(l => levelRaw && l.toLowerCase().includes(levelRaw.toLowerCase().slice(0, 6)));

    // Location — city/state
    const location = find(
      /(?:project\s+)?(?:location|address|city)[:\s]+(.+)/i,
      /(?:site\s+)?(?:address)[:\s]+(.+)/i,
    );

    // Scope
    const scope = find(
      /scope(?:\s+of\s+(?:work|bid))?[:\s]+(.+)/i,
      /(?:trade|work\s+type|description)[:\s]+(.+)/i,
    );

    // Plan room
    const planRoom = find(
      /(?:plan\s*room|plans?\s*(?:available|online|at|link)|download)[:\s]+(https?:\/\/\S+)/i,
      /(https?:\/\/(?:planroom|buildingconnected|bid\.net|ebidboard|smartbidnet|constructconnect|builtopia|panel|pantera)\S+)/i,
    );

    // Contact info for GC
    const contactName = find(
      /(?:contact|estimator|rep|pm|project\s+manager)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/,
      /(?:sincerely|regards|from)[,\s]+([A-Z][a-z]+ [A-Z][a-z]+)/,
    );
    const contactEmail = find(/([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/);
    const contactPhone = find(/(\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4})/);
    const contactTitle = find(/(?:title|role|position)[:\s]+(.+)/i);

    setDraft(d => {
      const newGcs = [...(d.gcs || [emptyGc()])];
      if (gcCompany || contactName || contactEmail || contactPhone) {
        newGcs[0] = {
          ...newGcs[0],
          company: gcCompany || newGcs[0].company,
          contactName: contactName || newGcs[0].contactName,
          contactTitle: contactTitle || newGcs[0].contactTitle,
          contactEmail: contactEmail || newGcs[0].contactEmail,
          contactPhone: contactPhone || newGcs[0].contactPhone,
        };
      }
      return {
        ...d,
        name: projName || d.name,
        gc: (gcCompany || newGcs[0].company) || d.gc,
        gcs: newGcs,
        bidDate: bidDate || d.bidDate,
        level: matchedLevel || levelRaw || d.level,
        location: location || d.location,
        scope: scope || d.scope,
        planRoom: planRoom || d.planRoom,
        info: d.info || text.slice(0, 800),
      };
    });
    flash('Fields extracted — review and confirm before saving');
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
          <td style="padding:10px 12px;border-bottom:1px solid #ddd;color:#666">${b.entryDate || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd;color:#666">${b.assignedDate || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd">${b.scope}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd">${b.level}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd">${b.location}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd">${b.planRoom ? '<a href="' + b.planRoom + '" style="color:#b82a0e">' + b.planRoom + '</a>' : '—'}</td>
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
                ${['PROJECT','GC','BID DATE','ENTRY DATE','ASSIGNED DATE','SCOPE','DRAWINGS','LOCATION','PLAN ROOM'].map(h => `<th style="text-align:left;padding:6px 12px;font-size:10px;letter-spacing:.12em;color:#666;font-weight:500;border-bottom:2px solid #201e1d">${h}</th>`).join('')}
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', borderBottom: '2px solid var(--color-text)', flexShrink: 0 }}>
        {[['AWAITING DECISION', pending, 'var(--color-text)'], ['IN REVIEW', inReview, 'oklch(0.50 0.18 240)'], ['ACCEPTED', accepted, '#1f7a4d'], ['DECLINED', declined, 'var(--color-accent)'], ['ARCHIVED', archived, 'var(--color-neutral-500)']].map(([label, n, color], i) => (
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
              <Seg value={filter} onChange={setFilter} options={[{ value: 'all', label: 'ALL' }, { value: 'pending', label: 'AWAITING' }, { value: 'review', label: 'IN REVIEW' }, { value: 'accepted', label: 'ACCEPTED' }, { value: 'declined', label: 'DECLINED' }, { value: 'archived', label: 'ARCHIVE' }]} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search GC, scope or location" style={{ ...inp, width: 240, padding: '8px 12px' }} />
            </div>
          </div>

          {/* card grid / archive list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
            {filtered.length === 0 && <div style={{ font: '500 14px/1.5 var(--font-body)', color: 'var(--color-neutral-600)', paddingTop: 20 }}>No bids match this filter.</div>}

            {/* ── ARCHIVE LIST VIEW ── */}
            {filter === 'archived' && filtered.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', font: '400 12.5px/1 var(--font-body)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-text)' }}>
                    {['PROJECT', 'GC', 'SCOPE', 'BID DATE', 'ENTRY DATE', 'ASSIGNED DATE', 'ARCHIVED', 'STATUS', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', font: '500 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(bid => {
                    const col = BID_STATUS_COLOR[bid.status];
                    const lbl = BID_STATUS_LABEL[bid.status];
                    return (
                      <tr key={bid.id} onClick={() => setDetailBid(bid)} style={{ borderBottom: '1px solid var(--color-divider)', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-neutral-100)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <td style={{ padding: '10px', font: '600 13px/1.2 var(--font-heading)', maxWidth: 220 }}>{bid.name}</td>
                        <td style={{ padding: '10px', color: 'var(--color-neutral-700)', whiteSpace: 'nowrap' }}>{bid.gc || '—'}</td>
                        <td style={{ padding: '10px', color: 'var(--color-neutral-700)', maxWidth: 160 }}>{bid.scope || '—'}</td>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap', font: '500 12px/1 var(--font-body)' }}>{bid.bidDate || '—'}</td>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap', font: '500 12px/1 var(--font-body)', color: 'var(--color-neutral-600)' }}>{bid.entryDate || '—'}</td>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap', font: '500 12px/1 var(--font-body)', color: 'var(--color-neutral-600)' }}>{bid.assignedDate || '—'}</td>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap', font: '500 12px/1 var(--font-body)', color: 'var(--color-neutral-500)' }}>{bid.archivedAt || '—'}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '3px 8px', background: col, color: '#fff', font: '700 9px/1 var(--font-body)', letterSpacing: '.1em', whiteSpace: 'nowrap' }}>{lbl}</span>
                        </td>
                        <td onClick={e => e.stopPropagation()} style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => patchBid(bid.id, { archived: false, archivedAt: undefined })} style={{ padding: '5px 10px', background: 'none', border: '1px solid var(--color-neutral-400)', font: '600 9px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>RESTORE</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* ── CARD GRID (all non-archive views) ── */}
            {filter !== 'archived' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {filtered.map(bid => {
                const col = BID_STATUS_COLOR[bid.status];
                const lbl = BID_STATUS_LABEL[bid.status];
                const cardBg = bid.status === 'accepted' ? 'rgba(31,122,77,.07)' : bid.status === 'declined' ? 'rgba(236,48,19,.06)' : bid.status === 'review' ? 'rgba(80,80,220,.07)' : 'var(--color-bg)';
                const cardBorder = bid.status === 'accepted' ? '2px solid rgba(31,122,77,.5)' : bid.status === 'declined' ? '2px solid rgba(236,48,19,.35)' : bid.status === 'review' ? '2px solid rgba(80,80,220,.35)' : '2px solid var(--color-text)';
                return (
                  <div key={bid.id} onClick={() => setDetailBid(bid)} style={{ border: cardBorder, display: 'flex', flexDirection: 'column', background: cardBg, cursor: 'pointer', transition: 'background .15s, border-color .15s' }}>
                    {/* photo slot */}
                    <div
                      onPaste={e => { e.stopPropagation(); handlePhotoPaste(bid.id, e); }}
                      style={{ position: 'relative', height: 220, background: bid.photo ? 'none' : 'var(--color-neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', overflow: 'hidden' }}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.14em', color: 'var(--color-accent)' }}>{bid.gc || 'GC TO BE CONFIRMED'}</div>
                        {bid.jobSize && <div style={{ padding: '2px 7px', background: bid.jobSize === 'large' ? 'var(--color-text)' : bid.jobSize === 'medium' ? 'oklch(0.50 0.18 240)' : 'var(--color-neutral-500)', color: '#fff', font: '700 9px/1 var(--font-body)', letterSpacing: '.1em' }}>{bid.jobSize.toUpperCase()}</div>}
                      </div>
                      <div style={{ font: '800 15px/1.2 var(--font-heading)' }}>{bid.name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[['BID DATE', bid.bidDate || '—'], ['DRAWINGS', bid.level], ['LOCATION', bid.location || '—'], ['SCOPE', bid.scope || '—']].map(([l, v]) => (
                          <div key={l} style={{ display: 'grid', gridTemplateColumns: '94px 1fr', gap: 6 }}>
                            <span style={{ font: '500 10px/1.4 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-600)' }}>{l}</span>
                            <span style={{ font: '400 11.5px/1.4 var(--font-body)' }}>{v}</span>
                          </div>
                        ))}
                        {[['ENTRY DATE', bid.entryDate], ['ASSIGNED', bid.assignedDate]].map(([l, v]) => v ? (
                          <div key={l} style={{ display: 'grid', gridTemplateColumns: '94px 1fr', gap: 6 }}>
                            <span style={{ font: '500 10px/1.4 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-600)' }}>{l}</span>
                            <span style={{ font: '500 11px/1.4 var(--font-body)', color: 'var(--color-neutral-500)' }}>{v}</span>
                          </div>
                        ) : null)}
                        {bid.planRoom && <div style={{ display: 'grid', gridTemplateColumns: '94px 1fr', gap: 6 }}><span style={{ font: '500 10px/1.4 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-600)' }}>PLAN ROOM</span><a href={bid.planRoom} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ font: '400 11.5px/1.4 var(--font-body)', color: 'var(--color-accent-700)', wordBreak: 'break-all' }}>Open ↗</a></div>}
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

                      {/* decline / review reason */}
                      {bid.status === 'declined' && bid.declineReason && (
                        <div style={{ font: '400 11px/1.5 var(--font-body)', color: 'var(--color-neutral-600)', borderLeft: '2px solid var(--color-accent)', paddingLeft: 8 }}>
                          {bid.declineReason}{bid.declineNote ? ' — ' + bid.declineNote : ''}
                        </div>
                      )}
                      {bid.status === 'review' && bid.reviewReason && (
                        <div style={{ font: '400 11px/1.5 var(--font-body)', color: 'oklch(0.50 0.18 240)', borderLeft: '2px solid oklch(0.50 0.18 240)', paddingLeft: 8 }}>
                          {bid.reviewReason}
                        </div>
                      )}

                      {/* actions */}
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--color-divider)', flexWrap: 'wrap' }}>
                        {(bid.status === 'pending' || bid.status === 'review') && <>
                          <button onClick={() => openAssign(bid.id)} style={{ flex: 1, padding: '9px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>ACCEPT</button>
                          <button onClick={() => { setDeclineFor(bid.id); setDeclineReason(DECLINE_REASONS[0]); setDeclineNote(''); }} style={{ flex: 1, padding: '9px', background: 'none', color: 'var(--color-text)', border: '1px solid var(--color-text)', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>DECLINE</button>
                          {bid.status === 'pending' && <button onClick={() => { setReviewFor(bid.id); setReviewReason(REVIEW_REASONS[0]); setReviewNote(''); }} style={{ padding: '7px 8px', background: 'none', border: '1px solid oklch(0.50 0.18 240)', font: '600 9px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', color: 'oklch(0.50 0.18 240)' }}>IN REVIEW</button>}
                          {bid.status === 'review' && <button onClick={() => patchBid(bid.id, { status: 'pending', reviewReason: '' })} style={{ padding: '7px 8px', background: 'none', border: '1px solid var(--color-neutral-400)', font: '600 9px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>UNMARK</button>}
                        </>}
                        {bid.status === 'accepted' && (
                          <button onClick={() => openAssign(bid.id)} style={{ padding: '7px 12px', background: 'none', border: '1px solid var(--color-text)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>REASSIGN</button>
                        )}
                        {!bid.archived && (
                          <button onClick={() => { const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); patchBid(bid.id, { archived: true, archivedAt: todayStr }); flash('Bid archived'); }} style={{ padding: '7px 8px', background: 'none', border: '1px solid var(--color-neutral-400)', font: '600 9px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>ARCHIVE</button>
                        )}
                        {bid.archived && (
                          <button onClick={() => patchBid(bid.id, { archived: false, archivedAt: undefined })} style={{ padding: '7px 8px', background: 'none', border: '1px solid var(--color-neutral-400)', font: '600 9px/1 var(--font-body)', letterSpacing: '.06em', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>RESTORE</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
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
                      {['PROJECT', 'GC', 'BID DATE', 'ENTRY DATE', 'ASSIGNED DATE', 'SCOPE', 'DRAWINGS', 'PLAN ROOM'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', font: '500 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', borderBottom: '1px solid var(--color-divider)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {personBids.map(bid => (
                      <tr key={bid.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                        <td style={{ padding: '10px', font: '600 13px/1 var(--font-body)' }}>{bid.name}</td>
                        <td style={{ padding: '10px', color: 'var(--color-neutral-700)', whiteSpace: 'nowrap' }}>{bid.gc}</td>
                        <td style={{ padding: '10px', font: '600 12px/1 var(--font-body)', color: 'var(--color-accent-700)', whiteSpace: 'nowrap' }}>{bid.bidDate}</td>
                        <td style={{ padding: '10px', color: 'var(--color-neutral-500)', whiteSpace: 'nowrap', font: '500 12px/1 var(--font-body)' }}>{bid.entryDate || '—'}</td>
                        <td style={{ padding: '10px', color: 'var(--color-neutral-500)', whiteSpace: 'nowrap', font: '500 12px/1 var(--font-body)' }}>{bid.assignedDate || '—'}</td>
                        <td style={{ padding: '10px', color: 'var(--color-neutral-700)' }}>{bid.scope}</td>
                        <td style={{ padding: '10px', color: 'var(--color-neutral-700)', whiteSpace: 'nowrap' }}>{bid.level}</td>
                        <td style={{ padding: '10px' }}>{bid.planRoom ? <a href={bid.planRoom} target="_blank" rel="noreferrer" style={{ font: '600 11px/1 var(--font-body)', color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>Open ↗</a> : <span style={{ color: 'var(--color-neutral-400)' }}>—</span>}</td>
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
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 980, maxWidth: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                <div style={{ width: 380, flexShrink: 0, borderRight: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column' }}>
                  <div
                    onPaste={e => handlePhotoPaste(bid.id, e)}
                    style={{ flex: 1, minHeight: 340, background: bid.photo ? '#000' : 'var(--color-neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
                  >
                    {bid.photo
                      ? <img src={bid.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                  <div style={{ font: '800 22px/1.2 var(--font-heading)', marginBottom: 16 }}>{bid.name}</div>
                  {/* project fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    {[['BID DATE', bid.bidDate || '—'], ['DRAWING LEVEL', bid.level || '—'], ['LOCATION', bid.location || '—'], ['SCOPE', bid.scope || '—']].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', marginBottom: 5 }}>{l}</div>
                        <div style={{ font: '600 13px/1.4 var(--font-body)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {bid.planRoom && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', marginBottom: 5 }}>PLAN ROOM</div>
                      <a href={bid.planRoom} target="_blank" rel="noreferrer" style={{ font: '600 13px/1 var(--font-body)', color: 'var(--color-accent)', wordBreak: 'break-all' }}>Open plan room ↗</a>
                    </div>
                  )}
                  {/* GC contacts */}
                  {(() => {
                    const gcs = bid.gcs?.filter(g => g.company) || (bid.gc ? [{ company: bid.gc, location: '', contactName: '', contactTitle: '', contactEmail: '', contactPhone: '' }] : []);
                    if (!gcs.length) return null;
                    return (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ font: '700 11px/1 var(--font-body)', letterSpacing: '.12em', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--color-divider)' }}>GENERAL CONTRACTOR{gcs.length > 1 ? 'S' : ''}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {gcs.map((gc, i) => (
                            <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--color-divider)', background: 'var(--color-neutral-50, var(--color-bg))' }}>
                              <div style={{ font: '700 13px/1 var(--font-body)', marginBottom: 4 }}>{gc.company}{i === 0 && gcs.length > 1 ? <span style={{ font: '500 10px/1 var(--font-body)', color: 'var(--color-accent)', marginLeft: 8, letterSpacing: '.1em' }}>PRIMARY</span> : null}</div>
                              {gc.location && <div style={{ font: '400 11.5px/1 var(--font-body)', color: 'var(--color-neutral-600)', marginBottom: 8 }}>{gc.location}</div>}
                              {gc.contactName && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 16px', alignItems: 'start' }}>
                                  <div style={{ font: '600 12px/1.4 var(--font-body)' }}>{gc.contactName}{gc.contactTitle ? <span style={{ font: '400 11px/1 var(--font-body)', color: 'var(--color-neutral-600)', marginLeft: 6 }}>{gc.contactTitle}</span> : null}</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                                    {gc.contactEmail && <a href={'mailto:' + gc.contactEmail} style={{ font: '400 11.5px/1 var(--font-body)', color: 'var(--color-accent)' }}>{gc.contactEmail}</a>}
                                    {gc.contactPhone && <a href={'tel:' + gc.contactPhone} style={{ font: '400 11.5px/1 var(--font-body)', color: 'var(--color-neutral-700)' }}>{gc.contactPhone}</a>}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
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
                  {bid.archived && (
                    <div style={{ padding: '10px 14px', background: 'var(--color-neutral-100)', border: '1px solid var(--color-divider)', marginBottom: 16 }}>
                      <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)' }}>ARCHIVED{bid.archivedAt ? ' · ' + bid.archivedAt : ''}</div>
                    </div>
                  )}
                  {bid.status === 'declined' && bid.declineReason && (
                    <div style={{ padding: '12px 14px', background: '#fff0ee', borderLeft: '3px solid var(--color-accent)', marginBottom: 16 }}>
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

      {/* ── IN REVIEW MODAL ── */}
      {reviewFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.5)', display: 'grid', placeItems: 'center', zIndex: 90 }}>
          <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 460, maxWidth: '92vw' }}>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--color-text)', font: '800 16px/1 var(--font-heading)' }}>MARK AS IN REVIEW</div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="REASON">
                <select value={reviewReason} onChange={e => setReviewReason(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                  {REVIEW_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="NOTE (OPTIONAL)">
                <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Any additional context…" style={{ ...inp, minHeight: 64, resize: 'vertical' }} />
              </Field>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => {
                  const reason = reviewReason + (reviewNote ? ' — ' + reviewNote : '');
                  patchBid(reviewFor, { status: 'review', reviewReason: reason });
                  setReviewFor(null); setReviewNote('');
                  flash('Bid marked as In Review — will not auto-archive');
                }} style={{ padding: '10px 18px', background: 'oklch(0.50 0.18 240)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>CONFIRM</button>
                <Button variant="secondary" onClick={() => setReviewFor(null)}>CANCEL</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD / EDIT MODAL ── */}
      {showUpload && (() => {
        const draftGcs: GcEntry[] = (draft.gcs && draft.gcs.length > 0) ? draft.gcs : [emptyGc()];
        const patchGc = (i: number, patch: Partial<GcEntry>) => setDraft(d => {
          const gs = [...(d.gcs || [emptyGc()])];
          gs[i] = { ...gs[i], ...patch };
          return { ...d, gcs: gs, gc: gs[0]?.company || '' };
        });
        const addGc = () => { if (draftGcs.length >= 4) return; setDraft(d => ({ ...d, gcs: [...(d.gcs || []), emptyGc()] })); };
        const removeGc = (i: number) => setDraft(d => ({ ...d, gcs: (d.gcs || []).filter((_, j) => j !== i) }));
        const photoFileRef = React.createRef<HTMLInputElement>();
        const handleDraftPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0]; if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => setDraft(d => ({ ...d, photo: ev.target?.result as string }));
          reader.readAsDataURL(file);
        };
        const handleDraftPhotoPaste = (e: React.ClipboardEvent) => {
          const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
          if (!item) return;
          const file = item.getAsFile(); if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => setDraft(d => ({ ...d, photo: ev.target?.result as string }));
          reader.readAsDataURL(file);
        };
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.55)', display: 'grid', placeItems: 'center', zIndex: 90 }}>
            <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 900, maxWidth: '98vw', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 24px', borderBottom: '2px solid var(--color-text)', font: '800 16px/1 var(--font-heading)', flexShrink: 0 }}>{editBid ? 'EDIT BID' : 'UPLOAD PROJECT'}</div>
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', gap: 0, minHeight: 0 }}>
                {/* LEFT: photo + ITB parser */}
                <div style={{ width: 300, flexShrink: 0, borderRight: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {/* photo area */}
                  <div
                    onPaste={handleDraftPhotoPaste}
                    style={{ position: 'relative', height: 220, background: draft.photo ? 'none' : 'var(--color-neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', borderBottom: '1px solid var(--color-divider)', cursor: 'default' }}
                  >
                    {draft.photo
                      ? <img src={draft.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
                      : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20, textAlign: 'center' }}>
                          <div style={{ font: '300 40px/1', color: 'var(--color-neutral-400)' }}>📷</div>
                          <div style={{ font: '600 11px/1.4 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-600)' }}>PASTE PHOTO</div>
                          <div style={{ font: '400 10px/1.4 var(--font-body)', color: 'var(--color-neutral-400)' }}>Ctrl+V / Cmd+V</div>
                        </div>
                    }
                    <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
                      <button onClick={() => photoFileRef.current?.click()} style={{ padding: '5px 9px', background: 'rgba(32,30,29,.75)', border: 'none', color: '#fff', font: '600 9px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>BROWSE</button>
                      {draft.photo && <button onClick={() => setDraft(d => ({ ...d, photo: undefined }))} style={{ padding: '5px 9px', background: 'rgba(236,48,19,.85)', border: 'none', color: '#fff', font: '600 9px/1 var(--font-body)', cursor: 'pointer' }}>✕</button>}
                    </div>
                    <input ref={photoFileRef} type="file" accept="image/*" onChange={handleDraftPhoto} style={{ display: 'none' }} />
                  </div>
                  {/* ITB parser */}
                  <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
                    <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.12em' }}>AI DOCUMENT READER</div>
                    <div style={{ font: '400 10px/1.5 var(--font-body)', color: 'var(--color-neutral-600)' }}>Paste an ITB email or bid document. The reader will extract project name, GC, bid date, drawing level, location, scope, and plan room link.</div>
                    <textarea
                      value={itbText}
                      onChange={e => setItbText(e.target.value)}
                      placeholder="Paste invitation to bid text here…"
                      style={{ flex: 1, ...inp, minHeight: 120, resize: 'none', fontSize: 11 }}
                    />
                    <button onClick={parseItb} style={{ padding: '9px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer' }}>PARSE & AUTO-FILL</button>
                  </div>
                </div>
                {/* RIGHT: form fields */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Project info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ gridColumn: '1/-1' }}><Field label="PROJECT NAME">
                      <input value={draft.name || ''} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={inp} autoFocus />
                    </Field></div>
                    <Field label="BID DATE">
                      <input value={draft.bidDate || ''} onChange={e => setDraft(d => ({ ...d, bidDate: e.target.value }))} placeholder="Sep 20" style={inp} />
                    </Field>
                    <Field label="DRAWING LEVEL">
                      <input
                        value={draft.level || ''}
                        onChange={e => setDraft(d => ({ ...d, level: e.target.value }))}
                        list="bid-levels-list"
                        placeholder="e.g. 100% CD or type custom"
                        style={inp}
                      />
                      <datalist id="bid-levels-list">
                        {BID_LEVELS.map(l => <option key={l} value={l} />)}
                      </datalist>
                    </Field>
                    <Field label="LOCATION">
                      <input value={draft.location || ''} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} placeholder="City, ST" style={inp} />
                    </Field>
                    <Field label="JOB SIZE">
                      <select value={draft.jobSize || ''} onChange={e => setDraft(d => ({ ...d, jobSize: e.target.value as 'large' | 'medium' | 'small' }))} style={inp}>
                        <option value="">Select size…</option>
                        <option value="large">Large</option>
                        <option value="medium">Medium</option>
                        <option value="small">Small</option>
                      </select>
                    </Field>
                    <div style={{ gridColumn: '1/-1' }}><Field label="SCOPE OF WORK">
                      <input value={draft.scope || ''} onChange={e => setDraft(d => ({ ...d, scope: e.target.value }))} placeholder="e.g. Curtain wall & storefront" style={inp} />
                    </Field></div>
                    <div style={{ gridColumn: '1/-1' }}><Field label="PLAN ROOM URL">
                      <input value={draft.planRoom || ''} onChange={e => setDraft(d => ({ ...d, planRoom: e.target.value }))} placeholder="https://" style={inp} />
                    </Field></div>
                  </div>
                  {/* GC section */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--color-divider)' }}>
                      <div style={{ font: '700 11px/1 var(--font-body)', letterSpacing: '.12em' }}>GENERAL CONTRACTORS</div>
                      <button onClick={addGc} style={{ padding: '4px 10px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>+ ADD GC</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {draftGcs.map((gc, i) => (
                        <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-accent)' }}>GC {i + 1}{i === 0 ? ' · PRIMARY' : ''}</div>
                            {i > 0 && <button onClick={() => removeGc(i)} style={{ padding: '3px 7px', background: 'none', border: '1px solid var(--color-neutral-400)', font: '600 9px/1 var(--font-body)', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>REMOVE</button>}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <Field label="COMPANY NAME">
                              <input value={gc.company} onChange={e => patchGc(i, { company: e.target.value })} style={{ ...inp, fontSize: 12 }} />
                            </Field>
                            <Field label="OFFICE LOCATION">
                              <input value={gc.location} onChange={e => patchGc(i, { location: e.target.value })} placeholder="City, ST" style={{ ...inp, fontSize: 12 }} />
                            </Field>
                            <Field label="CONTACT NAME">
                              <input value={gc.contactName} onChange={e => patchGc(i, { contactName: e.target.value })} style={{ ...inp, fontSize: 12 }} />
                            </Field>
                            <Field label="TITLE">
                              <input value={gc.contactTitle} onChange={e => patchGc(i, { contactTitle: e.target.value })} placeholder="Project Manager" style={{ ...inp, fontSize: 12 }} />
                            </Field>
                            <Field label="EMAIL">
                              <input value={gc.contactEmail} onChange={e => patchGc(i, { contactEmail: e.target.value })} type="email" style={{ ...inp, fontSize: 12 }} />
                            </Field>
                            <Field label="PHONE">
                              <input value={gc.contactPhone} onChange={e => patchGc(i, { contactPhone: e.target.value })} type="tel" placeholder="000-000-0000" style={{ ...inp, fontSize: 12 }} />
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Notes */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                    <Field label="PROJECT INFO / ITB SUMMARY">
                      <textarea value={draft.info || ''} onChange={e => setDraft(d => ({ ...d, info: e.target.value }))} style={{ ...inp, minHeight: 72, resize: 'vertical' }} />
                    </Field>
                    <Field label="INTERNAL NOTES">
                      <textarea value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} style={{ ...inp, minHeight: 48, resize: 'vertical' }} />
                    </Field>
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 24px', borderTop: '2px solid var(--color-text)', display: 'flex', gap: 10, flexShrink: 0 }}>
                <Button onClick={saveDraft}>{editBid ? 'SAVE CHANGES' : 'ADD TO BOARD'}</Button>
                <Button variant="secondary" onClick={() => { setShowUpload(false); setEditBid(null); setDraft(emptyDraft()); setItbText(''); }}>CANCEL</Button>
              </div>
            </div>
          </div>
        );
      })()}

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
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const p = PEOPLE.find(p => p.email.toLowerCase() === email.trim().toLowerCase());
    if (!p) { setError('No account found for that email.'); return; }
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
      {/* right — sign-in form */}
      <div style={{ padding: '52px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32, background: 'var(--color-bg)' }}>
        <div>
          <div style={{ font: '800 26px/1 var(--font-heading)', marginBottom: 6 }}>Sign in</div>
          <div style={{ font: '400 13px/1.5 var(--font-body)', color: 'var(--color-neutral-600)' }}>Use your Glass 1st email address.</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.14em' }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@glass1st.net" autoComplete="email" style={{ ...inp, padding: '12px 14px', fontSize: 14 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ font: '500 10px/1 var(--font-body)', letterSpacing: '.14em' }}>PASSWORD</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" style={{ ...inp, padding: '12px 14px', fontSize: 14 }} />
          </div>
          {error && <div style={{ font: '500 12px/1.4 var(--font-body)', color: 'var(--color-accent)', padding: '10px 14px', background: '#fff0ee', border: '1px solid var(--color-accent)' }}>{error}</div>}
          <button type="submit" style={{ marginTop: 4, padding: '14px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '700 13px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer' }}>SIGN IN →</button>
        </form>
        <div style={{ font: '400 12px/1.5 var(--font-body)', color: 'var(--color-neutral-500)' }}>
          Forgot your password? Contact your manager or IT to reset your account.
        </div>
      </div>
    </div>
  );
}

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
  const projects = visibleProjects();
  const openIssues = st.issues.filter(i => i.status === 'open');
  const mgrPerson = PEOPLE.find(p => p.id === me.mgr);

  const allFocusProjsUnordered = projects.map(p => {
    const ts = st.tasks.filter(t => t.projectId === p.id && (isManager || t.who === userId));
    if (!ts.length) return null;
    const override = st.projStatusOverride[p.id] as OverrideKey | undefined;
    const meta = override ? OVERRIDE_META[override] : null;
    const k: StatusKey = meta ? meta.statusKey : projStatusKey(ts);
    const displayColor = meta ? meta.color : STATUS[k];
    const displayLabel = meta ? meta.label : projStatusWord(k);
    return { id: p.id, key: k, override: override || null, displayColor, displayLabel, rank: 0 };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
  const allFocusProjs = (() => {
    const saved = st.focusProjOrder || [];
    const activeIds = allFocusProjsUnordered.map(p => p.id);
    const order = saved.filter(id => activeIds.includes(id));
    const unplaced = activeIds.filter(id => !order.includes(id));
    return [...order, ...unplaced].map(id => allFocusProjsUnordered.find(p => p.id === id)!);
  })();
  const focusId = st.focusProjectId || allFocusProjs[0]?.id || projects[0]?.id || null;
  const focusProject = projects.find(p => p.id === focusId);
  const focusTasks = st.tasks.filter(t => t.projectId === focusId);
  const openTask = st.openTaskId ? st.tasks.find(t => t.id === st.openTaskId) : undefined;

  const tcUnread = Object.entries(st.tcMessages || {}).filter(([key, msgs]) => {
    const last = msgs[msgs.length - 1];
    return last && last.from !== userId && last.at > (st.tcReadAt[key] || 0);
  }).length;

  const navItems: Array<[View, string, number]> = isManager
    ? [['myday', 'My day', st.tasks.filter(t => t.who === userId && t.status !== 'Complete').length],
      ['overview', 'Management overview', st.tasks.filter(t => t.status !== 'Complete' && teamOf().some(p => p.id === t.who)).length],
      ['teamcapacity', "My team's capacity", 0],
      ['calendar', 'Calendar', 0], ['capacity', 'My capacity', 0],
      ['projects', 'Projects', projects.length],
      ['teamconnection', 'Team Connection', tcUnread],
      ['meetings', 'AI Meeting Notes', st.meetingHistory.length],
      ['resources', 'Resources', 0]]
    : [['myday', 'My day', st.tasks.filter(t => t.who === userId && t.status !== 'Complete').length],
      ['calendar', 'Calendar', 0], ['projects', 'Projects', projects.length],
      ['teamconnection', 'Team Connection', tcUnread],
      ['capacity', 'My capacity', 0],
      ['meetings', 'AI Meeting Notes', st.meetingHistory.length],
      ['resources', 'Resources', 0]];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>
      {/* ── top tab strip ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: 38, background: 'var(--color-text)', flexShrink: 0, zIndex: 50 }}>
        {(['board', 'tracker'] as AppTab[]).map(a => (
          <button key={a} onClick={() => setSt(s => ({ ...s, app: a }))} style={{ padding: '0 22px', border: 'none', cursor: 'pointer', background: st.app === a ? 'var(--color-accent)' : 'transparent', color: '#fff', font: '600 11px/1 var(--font-body)', letterSpacing: '.12em' }}>
            {a === 'board' ? 'BID BOARD' : 'TASK TRACKER'}
          </button>
        ))}
      </div>

      {st.app === 'board' && <BidBoardView st={st} setSt={setSt} me={me} flash={flash} onSignOut={onSignOut} />}
      {st.app === 'tracker' && (
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
              {st.view === 'capacity' && <CapacityView st={st} setSt={setSt} me={me} isManager={false} team={[me]} onSignOut={onSignOut} />}
              {st.view === 'teamcapacity' && <CapacityView st={st} setSt={setSt} me={me} isManager={true} team={teamOf()} onSignOut={onSignOut} />}
              {st.view === 'projects' && <ProjectsView st={st} setSt={setSt} me={me} isManager={isManager} projects={projects} setTaskStatus={setTaskStatus} flash={flash} logNote={logNote} onSignOut={onSignOut} />}
              {st.view === 'teamconnection' && <TeamConnectionView st={st} setSt={setSt} me={me} isManager={isManager} />}
              {st.view === 'meetings' && <MeetingNotesView st={st} setSt={setSt} me={me} projects={projects} flash={flash} />}
              {st.view === 'resources' && <ResourcesView st={st} setSt={setSt} me={me} />}
            </div>
          </div>
        </div>
      )}

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
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
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
                            <span style={{ font: '600 13.5px/1.3 var(--font-body)', textDecoration: done ? 'line-through' : 'none', opacity: done ? .55 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>{t.title} {t.detail && <TaskSubTooltip detail={t.detail} />}</span>
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
                  const isDragging = dragId === row.id;
                  const isOver = dragOverId === row.id && dragId !== row.id;
                  return (
                    <div
                      key={row.id}
                      draggable
                      onDragStart={() => setDragId(row.id)}
                      onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                      onDragOver={e => { e.preventDefault(); setDragOverId(row.id); }}
                      onDrop={() => {
                        if (!dragId || dragId === row.id) return;
                        const ids = allFocusProjs.map(p => p.id);
                        const from = ids.indexOf(dragId);
                        const to = ids.indexOf(row.id);
                        const next = [...ids];
                        next.splice(from, 1);
                        next.splice(to, 0, dragId);
                        setSt(s => ({ ...s, focusProjOrder: next }));
                        setDragId(null); setDragOverId(null);
                      }}
                      style={{ borderBottom: '1px solid var(--color-divider)', borderLeft: selected ? '3px solid var(--color-text)' : '3px solid transparent', opacity: isDragging ? 0.4 : 1, borderTop: isOver ? '2px solid var(--color-accent)' : undefined }}
                    >
                      <div style={{ display: 'flex', alignItems: 'stretch' }}>
                        <div style={{ width: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', borderRight: '1px solid var(--color-divider)', padding: '0 4px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
                            <div style={{ width: 12, height: 1.5, background: 'var(--color-neutral-400)' }} />
                            <div style={{ width: 12, height: 1.5, background: 'var(--color-neutral-400)' }} />
                            <div style={{ width: 12, height: 1.5, background: 'var(--color-neutral-400)' }} />
                          </div>
                        </div>
                        <button onClick={() => setSt(s => ({ ...s, focusProjectId: row.id }))} style={{ flex: 1, textAlign: 'left', padding: '10px 8px', background: selected ? 'var(--color-bg)' : 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                          <span style={{ width: 9, height: 9, flexShrink: 0, background: row.displayColor }} />
                          <span style={{ font: '600 13px/1 var(--font-body)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.short || proj.name}</span>
                          <span style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.1em', color: row.displayColor, flexShrink: 0 }}>{row.displayLabel}</span>
                        </button>
                      </div>
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

function TaskSubTooltip({ detail }: { detail: string }) {
  const [mouse, setMouse] = React.useState<{ x: number; y: number } | null>(null);
  if (!detail) return null;
  const lines = detail.split('\n').filter(Boolean);
  return (
    <span
      onMouseMove={e => { e.stopPropagation(); setMouse({ x: e.clientX, y: e.clientY }); }}
      onMouseLeave={() => setMouse(null)}
      onClick={e => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: 'var(--color-neutral-300)', font: '700 9px/1 var(--font-body)', color: 'var(--color-neutral-700)', cursor: 'help', flexShrink: 0 }}
    >
      i
      {mouse && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: mouse.y, left: mouse.x + 14, zIndex: 9999, background: 'var(--color-text)', color: '#fff', width: 260, maxHeight: 320, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,.35)', pointerEvents: 'none', transform: 'translateY(-50%)' }}>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,.15)', font: '700 9px/1 var(--font-body)', letterSpacing: '.12em', color: 'rgba(255,255,255,.55)' }}>CHECKLIST</div>
          {lines.map((line, i) => {
            const indent = (line.match(/^(\s+)/)?.[1].length || 0) > 0;
            return (
              <div key={i} style={{ padding: indent ? '4px 10px 4px 22px' : '5px 10px', font: indent ? '400 10.5px/1.4 var(--font-body)' : '500 11px/1.4 var(--font-body)', color: indent ? 'rgba(255,255,255,.65)' : '#fff', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {line.trim()}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </span>
  );
}

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
                      <span style={{ font: '600 13px/1.3 var(--font-body)', display: 'flex', alignItems: 'center', gap: 6 }}>{t.title} {t.detail && <TaskSubTooltip detail={t.detail} />}</span>
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
  const [calMode, setCalMode] = useState<'week' | 'month'>('week');
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
          <div style={{ font: '500 13px/1 var(--font-body)', letterSpacing: '.08em', color: 'var(--color-neutral-600)', marginTop: 6 }}>
            {calMode === 'week' ? 'WEEK OF ' + prettyShort(wkStart).toUpperCase() + ' · ' + totalHrs + 'H SCHEDULED' : (() => { const ref = calMode === 'month' ? addDays(mondayOf(t0), st.calOff * 7 * 4) : wkStart; return ref.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(); })()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Seg value={calMode} onChange={setCalMode} options={[{ value: 'week', label: 'WEEK' }, { value: 'month', label: 'MONTH' }]} />
          {displayTeam && displayTeam.length > 1 && (
            <Seg value={personFilter} onChange={setPersonFilter} options={[{ value: 'ALL', label: 'ALL' + (displayTeam ? ' · ' + displayTeam.length : '') }, ...displayTeam.map(p => ({ value: p.id, label: p.initials }))]} />
          )}
          <button onClick={() => setSt(s => ({ ...s, calOff: s.calOff - 1 }))} style={{ padding: '10px 14px', border: '2px solid var(--color-text)', background: 'none', font: '700 14px/1 var(--font-body)', cursor: 'pointer' }}>◀</button>
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

      {calMode === 'week' ? (
        /* WEEK VIEW — Mon–Fri columns */
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)' }}>
          {days.filter(d => d.dayName !== 'SAT' && d.dayName !== 'SUN').map(day => (
            <div key={day.key} style={{ borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', minHeight: 320 }}>
              <div style={{ height: 64, flexShrink: 0, padding: '0 16px', borderBottom: '2px solid ' + (day.isToday ? 'var(--color-accent)' : 'var(--color-divider)'), background: day.isToday ? 'var(--color-text)' : 'var(--color-neutral-100)', color: day.isToday ? '#fff' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ font: '800 15px/1 var(--font-heading)', letterSpacing: '.06em' }}>{day.dayName}</div>
                  <div style={{ font: '500 12px/1 var(--font-body)', opacity: .7, marginTop: 5 }}>{prettyShort(day.date)}</div>
                </div>
                {day.hrs > 0 && <span style={{ font: '800 20px/1 var(--font-heading)', color: day.isToday ? 'var(--color-accent-300)' : 'var(--color-accent)' }}>{day.hrs}h</span>}
              </div>
              <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
                {day.tasks.length === 0 && <div style={{ font: '500 12px/1.5 var(--font-body)', color: 'var(--color-neutral-500)', paddingTop: 8 }}>—</div>}
                {day.tasks.map(t => {
                  const proj = PROJECTS.find(p => p.id === t.projectId);
                  return (
                    <button key={t.id} onClick={() => setSt(s => ({ ...s, openTaskId: t.id }))} style={{ textAlign: 'left', padding: '10px 12px', background: 'var(--color-bg)', cursor: 'pointer', border: 'none', borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: statusColor(t.status), display: 'flex', flexDirection: 'column', gap: 5, boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
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
      ) : (
        /* MONTH VIEW */
        (() => {
          // Compute the month to display based on calOff (treat calOff as week offset, derive month from wkStart)
          const refDate = wkStart;
          const year = refDate.getFullYear();
          const month = refDate.getMonth();
          const firstOfMonth = new Date(year, month, 1);
          const lastOfMonth = new Date(year, month + 1, 0);
          // Grid starts on Monday before the 1st
          const startDow = firstOfMonth.getDay(); // 0=Sun
          const gridStart = addDays(firstOfMonth, -(startDow === 0 ? 6 : startDow - 1));
          // Always show 6 rows = 42 cells
          const cells = Array.from({ length: 42 }, (_, i) => {
            const date = addDays(gridStart, i);
            const key = ymd(date);
            const inMonth = date.getMonth() === month;
            const isToday = key === ymd(t0);
            const cellTasks = st.tasks.filter(t =>
              filteredPeople.some(p => p.id === t.who) && t.date === key && t.status !== 'Complete'
            );
            const hrs = cellTasks.reduce((a, t) => a + t.hrs, 0);
            return { date, key, inMonth, isToday, tasks: cellTasks, hrs };
          });
          const DOW_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
          return (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* DOW header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', borderBottom: '2px solid var(--color-text)', flexShrink: 0 }}>
                {DOW_LABELS.map(d => (
                  <div key={d} style={{ padding: '10px 12px', font: '700 11px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', borderRight: '1px solid var(--color-divider)', textAlign: 'center' }}>{d}</div>
                ))}
              </div>
              {/* weeks */}
              <div style={{ flex: 1, display: 'grid', gridTemplateRows: 'repeat(6,1fr)', overflow: 'auto' }}>
                {Array.from({ length: 6 }, (_, row) => (
                  <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', borderBottom: '1px solid var(--color-divider)' }}>
                    {cells.slice(row * 7, row * 7 + 7).map(cell => (
                      <div key={cell.key} style={{ borderRight: '1px solid var(--color-divider)', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 90, minWidth: 0, overflow: 'hidden', background: cell.isToday ? 'var(--color-text)' : cell.inMonth ? 'var(--color-bg)' : 'var(--color-neutral-100)', color: cell.isToday ? '#fff' : cell.inMonth ? 'var(--color-text)' : 'var(--color-neutral-400)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                          <span style={{ font: '700 13px/1 var(--font-heading)' }}>{cell.date.getDate()}</span>
                          {cell.hrs > 0 && <span style={{ font: '600 10px/1 var(--font-body)', color: cell.isToday ? 'var(--color-accent-300)' : 'var(--color-accent)', letterSpacing: '.04em' }}>{cell.hrs}h</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', minWidth: 0 }}>
                          {cell.tasks.slice(0, 3).map(t => {
                            const proj = PROJECTS.find(p => p.id === t.projectId);
                            return (
                              <button key={t.id} onClick={() => setSt(s => ({ ...s, openTaskId: t.id }))} style={{ textAlign: 'left', padding: '3px 6px', background: cell.isToday ? 'rgba(255,255,255,.15)' : 'var(--color-neutral-200)', border: 'none', borderLeft: '3px solid ' + statusColor(t.status), cursor: 'pointer', font: '500 10px/1.3 var(--font-body)', color: cell.isToday ? '#fff' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', display: 'block', maxWidth: '100%' }}>
                                {t.title}{proj ? ' · ' + proj.short : ''}
                              </button>
                            );
                          })}
                          {cell.tasks.length > 3 && <div style={{ font: '500 10px/1 var(--font-body)', color: cell.isToday ? 'rgba(255,255,255,.7)' : 'var(--color-neutral-600)', paddingLeft: 6 }}>+{cell.tasks.length - 3} more</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}

// ─── Capacity ─────────────────────────────────────────────────────────────────
const CAP_DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const DAY_TARGET = 8;

function CapBar({ hrs, isToday, tasks = [] }: { hrs: number; isToday: boolean; tasks?: Task[] }) {
  const [mouse, setMouse] = React.useState<{ x: number; y: number } | null>(null);
  const pct = Math.min(hrs / DAY_TARGET, 1.25);
  const over = hrs > DAY_TARGET;
  const low = hrs > 0 && hrs < 5;
  const barColor = over ? 'var(--color-accent)' : low ? 'oklch(0.62 0.14 220)' : STATUS.good;
  const fillH = Math.min(pct, 1) * 100;
  const overflowH = over ? Math.min((hrs - DAY_TARGET) / DAY_TARGET, 0.25) / 0.25 * 14 : 0;

  const tooltipW = 240;
  const tipX = mouse ? Math.min(mouse.x + 12, window.innerWidth - tooltipW - 8) : 0;
  const tipY = mouse ? mouse.y - 8 : 0;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}
      onMouseMove={e => setMouse({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setMouse(null)}
    >
      {/* overflow spike */}
      <div style={{ height: 16, display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
        {over && <div style={{ width: '60%', height: overflowH + 'px', background: 'var(--color-accent)', opacity: .55, transition: 'height .3s' }} />}
      </div>
      {/* main bar track */}
      <div style={{ position: 'relative', width: '100%', flex: 1, background: 'var(--color-neutral-200)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, height: 2, background: isToday ? 'var(--color-accent)' : 'var(--color-neutral-400)', zIndex: 2, transform: 'translateY(100%)' }} />
        <div style={{ width: '100%', height: fillH + '%', background: barColor, transition: 'height .35s cubic-bezier(.22,1,.36,1)', minHeight: hrs > 0 ? 3 : 0 }} />
      </div>
      {/* hour label */}
      <div style={{ font: '800 15px/1 var(--font-heading)', color: over ? 'var(--color-accent)' : hrs === 0 ? 'var(--color-neutral-400)' : 'var(--color-text)' }}>
        {hrs > 0 ? hrs + 'h' : '—'}
      </div>
      {/* fixed-position tooltip — escapes all overflow clipping */}
      {mouse && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: tipY, left: tipX, zIndex: 9999, background: 'var(--color-text)', color: '#fff', width: tooltipW, boxShadow: '0 4px 20px rgba(0,0,0,.35)', pointerEvents: 'none', transform: 'translateY(-100%)' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.15)', font: '700 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'rgba(255,255,255,.6)' }}>
            {hrs > 0 ? hrs + 'H PLANNED · ' + tasks.length + ' TASK' + (tasks.length !== 1 ? 'S' : '') : 'NO TASKS SCHEDULED'}
          </div>
          {tasks.map(t => (
            <div key={t.id} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ font: '500 11.5px/1.3 var(--font-body)', flex: 1 }}>{t.title}</div>
              <div style={{ font: '700 11px/1 var(--font-body)', color: 'rgba(255,255,255,.65)', flexShrink: 0, marginTop: 1 }}>{t.hrs}h</div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function CapacityView({ st, setSt, me, isManager, team, onSignOut }: { st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; isManager: boolean; team: Person[]; onSignOut: () => void; }) {
  const t0 = today0(); const wkStart = addDays(mondayOf(t0), st.capOff * 7);
  const people = isManager ? team : [me];

  // Email & Job Catchup baseline: 1hr on every other workday (Mon, Wed, Fri of each week = indices 0, 2, 4)
  const CATCHUP_TASK: Task = { id: 'catchup-baseline', title: 'Email & Job Catchup', projectId: '', who: '', status: 'To-Do', due: '', day: '', date: '', hrs: 1, detail: 'a. Emails for each day\nb. Negotiating the Sale\nc. Comeback Items\nd. Follow Up', notes: [] };

  const rows = people.map(person => {
    const dayData = CAP_DAY_LABELS.map((_, i) => {
      const key = ymd(addDays(wkStart, i));
      const tasks = st.tasks.filter(t => t.who === person.id && t.date === key);
      // Add catchup baseline on Mon (0), Wed (2), Fri (4) of the displayed week
      const withCatchup = i % 2 === 0 ? [{ ...CATCHUP_TASK, date: key, who: person.id }, ...tasks] : tasks;
      return { hrs: withCatchup.reduce((a, t) => a + t.hrs, 0), tasks: withCatchup };
    });
    const total = dayData.reduce((a, d) => a + d.hrs, 0);
    return { person, dayData, total };
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <ViewHeader title={isManager ? "My team's capacity" : 'My capacity'} me={me} onSignOut={onSignOut} />

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
        {rows.map(({ person, dayData, total }) => (
          <div key={person.id} style={{ display: 'grid', gridTemplateColumns: '200px repeat(5,1fr) 100px', borderBottom: '1px solid var(--color-divider)', flex: 1, minHeight: 120 }}>
            {/* name col */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, background: 'var(--color-neutral-100)', borderRight: '1px solid var(--color-divider)' }}>
              <div style={{ font: '800 15px/1.2 var(--font-heading)' }}>{person.name}</div>
              <div style={{ font: '500 11px/1.4 var(--font-body)', color: 'var(--color-neutral-600)', letterSpacing: '.06em' }}>{person.role}</div>
              <div style={{ font: '800 22px/1 var(--font-heading)', color: total > 40 ? 'var(--color-accent)' : total > 0 ? 'var(--color-text)' : 'var(--color-neutral-400)', marginTop: 6 }}>{total > 0 ? total + 'h' : '—'}</div>
            </div>
            {/* day bar cells */}
            {dayData.map(({ hrs: h, tasks: dayTasks }, i) => {
              const isToday = ymd(addDays(wkStart, i)) === ymd(t0);
              return (
                <div key={i} style={{ padding: '12px 14px', borderLeft: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', background: isToday ? 'oklch(0.97 0.005 250)' : 'transparent' }}>
                  <CapBar hrs={h} isToday={isToday} tasks={dayTasks} />
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
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<{ title: string; who: string; due: string; hrs: string; detail: string }>({ title: '', who: '', due: '', hrs: '', detail: '' });
  const proj = PROJECTS.find(p => p.id === task.projectId);
  const projTasks = st.tasks.filter(t => t.projectId === task.projectId);
  const idx = projTasks.findIndex(t => t.id === task.id);

  function startEdit() {
    setEditDraft({ title: task.title, who: task.who, due: task.due, hrs: String(task.hrs), detail: task.detail });
    setEditing(true);
  }
  function saveEdit() {
    setSt(s => ({ ...s, tasks: s.tasks.map(t => t.id === task.id ? { ...t, title: editDraft.title.trim() || t.title, who: editDraft.who, due: editDraft.due, hrs: parseInt(editDraft.hrs) || t.hrs, detail: editDraft.detail } : t) }));
    setEditing(false);
  }

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
        {/* title + edit toggle */}
        <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {editing
            ? <input value={editDraft.title} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} style={{ ...inp, flex: 1, font: '700 16px/1.2 var(--font-heading)', padding: '6px 8px' }} autoFocus />
            : <div style={{ font: '800 18px/1.2 var(--font-heading)', flex: 1 }}>{task.title}</div>
          }
          {editing
            ? <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={saveEdit} style={{ padding: '6px 12px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '700 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>SAVE</button>
                <button onClick={() => setEditing(false)} style={{ padding: '6px 10px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>CANCEL</button>
              </div>
            : <button onClick={startEdit} style={{ padding: '5px 10px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', flexShrink: 0, color: 'var(--color-neutral-600)' }}>EDIT</button>
          }
        </div>

        {/* status */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ ...T.label, marginBottom: 8 }}>STATUS</div>
          <Seg value={segVal} onChange={v => setTaskStatus(task.id, v)} options={SEG_STATUSES} />
        </div>

        {/* meta */}
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-divider)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <div style={T.label}>OWNER</div>
            {editing
              ? <select value={editDraft.who} onChange={e => setEditDraft(d => ({ ...d, who: e.target.value }))} style={{ ...inp, marginTop: 4, width: '100%', fontSize: 12 }}>
                  {PEOPLE.filter(p => p.kind === 'estimator' || p.kind === 'manager').map(p => <option key={p.id} value={p.id}>{p.first}</option>)}
                </select>
              : <div style={{ font: '500 13px/1 var(--font-body)', marginTop: 4 }}>{me.id === task.who ? me.first + ' (you)' : personName(task.who).replace(/(\w+)\s(\w+)/, '$1 ' + personInitials(task.who)[1])}</div>
            }
          </div>
          <div>
            <div style={T.label}>DUE</div>
            {editing
              ? <input value={editDraft.due} onChange={e => setEditDraft(d => ({ ...d, due: e.target.value }))} placeholder="e.g. Sep 12" style={{ ...inp, marginTop: 4, width: '100%', fontSize: 12 }} />
              : <div style={{ font: '600 13px/1 var(--font-body)', marginTop: 4, color: dueColor(task) }}>{task.due}</div>
            }
          </div>
          <div>
            <div style={T.label}>HOURS</div>
            {editing
              ? <input value={editDraft.hrs} onChange={e => setEditDraft(d => ({ ...d, hrs: e.target.value }))} type="number" min="0.5" step="0.5" style={{ ...inp, marginTop: 4, width: '100%', fontSize: 12 }} />
              : <div style={{ font: '600 13px/1 var(--font-body)', marginTop: 4 }}>{task.hrs}</div>
            }
          </div>
        </div>

        {/* scope note */}
        {(task.detail || editing) && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-divider)' }}>
            <div style={{ ...T.label, marginBottom: 8 }}>CHECKLIST</div>
            {editing
              ? <textarea value={editDraft.detail} onChange={e => setEditDraft(d => ({ ...d, detail: e.target.value }))} placeholder="Add checklist items…" style={{ ...inp, width: '100%', minHeight: 80, resize: 'vertical', fontSize: 12 }} />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {task.detail.split('\n').filter(Boolean).map((line, i) => {
                    const indent = line.match(/^(\s+)/)?.[1].length || 0;
                    const isMain = /^[a-z]\./i.test(line.trim()) && indent === 0;
                    const isSub = indent > 0;
                    return (
                      <div key={i} style={{ paddingLeft: isMain ? 8 : isSub ? 20 : 0, font: isMain ? '600 11.5px/1.4 var(--font-body)' : '400 11px/1.4 var(--font-body)', color: isMain ? 'var(--color-text)' : 'var(--color-neutral-600)', borderLeft: isMain ? '2px solid var(--color-accent)' : 'none'}}>
                        {line.trim()}
                      </div>
                    );
                  })}
                </div>
            }
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

// ─── Team Connection ──────────────────────────────────────────────────────────
const QUICK_MESSAGES = ['Yes', 'No', 'Not sure', 'I have a question', 'Can you give me a call when you get a chance', 'I need some help', 'Can I Teams call you'];

function convKey(a: string, b: string) { return [a, b].sort().join('~'); }

// ─── AI Meeting Notes ──────────────────────────────────────────────────────────
function MeetingNotesView({ st, setSt, me, projects, flash }: {
  st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person;
  projects: Project[]; flash: (m: string) => void;
}) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [elapsed, setElapsed] = React.useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [confirmProj, setConfirmProj] = React.useState(st.meetingDraft?.suggestedProjectId || projects[0]?.id || '');
  const [editNotes, setEditNotes] = React.useState<Array<{ tag: string; text: string }>>(st.meetingDraft?.notes || []);
  const [editTasks, setEditTasks] = React.useState<Array<{ title: string; who: string; hrs: number; due: string }>>(st.meetingDraft?.tasks || []);

  React.useEffect(() => {
    if (st.meetingDraft) {
      setConfirmProj(st.meetingDraft.suggestedProjectId || projects[0]?.id || '');
      setEditNotes(st.meetingDraft.notes);
      setEditTasks(st.meetingDraft.tasks);
    }
  }, [st.meetingDraft]);

  async function startRecording() {
    try {
      // Capture system/PC audio via screen share with audio — works for any meeting app
      const displayStream = await (navigator.mediaDevices as MediaDevices & { getDisplayMedia: (c: MediaStreamConstraints) => Promise<MediaStream> }).getDisplayMedia({ audio: true, video: false });
      const audioTracks = displayStream.getAudioTracks();
      if (!audioTracks.length) {
        displayStream.getTracks().forEach(t => t.stop());
        flash('No audio track found — make sure to check "Share system audio" in the prompt');
        return;
      }
      const stream = new MediaStream(audioTracks);
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); displayStream.getTracks().forEach(t => t.stop()); processRecording(); };
      mr.start(1000);
      mediaRef.current = mr;
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      setSt(s => ({ ...s, meetingState: 'recording', meetingSource: 'system audio' }));
    } catch {
      flash('Could not capture audio — make sure to allow screen sharing and check "Share system audio"');
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setSt(s => ({ ...s, meetingState: 'processing' }));
  }

  async function processRecording() {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    let transcript = '';
    let draft: AppState['meetingDraft'];

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
    if (apiKey) {
      try {
        const form = new FormData();
        form.append('file', blob, 'meeting.webm');
        form.append('model', 'whisper-1');
        const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey }, body: form });
        const json = await r.json();
        transcript = json.text || '';

        const gpt = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: 'Extract from this meeting transcript: 1) A list of notes (tag: gc|spec|cost|schedule, text) and 2) Action items (title, who (first name), hrs estimate 1-8, due like "Mon" or "Oct 15"). Return JSON: {"notes":[{"tag":"gc","text":"..."}],"tasks":[{"title":"...","who":"...","hrs":2,"due":"..."}],"project":"best guess at project name"}' }, { role: 'user', content: transcript }],
            response_format: { type: 'json_object' },
          }),
        });
        const gptJson = await gpt.json();
        const parsed = JSON.parse(gptJson.choices?.[0]?.message?.content || '{}');
        const guessedPerson = (name: string) => PEOPLE.find(p => p.first.toLowerCase() === name?.toLowerCase())?.id || me.id;
        const guessedProj = projects.find(p => p.name.toLowerCase().includes((parsed.project || '').toLowerCase()))?.id || projects[0]?.id || '';
        draft = { transcript, suggestedProjectId: guessedProj, notes: parsed.notes || [], tasks: (parsed.tasks || []).map((t: { title: string; who: string; hrs: number; due: string }) => ({ ...t, who: guessedPerson(t.who) })) };
      } catch {
        transcript = '(Transcription failed — check your API key)';
        draft = { transcript, suggestedProjectId: projects[0]?.id || '', notes: [], tasks: [] };
      }
    } else {
      // demo mode — simulated output
      transcript = '[Demo mode] No OpenAI key set. This is a simulated transcript. The team discussed Cedar Point glazing scope, addendum 3 revisions, and assigned follow-up tasks to Eric and Allen.';
      draft = {
        transcript,
        suggestedProjectId: projects[0]?.id || '',
        notes: [
          { tag: 'gc', text: 'Cedar Point GC confirmed addendum 3 changes glazing scope on Level 3.' },
          { tag: 'spec', text: 'Spec section 08 44 13 updated — low-e coating required on all exterior units.' },
          { tag: 'cost', text: 'Estimate impact from addendum 3 estimated at +$18k.' },
        ],
        tasks: [
          { title: 'Update takeoff for addendum 3 scope changes', who: me.id, hrs: 4, due: 'Mon' },
          { title: 'Request updated Oldcastle quote with new spec', who: me.id, hrs: 1, due: 'Tue' },
          { title: 'Review revised drawings and confirm quantity changes', who: me.id, hrs: 3, due: 'Wed' },
        ],
      };
    }
    setSt(s => ({ ...s, meetingState: 'confirming', meetingDraft: draft }));
  }

  function confirmAndAdd() {
    const proj = projects.find(p => p.id === confirmProj);
    if (!proj) return;
    const when = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const newNotes: ProjNote[] = editNotes.map(n => ({ who: me.name, when, text: n.text, tag: n.tag, label: n.tag.toUpperCase() }));
    const newTasks: Task[] = editTasks.map(t => ({
      id: 'mt' + Date.now() + Math.random().toString(36).slice(2),
      title: t.title, projectId: confirmProj, who: t.who,
      status: 'To-Do' as TaskStatus, due: t.due, day: t.due,
      date: null, hrs: t.hrs, detail: '', notes: [],
    }));
    const histEntry = { id: 'mh' + Date.now(), at: Date.now(), source: st.meetingSource, projectId: confirmProj, transcript: st.meetingDraft?.transcript || '', notesAdded: editNotes.length, tasksAdded: editTasks.length };
    setSt(s => ({
      ...s,
      tasks: [...s.tasks, ...newTasks],
      projNotes: { ...s.projNotes, [confirmProj]: [...(s.projNotes[confirmProj] || []), ...newNotes] },
      meetingHistory: [histEntry, ...s.meetingHistory],
      meetingState: 'idle',
      meetingDraft: null,
    }));
    flash(`Added ${editNotes.length} note${editNotes.length !== 1 ? 's' : ''} + ${editTasks.length} task${editTasks.length !== 1 ? 's' : ''} to ${proj.name}`);
  }

  const fmtElapsed = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const state = st.meetingState;
  const inp2: React.CSSProperties = { border: '1px solid var(--color-divider)', padding: '6px 8px', font: '400 12px/1 var(--font-body)', background: 'var(--color-bg)', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      {/* ── left panel: history + key ── */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column', background: 'var(--color-neutral-100)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '2px solid var(--color-text)' }}>
          <div style={{ font: '800 15px/1 var(--font-heading)' }}>AI Meeting Notes</div>
        </div>
        <div style={{ padding: '10px 16px 6px', font: '600 10px/1 var(--font-body)', letterSpacing: '.14em', color: 'var(--color-neutral-600)' }}>PAST MEETINGS ({st.meetingHistory.length})</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {st.meetingHistory.length === 0 && <div style={{ padding: '12px 16px', font: '400 12px/1.5 var(--font-body)', color: 'var(--color-neutral-500)' }}>No recordings yet.</div>}
          {st.meetingHistory.map(h => {
            const proj = projects.find(p => p.id === h.projectId);
            return (
              <div key={h.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-divider)' }}>
                <div style={{ font: '600 11.5px/1 var(--font-body)', marginBottom: 3 }}>{proj?.name || h.projectId}</div>
                <div style={{ font: '400 10.5px/1 var(--font-body)', color: 'var(--color-neutral-600)', marginBottom: 4 }}>{new Date(h.at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {h.source}</div>
                <div style={{ font: '500 10px/1 var(--font-body)', color: 'var(--color-accent)' }}>{h.notesAdded} note{h.notesAdded !== 1 ? 's' : ''} · {h.tasksAdded} task{h.tasksAdded !== 1 ? 's' : ''} added</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── main panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <ViewHeader title="AI Meeting Notes" me={me} onSignOut={() => {}} />

        {/* IDLE — start screen */}
        {(state === 'idle' || state === 'prompt') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 48 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '800 28px/1.1 var(--font-heading)', marginBottom: 10 }}>Record a meeting</div>
              <div style={{ font: '400 14px/1.6 var(--font-body)', color: 'var(--color-neutral-600)', maxWidth: 420 }}>Captures your PC audio — works with any meeting app (Teams, Google Meet, Zoom, etc). Transcribes the call and extracts notes and action items for your projects.</div>
            </div>
            <button onClick={startRecording} style={{ padding: '16px 36px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '700 14px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>⏺</span> START RECORDING
            </button>
            <div style={{ padding: '10px 18px', background: 'var(--color-neutral-200)', border: '1px solid var(--color-divider)', maxWidth: 420 }}>
              <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', marginBottom: 5 }}>HOW IT WORKS</div>
              <div style={{ font: '400 11.5px/1.6 var(--font-body)', color: 'var(--color-neutral-700)' }}>When prompted, select your screen or app window and check <strong>"Share system audio"</strong>. The recording captures everything playing on your PC — your meeting call audio included.</div>
            </div>
          </div>
        )}

        {/* RECORDING */}
        {state === 'recording' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
              <span style={{ fontSize: 32, color: '#fff' }}>⏺</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '800 36px/1 var(--font-heading)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-accent)' }}>{fmtElapsed(elapsed)}</div>
              <div style={{ font: '500 13px/1 var(--font-body)', color: 'var(--color-neutral-600)', marginTop: 8, letterSpacing: '.1em', textTransform: 'uppercase' }}>Recording · System Audio</div>
            </div>
            <button onClick={stopRecording} style={{ padding: '13px 32px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '700 13px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer' }}>⏹ STOP &amp; PROCESS</button>
            <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(236,48,19,.4)} 50%{box-shadow:0 0 0 18px rgba(236,48,19,0)} }`}</style>
          </div>
        )}

        {/* PROCESSING */}
        {state === 'processing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ font: '800 22px/1 var(--font-heading)' }}>Transcribing &amp; analyzing…</div>
            <div style={{ font: '400 13px/1.5 var(--font-body)', color: 'var(--color-neutral-600)' }}>Extracting notes and action items from your meeting. This may take a moment.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 10, height: 10, background: 'var(--color-accent)', borderRadius: '50%', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
            </div>
            <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }`}</style>
          </div>
        )}

        {/* CONFIRMING */}
        {state === 'confirming' && st.meetingDraft && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ font: '800 22px/1 var(--font-heading)', marginBottom: 4 }}>Review before adding</div>
                <div style={{ font: '400 13px/1 var(--font-body)', color: 'var(--color-neutral-600)' }}>Confirm the project, then edit the notes and tasks below before saving.</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button onClick={() => setSt(s => ({ ...s, meetingState: 'idle', meetingDraft: null }))} style={{ padding: '9px 16px', background: 'none', border: '1px solid var(--color-divider)', font: '600 11px/1 var(--font-body)', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>DISCARD</button>
                <button onClick={confirmAndAdd} style={{ padding: '9px 20px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>ADD TO PROJECT →</button>
              </div>
            </div>

            {/* project selector */}
            <div style={{ padding: '16px 20px', border: '2px solid var(--color-text)', background: 'var(--color-neutral-100)' }}>
              <div style={{ font: '700 10px/1 var(--font-body)', letterSpacing: '.14em', marginBottom: 10 }}>PROJECT</div>
              <select value={confirmProj} onChange={e => setConfirmProj(e.target.value)} style={{ ...inp2, font: '600 14px/1 var(--font-body)', padding: '9px 12px' }}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* transcript */}
            <div>
              <div style={{ font: '700 10px/1 var(--font-body)', letterSpacing: '.14em', marginBottom: 8, color: 'var(--color-neutral-600)' }}>TRANSCRIPT</div>
              <div style={{ padding: '12px 14px', background: 'var(--color-neutral-100)', border: '1px solid var(--color-divider)', font: '400 12px/1.6 var(--font-body)', color: 'var(--color-neutral-700)', maxHeight: 120, overflowY: 'auto' }}>{st.meetingDraft.transcript}</div>
            </div>

            {/* notes */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ font: '700 10px/1 var(--font-body)', letterSpacing: '.14em' }}>NOTES TO ADD ({editNotes.length})</div>
                <button onClick={() => setEditNotes(n => [...n, { tag: 'spec', text: '' }])} style={{ padding: '4px 10px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', cursor: 'pointer' }}>+ ADD NOTE</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {editNotes.map((n, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', border: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
                    <select value={n.tag} onChange={e => setEditNotes(ns => ns.map((x, j) => j === i ? { ...x, tag: e.target.value } : x))} style={{ ...inp2, width: 90, flexShrink: 0 }}>
                      {['gc', 'spec', 'cost', 'schedule', 'risk', 'other'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                    <input value={n.text} onChange={e => setEditNotes(ns => ns.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} style={{ ...inp2, flex: 1 }} placeholder="Note text…" />
                    <button onClick={() => setEditNotes(ns => ns.filter((_, j) => j !== i))} style={{ padding: '6px 8px', background: 'none', border: '1px solid var(--color-divider)', cursor: 'pointer', color: 'var(--color-accent)', font: '700 11px/1 var(--font-body)', flexShrink: 0 }}>✕</button>
                  </div>
                ))}
                {editNotes.length === 0 && <div style={{ font: '400 12px/1 var(--font-body)', color: 'var(--color-neutral-500)', padding: '8px 0' }}>No notes extracted — add one above.</div>}
              </div>
            </div>

            {/* tasks */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ font: '700 10px/1 var(--font-body)', letterSpacing: '.14em' }}>ACTION ITEMS TO ADD ({editTasks.length})</div>
                <button onClick={() => setEditTasks(ts => [...ts, { title: '', who: me.id, hrs: 2, due: 'Mon' }])} style={{ padding: '4px 10px', background: 'none', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)', cursor: 'pointer' }}>+ ADD TASK</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {editTasks.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px 80px 32px', gap: 8, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
                    <input value={t.title} onChange={e => setEditTasks(ts => ts.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} style={inp2} placeholder="Task title…" />
                    <select value={t.who} onChange={e => setEditTasks(ts => ts.map((x, j) => j === i ? { ...x, who: e.target.value } : x))} style={inp2}>
                      {PEOPLE.filter(p => p.kind === 'estimator' || p.kind === 'manager').map(p => <option key={p.id} value={p.id}>{p.first}</option>)}
                    </select>
                    <input value={t.hrs} type="number" min={0.5} step={0.5} onChange={e => setEditTasks(ts => ts.map((x, j) => j === i ? { ...x, hrs: parseFloat(e.target.value) || 1 } : x))} style={{ ...inp2, textAlign: 'center' }} />
                    <input value={t.due} onChange={e => setEditTasks(ts => ts.map((x, j) => j === i ? { ...x, due: e.target.value } : x))} style={inp2} placeholder="Mon" />
                    <button onClick={() => setEditTasks(ts => ts.filter((_, j) => j !== i))} style={{ padding: '6px 8px', background: 'none', border: '1px solid var(--color-divider)', cursor: 'pointer', color: 'var(--color-accent)', font: '700 11px/1 var(--font-body)' }}>✕</button>
                  </div>
                ))}
                {editTasks.length === 0 && <div style={{ font: '400 12px/1 var(--font-body)', color: 'var(--color-neutral-500)', padding: '8px 0' }}>No action items extracted — add one above.</div>}
              </div>
            </div>

            <button onClick={confirmAndAdd} style={{ padding: '14px 28px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '700 13px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer', alignSelf: 'flex-start' }}>
              ADD TO PROJECT →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamConnectionView({ st, setSt, me, isManager }: {
  st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person; isManager: boolean;
}) {
  const userId = me.id;
  const myMgr = PEOPLE.find(p => p.id === me.mgr);
  const managers = PEOPLE.filter(p => p.kind === 'manager');
  const myTeam = isManager ? PEOPLE.filter(p => p.mgr === userId) : [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  function buildRail(): Array<{ header: string; rows: Array<{ key: string; name: string; sub: string; members?: string[] }> }> {
    const groups: Array<{ header: string; rows: Array<{ key: string; name: string; sub: string; members?: string[] }> }> = [];
    const groupChats = [
      { key: 'ch:all', name: 'Estimating — everyone', members: PEOPLE.map(p => p.initials) },
      { key: 'ch:mgrs', name: 'Manager chat', members: ['RH', 'PD', myMgr?.initials || ''].filter(Boolean) },
      ...managers.map(m => ({ key: `ch:${m.id}`, name: `${m.first}'s team`, members: [m.initials, ...PEOPLE.filter(p => p.mgr === m.id).map(p => p.initials)] })),
    ];
    groups.push({
      header: 'GROUP CHATS',
      rows: groupChats.map(g => {
        const msgs = st.tcMessages[g.key] || [];
        const last = msgs[msgs.length - 1];
        return { key: g.key, name: g.name, sub: last ? last.text.slice(0, 48) : `${g.members?.length || 0} people · group chat`, members: g.members };
      }),
    });
    if (!isManager && myMgr) {
      const k = convKey(userId, myMgr.id);
      const msgs = st.tcMessages[k] || [];
      const last = msgs[msgs.length - 1];
      groups.push({ header: 'YOUR MANAGER', rows: [{ key: k, name: myMgr.name, sub: last ? last.text.slice(0, 48) : myMgr.role }] });
    }
    managers.forEach(m => {
      const everyone = [m, ...PEOPLE.filter(p => p.mgr === m.id)].filter(p => p.id !== userId);
      if (!everyone.length) return;
      groups.push({
        header: `${m.name.toUpperCase()} · TEAM`,
        rows: everyone.map(p => { const k = convKey(userId, p.id); const msgs = st.tcMessages[k] || []; const last = msgs[msgs.length - 1]; return { key: k, name: p.name, sub: last ? last.text.slice(0, 48) : p.role }; }),
      });
    });
    const headMgmt = PEOPLE.filter(p => p.id === 'ray' || p.id === 'paul');
    groups.push({
      header: 'HEAD MANAGEMENT',
      rows: headMgmt.map(p => { const k = convKey(userId, p.id); const msgs = st.tcMessages[k] || []; const last = msgs[msgs.length - 1]; return { key: k, name: p.name, sub: last ? last.text.slice(0, 48) : p.role }; }),
    });
    return groups;
  }

  const rail = buildRail();
  const sel = st.tcSelected;
  const msgs = st.tcMessages[sel] || [];

  function isUnread(key: string) {
    const m = (st.tcMessages[key] || []);
    const last = m[m.length - 1];
    return last && last.from !== userId && last.at > (st.tcReadAt[key] || 0);
  }

  function selectConvo(key: string) {
    setSt(s => ({ ...s, tcSelected: key, tcReadAt: { ...s.tcReadAt, [key]: Date.now() }, tcGifPanel: false }));
  }

  function sendMessage(text: string, files: typeof st.tcPendingFiles) {
    if (!text.trim() && !files.length) return;
    const msg = { from: userId, text: text.trim(), at: Date.now(), attachments: files.length ? files : undefined };
    setSt(s => ({
      ...s,
      tcMessages: { ...s.tcMessages, [sel]: [...(s.tcMessages[sel] || []), msg] },
      tcCompose: '',
      tcPendingFiles: [],
      tcGifPanel: false,
      tcReadAt: { ...s.tcReadAt, [sel]: Date.now() },
    }));
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(f => ({ name: f.name, size: (f.size / 1024).toFixed(0) + ' KB', isImage: f.type.startsWith('image/'), url: URL.createObjectURL(f) }));
    setSt(s => ({ ...s, tcPendingFiles: [...s.tcPendingFiles, ...newFiles] }));
    e.target.value = '';
  }

  function handleComposePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (!item) return;
    const file = item.getAsFile(); if (!file) return;
    e.preventDefault();
    const url = URL.createObjectURL(file);
    setSt(s => ({ ...s, tcPendingFiles: [...s.tcPendingFiles, { name: file.name || 'image.png', size: (file.size / 1024).toFixed(0) + ' KB', isImage: true, url }] }));
  }

  const selName = (() => {
    for (const g of rail) for (const r of g.rows) if (r.key === sel) return { name: r.name, members: r.members, isGroup: sel.startsWith('ch:') };
    return { name: sel, members: undefined, isGroup: false };
  })();

  const selPerson = !selName.isGroup ? PEOPLE.find(p => { const ids = sel.split('~'); return ids.includes(p.id) && p.id !== userId; }) : undefined;

  function threadTag(): { label: string; accent: boolean } {
    if (selName.isGroup) return { label: 'GROUP', accent: true };
    if (selPerson?.id === me.mgr) return { label: 'YOUR MANAGER', accent: true };
    if (myTeam.some(p => p.id === selPerson?.id)) return { label: 'ON YOUR TEAM', accent: false };
    return { label: 'ESTIMATING', accent: false };
  }
  const tag = threadTag();

  const timeStr = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const myStatus: MemberStatus = (st.memberStatuses[userId] as MemberStatus) || 'available';
  const myStatusOpt = STATUS_OPTIONS.find(o => o.value === myStatus)!;

  function getPersonStatus(personId: string): typeof STATUS_OPTIONS[0] {
    const s = (st.memberStatuses[personId] as MemberStatus) || 'available';
    return STATUS_OPTIONS.find(o => o.value === s)!;
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      {/* rail */}
      <div style={{ width: 290, flexShrink: 0, borderRight: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'var(--color-bg)' }}>

        {/* ── MY STATUS ── */}
        <div style={{ padding: '12px 14px', borderBottom: '2px solid var(--color-text)', background: 'var(--color-neutral-100)', flexShrink: 0 }}>
          <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.14em', color: 'var(--color-neutral-600)', marginBottom: 8 }}>MY STATUS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: myStatusOpt.dot, flexShrink: 0, boxShadow: '0 0 0 2px ' + myStatusOpt.dot + '44' }} />
            <div style={{ font: '700 12px/1 var(--font-body)', color: myStatusOpt.color }}>{myStatusOpt.label}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSt(s => ({ ...s, memberStatuses: { ...s.memberStatuses, [userId]: opt.value } }))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', border: myStatus === opt.value ? '1.5px solid ' + opt.color : '1px solid var(--color-divider)', background: myStatus === opt.value ? opt.color + '18' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: opt.dot, flexShrink: 0 }} />
                <span style={{ font: myStatus === opt.value ? '700 10px/1 var(--font-body)' : '500 10px/1 var(--font-body)', color: myStatus === opt.value ? opt.color : 'var(--color-neutral-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {rail.map(group => (
          <div key={group.header}>
            <div style={{ padding: '8px 14px 5px', font: '600 10px/1 var(--font-body)', letterSpacing: '.16em', color: 'var(--color-neutral-600)', background: 'var(--color-neutral-100)', borderBottom: '1px solid var(--color-divider)', borderTop: '2px solid var(--color-text)' }}>
              {group.header}
            </div>
            {group.rows.map(row => {
              const active = sel === row.key;
              const unread = isUnread(row.key);
              const rowPerson = !row.key.startsWith('ch:') ? PEOPLE.find(p => { const ids = row.key.split('~'); return ids.includes(p.id) && p.id !== userId; }) : undefined;
              const personStatus = rowPerson ? getPersonStatus(rowPerson.id) : null;
              return (
                <button key={row.key} onClick={() => selectConvo(row.key)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--color-divider)', background: active ? 'var(--color-text)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 30, height: 30, background: active ? 'var(--color-accent)' : 'var(--color-neutral-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 10px/1 var(--font-body)', color: active ? '#fff' : 'var(--color-text)' }}>
                      {row.key.startsWith('ch:') ? '#' : rowPerson?.initials || '?'}
                    </div>
                    {personStatus && (
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: personStatus.dot, border: '1.5px solid var(--color-bg)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 12px/1 var(--font-body)', color: active ? '#fff' : 'var(--color-text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
                    {personStatus && (
                      <div style={{ font: '500 10px/1 var(--font-body)', color: active ? 'rgba(255,255,255,.55)' : personStatus.color, marginBottom: 2 }}>{personStatus.label}</div>
                    )}
                    <div style={{ font: '400 10.5px/1.3 var(--font-body)', color: active ? 'rgba(255,255,255,.65)' : 'var(--color-neutral-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.sub}</div>
                    {row.members && <div style={{ font: '400 9.5px/1 var(--font-body)', color: active ? 'rgba(255,255,255,.4)' : 'var(--color-neutral-400)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.members.join(' · ')}</div>}
                  </div>
                  {unread && <div style={{ width: 8, height: 8, background: 'var(--color-accent)', borderRadius: '50%', flexShrink: 0, marginTop: 4 }} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* thread header */}
        <div style={{ padding: '12px 20px', borderBottom: '2px solid var(--color-text)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, background: 'var(--color-bg)' }}>
          <div style={{ width: 38, height: 38, background: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 13px/1 var(--font-body)', color: '#fff', flexShrink: 0 }}>
            {selName.isGroup ? '#' : selPerson?.initials || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ font: '800 18px/1 var(--font-heading)' }}>{selName.name}</div>
              {selPerson && (() => { const ps = getPersonStatus(selPerson.id); return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: ps.color + '18', border: '1px solid ' + ps.color + '55' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: ps.dot }} />
                  <span style={{ font: '600 10px/1 var(--font-body)', color: ps.color }}>{ps.label}</span>
                </div>
              ); })()}
            </div>
            <div style={{ font: '400 11px/1 var(--font-body)', color: 'var(--color-neutral-600)', marginTop: 3 }}>
              {selName.isGroup ? `${selName.members?.length || 0} people · group chat` : selPerson ? `${selPerson.role} · ${selPerson.email}` : ''}
            </div>
          </div>
          <div style={{ padding: '3px 10px', background: tag.accent ? 'var(--color-accent)' : 'var(--color-neutral-300)', color: tag.accent ? '#fff' : 'var(--color-text)', font: '700 9.5px/1 var(--font-body)', letterSpacing: '.1em' }}>{tag.label}</div>
        </div>

        {/* messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--color-neutral-100)' }}>
          {msgs.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-neutral-500)' }}>
              <div style={{ font: '700 13px/1 var(--font-body)', letterSpacing: '.12em' }}>NO MESSAGES YET</div>
              <div style={{ font: '400 11.5px/1.5 var(--font-body)', textAlign: 'center', maxWidth: 260 }}>Start the conversation below. Paste a screenshot or attach a file.</div>
            </div>
          )}
          {msgs.map((msg, i) => {
            const isMine = msg.from === userId;
            const sender = PEOPLE.find(p => p.id === msg.from);
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 3 }}>
                {msg.attachments?.map((att, ai) => (
                  <div key={ai} style={{ maxWidth: '72%', alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
                    {att.isImage && att.url
                      ? <img src={att.url} alt={att.name} style={{ width: 320, height: 220, objectFit: 'cover', display: 'block' }} />
                      : <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-accent)', color: '#fff', font: '600 11px/1 var(--font-body)' }}>
                          <div style={{ width: 8, height: 8, background: '#fff', flexShrink: 0 }} />
                          <span>{att.name}</span><span style={{ opacity: .7 }}>{att.size}</span>
                        </div>
                    }
                  </div>
                ))}
                {msg.text && (
                  <div style={{ maxWidth: '72%', padding: '9px 13px', background: isMine ? 'var(--color-text)' : 'var(--color-bg)', color: isMine ? '#fff' : 'var(--color-text)', border: isMine ? 'none' : '1px solid var(--color-divider)', font: '400 13px/1.5 var(--font-body)' }}>
                    {msg.text}
                  </div>
                )}
                <div style={{ font: '400 10px/1 var(--font-body)', color: 'var(--color-neutral-500)' }}>{sender?.name || msg.from} · {timeStr(msg.at)}</div>
              </div>
            );
          })}
        </div>

        {/* GIF panel */}
        {st.tcGifPanel && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-divider)', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <div style={{ border: '1px solid var(--color-divider)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-600)' }}>ADD A GIF</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Paste a GIF link" style={{ ...inputStyle, flex: 1, padding: '7px 10px' }} />
                <button style={{ padding: '7px 14px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '600 11px/1 var(--font-body)', cursor: 'pointer' }}>ADD</button>
              </div>
              <div style={{ font: '400 10px/1.4 var(--font-body)', color: 'var(--color-neutral-500)' }}>Previously sent GIFs appear here for quick reuse.</div>
            </div>
          </div>
        )}

        {/* composer */}
        <div style={{ borderTop: '2px solid var(--color-text)', flexShrink: 0, background: 'var(--color-bg)' }}>
          {/* quick chips */}
          <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {QUICK_MESSAGES.map(q => (
              <button key={q} onClick={() => sendMessage(q, [])} style={{ padding: '5px 10px', border: '1px solid var(--color-text)', background: 'none', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>{q}</button>
            ))}
          </div>
          {/* pending attachments */}
          {st.tcPendingFiles.length > 0 && (
            <div style={{ padding: '8px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {st.tcPendingFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: '1px solid var(--color-divider)', font: '600 10px/1 var(--font-body)' }}>
                  {f.isImage && f.url ? <img src={f.url} alt="" style={{ width: 30, height: 30, objectFit: 'cover' }} /> : <div style={{ width: 8, height: 8, background: 'var(--color-accent)' }} />}
                  <span>{f.name}</span>
                  <button onClick={() => setSt(s => ({ ...s, tcPendingFiles: s.tcPendingFiles.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', font: '600 12px/1', color: 'var(--color-neutral-500)' }}>×</button>
                </div>
              ))}
            </div>
          )}
          {/* input row */}
          <div style={{ padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <input type="file" ref={fileInputRef} onChange={handleFileInput} multiple style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 12px', border: '1px solid var(--color-text)', background: 'none', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', flexShrink: 0 }}>ATTACH</button>
            <button onClick={() => setSt(s => ({ ...s, tcGifPanel: !s.tcGifPanel }))} style={{ padding: '8px 12px', border: '1px solid var(--color-text)', background: st.tcGifPanel ? 'var(--color-text)' : 'none', color: st.tcGifPanel ? '#fff' : 'var(--color-text)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', flexShrink: 0 }}>GIF</button>
            <textarea
              value={st.tcCompose}
              onChange={e => setSt(s => ({ ...s, tcCompose: e.target.value }))}
              onPaste={handleComposePaste}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(st.tcCompose, st.tcPendingFiles); } }}
              placeholder="Message… paste a screenshot or Shift+Enter for newline"
              rows={1}
              style={{ ...inputStyle, flex: 1, resize: 'none', padding: '8px 10px', font: '400 13px/1.5 var(--font-body)' }}
            />
            <button onClick={() => sendMessage(st.tcCompose, st.tcPendingFiles)} style={{ padding: '8px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', flexShrink: 0 }}>SEND</button>
          </div>
          <div style={{ padding: '0 16px 8px', font: '400 10px/1 var(--font-body)', color: 'var(--color-neutral-500)' }}>Paste a screenshot straight into the message box, or drop files with ATTACH</div>
        </div>
      </div>
    </div>
  );
}

// ─── Resources ─────────────────────────────────────────────────────────────────
const PROCESSES = [
  { id: 'p1', kind: 'PDF' as const, title: 'Bid Submission Process', owner: 'Ray Herring', summary: 'Step-by-step guide for preparing and submitting bids on time and in the correct format.', sections: [{ heading: '1. Pre-Bid Checklist', body: 'Confirm scope, obtain addenda, and verify bid form requirements before starting takeoff.' }, { heading: '2. Takeoff', body: 'Complete full quantity survey using Bluebeam. Log all assumptions.' }, { heading: '3. Estimate Sheet', body: 'Fill in the standard estimate template. Include alternates clearly labeled.' }, { heading: '4. Review', body: 'Manager reviews before submission. Document any open items.' }, { heading: '5. Submit', body: 'Submit by the deadline. Confirm receipt with the GC.' }] },
  { id: 'p2', kind: 'DOCX' as const, title: 'RFQ Template & Vendor Process', owner: 'Blake Nicholson', summary: 'Standard RFQ format and process for soliciting quotes from vendors and subcontractors.', sections: [{ heading: '1. Identify Vendors', body: 'Pull from the approved vendor list. Add new vendors via the vendor request form.' }, { heading: '2. Send RFQ', body: 'Use the standard RFQ template. Include drawings, specs, and scope sheet.' }, { heading: '3. Follow Up', body: 'Follow up 48 hours before quote deadline.' }, { heading: '4. Log Quotes', body: 'Enter all quotes into the estimate sheet. Note exclusions.' }] },
  { id: 'p3', kind: 'PDF' as const, title: 'Addendum Management', owner: 'Luis Woo', summary: 'How to track, document, and respond to project addenda during the bid period.', sections: [{ heading: '1. Monitor', body: 'Check plan room daily during the bid period for new addenda.' }, { heading: '2. Log', body: 'Record each addendum in the project log with date and description.' }, { heading: '3. Revise Estimate', body: 'Update takeoff and estimate for any scope changes.' }, { heading: '4. Notify GC', body: 'Confirm receipt of all addenda with the GC before submitting.' }] },
];

const VENDORS = [
  { id: 'v1', name: 'Oldcastle BuildingEnvelope', trade: 'Glass', about: 'National manufacturer of glass and glazing products. Primary supplier for large commercial projects.', leadTime: '8–12 wks', quoteTurnaround: '3–5 days', terms: 'Net 30', contacts: [{ name: 'Dana Pierce', role: 'Sales Rep', phone: '(404) 555-0182', email: 'dpierce@obe.com' }, { name: 'Marcus Trent', role: 'Technical Sales', phone: '(404) 555-0199', email: 'mtrent@obe.com' }] },
  { id: 'v2', name: 'Kawneer', trade: 'Storefront & curtain wall', about: 'Aluminum framing systems for curtain wall, storefront, and windows. Strong code compliance documentation.', leadTime: '10–14 wks', quoteTurnaround: '4–7 days', terms: 'Net 30', contacts: [{ name: 'Sandra Lee', role: 'Regional Rep', phone: '(678) 555-0141', email: 'slee@kawneer.com' }] },
  { id: 'v3', name: 'Arcadia', trade: 'Storefront & curtain wall', about: 'Architectural aluminum products including curtain wall and storefront. Competitive pricing on custom profiles.', leadTime: '6–10 wks', quoteTurnaround: '3–5 days', terms: 'Net 45', contacts: [{ name: 'James Ortega', role: 'Account Manager', phone: '(770) 555-0155', email: 'jortega@arcadia.com' }] },
  { id: 'v4', name: 'Firestone Building Products', trade: 'Metal panels', about: 'Metal panel systems and facades. Known for warranty programs and installation support.', leadTime: '6–8 wks', quoteTurnaround: '2–4 days', terms: 'Net 30', contacts: [{ name: 'Lynn Cho', role: 'Sales', phone: '(615) 555-0177', email: 'lcho@firestone.com' }] },
  { id: 'v5', name: 'Allegion', trade: 'Door hardware', about: 'Commercial door hardware and access control. Full product schedule takeoff available.', leadTime: '4–6 wks', quoteTurnaround: '1–3 days', terms: 'Net 30', contacts: [{ name: 'Tom Vasquez', role: 'Specification Rep', phone: '(404) 555-0133', email: 'tvasquez@allegion.com' }] },
  { id: 'v6', name: 'Sika Corporation', trade: 'Sealants & glazing supplies', about: 'Structural and weather sealants for glazing. Full technical support for spec compliance.', leadTime: '1–2 wks', quoteTurnaround: '1–2 days', terms: 'Net 30', contacts: [{ name: 'Priya Nair', role: 'Technical Rep', phone: '(864) 555-0162', email: 'pnair@sika.com' }] },
];
const VENDOR_TRADES = ['All trades', 'Glass', 'Storefront & curtain wall', 'Metal panels', 'Door hardware', 'Doors & entrances', 'Sealants & glazing supplies', 'Skylights & canopies', 'Railings & handrail', 'Louvers & sunshades', 'Fabrication & finishing'];

const TOOLS = [
  { id: 't1', name: 'Bluebeam Revu', kind: 'TAKEOFF SOFTWARE', note: 'Primary takeoff and markup tool. Use for all quantity surveys, drawing markups, and bid set management.', file: 'Bluebeam_Setup_Guide.pdf', meta: 'PDF · 2.1 MB', training: ['Bluebeam'] },
  { id: 't2', name: 'Glazier Studio', kind: 'ESTIMATING SOFTWARE', note: 'Glass and glazing estimating platform. Connects directly to bid projects and generates cost reports.', file: 'GlazierStudio_Manual.pdf', meta: 'PDF · 3.4 MB', training: ['Glazier Studio'] },
  { id: 't3', name: 'Microsoft Excel', kind: 'WORKBOOK', note: 'Standard estimate sheet and bid tab tool. Use the 1CG Estimate Template for all bids.', file: '1CG_Estimate_Template.xlsx', meta: 'XLSX · 890 KB', training: ['Microsoft Excel'] },
  { id: 't4', name: 'AI Estimate Assistant', kind: 'AI', note: 'AI-powered tool for extracting scope from specifications and generating first-pass estimates.', file: 'AI_Tool_Guide.pdf', meta: 'PDF · 1.2 MB', training: ['AI'] },
];

const TRAINING_VIDEOS = [
  { id: 'tr1', type: 'Bluebeam', title: 'Bluebeam Revu: Glazing Takeoff Basics', length: '24 min', description: 'Learn the standard 1CG takeoff workflow using Bluebeam Revu. Covers markup layers, measurement tools, and quantity export.', videoUrl: '' },
  { id: 'tr2', type: 'Bluebeam', title: 'Bluebeam: Custom Columns & Legends', length: '18 min', description: 'Set up custom columns for material types and auto-generate legends. Speeds up quantity verification significantly.', videoUrl: '' },
  { id: 'tr3', type: 'Glazier Studio', title: 'Glazier Studio: First Bid Setup', length: '31 min', description: 'Walk through setting up a new project, entering opening schedules, and generating a first-pass estimate in Glazier Studio.', videoUrl: '' },
  { id: 'tr4', type: 'Metal panels', title: 'Metal Panel Estimating Fundamentals', length: '22 min', description: 'Overview of metal panel systems, takeoff methodology, and common exclusions to watch for on panel scopes.', videoUrl: '' },
  { id: 'tr5', type: 'AI', title: 'Using AI to Extract Scope from Specs', length: '15 min', description: 'How to use the 1CG AI assistant to parse specifications and flag relevant sections for glazing and metal panel scopes.', videoUrl: '' },
  { id: 'tr6', type: 'Microsoft Excel', title: '1CG Estimate Template Walkthrough', length: '28 min', description: 'Full walkthrough of the standard estimate template, including formulas, GC tab, and formatting for submission.', videoUrl: '' },
  { id: 'tr7', type: 'Estimating basics', title: 'Reading Commercial Construction Documents', length: '35 min', description: 'Foundation course on reading drawings, spec sections, and addenda for commercial glazing and facade scopes.', videoUrl: '' },
  { id: 'tr8', type: 'Estimating basics', title: 'GC Relationships and Bid Strategy', length: '20 min', description: 'How to work with general contractors, understand bid invitations, and position 1CG competitively.', videoUrl: '' },
];
const TRAINING_FILTERS = ['All training', 'Bluebeam', 'Glazier Studio', 'Metal panels', 'AI', 'Microsoft Excel', 'Estimating basics'];

function ResourcesView({ st, setSt }: { st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; me: Person }) {
  const cat = st.resCategory;
  const search = st.resSearch.toLowerCase();

  const CATEGORIES: Array<{ key: typeof cat; label: string; count: number }> = [
    { key: 'processes', label: 'Processes', count: PROCESSES.length },
    { key: 'vendors', label: 'Vendor contacts', count: VENDORS.length },
    { key: 'tools', label: 'Tools', count: TOOLS.length },
    { key: 'training', label: 'Training', count: TRAINING_VIDEOS.length },
  ];

  const catHints: Record<typeof cat, string> = {
    processes: 'Standard operating procedures for the estimating team.',
    vendors: 'Approved suppliers and vendor contacts by trade.',
    tools: 'Software and workbooks used for estimating and takeoff.',
    training: 'Video guides for tools and estimating fundamentals.',
  };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
      {/* category rail */}
      <div style={{ width: 230, flexShrink: 0, borderRight: '2px solid var(--color-text)', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '2px solid var(--color-text)', font: '700 11px/1 var(--font-body)', letterSpacing: '.16em' }}>RESOURCE LIBRARY</div>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setSt(s => ({ ...s, resCategory: c.key, resSearch: '', resSelectedVendor: null, resProcessReader: null }))} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: 'none', borderBottom: '1px solid var(--color-divider)', background: cat === c.key ? 'var(--color-text)' : 'transparent', color: cat === c.key ? '#fff' : 'var(--color-text)', font: '600 12.5px/1 var(--font-body)', textAlign: 'left', cursor: 'pointer' }}>
            <span>{c.label}</span>
            <span style={{ font: '600 11px/1 var(--font-body)', opacity: .6 }}>{c.count}</span>
          </button>
        ))}
      </div>

      {/* content panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* panel header */}
        {!st.resProcessReader && (
          <div style={{ padding: '16px 24px', borderBottom: '2px solid var(--color-text)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, background: 'var(--color-bg)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ font: '800 18px/1 var(--font-heading)' }}>{CATEGORIES.find(c => c.key === cat)?.label}</div>
              <div style={{ font: '400 11.5px/1 var(--font-body)', color: 'var(--color-neutral-600)', marginTop: 4 }}>{catHints[cat]}</div>
            </div>
            <input value={st.resSearch} onChange={e => setSt(s => ({ ...s, resSearch: e.target.value, resSelectedVendor: null }))} placeholder={cat === 'processes' ? 'Search processes' : cat === 'vendors' ? 'Search vendors' : cat === 'tools' ? 'Search tools' : 'Search training'} style={{ ...inputStyle, width: 220, padding: '8px 12px' }} />
            <button onClick={() => setSt(s => ({ ...s, resAddingResource: true }))} style={{ padding: '9px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', flexShrink: 0 }}>+ ADD RESOURCE</button>
          </div>
        )}

        {/* PROCESSES */}
        {cat === 'processes' && !st.resProcessReader && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {[...PROCESSES, ...(st.userProcesses || [])].filter(p => !search || p.title.toLowerCase().includes(search) || p.owner.toLowerCase().includes(search)).map((proc, i, arr) => (
              <ProcessRow key={proc.id} proc={proc as typeof PROCESSES[0]} isLast={i === arr.length - 1} onRead={() => setSt(s => ({ ...s, resProcessReader: proc.id }))} />
            ))}
          </div>
        )}

        {/* PROCESS READER */}
        {cat === 'processes' && st.resProcessReader && (() => {
          const proc = [...PROCESSES, ...(st.userProcesses || [])].find(p => p.id === st.resProcessReader) as typeof PROCESSES[0] | undefined;
          if (!proc) return null;
          return (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 40px', maxWidth: 900 }}>
              <button onClick={() => setSt(s => ({ ...s, resProcessReader: null }))} style={{ background: 'none', border: 'none', font: '600 11px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer', color: 'var(--color-accent)', marginBottom: 16, padding: 0 }}>← ALL PROCESSES</button>
              <div style={{ font: '500 10.5px/1 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-600)', marginBottom: 8 }}>{proc.kind} · OWNER: {proc.owner.toUpperCase()}</div>
              <div style={{ font: '800 28px/1.2 var(--font-heading)', marginBottom: 12 }}>{proc.title}</div>
              <div style={{ font: '400 13.5px/1.6 var(--font-body)', color: 'var(--color-neutral-700)', marginBottom: 20 }}>{proc.summary}</div>
              <div style={{ height: 2, background: 'var(--color-text)', marginBottom: 20 }} />
              {proc.sections.map((sec, i) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  <div style={{ font: '700 14px/1 var(--font-body)', marginBottom: 8 }}>{sec.heading}</div>
                  <div style={{ font: '400 13px/1.6 var(--font-body)', color: 'var(--color-neutral-700)' }}>{sec.body}</div>
                </div>
              ))}
              <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--color-divider)' }}>
                <button style={{ padding: '10px 20px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>↓ DOWNLOAD</button>
              </div>
            </div>
          );
        })()}

        {/* VENDORS */}
        {cat === 'vendors' && (
          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-divider)', flexShrink: 0 }}>
                <select value={st.resVendorTrade} onChange={e => setSt(s => ({ ...s, resVendorTrade: e.target.value, resSelectedVendor: null }))} style={{ ...inputStyle, width: '100%', padding: '7px 10px', appearance: 'none' }}>
                  {[...VENDOR_TRADES, ...(st.customVendorTrades || [])].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {[...VENDORS, ...(st.userVendors || [])].filter(v => {
                  if (st.resVendorTrade !== 'All trades' && v.trade !== st.resVendorTrade) return false;
                  if (search && !v.name.toLowerCase().includes(search) && !v.trade.toLowerCase().includes(search) && !v.about.toLowerCase().includes(search) && !v.contacts.some(c => c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search))) return false;
                  return true;
                }).map(v => (
                  <button key={v.id} onClick={() => setSt(s => ({ ...s, resSelectedVendor: v.id }))} style={{ width: '100%', padding: '12px 14px', border: 'none', borderBottom: '1px solid var(--color-divider)', background: st.resSelectedVendor === v.id ? 'var(--color-text)' : 'transparent', color: st.resSelectedVendor === v.id ? '#fff' : 'var(--color-text)', textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ font: '600 12.5px/1 var(--font-body)' }}>{v.name}</div>
                    <div style={{ font: '400 10.5px/1 var(--font-body)', opacity: .65, marginTop: 4 }}>{v.trade} · {v.contacts.length} contact{v.contacts.length !== 1 ? 's' : ''}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {(() => {
                const v = [...VENDORS, ...(st.userVendors || [])].find(v => v.id === st.resSelectedVendor);
                if (!v) return <div style={{ font: '500 12px/1 var(--font-body)', color: 'var(--color-neutral-500)', padding: 8 }}>Select a company on the left.</div>;
                return (
                  <>
                    <div style={{ font: '800 22px/1.2 var(--font-heading)', marginBottom: 4 }}>{v.name}</div>
                    <div style={{ font: '700 10px/1 var(--font-body)', letterSpacing: '.14em', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: 14 }}>{v.trade}</div>
                    <div style={{ font: '400 13px/1.6 var(--font-body)', color: 'var(--color-neutral-700)', marginBottom: 16 }}>{v.about}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--color-divider)', borderBottom: '1px solid var(--color-divider)', marginBottom: 20 }}>
                      {[['LEAD TIME', v.leadTime], ['QUOTE TURNAROUND', v.quoteTurnaround]].map(([l, val]) => (
                        <div key={l} style={{ padding: '12px 14px', borderLeft: l !== 'LEAD TIME' ? '1px solid var(--color-divider)' : 'none' }}>
                          <div style={{ font: '500 9.5px/1 var(--font-body)', letterSpacing: '.1em', color: 'var(--color-neutral-600)', marginBottom: 6 }}>{l}</div>
                          <div style={{ font: '700 13px/1 var(--font-body)' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ font: '700 11px/1 var(--font-body)', letterSpacing: '.12em', marginBottom: 10 }}>CONTACTS</div>
                    {v.contacts.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-divider)' }}>
                        <div style={{ width: 34, height: 34, background: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 11px/1 var(--font-body)', color: '#fff', flexShrink: 0 }}>{c.name.split(' ').map(w => w[0]).join('')}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ font: '600 13px/1 var(--font-body)' }}>{c.name}</div>
                          <div style={{ font: '400 11px/1 var(--font-body)', color: 'var(--color-neutral-600)', marginTop: 3 }}>{c.role}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ font: '400 11.5px/1 var(--font-body)' }}>{c.phone}</div>
                          <a href={'mailto:' + c.email} style={{ font: '600 11px/1 var(--font-body)', color: 'var(--color-accent)', display: 'block', marginTop: 3 }}>{c.email}</a>
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* TOOLS */}
        {cat === 'tools' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {[...TOOLS, ...(st.userTools || [])].filter(t => !search || t.name.toLowerCase().includes(search) || t.note.toLowerCase().includes(search)).map((tool, i) => (
              <div key={tool.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-divider)', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 5 }}>
                    <div style={{ width: 8, height: 8, background: 'var(--color-accent)', flexShrink: 0, marginTop: 4 }} />
                    <div style={{ font: '700 14px/1 var(--font-body)' }}>{tool.name}</div>
                    <div style={{ font: '600 9.5px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)' }}>{tool.kind}</div>
                  </div>
                  <div style={{ font: '400 12.5px/1.5 var(--font-body)', color: 'var(--color-neutral-700)', marginLeft: 18, marginBottom: 8 }}>{tool.note}</div>
                  <div style={{ marginLeft: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {tool.training.map(type => (
                      <button key={type} onClick={() => setSt(s => ({ ...s, resCategory: 'training', resTrainingFilter: type, resSearch: '' }))} style={{ padding: '4px 10px', border: '1px solid var(--color-accent)', background: 'none', color: 'var(--color-accent)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>▶ {type.toUpperCase()} TRAINING</button>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <button style={{ padding: '9px 16px', background: 'var(--color-text)', color: '#fff', border: 'none', font: '700 11px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', display: 'block', marginBottom: 6 }}>↓ DOWNLOAD</button>
                  <div style={{ font: '400 10px/1 var(--font-body)', color: 'var(--color-neutral-500)' }}>{tool.meta}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TRAINING */}
        {cat === 'training' && (() => {
          const allTypes = [...new Set([...TRAINING_FILTERS.slice(1), ...(st.customTrainingTypes || [])])];
          const allFilters = ['All training', ...allTypes];
          const allVideos = [...TRAINING_VIDEOS, ...(st.userTrainingVideos || [])];
          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--color-divider)', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, background: 'var(--color-bg)' }}>
                {allFilters.map(f => (
                  <button key={f} onClick={() => setSt(s => ({ ...s, resTrainingFilter: f }))} style={{ padding: '5px 12px', border: st.resTrainingFilter === f ? 'none' : '1px solid var(--color-divider)', background: st.resTrainingFilter === f ? 'var(--color-accent)' : 'transparent', color: st.resTrainingFilter === f ? '#fff' : 'var(--color-neutral-600)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>{f.toUpperCase()}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {allVideos.filter(v => {
                    if (st.resTrainingFilter !== 'All training' && v.type !== st.resTrainingFilter) return false;
                    if (search && !v.title.toLowerCase().includes(search) && !v.description.toLowerCase().includes(search)) return false;
                    return true;
                  }).map(video => (
                    <button key={video.id} onClick={() => setSt(s => ({ ...s, resVideoOpen: video.id }))} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                      <div style={{ height: 140, background: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%' }}>
                        <div style={{ width: 44, height: 44, border: '2px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ font: '400 18px/1', color: 'rgba(255,255,255,.8)', marginLeft: 2 }}>▶</div>
                        </div>
                        <div style={{ position: 'absolute', bottom: 10, right: 10, padding: '3px 7px', background: 'rgba(0,0,0,.55)', color: '#fff', font: '600 10px/1 var(--font-body)', letterSpacing: '.04em' }}>{video.length}</div>
                      </div>
                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                        <div style={{ font: '700 9px/1 var(--font-body)', letterSpacing: '.14em', color: 'var(--color-accent)', textTransform: 'uppercase' }}>{video.type}</div>
                        <div style={{ font: '700 13px/1.3 var(--font-body)', color: 'var(--color-text)' }}>{video.title}</div>
                        <div style={{ font: '400 11.5px/1.5 var(--font-body)', color: 'var(--color-neutral-600)' }}>{video.description}</div>
                        <div style={{ marginTop: 8, padding: '7px 12px', background: 'var(--color-text)', color: '#fff', font: '700 10px/1 var(--font-body)', letterSpacing: '.1em', alignSelf: 'flex-start' }}>▶ WATCH</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Video viewer modal */}
      {st.resVideoOpen && (() => {
        const allVideos = [...TRAINING_VIDEOS, ...(st.userTrainingVideos || [])];
        const video = allVideos.find(v => v.id === st.resVideoOpen);
        if (!video) return null;
        const filtered = allVideos.filter(v => st.resTrainingFilter === 'All training' || v.type === st.resTrainingFilter);
        const idx = filtered.findIndex(v => v.id === st.resVideoOpen);
        const prev = filtered[idx - 1];
        const next = filtered[idx + 1];
        return (
          <div onClick={() => setSt(s => ({ ...s, resVideoOpen: null }))} style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,18,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 32 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* modal header */}
              <div style={{ padding: '14px 20px', borderBottom: '2px solid var(--color-text)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ font: '700 9px/1 var(--font-body)', letterSpacing: '.14em', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: 5 }}>{video.type}</div>
                  <div style={{ font: '800 17px/1.2 var(--font-heading)' }}>{video.title}</div>
                </div>
                <button onClick={() => window.open(video.videoUrl || '#', '_blank')} style={{ padding: '8px 14px', border: '1px solid var(--color-text)', background: 'none', font: '600 10px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer', flexShrink: 0 }}>OPEN IN TAB ↗</button>
                <button onClick={() => setSt(s => ({ ...s, resVideoOpen: null }))} style={{ padding: '8px 12px', border: '1px solid var(--color-divider)', background: 'none', font: '600 11px/1 var(--font-body)', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>✕</button>
              </div>
              {/* video area */}
              <div style={{ background: '#0e0d0d', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                {video.videoUrl
                  ? <iframe src={video.videoUrl} style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', inset: 0 }} allowFullScreen title={video.title} />
                  : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 64, height: 64, border: '2px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ font: '300 28px/1', color: 'rgba(255,255,255,.5)', marginLeft: 4 }}>▶</div>
                      </div>
                      <div style={{ font: '500 11px/1 var(--font-body)', letterSpacing: '.12em', color: 'rgba(255,255,255,.3)' }}>{video.length}</div>
                    </div>
                  )
                }
              </div>
              {/* meta + nav */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-divider)', display: 'flex', alignItems: 'flex-start', gap: 20, flexShrink: 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ font: '400 12.5px/1.6 var(--font-body)', color: 'var(--color-neutral-700)' }}>{video.description}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  <button onClick={() => prev && setSt(s => ({ ...s, resVideoOpen: prev.id }))} disabled={!prev} style={{ padding: '8px 14px', border: '1px solid var(--color-text)', background: 'none', font: '700 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: prev ? 'pointer' : 'default', opacity: prev ? 1 : .3 }}>← PREV</button>
                  <span style={{ font: '500 10px/1 var(--font-body)', color: 'var(--color-neutral-500)' }}>{idx + 1} / {filtered.length}</span>
                  <button onClick={() => next && setSt(s => ({ ...s, resVideoOpen: next.id }))} disabled={!next} style={{ padding: '8px 14px', border: '1px solid var(--color-text)', background: 'none', font: '700 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: next ? 'pointer' : 'default', opacity: next ? 1 : .3 }}>NEXT →</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Resource modal */}
      {st.resAddingResource && <AddResourceModal st={st} setSt={setSt} />}
    </div>
  );
}

function UploadZone({ label, accept, file, url, onFile, onUrl, urlPlaceholder }: {
  label: string; accept: string; file: File | null; url: string;
  onFile: (f: File, objectUrl: string) => void; onUrl: (u: string) => void; urlPlaceholder: string;
}) {
  const [mode, setMode] = useState<'link' | 'file'>('link');
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', marginBottom: 10, border: '1px solid var(--color-text)' }}>
        <button onClick={() => setMode('link')} style={{ flex: 1, padding: '8px', border: 'none', background: mode === 'link' ? 'var(--color-text)' : 'transparent', color: mode === 'link' ? '#fff' : 'var(--color-text)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>LINK / URL</button>
        <button onClick={() => setMode('file')} style={{ flex: 1, padding: '8px', border: 'none', borderLeft: '1px solid var(--color-text)', background: mode === 'file' ? 'var(--color-text)' : 'transparent', color: mode === 'file' ? '#fff' : 'var(--color-text)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>UPLOAD FILE</button>
      </div>
      {mode === 'link'
        ? <input value={url} onChange={e => onUrl(e.target.value)} placeholder={urlPlaceholder} style={{ ...inputStyle, padding: '8px 10px', width: '100%' }} />
        : (
          <div>
            <input ref={ref} type="file" accept={accept} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f, URL.createObjectURL(f)); }} style={{ display: 'none' }} />
            <button onClick={() => ref.current?.click()} style={{ width: '100%', padding: '18px', border: '1px dashed var(--color-neutral-400)', background: 'var(--color-neutral-100)', font: '600 11px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>
              {file ? `✓  ${file.name}` : 'CLICK TO CHOOSE FILE'}
            </button>
            {file && <div style={{ font: '400 10.5px/1 var(--font-body)', color: 'var(--color-neutral-500)', marginTop: 5 }}>{(file.size / 1024).toFixed(0)} KB · {file.type || 'file'}</div>}
          </div>
        )
      }
    </div>
  );
}

function AddResourceModal({ st, setSt }: { st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>> }) {
  const cat = st.resCategory;
  const close = () => setSt(s => ({ ...s, resAddingResource: false }));

  const TITLES: Record<typeof cat, string> = {
    processes: 'ADD PROCESS DOCUMENT',
    vendors: 'ADD VENDOR CONTACT',
    tools: 'ADD TOOL',
    training: 'ADD TRAINING VIDEO',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,30,29,.5)', display: 'grid', placeItems: 'center', zIndex: 80 }}>
      <div style={{ background: 'var(--color-bg)', border: '2px solid var(--color-text)', width: 640, maxWidth: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--color-text)', font: '800 15px/1 var(--font-heading)' }}>{TITLES[cat]}</div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {cat === 'processes' && <AddProcessForm setSt={setSt} close={close} />}
          {cat === 'vendors' && <AddVendorForm setSt={setSt} close={close} />}
          {cat === 'tools' && <AddToolForm setSt={setSt} close={close} />}
          {cat === 'training' && <AddTrainingForm st={st} setSt={setSt} close={close} />}
        </div>
      </div>
    </div>
  );
}

function FormFooter({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div style={{ padding: '14px 24px', borderTop: '1px solid var(--color-divider)', display: 'flex', gap: 10 }}>
      <Button onClick={onSave}>SAVE</Button>
      <Button variant="secondary" onClick={onCancel}>CANCEL</Button>
    </div>
  );
}

function AddProcessForm({ setSt, close }: { setSt: React.Dispatch<React.SetStateAction<AppState>>; close: () => void }) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [summary, setSummary] = useState('');
  const [kind, setKind] = useState<'PDF' | 'DOCX' | 'OTHER'>('PDF');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [fileObjectUrl, setFileObjectUrl] = useState('');

  function save() {
    if (!title.trim()) return;
    setSt(s => ({
      ...s,
      userProcesses: [...(s.userProcesses || []), {
        id: 'up' + Date.now(), kind, title: title.trim(), owner: owner.trim(),
        summary: summary.trim(), fileName: file?.name, fileUrl: file ? fileObjectUrl : fileUrl.trim(), sections: [],
      }],
      resAddingResource: false,
    }));
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="DOCUMENT TITLE"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Process name" style={{ ...inputStyle, padding: '8px 10px' }} autoFocus /></Field>
      <Field label="FILE TYPE">
        <div style={{ display: 'flex', border: '1px solid var(--color-text)' }}>
          {(['PDF', 'DOCX', 'OTHER'] as const).map((k, i) => (
            <button key={k} onClick={() => setKind(k)} style={{ flex: 1, padding: '8px', border: 'none', borderLeft: i > 0 ? '1px solid var(--color-text)' : 'none', background: kind === k ? 'var(--color-text)' : 'transparent', color: kind === k ? '#fff' : 'var(--color-text)', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer' }}>{k}</button>
          ))}
        </div>
      </Field>
      <Field label="OWNER / RESPONSIBLE PARTY"><input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Name" style={{ ...inputStyle, padding: '8px 10px' }} /></Field>
      <Field label="SUMMARY / WHAT IT COVERS"><textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Brief description of this process" rows={3} style={{ ...inputStyle, padding: '8px 10px', resize: 'vertical' }} /></Field>
      <UploadZone label="DOCUMENT FILE" accept=".pdf,.doc,.docx,.xls,.xlsx,application/*" file={file} url={fileUrl} onFile={(f, u) => { setFile(f); setFileObjectUrl(u); }} onUrl={setFileUrl} urlPlaceholder="https://… SharePoint or direct link" />
      <FormFooter onSave={save} onCancel={close} />
    </div>
  );
}

function AddVendorForm({ setSt, close }: { setSt: React.Dispatch<React.SetStateAction<AppState>>; close: () => void }) {
  const [name, setName] = useState('');
  const [trade, setTrade] = useState(VENDOR_TRADES[1]);
  const [newTradeMode, setNewTradeMode] = useState(false);
  const [newTrade, setNewTrade] = useState('');
  const [about, setAbout] = useState('');
  const [products, setProducts] = useState('');
  const [leadTime, setLeadTime] = useState('');
  const [quoteTurnaround, setQuoteTurnaround] = useState('');
  const [contacts, setContacts] = useState([{ name: '', role: '', phone: '', email: '' }]);

  function save() {
    if (!name.trim()) return;
    const resolvedTrade = newTradeMode ? newTrade.trim() : trade;
    if (!resolvedTrade) return;
    const id = 'uv' + Date.now();
    setSt(s => ({
      ...s,
      userVendors: [...(s.userVendors || []), {
        id, name: name.trim(), trade: resolvedTrade,
        about: [about.trim(), products.trim() ? `Products/supply: ${products.trim()}` : ''].filter(Boolean).join(' · '),
        leadTime: leadTime.trim() || '—', quoteTurnaround: quoteTurnaround.trim() || '—', terms: '—',
        contacts: contacts.filter(c => c.name.trim()),
      }],
      customVendorTrades: newTradeMode && newTrade.trim() && !VENDOR_TRADES.includes(newTrade.trim()) && !(s.customVendorTrades || []).includes(newTrade.trim())
        ? [...(s.customVendorTrades || []), newTrade.trim()]
        : (s.customVendorTrades || []),
      resVendorTrade: resolvedTrade,
      resSelectedVendor: id,
      resAddingResource: false,
    }));
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="COMPANY NAME"><input value={name} onChange={e => setName(e.target.value)} placeholder="Vendor or supplier name" style={{ ...inputStyle, padding: '8px 10px' }} autoFocus /></Field>
      <Field label="TRADE">
        {newTradeMode ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newTrade} onChange={e => setNewTrade(e.target.value)} placeholder="New trade name" style={{ ...inputStyle, padding: '8px 10px', flex: 1 }} autoFocus />
            <button onClick={() => setNewTradeMode(false)} style={{ padding: '8px 12px', border: '1px solid var(--color-divider)', background: 'none', font: '600 10px/1 var(--font-body)', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>← BACK</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={trade} onChange={e => setTrade(e.target.value)} style={{ ...inputStyle, padding: '8px 10px', flex: 1, appearance: 'none' }}>
              {VENDOR_TRADES.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => setNewTradeMode(true)} style={{ padding: '8px 12px', border: '1px solid var(--color-text)', background: 'none', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', flexShrink: 0 }}>+ NEW</button>
          </div>
        )}
      </Field>
      <Field label="BRIEF DESCRIPTION"><textarea value={about} onChange={e => setAbout(e.target.value)} placeholder="What this vendor does, notable strengths" rows={2} style={{ ...inputStyle, padding: '8px 10px', resize: 'vertical' }} /></Field>
      <Field label="PRODUCTS / WHAT THEY SUPPLY"><textarea value={products} onChange={e => setProducts(e.target.value)} placeholder="List the products or materials they supply" rows={2} style={{ ...inputStyle, padding: '8px 10px', resize: 'vertical' }} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="LEAD TIME"><input value={leadTime} onChange={e => setLeadTime(e.target.value)} placeholder="e.g. 6–8 wks" style={{ ...inputStyle, padding: '8px 10px' }} /></Field>
        <Field label="QUOTE TURNAROUND"><input value={quoteTurnaround} onChange={e => setQuoteTurnaround(e.target.value)} placeholder="e.g. 2–3 days" style={{ ...inputStyle, padding: '8px 10px' }} /></Field>
      </div>
      <div>
        <div style={{ font: '600 10px/1 var(--font-body)', letterSpacing: '.12em', color: 'var(--color-neutral-600)', marginBottom: 10 }}>CONTACTS</div>
        {contacts.map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12, padding: 14, background: 'var(--color-neutral-100)', position: 'relative' }}>
            <Field label="NAME"><input value={c.name} onChange={e => setContacts(cs => cs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Full name" style={{ ...inputStyle, padding: '8px 10px' }} /></Field>
            <Field label="ROLE / TITLE"><input value={c.role} onChange={e => setContacts(cs => cs.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} placeholder="e.g. Sales Rep" style={{ ...inputStyle, padding: '8px 10px' }} /></Field>
            <Field label="PHONE"><input value={c.phone} onChange={e => setContacts(cs => cs.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} placeholder="(000) 000-0000" style={{ ...inputStyle, padding: '8px 10px' }} /></Field>
            <Field label="EMAIL"><input value={c.email} onChange={e => setContacts(cs => cs.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} placeholder="name@company.com" style={{ ...inputStyle, padding: '8px 10px' }} /></Field>
            {contacts.length > 1 && <button onClick={() => setContacts(cs => cs.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', font: '600 11px/1', color: 'var(--color-neutral-500)' }}>✕</button>}
          </div>
        ))}
        <button onClick={() => setContacts(cs => [...cs, { name: '', role: '', phone: '', email: '' }])} style={{ padding: '7px 14px', border: '1px solid var(--color-divider)', background: 'none', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>+ ADD CONTACT</button>
      </div>
      <FormFooter onSave={save} onCancel={close} />
    </div>
  );
}

function AddToolForm({ setSt, close }: { setSt: React.Dispatch<React.SetStateAction<AppState>>; close: () => void }) {
  const TOOL_KINDS = ['TAKEOFF SOFTWARE', 'ESTIMATING SOFTWARE', 'WORKBOOK', 'AI', 'OTHER'];
  const [name, setName] = useState('');
  const [kind, setKind] = useState(TOOL_KINDS[0]);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [fileObjectUrl, setFileObjectUrl] = useState('');

  function save() {
    if (!name.trim()) return;
    const meta = file ? `${file.name.split('.').pop()?.toUpperCase() || 'FILE'} · ${(file.size / 1024).toFixed(0)} KB` : '';
    setSt(s => ({
      ...s,
      userTools: [...(s.userTools || []), {
        id: 'ut' + Date.now(), name: name.trim(), kind, note: note.trim(),
        fileUrl: file ? fileObjectUrl : fileUrl.trim(), fileName: file?.name, meta, training: [],
      }],
      resAddingResource: false,
    }));
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="TOOL NAME"><input value={name} onChange={e => setName(e.target.value)} placeholder="Tool or software name" style={{ ...inputStyle, padding: '8px 10px' }} autoFocus /></Field>
      <Field label="TYPE">
        <select value={kind} onChange={e => setKind(e.target.value)} style={{ ...inputStyle, padding: '8px 10px', appearance: 'none' }}>
          {TOOL_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </Field>
      <Field label="DESCRIPTION / HOW IT IS USED"><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Plain-language explanation of what this tool does and when to use it" rows={3} style={{ ...inputStyle, padding: '8px 10px', resize: 'vertical' }} /></Field>
      <UploadZone label="INSTALLER / GUIDE FILE" accept=".pdf,.doc,.docx,.exe,.zip,.dmg,application/*" file={file} url={fileUrl} onFile={(f, u) => { setFile(f); setFileObjectUrl(u); }} onUrl={setFileUrl} urlPlaceholder="https://… download or SharePoint link" />
      <FormFooter onSave={save} onCancel={close} />
    </div>
  );
}

function AddTrainingForm({ st, setSt, close }: { st: AppState; setSt: React.Dispatch<React.SetStateAction<AppState>>; close: () => void }) {
  const allTypes = [...new Set([...TRAINING_FILTERS.slice(1), ...(st.customTrainingTypes || [])])];
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(st.resTrainingFilter !== 'All training' ? st.resTrainingFilter : allTypes[0]);
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [description, setDescription] = useState('');
  const [length, setLength] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoObjectUrl, setVideoObjectUrl] = useState('');

  function save() {
    if (!title.trim()) return;
    const resolvedCat = newCatMode ? newCat.trim() : category;
    if (!resolvedCat) return;
    const extraTypes = newCatMode && newCat.trim() && !allTypes.includes(newCat.trim())
      ? [...(st.customTrainingTypes || []), newCat.trim()] : (st.customTrainingTypes || []);
    setSt(s => ({
      ...s,
      userTrainingVideos: [...(s.userTrainingVideos || []), {
        id: 'utr' + Date.now(), type: resolvedCat, title: title.trim(),
        length: length.trim() || '—', description: description.trim(),
        videoUrl: file ? videoObjectUrl : videoUrl.trim(),
      }],
      customTrainingTypes: extraTypes,
      resTrainingFilter: resolvedCat,
      resAddingResource: false,
    }));
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="TITLE"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title" style={{ ...inputStyle, padding: '8px 10px' }} autoFocus /></Field>
      <Field label="CATEGORY">
        {newCatMode ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category name" style={{ ...inputStyle, padding: '8px 10px', flex: 1 }} autoFocus />
            <button onClick={() => setNewCatMode(false)} style={{ padding: '8px 12px', border: '1px solid var(--color-divider)', background: 'none', font: '600 10px/1 var(--font-body)', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>← BACK</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, padding: '8px 10px', flex: 1, appearance: 'none' }}>
              {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => setNewCatMode(true)} style={{ padding: '8px 12px', border: '1px solid var(--color-text)', background: 'none', font: '600 10px/1 var(--font-body)', letterSpacing: '.08em', cursor: 'pointer', flexShrink: 0 }}>+ NEW</button>
          </div>
        )}
      </Field>
      <Field label="DESCRIPTION"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will viewers learn?" rows={3} style={{ ...inputStyle, padding: '8px 10px', resize: 'vertical' }} /></Field>
      <Field label="DURATION"><input value={length} onChange={e => setLength(e.target.value)} placeholder="e.g. 24 min" style={{ ...inputStyle, padding: '8px 10px' }} /></Field>
      <UploadZone label="VIDEO SOURCE" accept="video/*" file={file} url={videoUrl} onFile={(f, u) => { setFile(f); setVideoObjectUrl(u); if (!length) setLength('—'); }} onUrl={setVideoUrl} urlPlaceholder="https://… YouTube, Vimeo, SharePoint, or direct link" />
      <FormFooter onSave={save} onCancel={close} />
    </div>
  );
}

function ProcessRow({ proc, isLast, onRead }: { proc: typeof PROCESSES[0]; isLast: boolean; onRead: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ padding: '14px 24px', borderBottom: isLast ? 'none' : '1px solid var(--color-divider)', background: hovered ? 'var(--color-neutral-100)' : 'var(--color-bg)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 48, height: 48, background: proc.kind === 'PDF' ? 'var(--color-text)' : 'var(--color-neutral-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 10px/1 var(--font-body)', color: proc.kind === 'PDF' ? '#fff' : 'var(--color-text)', flexShrink: 0 }}>{proc.kind}</div>
      <div style={{ flex: 1 }}>
        <div style={{ font: '600 13.5px/1 var(--font-body)', marginBottom: 3 }}>{proc.title}</div>
        <div style={{ font: '500 10.5px/1 var(--font-body)', color: 'var(--color-neutral-600)', letterSpacing: '.06em' }}>OWNER · {proc.owner.toUpperCase()}</div>
        {hovered && <div style={{ font: '400 11.5px/1.5 var(--font-body)', color: 'var(--color-neutral-700)', marginTop: 8, marginLeft: 0 }}>{proc.summary}</div>}
      </div>
      <button onClick={onRead} style={{ padding: '8px 16px', border: '1px solid var(--color-text)', background: 'none', font: '700 10px/1 var(--font-body)', letterSpacing: '.1em', cursor: 'pointer', flexShrink: 0 }}>READ</button>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  if (!userId) return <LoginScreen onLogin={setUserId} />;
  return <MainApp userId={userId} onSignOut={() => setUserId(null)} />;
}
