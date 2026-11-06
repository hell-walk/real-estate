// Ratan Galaxy, drawn as data. The five home types with their rooms as rectangles in feet (x to the east, y to the
// south, origin at the top left of each plan), the doors on the room edges and the pairs of rooms that open into each
// other without a wall; the blocks with how their fourteen flats sit on a floor; and the sample prices. Room sizes come
// from the builder's published floor plans (see docs/ratan-galaxy-facts.md); the way the rooms join is our reading of
// the drawings, so every plan here is indicative. Both the hero model and the flat viewer import this file.

export const FT = 0.3048; // one foot in metres

// kinds decide the floor finish in the viewer and whether an outer wall gets a window
const KIND = { living: 'living', dining: 'dining', bed: 'bed', kitchen: 'kitchen', toilet: 'toilet', store: 'store', balcony: 'balcony', passage: 'passage', servant: 'servant', dress: 'dress' };

const room = (id, name, kind, x, y, w, h) => ({ id, name, kind, x, y, w, h });
const door = (room, side, at, w = 3) => ({ room, side, at, w }); // side n, s, e or w; at = feet from the edge's start (its smaller x or y)

const twoBedB = {
  id: '2bhk-994', name: '2 BHK', blocks: ['B'], beds: 2, superArea: 994, carpet: '69 to 79 sq m', price: 6860000, priceText: '₹68.6 L',
  blurb: 'Drawing room 10 by 17, dining, two bedrooms of 10 by 12, a kitchen with a store, two toilets, two balconies.',
  rooms: [
    room('drawing', 'Drawing room', KIND.living, 1.4, 0, 17.2, 10.4),
    room('toilet1', 'Toilet', KIND.toilet, 1.4, 10.4, 7, 6),
    room('hall', 'Passage', KIND.passage, 1.4, 16.4, 7.2, 4.2),
    room('dining', 'Dining', KIND.dining, 8.6, 10.4, 10, 10.2),
    room('toilet2', 'Toilet', KIND.toilet, 11.6, 20.6, 6.1, 7),
    room('kitchen', 'Kitchen', KIND.kitchen, 4.6, 20.6, 7, 10.4),
    room('store', 'Store', KIND.store, 0, 20.6, 4.6, 4.2),
    room('bed1', 'Bedroom', KIND.bed, 18.6, 6.1, 12, 10),
    room('bed2', 'Bedroom', KIND.bed, 18.6, 16.1, 12, 10.5),
    room('balcony1', 'Balcony', KIND.balcony, 18.6, 0, 5, 6.1),
    room('balcony2', 'Balcony', KIND.balcony, 30.6, 9.6, 5, 13),
  ],
  open: [['drawing', 'dining'], ['hall', 'dining']],
  doors: [door('drawing', 'w', 1.5), door('toilet1', 'n', 2), door('balcony1', 'w', 1.5, 4), door('bed1', 'w', 1), door('bed2', 'w', 1), door('kitchen', 'n', 1), door('store', 'e', 0.6), door('toilet2', 'n', 1.5), door('balcony2', 'w', 2, 4), door('balcony2', 'w', 9, 4)],
  entry: { room: 'drawing', side: 'w', at: 1.5 },
};

const twoBedAC = {
  id: '2bhk-1141', name: '2 BHK', blocks: ['A', 'C'], beds: 2, superArea: 1141, carpet: '89.4 sq m', price: 7870000, priceText: '₹78.7 L',
  blurb: 'Drawing room 10 by 17, dining 10 by 11, two bedrooms of 10 by 12, kitchen 10 by 7 with a store, two toilets, two balconies. Flat 14 on each floor.',
  rooms: [
    room('balconyN', 'Balcony', KIND.balcony, 10, 0, 4.5, 5),
    room('drawing', 'Drawing room', KIND.living, 14.5, 0, 17.25, 9.5),
    room('bed1', 'Bedroom', KIND.bed, 4, 5, 10.5, 10.5),
    room('bed2', 'Bedroom', KIND.bed, 4, 15.5, 10.5, 11),
    room('balconyW', 'Balcony', KIND.balcony, 0, 9, 4, 9),
    room('dining', 'Dining', KIND.dining, 14.5, 9.5, 10, 10.9),
    room('toiletB', 'Toilet', KIND.toilet, 24.5, 9.5, 7, 6),
    room('toiletA', 'Toilet', KIND.toilet, 14.5, 20.4, 6.1, 7),
    room('kitchen', 'Kitchen', KIND.kitchen, 20.6, 20.4, 7, 10.4),
    room('store', 'Store', KIND.store, 27.6, 25.8, 5, 4.2),
  ],
  open: [['drawing', 'dining']],
  doors: [door('drawing', 'e', 1), door('bed1', 'e', 6), door('bed2', 'e', 1), door('toiletA', 'w', 3), door('kitchen', 'n', 0.5), door('store', 'w', 0.6), door('toiletB', 'w', 1.5), door('balconyN', 's', 1, 3), door('balconyW', 'e', 2, 4)],
  entry: { room: 'drawing', side: 'e', at: 1 },
};

