export type PersonKind = 'exec' | 'manager' | 'estimator';
export type BidStatus = 'pending' | 'accepted' | 'declined';

export interface BidProject {
  id: string; name: string; gc: string; bidDate: string;
  level: string; location: string; scope: string;
  planRoom: string; info: string; notes: string;
  status: BidStatus; assignees: string[];
  declineReason: string; declineNote: string;
  notified: boolean; photo?: string;
}

export const BID_LEVELS = ['100% CD', '90% CD', '75% DD', '50% DD', '100% CD + Add. 3', 'N/A'];
export const DECLINE_REASONS = ['Capacity', 'Scope outside our trade', 'Schedule conflict', 'Location too far', 'GC relationship or terms', 'Other'];
export type TaskStatus = 'To-Do' | 'In Progress' | 'Awaiting Response' | 'Complete';
export type CrmStage = 'Bidding' | 'Feeling Good' | 'Neutral' | 'At Risk' | 'Sold' | 'Lost' | 'No bid';

export interface Person {
  id: string; name: string; first: string; role: string;
  initials: string; email: string; kind: PersonKind; mgr: string | null;
}
export interface GcContact { name: string; title: string; email: string; phone: string; }
export interface Project {
  id: string; ref: string; name: string; short: string; client: string;
  scope: string; bidDue: string; value: string; bidTab: string;
  location: string; glazier: string; sqft: string; trade?: 'glass' | 'acm';
  gc?: string; gcContacts?: GcContact[]; drawings?: string;
}
export interface Task {
  id: string; title: string; projectId: string; who: string;
  status: TaskStatus; due: string; day: string; date: string | null;
  hrs: number; detail: string; notes: NoteEntry[];
}
export interface NoteEntry { who: string; when: string; text: string; }
export interface Revision { rev: string; label: string; price: string; cost: string; when: string; who: string; note: string; }
export interface FollowUp { id: string; date: string; note: string; by: string; done: boolean; }
export interface Deal {
  estimator: string; manager: string; bd: string; stage: CrmStage;
  docStage: string; price: string; cost: string;
  loggedAt: string; assignedAt: string; lastPricedAt?: string;
}

export const PEOPLE: Person[] = [
  { id: 'paul',  name: 'Paul Dustin',         first: 'Paul',  role: 'VP of PreCon',           initials: 'PD', email: 'PaulDustin@Glass1st.net',           kind: 'exec',      mgr: null },
  { id: 'blake', name: 'Blake Nicholson',      first: 'Blake', role: 'Estimating Manager',      initials: 'BN', email: 'BlakeNicholson@Glass1st.net',        kind: 'manager',   mgr: 'paul' },
  { id: 'luis',  name: 'Luis Woo',             first: 'Luis',  role: 'Estimating Manager',      initials: 'LW', email: 'LuisWoo@Glass1st.net',               kind: 'manager',   mgr: 'paul' },
  { id: 'chris', name: 'Chris Hollingsworth',  first: 'Chris', role: 'MP Estimating Manager',   initials: 'CH', email: 'ChrisHollingsworth@Glass1st.net',     kind: 'manager',   mgr: 'paul' },
  { id: 'allen', name: 'Allen Poole',          first: 'Allen', role: 'Estimator',               initials: 'AP', email: 'AllenPoole@Glass1st.net',             kind: 'estimator', mgr: 'blake' },
  { id: 'nico',  name: 'Nico Goenaga',         first: 'Nico',  role: 'Estimator',               initials: 'NG', email: 'NicolasGoenaga@Glass1st.net',         kind: 'estimator', mgr: 'blake' },
  { id: 'eric',  name: 'Eric Lunsford',        first: 'Eric',  role: 'Estimator',               initials: 'EL', email: 'EricLunsford@Glass1st.net',           kind: 'estimator', mgr: 'luis' },
  { id: 'timh',  name: 'Tim Hamilton',         first: 'Tim',   role: 'Estimator',               initials: 'TH', email: 'TimHamilton@Glass1st.net',            kind: 'estimator', mgr: 'luis' },
  { id: 'timp',  name: 'Tim Prewett',          first: 'Tim',   role: 'Cladding Estimator',      initials: 'TP', email: 'timprewett@glass1st.net',             kind: 'estimator', mgr: 'chris' },
  { id: 'ray',   name: 'Ray Herring',          first: 'Ray',   role: 'Estimating Director',     initials: 'RH', email: 'RayHerring@Glass1st.net',             kind: 'exec',      mgr: null },
  { id: 'lucas', name: 'Lucas Braswell',       first: 'Lucas', role: 'Project Developer',        initials: 'LB', email: 'LucasBraswell@Glass1st.net',          kind: 'estimator', mgr: 'blake' },
  { id: 'justin',name: 'Justin Campana',       first: 'Justin',role: 'Project Developer',        initials: 'JC', email: 'JustinCampana@Glass1st.net',          kind: 'estimator', mgr: 'blake' },
];

