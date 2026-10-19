// Plan dimensions in metres. World axes: +x east, +y up, +z south.
// The drawing sheet has no legible dimension strings at the resolution supplied,
// so scale comes from the 1.75 m human figures in the elevations (~25.7 px/m on
// the sheet) and is cross-checked against the 10-seat dining table (~3.1 m).

export const KDL = {
  // Kitchen / dining / living: one long room, garden (north) wall at z = 0.
  x0: 0, x1: 14.0,
  z0: 0, z1: 6.0,
  height: 3.4,
  wall: 0.35,           // exterior wall thickness
  innerWall: 0.3,       // wall shared with the front rooms
  // Zone boundaries along x (ceiling beams / pilasters sit on these lines)
  kitchenEnd: 4.6,
  diningEnd: 9.4,
  // Bay alcove off the north wall behind the dining table
  bay: { x0: 5.6, x1: 8.4, depth: 1.3, openingTop: 3.05 },
};

// Front block (entry, vestibule, lobby, stair, powder room, lift, library/TV room),
// placed directly south of the KDL room. Its position relative to the KDL room is an
// assumption: the sheet draws the two plans side by side, not joined.
const FZ = KDL.z1 + KDL.innerWall; // front block local y=0 maps to this z
export const FRONT = {
  z0: FZ,
  depth: 7.6,
  height: 3.4,
  rooms: {
    stair:     { x0: 1.35, x1: 3.35, z0: FZ + 0.0, z1: FZ + 3.1, label: 'Stair' },
    lobby:     { x0: 3.45, x1: 8.6,  z0: FZ + 0.0, z1: FZ + 3.15, label: 'Lobby' },
    powder:    { x0: 0.8,  x1: 3.1,  z0: FZ + 3.4, z1: FZ + 5.0, label: 'Powder room' },
    lift:      { x0: 3.45, x1: 4.6,  z0: FZ + 3.5, z1: FZ + 4.3, label: 'Lift' },
    vestibule: { x0: 0.3,  x1: 5.15, z0: FZ + 5.2, z1: FZ + 7.25, label: 'Vestibule' },
    entry:     { x0: 5.35, x1: 8.6,  z0: FZ + 4.1, z1: FZ + 7.2, label: 'Entry' },
    gallery:   { x0: 8.65, x1: 9.25, z0: FZ + 0.0, z1: FZ + 7.25, label: 'Gallery' },
    library:   { x0: 9.25, x1: 13.8, z0: FZ + 0.0, z1: FZ + 7.3, label: 'Library / TV room' },
  },
};

export const EYE = 1.62;
