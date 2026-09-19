export type PersonKind = 'exec' | 'manager' | 'estimator';
export type BidStatus = 'pending' | 'accepted' | 'declined' | 'review';

export interface GcEntry {
  company: string; location: string;
  contactName: string; contactTitle: string;
  contactEmail: string; contactPhone: string;
}
export function emptyGc(): GcEntry {
  return { company: '', location: '', contactName: '', contactTitle: '', contactEmail: '', contactPhone: '' };
}

export type BidTypeBid = 'Negotiated' | 'Hard Bid' | 'Design-Build' | 'CM at Risk' | 'Other';
export type BidWorkType = 'Curtain Wall' | 'Storefront' | 'Window Wall' | 'Entrances & Doors' | 'Skylights' | 'Glass Partitions' | 'ACM / Cladding' | 'Mixed Scope' | 'Other';
export type BidBuildingType = 'Office' | 'Healthcare' | 'Education' | 'Hospitality' | 'Retail' | 'Industrial' | 'Multi-Family Residential' | 'Mixed-Use' | 'Government' | 'Data Center' | 'Other';
export type BidTypeConstruction = 'New Construction' | 'Renovation' | 'Upfit' | 'Other';
export type BidOffice = 'Charlotte' | 'Atlanta' | 'Charleston';
export type BidClientTier = '1' | '2' | '3' | '4';