export const PROJECTS: Project[] = [
  {
    id: 'cedar', ref: 'BID 2041', name: 'Cedar Point Medical Office Building', short: 'Cedar Point MOB',
    client: 'Harmon Construction', gc: 'Harmon Construction',
    location: 'Charlotte, NC', scope: 'Curtain wall + storefront', bidDue: 'Sep 09',
    value: '$1.24M', bidTab: 'BT-2041', glazier: 'Oldcastle', sqft: '11,400 sf', trade: 'glass',
    drawings: 'CD',
    gcContacts: [
      { name: 'Dana Reeves', title: 'Chief Estimator', email: 'dana@harmonco.com', phone: '704-555-0242' },
      { name: 'Marcus Bell', title: 'Project Manager', email: 'mbell@harmonco.com', phone: '704-555-0296' },
    ],
  },
  {
    id: 'northgate', ref: 'BID 2038', name: 'Northgate High School Addition', short: 'Northgate HS',
    client: 'Bratton Builders', gc: 'Bratton Builders',
    location: 'Rock Hill, SC', scope: 'Alum. entrances, HM doors', bidDue: 'Sep 04',
    value: '$862K', bidTab: 'BT-2038', glazier: 'Tubelite', sqft: '6,900 sf', trade: 'glass',
    drawings: 'DD',
    gcContacts: [
      { name: 'Jeff Bratton', title: 'Project Manager', email: 'jbratton@brattonbuilders.com', phone: '803-555-0110' },
    ],
  },
  {
    id: 'riverside', ref: 'BID 2035', name: 'Riverside Marriott Renovation', short: 'Riverside Marriott',
    client: 'Sandhill GC', gc: 'Sandhill GC',
    location: 'Greenville, SC', scope: 'Window wall replacement', bidDue: 'Sep 04',
    value: '$2.05M', bidTab: 'BT-2035', glazier: 'YKK AP', sqft: '18,200 sf', trade: 'glass',
    drawings: 'DD',
    gcContacts: [
      { name: 'Mark Sandhill', title: 'Chief Estimator', email: 'mark@sandhillgc.com', phone: '864-555-0188' },
    ],
  },
  {
    id: 'tempe', ref: 'BID 2044', name: 'Tempe Logistics Center Bldg C', short: 'Tempe Logistics C',
    client: 'Vantage West', gc: 'Vantage West',
    location: 'Tempe, AZ', scope: 'Storefront + skylights', bidDue: 'Sep 17',
    value: '$540K', bidTab: 'BT-2044', glazier: 'Kawneer', sqft: '4,100 sf', trade: 'acm',
    drawings: 'DD',
    gcContacts: [],
  },
  {
    id: 'willow', ref: 'BID 2029', name: 'Willow Creek Apartments Ph. II', short: 'Willow Creek II',
    client: 'Corbett Residential', gc: 'Corbett Residential',
    location: 'Asheville, NC', scope: 'Vinyl windows, sliders, mirrors', bidDue: 'Sep 05',
    value: '$1.10M', bidTab: 'BT-2029', glazier: 'Milgard', sqft: '22,600 sf', trade: 'glass',
    drawings: 'IFC',
    gcContacts: [
      { name: 'Sara Corbett', title: 'Owner Representative', email: 'sara@corbettres.com', phone: '828-555-0021' },
    ],
  },
  {
    id: 'test', ref: 'BID 2042', name: 'Test', short: 'Test',
    client: 'Test GC', gc: 'Test GC',
    location: 'Location TBD', scope: 'Test project', bidDue: 'TBD',
    value: '$0', bidTab: 'BT-2042', glazier: '', sqft: '0 sf', trade: 'glass',
    drawings: '',
    gcContacts: [],
  },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monday(d: Date): Date {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0,0,0,0); return r;
}
function addD(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function workday(d: Date): Date {
  const dw = d.getDay();
  if (dw === 0) return addD(d, 1);
  if (dw === 6) return addD(d, 2);
  return d;
}
export function ymd(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
export function fromYmd(s: string): Date {
  const [y,m,dd] = s.split('-').map(Number);
  return new Date(y, m-1, dd);
}
export function prettyShort(d: Date): string {
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function dayKeyOf(d: Date): string {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

const SEED_BASE = new Date(2026, 7, 10); // Aug 10 2026

function seedShift(): number {
  const m = monday(new Date()); m.setHours(0,0,0,0);
  return Math.round((m.getTime() - SEED_BASE.getTime()) / 86400000);
}

export function seedShiftDate(str: string): Date | null {
  if (!str) return null;
  const m = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(str);
  if (!m) return null;
  const shift = seedShift();
  const base = new Date(2026, MONTHS.indexOf(m[1]), Number(m[2]));
  return addD(base, shift);
}

export function taskDate(t: { due?: string; date?: string | null }): Date | null {
  if (t.date) return fromYmd(t.date);
  if (!t.due) return null;
  return seedShiftDate(t.due);
}

type RawTask = [string, string, string, string, TaskStatus, string, string, number, string, [string, string, string][]];

const SEED: RawTask[] = [
  ['t1','Take off curtain wall elevations 1–4','cedar','allen','In Progress','Aug 12','Tue',6,
   'Blue Elev 3–5. The atrium is a separate tile so Blake can Alt Alternate. Use the 2.0 × 9ʹ system for the typical.',
   [['Allen Poole','Mon 4:02p','Blue Elev 3–5, the atrium is a separate tile so Blake can do an Alternate. Use the 2.0 × 9ʹ system for the typical.'],
    ['Blake Nicholson','Fri 20:20p','Also, the Cedar Point bid form — they will send Addendum 3 Monday.']]],
  ['t2','Request glass quote — Oldcastle','cedar','allen','Awaiting Response','Aug 13','Wed',2,
   'Need 1″ IGU with a low-e #2 and a spandrel price for 1,900 sf.',
   [['Allen Poole','Mon 4:05p','Sent to Damon. Says Wednesday at the earliest.']]],
  ['t11','Bid tab review with Blake','cedar','allen','To-Do','Aug 15','Fri',2,
   'Walk the tab line by line before the 2pm submission.',[],],
  ['t1x','Finalize proposal + estimate','cedar','allen','To-Do','Aug 19','Tue',4,
   'Package scope letter, exclusions, and bid form.',[],],

  ['t3','Price aluminum entrances package','northgate','nico','In Progress','Aug 12','Tue',5,
   'Six pairs of medium-stile plus two ADA operators.',
   [['Nico Goenaga','Mon 11:20a','Operator pricing came in 18% over last year. Carrying the higher number.']]],
  ['t4','Hollow metal door schedule check','northgate','nico','To-Do','Aug 13','Wed',3,
   'Cross-check the schedule against the floor plans — sheet A-601 has two doors that are not on the plan.',[],],
  ['t12','Scope letter — exclusions and clarifications','northgate','nico','To-Do','Aug 14','Thu',2,
   'Standard exclusions plus the note about the temporary weather closure.',[],],
  ['t14','Submit Northgate bid','northgate','blake','To-Do','Aug 14','Thu',1,
   'Bid due 2:00pm to Bratton. Email plus the portal upload.',[],],

  ['t5','Window wall shop-drawing review','riverside','allen','To-Do','Aug 14','Thu',4,
   'First submittal from the fabricator. Watch the anchor condition at the slab edge.',[],],
  ['t6','Confirm existing head condition at levels 3–8','riverside','allen','Awaiting Response','Aug 14','Thu',2,
   'Waiting on the GC to send field photos of the existing receptor.',
   [['Allen Poole','Fri 3:15p','Asked Sandhill twice. Second request sent.']]],
  ['t13','Check subcontractor coverage for glazing labor','riverside','blake','In Progress','Aug 13','Wed',3,
   'Two of three glaziers are loaded through September.',
   [['Blake Nicholson','Mon 1:05p','Reaching out to Meridian Glass for a labor-only number.']]],

  ['t7','Storefront takeoff — Bldg C','tempe','nico','To-Do','Aug 18','Mon',5,
   'Only the west and south elevations are glazed.',[],],
  ['t8','Skylight curb quote — follow up','tempe','nico','Awaiting Response','Aug 17','Fri',1,
   'Two 8x16 unit skylights. Need the curb height confirmed.',
   [['Nico Goenaga','Fri 10:02a','Left a voicemail with the rep.']]],

  ['t9','Vinyl window count by unit type','willow','allen','Complete','Aug 10','Mon',4,
   'A/B/C unit types times 148 units.',
   [['Allen Poole','Mon 8:30a','1,032 windows plus 96 sliders. Loaded in the tab.']]],
  ['t10','Mirror and shower enclosure allowance','willow','nico','Complete','Aug 10','Mon',2,
   'Allowance per unit rather than a takeoff.',[],],

  ['t15','Send out intro email','test','nico','To-Do','Aug 11','Tue',1,
   'Auto-created on project assignment.',[],],
  ['t16','Takeoff + RFQs out','test','nico','To-Do','Aug 12','Wed',6,
   'Auto-created on project assignment.',[],],
  ['t17','Assemble + review estimate sheet','test','nico','To-Do','Aug 18','Mon',2,
   'Auto-created — due before bid close.',[],],
  ['t18','Finalize proposal + estimate','test','nico','To-Do','Aug 19','Tue',4,
   'Auto-created — due on bid date.',[],],
];

export function mkTasks(): Task[] {
  const shift = seedShift();
  return SEED.map(s => {
    const m = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(String(s[5]));
    const d = m ? workday(addD(new Date(2026, MONTHS.indexOf(m[1]), Number(m[2])), shift)) : null;
    return {
      id: s[0], title: s[1], projectId: s[2], who: s[3], status: s[4],
      due: d ? prettyShort(d) : s[5],
      day: d ? dayKeyOf(d) : s[6],
      date: d ? ymd(d) : null,
      hrs: s[7], detail: s[8],
      notes: s[9].map(n => ({ who: n[0], when: n[1], text: n[2] })),
    };
  });
}

export const INITIAL_REVISIONS: Record<string, Revision[]> = {
  cedar: [{ rev:'R0', label:'Base bid', price:'1240000', cost:'952000', when:'Jul 30 · 4:12 PM', who:'Allen Poole', note:'First complete run-off the 100% CD set.' }],
  northgate: [
    { rev:'R0', label:'Base bid',    price:'880000', cost:'702000', when:'Jul 24 · 11:05 AM', who:'Nico Goenaga', note:'Includes both ADA operators.' },
    { rev:'R1', label:'Addendum 2',  price:'862000', cost:'681000', when:'Aug 11 · 9:40 AM',  who:'Nico Goenaga', note:'Addendum 2 deleted two HM door openings.' },
  ],
  riverside: [{ rev:'R0', label:'Budget number', price:'2050000', cost:'1660000', when:'Aug 06 · 2:20 PM', who:'Allen Poole', note:'DD-level budget, carries a 6% design allowance.' }],
  willow: [{ rev:'R0', label:'Base bid', price:'1100000', cost:'814000', when:'Jul 03 · 8:55 AM', who:'Allen Poole', note:'Allowance-based mirror and enclosure scope.' }],
};

export const INITIAL_DEALS: Record<string, Deal> = {
  cedar:    { estimator:'allen', manager:'blake', bd:'Danielle', stage:'Bidding',      docStage:'CD',      price:'1240000', cost:'952000',  loggedAt:'Aug 18', assignedAt:'Aug 20', lastPricedAt:'Jul 30 · 4:12 PM' },
  northgate:{ estimator:'nico',  manager:'blake', bd:'Jaramie',  stage:'Feeling Good', docStage:'DD',      price:'862000',  cost:'681000',  loggedAt:'Aug 31', assignedAt:'Aug 22' },
  riverside:{ estimator:'nico',  manager:'blake', bd:'',         stage:'Bidding',      docStage:'DD',      price:'2050000', cost:'1660000', loggedAt:'Aug 31', assignedAt:'Aug 22' },
  tempe:    { estimator:'nico',  manager:'blake', bd:'Danielle', stage:'Bidding',      docStage:'DD',      price:'',        cost:'',        loggedAt:'Aug 29', assignedAt:'Aug 25' },
  willow:   { estimator:'allen', manager:'blake', bd:'John',     stage:'Sold',         docStage:'IFC',     price:'1100000', cost:'814000',  loggedAt:'Jul 22', assignedAt:'Jun 10', lastPricedAt:'Jun 25 · 8:55 AM' },
  test:     { estimator:'nico',  manager:'blake', bd:'',         stage:'Bidding',      docStage:'',        price:'',        cost:'',        loggedAt:'',       assignedAt:'' },
};

export const STAGES: CrmStage[] = ['Bidding','Feeling Good','Neutral','At Risk','Sold','Lost','No bid'];
export const BD_ROSTER = ['Danielle','Jaramie','John'];
export const DOC_STAGES = ['SD','DD','50% CD','90% CD','100% CD'];
export const NOTE_TAGS = [
  { id:'spec',    label:'SPEC',     snippet:'Spec § — ' },
  { id:'gc',      label:'GC CALL',  snippet:'Call with GC — ' },
  { id:'rfi',     label:'RFI',      snippet:'RFI needed — ' },
  { id:'price',   label:'PRICING',  snippet:'Pricing — ' },
  { id:'todo',    label:'REMINDER', snippet:'Remember to ' },
];

export const WEEKHEAD      = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
export const WEEKDAY_LABELS = ['MON','TUE','WED','THU','FRI'];

export function money(n: number): string {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (n >= 1000)    return '$' + Math.round(n / 1000) + 'K';
  return '$' + n.toLocaleString();
}
export function num(s: string): number {
  return parseFloat(String(s || '').replace(/[$,KkMm]/g, '')) || 0;
}
export function gpPct(price: string, cost: string): string {
  const p = num(price), c = num(cost);
  if (!p || !c) return '—';
  return Math.round((p - c) / p * 100) + '%';
}
export function gpNum(price: string, cost: string): number {
  const p = num(price), c = num(cost);
  return p && c ? p - c : 0;
}
export function statusColor(s: TaskStatus): string {
  if (s === 'Complete')          return 'oklch(0.58 0.12 150)';
  if (s === 'Awaiting Response') return 'oklch(0.72 0.15 78)';
  if (s === 'In Progress')       return 'var(--color-accent)';
  return 'var(--color-neutral-500)';
}
export function statusShort(s: TaskStatus): string {
  return ({ 'To-Do':'TO-DO','In Progress':'WIP','Awaiting Response':'WAITING','Complete':'DONE' } as Record<TaskStatus,string>)[s] || s;
}
export function personName(id: string): string  { return PEOPLE.find(p => p.id === id)?.name || id; }
export function personFirst(id: string): string { return PEOPLE.find(p => p.id === id)?.first || id; }
export function personInitials(id: string): string { return PEOPLE.find(p => p.id === id)?.initials || id.slice(0,2).toUpperCase(); }

export function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
export function mondayOf(d: Date): Date {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0,0,0,0); return r;
}

export { workday, monday };

export const INITIAL_BID_PROJECTS: BidProject[] = [
  {
    id: 'bp1', name: 'Apex Tower Phase 1 — Curtain Wall', gc: 'Turner Construction',
    bidDate: 'Sep 20', level: '100% CD', location: 'Charlotte, NC',
    scope: 'Curtain wall, unitized system, 34,000 sf', planRoom: 'https://planroom.turner.com/apex',
    info: 'Full curtain wall envelope for a 22-story mixed-use tower. Unitized system preferred. Alternate for BIPV glazing on south face.',
    notes: 'Turner rep is Mark Connelly — strong relationship. Seen this GC 3x this year.',
    status: 'pending', assignees: [], declineReason: '', declineNote: '', notified: false,
  },
  {
    id: 'bp2', name: 'Lakefront Civic Center', gc: 'Brasfield & Gorrie',
    bidDate: 'Sep 15', level: '90% CD', location: 'Columbia, SC',
    scope: 'Storefront, skylights, decorative glass partitions', planRoom: '',
    info: 'New civic building for the City of Columbia. Storefront on three facades plus a 1,200 sf skylight over the atrium.',
    notes: 'Need to confirm if the skylight is structural or just glazing.',
    status: 'pending', assignees: [], declineReason: '', declineNote: '', notified: false,
  },
  {
    id: 'bp3', name: 'Meridian Medical Pavilion', gc: 'Skanska USA',
    bidDate: 'Sep 12', level: '75% DD', location: 'Raleigh, NC',
    scope: 'Window wall replacement, 18,500 sf', planRoom: 'https://skanska.buildingconnected.com/m42',
    info: 'Full window wall replacement on an occupied hospital pavilion. Phased install — must coordinate with infection control.',
    notes: 'DDs only so scope has risk. Price with exclusions.',
    status: 'pending', assignees: [], declineReason: '', declineNote: '', notified: false,
  },
  {
    id: 'bp4', name: 'Hartwell Office Complex — Bldg A', gc: 'Batson-Cook',
    bidDate: 'Sep 05', level: '100% CD', location: 'Greenville, SC',
    scope: 'Curtain wall + aluminum entrances, 9,800 sf', planRoom: '',
    info: 'Four-story Class A office. Standard pressure-glazed curtain wall with punched aluminum entrances at two lobby entries.',
    notes: 'Assigned to Allen. Batson-Cook wants number by noon.',
    status: 'accepted', assignees: ['allen'], declineReason: '', declineNote: '', notified: true,
  },
  {
    id: 'bp5', name: 'Pinehurst Resort Expansion', gc: 'Ryan Companies',
    bidDate: 'Sep 08', level: '100% CD + Add. 3', location: 'Pinehurst, NC',
    scope: 'Vinyl windows, sliders, glass railings — resort residential', planRoom: '',
    info: 'Phase 2 resort expansion — 48 villa units. Vinyl windows and sliders per unit type, plus glass railing on all decks.',
    notes: 'Nico has the unit matrix from Phase 1.',
    status: 'accepted', assignees: ['nico'], declineReason: '', declineNote: '', notified: true,
  },
  {
    id: 'bp6', name: 'Blue Ridge Data Center', gc: 'McCarthy Building Companies',
    bidDate: 'Sep 03', level: '90% CD', location: 'Asheville, NC',
    scope: 'Blast-rated storefront and security glazing', planRoom: '',
    info: 'Secure data center facility. All glazing must meet blast and forced-entry ratings. Specialty scope.',
    notes: 'Outside our normal trade — we do not carry blast-rated product lines.',
    status: 'declined', assignees: [], declineReason: 'Scope outside our trade', declineNote: 'We do not stock or fabricate blast-rated glazing systems. Recommend passing to a security glazing sub.', notified: false,
  },
];