const threeBedBig = {
  id: '3bhk-1917', name: '3 BHK with servant’s room', blocks: ['A', 'C'], beds: 3, superArea: 1917, carpet: '132.3 sq m', price: 13200000, priceText: '₹1.32 Cr',
  blurb: 'Drawing room 11 by 17, dining 11 by 11, bedrooms of 13 by 11, 11 by 13 and 11 by 13, kitchen 7 by 10, a servant’s room with its own toilet, store, three balconies. Flats 3 and 13.',
  rooms: [
    room('balconyNW', 'Balcony', KIND.balcony, 0, 2, 5, 8),
    room('bed1', 'Bedroom', KIND.bed, 5, 0, 13, 11),
    room('toilet1', 'Toilet', KIND.toilet, 0, 10, 5, 9),
    room('bed2', 'Bedroom', KIND.bed, 5, 11, 11, 13),
    room('passage', 'Passage', KIND.passage, 16, 11, 5, 3),
    room('toilet2', 'Toilet', KIND.toilet, 16, 14, 5, 7),
    room('balconySW', 'Balcony', KIND.balcony, 3, 24, 10, 5),
    room('dining', 'Dining', KIND.dining, 18, 0, 11, 11),
    room('kitchen', 'Kitchen', KIND.kitchen, 21, 11, 7, 10.4),
    room('balconyS', 'Balcony', KIND.balcony, 21, 21.4, 7, 4),
    room('drawing', 'Drawing room', KIND.living, 29, 0, 11, 17),
    room('balconyM', 'Balcony', KIND.balcony, 29, 17, 7, 4),
    room('store', 'Store', KIND.store, 40, 1, 6.6, 4),
    room('bed3', 'Bedroom', KIND.bed, 40, 5, 11, 13),
    room('balconySE', 'Balcony', KIND.balcony, 40, 18, 11, 5),
    room('servant', 'Servant’s room', KIND.servant, 51, 2, 8, 10),
    room('toilet3', 'Toilet', KIND.toilet, 51, 12, 7, 4.5),
  ],
  open: [['drawing', 'dining'], ['passage', 'dining']],
  doors: [door('drawing', 'n', 5), door('bed1', 'e', 6), door('balconyNW', 'e', 2, 4), door('toilet1', 'e', 3), door('bed2', 'e', 0), door('kitchen', 'w', 0), door('toilet2', 'n', 1), door('balconySW', 'n', 3, 4), door('balconyS', 'n', 1.5, 4), door('balconyM', 'n', 1.5, 4), door('bed3', 'w', 4), door('store', 'w', 0.5), door('balconySE', 'n', 3, 4), door('servant', 'w', 3), door('toilet3', 'n', 2)],
  entry: { room: 'drawing', side: 'n', at: 5 },
};

const threeBed = {
  ...threeBedBig, id: '3bhk-1747', name: '3 BHK', superArea: 1747, carpet: '117.6 sq m', price: 12100000, priceText: '₹1.21 Cr',
  blurb: 'Drawing room 11 by 17, dining 11 by 11, bedrooms of 13 by 11, 11 by 13 and 11 by 13, kitchen 7 by 10, store, three balconies. Flats 6 and 10.',
  rooms: threeBedBig.rooms.filter((r) => r.id !== 'servant' && r.id !== 'toilet3'),
  doors: threeBedBig.doors.filter((d) => d.room !== 'servant' && d.room !== 'toilet3'),
};

