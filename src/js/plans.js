// Ratan Galaxy, drawn as data. The six home types with their rooms as rectangles in feet (x to the east, y to the
// south, origin at the top left of each plan), the doors on the room edges and the pairs of rooms that open into each
// other without a wall; the blocks with how their fourteen flats sit on a floor; and the sample prices. Room sizes and
// flat numbers come from the builder's brochures (the Phase II brochure for the X towers, the 2013 brochure for Block B,
// see docs/ratan-galaxy-facts.md); carpet areas and the names of the types from the UP RERA unit lists; the way the
// rooms join is our reading of the drawings, so every plan here is indicative. Both the hero model and the flat viewer
// import this file.

export const FT = 0.3048; // one foot in metres

// kinds decide the floor finish in the viewer and whether an outer wall gets a window
const KIND = { living: 'living', dining: 'dining', bed: 'bed', kitchen: 'kitchen', toilet: 'toilet', store: 'store', balcony: 'balcony', passage: 'passage', study: 'study', dress: 'dress' };

const room = (id, name, kind, x, y, w, h) => ({ id, name, kind, x, y, w, h });
const door = (room, side, at, w = 3) => ({ room, side, at, w }); // side n, s, e or w; at = feet from the edge's start (its smaller x or y)

// Block B, the H-block: one two bedroom plan fourteen times a floor. The 2013 brochure gives flats 6 and 13 as 994 sq ft
// and the other twelve as 1,100 sq ft, the same rooms with more balcony.
const twoBedB = {
  id: '2bhk-994', name: '2 BHK', blocks: ['B'], beds: 2, superArea: 994, carpet: '69 to 79 sq m', price: 6860000, priceText: '₹68.6 L',
  blurb: 'Drawing room 10 by 17, dining, two bedrooms of 10 by 12, a kitchen with a store, two toilets, two balconies. Flats 6 and 13 are 994 sq ft; the other twelve a floor are 1,100 sq ft with more balcony.',
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

// The X towers, Blocks A and C. The Phase II brochure draws five plans on the fourteen flats of a floor; the 2013
// brochure draws the same five on the same numbers in Block C at slightly smaller super areas (1,294, 1,769, 1,894,
// 1,906 and 2,450 sq ft). The super areas here are the Phase II figures.

// flats 4, 5, 11 and 12: 2 BHK + store, 1,294 sq ft. The entrance is at the top of the drawing room, the store and a
// toilet beside the door, the dining and kitchen behind, the two bedrooms side by side at the back over a long balcony.
const twoBedX = {
  id: '2bhk-1294', name: '2 BHK + store', blocks: ['A', 'C'], beds: 2, superArea: 1294, carpet: '89.4 sq m', price: 8930000, priceText: '₹89.3 L',
  blurb: 'Drawing room 18 by 11, dining 10 by 10, kitchen 10 by 7, two bedrooms of 14 by 11, store 8 by 4, two toilets, two balconies. Flats 4, 5, 11 and 12.',
  rooms: [
    room('drawing', 'Drawing room', KIND.living, 0, 0, 11.5, 18.4),
    room('store', 'Store', KIND.store, 11.5, 0, 4.5, 8),
    room('toilet1', 'Toilet', KIND.toilet, 16, 0, 5, 8),
    room('dining', 'Dining', KIND.dining, 11.5, 8, 10, 10.5),
    room('kitchen', 'Kitchen', KIND.kitchen, 21.5, 8.5, 7, 10),
    room('balconyW', 'Balcony', KIND.balcony, 0, 18.4, 6, 4),
    room('bed1', 'Bedroom', KIND.bed, 6, 18.5, 11, 14),
    room('bed2', 'Bedroom', KIND.bed, 17, 18.5, 11, 14),
    room('balconyS', 'Balcony', KIND.balcony, 6, 32.5, 17, 4),
    room('toilet2', 'Toilet', KIND.toilet, 23, 32.5, 5, 8),
  ],
  open: [['drawing', 'dining']],
  doors: [door('drawing', 'n', 0.5), door('store', 's', 0.75), door('toilet1', 's', 1), door('kitchen', 'w', 2), door('balconyW', 'n', 1), door('bed1', 'n', 7), door('bed2', 'n', 1), door('balconyS', 'n', 4, 4), door('balconyS', 'n', 13, 4), door('toilet2', 'n', 1)],
  entry: { room: 'drawing', side: 'n', at: 0.5 },
};

// The wing the three bedroom plans share: two bedrooms with their toilets and balconies at the far end, the kitchen
// with a utility balcony, the dining in the middle.
const wingRooms = [
  room('balconyNW', 'Balcony', KIND.balcony, 0, 1, 11, 4),
  room('bed1', 'Bedroom', KIND.bed, 7, 5, 11, 13),
  room('toilet2', 'Toilet', KIND.toilet, 2, 14, 5, 9),
  room('bed2', 'Bedroom', KIND.bed, 7, 18, 11, 13),
  room('balconySW', 'Balcony', KIND.balcony, 2, 23, 5, 8),
  room('toilet1', 'Toilet', KIND.toilet, 18, 4, 5, 8),
  room('passage', 'Passage', KIND.passage, 18, 12, 6, 9),
  room('balconyK', 'Utility balcony', KIND.balcony, 24, 0, 7, 4),
  room('kitchen', 'Kitchen', KIND.kitchen, 24, 4, 7, 10.3),
  room('dining', 'Dining', KIND.dining, 24, 14.3, 10.75, 11),
];
const wingDoors = [door('balconyNW', 's', 7.5), door('bed1', 'e', 8), door('toilet2', 'e', 5), door('bed2', 'e', 0), door('balconySW', 'e', 2), door('toilet1', 's', 1), door('balconyK', 's', 2), door('kitchen', 's', 2)];

// flats 2, 7, 9 and 14: 3 BHK + study + store, 1,905 sq ft. The drawing room across the middle with a balcony off it,
// the third bedroom with its toilet and a balcony at the entrance end, the study off the entrance lobby, the store by
// the drawing room door.
const threeBedStudy = {
  id: '3bhk-study-1905', name: '3 BHK + study', blocks: ['A', 'C'], beds: 3, superArea: 1905, carpet: '132.3 sq m', price: 13100000, priceText: '₹1.31 Cr',
  blurb: 'Drawing room 17 by 11, dining 11 by 11, bedrooms of 13 by 11, 11 by 13 and 13 by 11, a study of 8 by 10, kitchen 10 by 7, store, three toilets, five balconies. Flats 2, 7, 9 and 14.',
  rooms: [
    ...wingRooms,
    room('drawing', 'Drawing room', KIND.living, 34.75, 8, 11, 17),
    room('balconyM', 'Balcony', KIND.balcony, 34.75, 3.25, 7.25, 4.75),
    room('store', 'Store', KIND.store, 45.75, 8, 4, 6.6),
    room('bed3', 'Bedroom', KIND.bed, 49.75, 8, 11, 13),
    room('balconyNE', 'Balcony', KIND.balcony, 49.75, 4, 11, 4),
    room('toilet3', 'Toilet', KIND.toilet, 60.75, 8, 8, 5),
    room('study', 'Study', KIND.study, 60.75, 13, 10, 8),
    room('lobby', 'Entrance lobby', KIND.passage, 45.75, 21, 25, 4),
  ],
  open: [['drawing', 'dining'], ['passage', 'dining'], ['drawing', 'lobby']],
  doors: [...wingDoors, door('balconyM', 's', 1.5, 4), door('store', 'w', 1), door('bed3', 's', 4), door('balconyNE', 's', 3.5, 4), door('toilet3', 'w', 1), door('study', 's', 3), door('lobby', 'e', 0.5)],
  entry: { room: 'lobby', side: 'e', at: 0.5 },
};

// flats 3 and 6: the same rooms as the 1,905 plan drawn the other way up, 1,917 sq ft
const threeBedStudyB = {
  ...threeBedStudy, id: '3bhk-study-1917', superArea: 1917, price: 13200000, priceText: '₹1.32 Cr',
  blurb: 'The 1,905 plan the other way up: drawing room 17 by 11, three bedrooms, a study of 8 by 10, kitchen, store, three toilets, five balconies. Flats 3 and 6.',
};

// flats 10 and 13: 3 BHK, 1,781 sq ft. The same wing; the drawing room is 17 by 10½ and the third bedroom is the long
// 17 by 11 room with its own toilet, with no study and no store.
const threeBed = {
  id: '3bhk-1781', name: '3 BHK', blocks: ['A', 'C'], beds: 3, superArea: 1781, carpet: '117.6 to 117.8 sq m', price: 12300000, priceText: '₹1.23 Cr',
  blurb: 'Drawing room 17 by 10, dining 11 by 11, bedrooms of 13 by 11, 11 by 13 and 17 by 11, kitchen 10 by 7, three toilets, four balconies. Flats 10 and 13.',
  rooms: [
    ...wingRooms,
    room('drawing', 'Drawing room', KIND.living, 34.75, 8, 10.5, 17),
    room('balconyM', 'Balcony', KIND.balcony, 34.75, 3.25, 7.25, 4.75),
    room('bed3', 'Bedroom', KIND.bed, 45.25, 8, 17.3, 11),
    room('balconyNE', 'Balcony', KIND.balcony, 50, 4, 11, 4),
    room('toilet3', 'Toilet', KIND.toilet, 62.55, 8, 5, 6.75),
    room('lobby', 'Entrance lobby', KIND.passage, 45.25, 19, 17.3, 4),
  ],
  open: [['drawing', 'dining'], ['passage', 'dining'], ['drawing', 'lobby']],
  doors: [...wingDoors, door('balconyM', 's', 1.5, 4), door('bed3', 's', 6), door('balconyNE', 's', 3, 4), door('toilet3', 'w', 1.5), door('lobby', 'e', 0.5)],
  entry: { room: 'lobby', side: 'e', at: 0.5 },
};

// flats 1 and 8, the tips of the wings: 4 BHK + study + store, 2,535 sq ft. RERA lists it as 4 BHK + servant's room;
// the brochure calls the 10 by 8 room off the lobby, with its own toilet, the study.
const fourBed = {
  id: '4bhk-2535', name: '4 BHK + study', blocks: ['A', 'C'], beds: 4, superArea: 2535, carpet: '170.4 sq m', price: 17500000, priceText: '₹1.75 Cr',
  blurb: 'Drawing room 17 by 11, dining 13 by 11, four bedrooms of 14 by 12, 14 by 12, 12 by 13 and 13 by 11, a dressing room, a box room, a study of 10 by 8 with its own toilet, kitchen 10 by 8, store, four toilets, four balconies. Flats 1 and 8.',
  rooms: [
    room('balconyNW', 'Balcony', KIND.balcony, 0, 4, 5, 12),
    room('bed1', 'Bedroom', KIND.bed, 5, 4, 14, 12),
    room('toilet1', 'Toilet', KIND.toilet, 19, 4, 5, 8),
    room('dress1', 'Dressing', KIND.dress, 19, 12, 5, 6),
    room('balconyK', 'Utility balcony', KIND.balcony, 24, 4, 8, 4),
    room('kitchen', 'Kitchen', KIND.kitchen, 24, 8, 8, 10),
    room('drawing', 'Drawing room', KIND.living, 32, 4, 11.5, 18),
    room('study', 'Study', KIND.study, 43.5, 6, 8, 10),
    room('toilet4', 'Toilet', KIND.toilet, 51.5, 9.75, 6.25, 6.25),
    room('lobby', 'Entrance lobby', KIND.passage, 43.5, 16, 14.25, 6),
    room('store', 'Store', KIND.store, 53.5, 22, 4.3, 7),
    room('bed4', 'Bedroom', KIND.bed, 40.5, 22, 13, 11),
    room('toilet3', 'Toilet', KIND.toilet, 35.5, 22, 5, 8),
    room('toilet2', 'Toilet', KIND.toilet, 5, 16, 9.5, 6),
    room('box', 'Box room', KIND.store, 14.5, 16, 4.5, 6),
    room('dining', 'Dining', KIND.dining, 19, 18, 13, 11.5),
    room('bed2', 'Bedroom', KIND.bed, 5, 22, 14, 12),
    room('balconySW', 'Balcony', KIND.balcony, 0, 22, 5, 12),
    room('bed3', 'Bedroom', KIND.bed, 19, 29.5, 12, 13.3),
    room('balconyS', 'Balcony', KIND.balcony, 19, 42.8, 12, 4),
  ],
  open: [['dining', 'drawing'], ['drawing', 'lobby']],
  doors: [door('lobby', 'e', 1), door('study', 's', 2.5), door('toilet4', 'w', 1.5), door('store', 'n', 0.5), door('bed4', 'n', 5), door('toilet3', 'e', 1), door('balconyK', 's', 2, 4), door('kitchen', 's', 2), door('toilet1', 'w', 2), door('dress1', 'w', 1), door('balconyNW', 'e', 3, 4), door('toilet2', 's', 2), door('box', 'e', 1.5), door('bed2', 'e', 1), door('balconySW', 'e', 3, 4), door('bed3', 'n', 4), door('balconyS', 'n', 4, 4)],
  entry: { room: 'lobby', side: 'e', at: 1 },
};

export const PLANS = { [twoBedB.id]: twoBedB, [twoBedX.id]: twoBedX, [threeBed.id]: threeBed, [threeBedStudy.id]: threeBedStudy, [threeBedStudyB.id]: threeBedStudyB, [fourBed.id]: fourBed };
export const PLAN_ORDER = ['2bhk-994', '2bhk-1294', '3bhk-1781', '3bhk-study-1905', '3bhk-study-1917', '4bhk-2535'];

// the type ids this site used before the brochures were read, so old links still open a flat
const OLD_IDS = { '2bhk-1141': '2bhk-1294', '3bhk-1747': '3bhk-1781', '3bhk-1917': '3bhk-study-1917', '4bhk-2366': '4bhk-2535' };

// the flats on one floor of an X tower (Blocks A and C), by number, as the brochures number them; Block B is all two
// bedroom homes. Per floor: four 2 BHK, two 3 BHK, six 3 BHK + study, two 4 BHK, which is the RERA count for Block A.
const X_TYPES = { 1: '4bhk-2535', 8: '4bhk-2535', 2: '3bhk-study-1905', 7: '3bhk-study-1905', 9: '3bhk-study-1905', 14: '3bhk-study-1905', 3: '3bhk-study-1917', 6: '3bhk-study-1917', 10: '3bhk-1781', 13: '3bhk-1781', 4: '2bhk-1294', 5: '2bhk-1294', 11: '2bhk-1294', 12: '2bhk-1294' };

export const BLOCKS = {
  A: { id: 'A', name: 'Block A', shape: 'x', phase: 'Phase II', floors: 9, ground: 'shops', rera: 'UPRERAPRJ718664', done: 'November 2024', note: 'The Phase II tower: 126 homes over eleven shops and the stilt parking. Completed November 2024.' },
  B: { id: 'B', name: 'Block B', shape: 'h', phase: 'Phase I', floors: 9, ground: 'lobby', rera: 'UPRERAPRJ8949', done: 'June 2018', note: 'The two bedroom block in the middle of the plan: 126 homes over the stilt parking. Completed June 2018.' },
  C: { id: 'C', name: 'Block C', shape: 'x', phase: 'Phase I', floors: 9, ground: 'lobby', rera: 'UPRERAPRJ8949', done: 'June 2018', note: 'The west tower: 126 two, three and four bedroom homes over the stilt parking. Completed June 2018.' },
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

// reads ?block=A&floor=5&flat=3 or ?type=3bhk-study-1917 into one description of a flat
export function flatFromParams(params) {
  let block = (params.get('block') || '').toUpperCase(), floor = Number(params.get('floor')) || 0, flat = Number(params.get('flat')) || 0, type = params.get('type') || '';
  type = OLD_IDS[type] || type;
  if (!PLANS[type]) type = flatType(block, flat) || '';
  if (!type) { type = '3bhk-study-1917'; block = 'A'; floor = 5; flat = 3; }
  const plan = PLANS[type];
  if (!BLOCKS[block] || !plan.blocks.includes(block)) block = plan.blocks[0];
  if (!(floor >= 1 && floor <= 9)) floor = 5;
  if (!(flat >= 1 && flat <= 14) || flatType(block, flat) !== type) flat = Number(Object.keys(block === 'B' ? { 1: 1 } : X_TYPES).find((k) => block === 'B' || X_TYPES[k] === type)) || 1;
  return { block, floor, flat, type, plan };
}

export function flatTitle({ block, floor, flat }) { return `Block ${block}, ${ordinal(floor)} floor, flat ${flat}`; }