export interface BidProject {
  id: string; name: string;
  gc: string; // legacy / primary GC company name for display
  gcs: GcEntry[]; // up to 4 GCs with full contact info
  bidDate: string;
  level: string; location: string; scope: string;
  planRoom: string; planLinks?: string[]; info: string; notes: string;
  followUpDate?: string; // manual override; if absent, computed as bidDate + 14d
  price?: string; cost?: string; // current proposal sell price and estimated cost
  revisions?: Revision[];
  status: BidStatus; assignees: string[];
  declineReason: string; declineNote: string;
  reviewReason: string;
  notified: boolean; photo?: string;
  archived?: boolean; archivedAt?: string;
  entryDate?: string; assignedDate?: string;
  jobSize?: 'large' | 'medium' | 'small';
  // new structured fields
  typeBid?: BidTypeBid;
  workType?: BidWorkType;
  buildingType?: BidBuildingType;
  typeConstruction?: BidTypeConstruction;
  office?: BidOffice;
  clientTier?: BidClientTier;
  manager?: string;
  bd?: string;
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
export type TimeBlock = 'morning' | 'afternoon';
export interface Task {
  id: string; title: string; projectId: string; who: string;
  status: TaskStatus; due: string; day: string; date: string | null;
  hrs: number; detail: string; notes: NoteEntry[];
  timeBlock?: TimeBlock; // 'morning' = 8–12, 'afternoon' = 1–5
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
  { id: 'timp',  name: 'Tim Prewett',          first: 'Tim',   role: 'Cladding Estimator',      initials: 'TP', email: 'timprewett@glass1st.net',             kind: 'estimator', mgr: 'chris' },
  { id: 'ray',   name: 'Ray Herring',          first: 'Ray',   role: 'Estimating Director',     initials: 'RH', email: 'RayHerring@Glass1st.net',             kind: 'manager',   mgr: 'paul' },
  { id: 'lucas', name: 'Lucas Braswell',       first: 'Lucas', role: 'Project Developer',        initials: 'LB', email: 'LucasBraswell@Glass1st.net',          kind: 'estimator', mgr: 'paul' },
  { id: 'justin',name: 'Justin Campana',       first: 'Justin',role: 'Project Developer',        initials: 'JC', email: 'JustinCampana@Glass1st.net',          kind: 'estimator', mgr: 'paul' },
  { id: 'kris',  name: 'Kris Tripp',           first: 'Kris',  role: 'Business Development',     initials: 'KT', email: 'KrisTripp@Glass1st.net',              kind: 'estimator', mgr: 'paul' },
];

// Manager IDs allowed for bid/CRM manager assignment
export const MANAGER_IDS = ['ray', 'paul', 'blake', 'luis'];

// BD team for bid board and CRM (shared list)
export const BD_TEAM = [
  { id: '', name: 'Open / Unassigned' },
  { id: 'john', name: 'John DiPaolo' },
  { id: 'danielle', name: 'Danielle Benfield' },
  { id: 'jaramia', name: 'Jaramia Staumpf' },
  { id: 'newguy', name: 'New Guy' },
];

// Office assignment logic
const OFFICE_COORDS: Record<string, { lat: number; lng: number }> = {
  Charlotte:  { lat: 35.2271, lng: -80.8431 },
  Atlanta:    { lat: 33.7490, lng: -84.3880 },
  Charleston: { lat: 32.7765, lng: -79.9311 },
};
const STATE_TO_OFFICE: Record<string, 'Charlotte' | 'Atlanta' | 'Charleston'> = {
  NC: 'Charlotte', VA: 'Charlotte', SC: 'Charleston',
  GA: 'Atlanta', AL: 'Atlanta', TN: 'Atlanta', MS: 'Atlanta', FL: 'Atlanta',
};

function degToRad(d: number) { return d * Math.PI / 180; }
function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = degToRad(lat2 - lat1), dLng = degToRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function inferOffice(location: string): BidOffice | undefined {
  if (!location) return undefined;
  // Extract state abbreviation
  const stateMatch = location.match(/,\s*([A-Z]{2})\s*$/);
  if (stateMatch) {
    const st = stateMatch[1];
    if (STATE_TO_OFFICE[st]) return STATE_TO_OFFICE[st] as BidOffice;
  }
  return undefined;
}

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
    gcs: [{ company: 'Turner Construction', location: 'Charlotte, NC', contactName: 'Mark Connelly', contactTitle: 'Project Manager', contactEmail: 'mconnelly@tcco.com', contactPhone: '704-555-0182' }],
    bidDate: '2026-09-20', level: '100% CD', location: 'Charlotte, NC',
    scope: 'Curtain wall, unitized system, 34,000 sf', planRoom: 'https://planroom.turner.com/apex',
    info: 'Full curtain wall envelope for a 22-story mixed-use tower. Unitized system preferred. Alternate for BIPV glazing on south face.',
    notes: 'Turner rep is Mark Connelly — strong relationship. Seen this GC 3x this year.',
    status: 'pending', assignees: ['allen'], declineReason: '', declineNote: '', reviewReason: '', notified: false,
    bd: 'john', manager: 'blake', typeBid: 'Hard Bid', workType: 'Curtain Wall', buildingType: 'Office', typeConstruction: 'New Construction', office: 'Charlotte', clientTier: '1', jobSize: 'large',
    price: '4850000', cost: '3720000',
    revisions: [
      { rev: 'R0', label: 'Base bid', price: '5100000', cost: '3920000', when: 'Sep 10 · 2:15 PM', who: 'Allen Poole', note: 'Initial takeoff from 100% CD set. Includes unitized system with standard IGU.' },
      { rev: 'R1', label: 'VE Alternate', price: '4850000', cost: '3720000', when: 'Sep 14 · 10:30 AM', who: 'Allen Poole', note: 'VE alternate — removed BIPV south face, substituted standard spandrel glazing.' },
    ],
  },
  {
    id: 'bp2', name: 'Lakefront Civic Center', gc: 'Brasfield & Gorrie',
    gcs: [{ company: 'Brasfield & Gorrie', location: 'Columbia, SC', contactName: 'Sandra Park', contactTitle: 'Estimator', contactEmail: 'spark@bg.com', contactPhone: '803-555-0244' }],
    bidDate: '2026-09-28', level: '90% CD', location: 'Columbia, SC',
    scope: 'Storefront, skylights, decorative glass partitions', planRoom: '',
    info: 'New civic building for the City of Columbia. Storefront on three facades plus a 1,200 sf skylight over the atrium.',
    notes: 'Need to confirm if the skylight is structural or just glazing.',
    status: 'pending', assignees: ['nico'], declineReason: '', declineNote: '', reviewReason: '', notified: false,
    bd: 'danielle', manager: 'paul', typeBid: 'Hard Bid', workType: 'Storefront', buildingType: 'Government', typeConstruction: 'New Construction', office: 'Charlotte', clientTier: '2', jobSize: 'medium',
    price: '1240000', cost: '965000',
    revisions: [
      { rev: 'R0', label: 'Base bid', price: '1240000', cost: '965000', when: 'Sep 15 · 9:00 AM', who: 'Nico Goenaga', note: 'Storefront and skylight scope from 90% CD drawings.' },
    ],
  },
  {
    id: 'bp3', name: 'Meridian Medical Pavilion', gc: 'Skanska USA',
    gcs: [{ company: 'Skanska USA', location: 'Raleigh, NC', contactName: 'Tom Reyes', contactTitle: 'VP PreCon', contactEmail: 'treyes@skanska.com', contactPhone: '919-555-0371' }],
    bidDate: '2026-10-05', level: '75% DD', location: 'Raleigh, NC',
    scope: 'Window wall replacement, 18,500 sf', planRoom: 'https://skanska.buildingconnected.com/m42',
    info: 'Full window wall replacement on an occupied hospital pavilion. Phased install — must coordinate with infection control.',
    notes: 'DDs only so scope has risk. Price with exclusions.',
    status: 'review', assignees: ['eric'], declineReason: '', declineNote: '', reviewReason: 'Deeper dive needed', notified: false,
    bd: 'jaramia', manager: 'ray', typeBid: 'Negotiated', workType: 'Window Wall', buildingType: 'Healthcare', typeConstruction: 'Renovation', office: 'Charlotte', clientTier: '1', jobSize: 'large',
    price: '2750000', cost: '2180000',
    revisions: [
      { rev: 'R0', label: 'Budget number', price: '3100000', cost: '2450000', when: 'Sep 12 · 11:20 AM', who: 'Eric Lunsford', note: 'DD-level budget. Carries design contingency — scope unclear at mullion conditions.' },
      { rev: 'R1', label: 'Scope reduction', price: '2750000', cost: '2180000', when: 'Sep 18 · 3:45 PM', who: 'Eric Lunsford', note: 'Removed Phase 3 wing from scope per Skanska clarification. Exclusion list updated.' },
    ],
  },
  {
    id: 'bp4', name: 'Hartwell Office Complex — Bldg A', gc: 'Batson-Cook',
    gcs: [{ company: 'Batson-Cook', location: 'Greenville, SC', contactName: 'Dale Fuqua', contactTitle: 'Senior Estimator', contactEmail: 'dfuqua@batson-cook.com', contactPhone: '864-555-0119' }],
    bidDate: '2026-09-05', level: '100% CD', location: 'Greenville, SC',
    scope: 'Curtain wall + aluminum entrances, 9,800 sf', planRoom: '',
    info: 'Four-story Class A office. Standard pressure-glazed curtain wall with punched aluminum entrances at two lobby entries.',
    notes: 'Assigned to Allen. Batson-Cook wants number by noon.',
    status: 'accepted', assignees: ['allen'], declineReason: '', declineNote: '', reviewReason: '', notified: true,
    bd: 'john', manager: 'blake', typeBid: 'Hard Bid', workType: 'Curtain Wall', buildingType: 'Office', typeConstruction: 'New Construction', office: 'Atlanta', clientTier: '2', jobSize: 'medium',
    price: '1580000', cost: '1220000',
    revisions: [
      { rev: 'R0', label: 'Base bid', price: '1580000', cost: '1220000', when: 'Aug 28 · 8:55 AM', who: 'Allen Poole', note: 'Final number submitted. Accepted by Batson-Cook.' },
    ],
  },
  {
    id: 'bp5', name: 'Pinehurst Resort Expansion', gc: 'Ryan Companies',
    gcs: [{ company: 'Ryan Companies', location: 'Pinehurst, NC', contactName: 'Casey Morton', contactTitle: 'Project Engineer', contactEmail: 'cmorton@ryancompanies.com', contactPhone: '910-555-0067' }],
    bidDate: '2026-09-08', level: '100% CD + Add. 3', location: 'Pinehurst, NC',
    scope: 'Vinyl windows, sliders, glass railings — resort residential', planRoom: '',
    info: 'Phase 2 resort expansion — 48 villa units. Vinyl windows and sliders per unit type, plus glass railing on all decks.',
    notes: 'Nico has the unit matrix from Phase 1.',
    status: 'accepted', assignees: ['nico'], declineReason: '', declineNote: '', reviewReason: '', notified: true,
    bd: 'danielle', manager: 'paul', typeBid: 'Negotiated', workType: 'Mixed Scope', buildingType: 'Hospitality', typeConstruction: 'New Construction', office: 'Charlotte', clientTier: '3', jobSize: 'medium',
    price: '895000', cost: '698000',
    revisions: [
      { rev: 'R0', label: 'Phase 1 scope', price: '620000', cost: '485000', when: 'Aug 15 · 1:10 PM', who: 'Nico Goenaga', note: 'Phase 1 villas only — 24 units.' },
      { rev: 'R1', label: 'Phase 2 added', price: '895000', cost: '698000', when: 'Sep 02 · 4:00 PM', who: 'Nico Goenaga', note: 'Added Phase 2 villa units and all deck glass railings.' },
    ],
  },
  {
    id: 'bp6', name: 'Blue Ridge Data Center', gc: 'McCarthy Building Companies',
    gcs: [{ company: 'McCarthy Building Companies', location: 'Asheville, NC', contactName: '', contactTitle: '', contactEmail: '', contactPhone: '' }],
    bidDate: '2026-09-03', level: '90% CD', location: 'Asheville, NC',
    scope: 'Blast-rated storefront and security glazing', planRoom: '',
    info: 'Secure data center facility. All glazing must meet blast and forced-entry ratings. Specialty scope.',
    notes: 'Outside our normal trade — we do not carry blast-rated product lines.',
    status: 'declined', assignees: [], declineReason: 'Scope outside our trade', declineNote: 'We do not stock or fabricate blast-rated glazing systems. Recommend passing to a security glazing sub.', reviewReason: '', notified: false,
    bd: 'jaramia', manager: 'blake', typeBid: 'Hard Bid', workType: 'Storefront', buildingType: 'Data Center', typeConstruction: 'New Construction', office: 'Atlanta', clientTier: '4', jobSize: 'small',
  },
  {
    id: 'bp7', name: 'Novant Ballantyne MOB', gc: 'Choate Construction',
    gcs: [{ company: 'Choate Construction', location: 'Charlotte, NC', contactName: 'Pam Hicks', contactTitle: 'Preconstruction Manager', contactEmail: 'phicks@choateco.com', contactPhone: '704-555-0291' }],
    bidDate: '2026-10-12', level: '100% CD', location: 'Charlotte, NC',
    scope: 'Storefront & automatic entrances, 3-story medical office', planRoom: '',
    info: 'Full storefront package on all four elevations. Automatic sliding doors at two entrances per healthcare code.',
    notes: 'Strong relationship via John — expedite review.',
    status: 'pending', assignees: ['eric'], declineReason: '', declineNote: '', reviewReason: '', notified: false,
    bd: 'john', manager: 'blake', typeBid: 'Hard Bid', workType: 'Storefront', buildingType: 'Healthcare', typeConstruction: 'New Construction', office: 'Charlotte', clientTier: '1', jobSize: 'medium',
    price: '780000', cost: '605000',
    revisions: [
      { rev: 'R0', label: 'Base bid', price: '780000', cost: '605000', when: 'Sep 30 · 9:15 AM', who: 'Eric Lunsford', note: 'Full storefront package with automatic doors at two entries.' },
    ],
  },
  {
    id: 'bp8', name: 'Emory University Science Annex', gc: 'DPR Construction',
    gcs: [{ company: 'DPR Construction', location: 'Atlanta, GA', contactName: 'Reggie Okafor', contactTitle: 'Project Executive', contactEmail: 'rokafor@dpr.com', contactPhone: '404-555-0348' }],
    bidDate: '2026-10-18', level: '100% CD', location: 'Atlanta, GA',
    scope: 'Full glazing — 6-story science building, LEED Gold', planRoom: 'https://dpr.buildingconnected.com/emory',
    info: 'Full curtain wall and storefront package. LEED Gold target requires high-performance glazing throughout. Value engineering alternate requested.',
    notes: 'Price is tight — VE curtain wall from thermally broken to standard system for alternate.',
    status: 'pending', assignees: ['nico'], declineReason: '', declineNote: '', reviewReason: '', notified: false,
    bd: 'danielle', manager: 'paul', typeBid: 'Hard Bid', workType: 'Curtain Wall', buildingType: 'Education', typeConstruction: 'New Construction', office: 'Atlanta', clientTier: '1', jobSize: 'large',
    price: '3420000', cost: '2680000',
    revisions: [
      { rev: 'R0', label: 'Base bid', price: '3820000', cost: '2990000', when: 'Oct 05 · 8:30 AM', who: 'Nico Goenaga', note: 'Full curtain wall + storefront per 100% CDs. Thermally broken system throughout.' },
      { rev: 'R1', label: 'VE Alternate — std system', price: '3420000', cost: '2680000', when: 'Oct 10 · 2:00 PM', who: 'Nico Goenaga', note: 'VE alternate: standard (non-thermally broken) system on non-critical elevations.' },
    ],
  },
  {
    id: 'bp9', name: 'Vanderbilt Med Center Tower', gc: 'Skanska USA',
    gcs: [{ company: 'Skanska USA', location: 'Nashville, TN', contactName: 'Leo Hartmann', contactTitle: 'Senior PM', contactEmail: 'lhartmann@skanska.com', contactPhone: '615-555-0419' }],
    bidDate: '2026-10-02', level: '100% CD', location: 'Nashville, TN',
    scope: 'Unitized curtain wall, 22-story patient tower', planRoom: 'https://skanska.buildingconnected.com/vandy',
    info: 'Major hospital patient tower. Unitized system — slab edge conditions need field verification. Coordination with MEP at every floor.',
    notes: 'Unitized system quote from OBE in hand. Need to confirm slab edge conditions with structural.',
    status: 'pending', assignees: ['allen'], declineReason: '', declineNote: '', reviewReason: '', notified: false,
    bd: 'jaramia', manager: 'ray', typeBid: 'Hard Bid', workType: 'Curtain Wall', buildingType: 'Healthcare', typeConstruction: 'New Construction', office: 'Atlanta', clientTier: '1', jobSize: 'large',
    price: '6100000', cost: '4740000',
    revisions: [
      { rev: 'R0', label: 'Base bid', price: '6100000', cost: '4740000', when: 'Sep 22 · 11:45 AM', who: 'Allen Poole', note: 'Unitized system, 22-story. OBE quote included. Slab edge TBD — contingency in cost.' },
    ],
  },
  {
    id: 'bp10', name: 'Columbia Convention Center Expansion', gc: 'Barton Malow',
    gcs: [{ company: 'Barton Malow', location: 'Columbia, SC', contactName: 'Derek Stiles', contactTitle: 'Estimator', contactEmail: 'dstiles@bartonmalow.com', contactPhone: '803-555-0512' }],
    bidDate: '2026-11-01', level: '90% CD', location: 'Columbia, SC',
    scope: 'Curtain wall & ribbon windows, convention hall addition', planRoom: '',
    info: 'Phase 2 expansion of existing convention center. Large ribbon window system on new hall — coordinate with existing structure tie-ins.',
    notes: 'First contact made — good intro from Jaramia. Relationship building phase.',
    status: 'pending', assignees: [], declineReason: '', declineNote: '', reviewReason: '', notified: false,
    bd: 'newguy', manager: 'paul', typeBid: 'Hard Bid', workType: 'Curtain Wall', buildingType: 'Government', typeConstruction: 'New Construction', office: 'Charlotte', clientTier: '3', jobSize: 'large',
  },
];