const fourBed = {
  id: '4bhk-2366', name: '4 BHK', blocks: ['A', 'C'], beds: 4, superArea: 2366, carpet: '170.4 sq m', price: 16300000, priceText: '₹1.63 Cr',
  blurb: 'Drawing room 17 by 11, dining 16 by 12, four bedrooms, two of them with dressing rooms, a servant’s room, kitchen 8 by 10, four toilets, store, four balconies. Flats 1 and 8, at the tips of the wings.',
  rooms: [
    room('balconyNW', 'Balcony', KIND.balcony, 0, 0, 5, 9),
    room('bed1', 'Bedroom', KIND.bed, 5, 0, 14, 12),
    room('toilet1', 'Toilet', KIND.toilet, 19, 0, 8, 5),
    room('dress1', 'Dressing', KIND.dress, 19, 5, 6, 5),
    room('kitchen', 'Kitchen', KIND.kitchen, 27, 0, 8, 10),
    room('balconyN', 'Balcony', KIND.balcony, 35, 0, 6, 3),
    room('drawing', 'Drawing room', KIND.living, 35, 3, 17.5, 11.5),
    room('dining', 'Dining', KIND.dining, 19, 10, 16, 12),
    room('servant', 'Servant’s room', KIND.servant, 52.5, 3, 10, 8),
    room('toilet4', 'Toilet', KIND.toilet, 52.5, 12, 6, 5.5),
    room('store', 'Store', KIND.store, 52.5, 17.5, 5, 6),
    room('passage', 'Passage', KIND.passage, 35, 14.5, 4.5, 7.5),
    room('bed4', 'Bedroom', KIND.bed, 39.5, 14.5, 13, 11),
    room('toilet3', 'Toilet', KIND.toilet, 31.5, 22, 8, 5),
    room('bed3', 'Bedroom', KIND.bed, 19.5, 22, 12, 13.3),
    room('toilet2', 'Toilet', KIND.toilet, 5, 12, 8, 5),
    room('dress2', 'Dressing', KIND.dress, 13, 12, 6, 5),
    room('bed2', 'Bedroom', KIND.bed, 5, 17, 14, 12),
    room('balconySW', 'Balcony', KIND.balcony, 0, 19, 5, 9),
    room('balconyS', 'Balcony', KIND.balcony, 5, 29, 14, 5),
  ],
  open: [['dining', 'drawing'], ['passage', 'dining'], ['passage', 'drawing']],
  doors: [door('drawing', 'n', 12), door('balconyN', 's', 1, 4), door('kitchen', 's', 2), door('toilet1', 'w', 1), door('dress1', 'w', 1), door('balconyNW', 'e', 2.5, 4), door('bed2', 'e', 2), door('bed3', 'n', 4), door('toilet3', 'n', 4.5), door('bed4', 'w', 2), door('toilet4', 'w', 2.5), door('store', 'w', 1), door('servant', 'w', 3), door('toilet2', 's', 2), door('dress2', 's', 1), door('balconySW', 'e', 2, 4), door('balconyS', 'n', 5, 4)],
  entry: { room: 'drawing', side: 'n', at: 12 },
};

export const PLANS = { [twoBedB.id]: twoBedB, [twoBedAC.id]: twoBedAC, [threeBed.id]: threeBed, [threeBedBig.id]: threeBedBig, [fourBed.id]: fourBed };
export const PLAN_ORDER = ['2bhk-994', '2bhk-1141', '3bhk-1747', '3bhk-1917', '4bhk-2366'];

// the flats on one floor of an X tower (Blocks A and C), by number; Block B is all two bedroom homes
const X_TYPES = { 1: '4bhk-2366', 8: '4bhk-2366', 3: '3bhk-1917', 6: '3bhk-1917', 10: '3bhk-1917', 13: '3bhk-1917', 2: '3bhk-1747', 7: '3bhk-1747', 9: '3bhk-1747', 12: '3bhk-1747', 4: '2bhk-1141', 5: '2bhk-1141', 11: '2bhk-1141', 14: '2bhk-1141' };

export const BLOCKS = {
  A: { id: 'A', name: 'Block A', shape: 'x', phase: 'Phase II', floors: 9, ground: 'shops', rera: 'UPRERAPRJ718664', done: 'November 2024', note: 'The Phase II tower: 126 homes over eleven shops on the ground floor. Completed November 2024.' },
  B: { id: 'B', name: 'Block B', shape: 'h', phase: 'Phase I', floors: 9, ground: 'lobby', rera: 'UPRERAPRJ8949', done: 'June 2018', note: 'The two bedroom block in the middle of the plan: 126 homes, parking in the basement. Completed June 2018.' },
  C: { id: 'C', name: 'Block C', shape: 'x', phase: 'Phase I', floors: 9, ground: 'lobby', rera: 'UPRERAPRJ8949', done: 'June 2018', note: 'The west tower: 126 two, three and four bedroom homes, parking in the basement. Completed June 2018.' },
};

export function flatType(block, flat) {
  const b = String(block || '').toUpperCase();
  const n = Number(flat);
  if (b === 'B') return n >= 1 && n <= 14 ? '2bhk-994' : null;
  if (b === 'A' || b === 'C') return X_TYPES[n] || null;
  return null;
}

export function ordinal(n) {
  n = Number(n);
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// reads ?block=A&floor=5&flat=3 or ?type=3bhk-1917 into one description of a flat
export function flatFromParams(params) {
  let block = (params.get('block') || '').toUpperCase(), floor = Number(params.get('floor')) || 0, flat = Number(params.get('flat')) || 0, type = params.get('type') || '';
  if (!PLANS[type]) type = flatType(block, flat) || '';
  if (!type) { type = '3bhk-1917'; block = 'A'; floor = 5; flat = 3; }
  const plan = PLANS[type];
  if (!BLOCKS[block] || !plan.blocks.includes(block)) block = plan.blocks[0];
  if (!(floor >= 1 && floor <= 9)) floor = 5;
  if (!(flat >= 1 && flat <= 14) || flatType(block, flat) !== type) flat = Number(Object.keys(block === 'B' ? { 1: 1 } : X_TYPES).find((k) => block === 'B' || X_TYPES[k] === type)) || 1;
  return { block, floor, flat, type, plan };
}

export function flatTitle({ block, floor, flat }) { return `Block ${block}, ${ordinal(floor)} floor, flat ${flat}`; }
