// All conveyor calculator inputs, in the order the bot will ask.
// `def`  = default value (shown to user; type "-" to accept it).
// `unit` = shown for clarity.
// `info` = short explanation shown when the bot asks for this field.
// `group`= section header in chat.
// `allowAuto` = if true, user can reply "auto" to leave it auto-calculated.

const FIELDS = [
  // ---- Capacity & Material ----
  { id: 'Qt',        label: 'Handling rate (Qt)',              unit: 't/h',   def: 18000, group: 'Capacity & Material',
    info: 'Material throughput — the design capacity of the conveyor.' },
  { id: 'rho',       label: 'Bulk density (ρ)',                unit: 'kg/m³', def: 970,
    info: 'Density of the conveyed material. e.g. coal ~970, RDF/waste ~1396, wet sand ~1500, gravel ~1600, iron ore ~2500.' },
  { id: 'surcharge', label: 'Surcharge angle (β)',             unit: '°',     def: 20,
    info: 'Slope the material forms above the troughing line. Typical 15–25°.' },
  { id: 'vo',        label: 'Speed of incoming material (v₀)', unit: 'm/s',   def: 0,
    info: 'Speed of material at the loading point. 0 if dropped vertically.' },

  // ---- Belt & Speed ----
  { id: 'B',         label: 'Belt width (B)',                  unit: 'mm',    def: 2400, group: 'Belt & Speed',
    info: 'Standard widths: 800, 1000, 1200, 1400, 1600, 1800, 2000, 2400…' },
  { id: 'v',         label: 'Belt speed (v)',                  unit: 'm/s',   def: 5.27,
    info: 'Operating speed. Typical 2–6 m/s. Higher = more capacity but more wear.' },
  { id: 'mG',        label: 'Mass of belt (mG)',               unit: 'kg/m',  def: 158,
    info: 'Belt mass per metre. Depends on width and cover thickness.' },
  { id: 'e_belt',    label: 'Belt elongation (e)',             unit: '%',     def: 0.2,
    info: 'Belt stretch at operating tension. Steel-cord ~0.2%. Sets take-up travel.' },

  // ---- Idlers & Tilt ----
  { id: 'mRo_idler', label: "Mass per top idler (m'Ro)",       unit: 'kg/idler', def: 63, group: 'Idlers & Tilt',
    info: 'Mass PER IDLER SET (not per metre). If you have kg/m, multiply by carry spacing l₀.' },
  { id: 'mRu_idler', label: 'Mass per return idler (m"Ru)',    unit: 'kg/idler', def: 33.8,
    info: 'Mass PER IDLER SET (not per metre). If you have kg/m, multiply by return spacing l_u.' },
  { id: 'nTilt',     label: 'Number of tilted idlers (nTilt)', unit: '-',     def: 0,
    info: 'Number of forward-tilted idler sets (for belt tracking).' },
  { id: 'tilt',      label: 'Tilt angle of idler (λ)',         unit: '°',     def: 0,
    info: 'Forward tilt of carry idlers. Usually 0–3°.' },
  { id: 'trough',    label: 'Trough angle (δ)',                unit: '°',     def: 45,
    info: '0=flat, 20–45 typical. Defines the idler trough (V / 3-roll / 5-roll).' },

  // ---- Friction & Drive basics ----
  { id: 'mu',        label: 'Friction belt-pulley (μ)',        unit: '-',     def: 0.35, group: 'Friction & Drive',
    info: '0.35 dry/clean, 0.25 wet, 0.45 lagged. Drives the wrap factor k.' },
  { id: 'wrap',      label: 'Angle of wrap (α)',               unit: '°',     def: 180,
    info: '180° single pulley, 210–230° dual/snubbed. Larger = more grip.' },
  { id: 'eta',       label: 'Drive efficiency (η)',            unit: '-',     def: 0.955,
    info: 'Gearbox + coupling efficiency. ~0.95 typical.' },
  { id: 'x_accel',   label: 'Acceleration factor (x)',         unit: '-',     def: 1.25,
    info: 'Peak/nominal tension ratio during start-up. Typical 1.2–1.5.' },

  // ---- Reducer ----
  { id: 'reducerI',  label: 'Reducer ratio – drive (i)',       unit: '-',     def: null, group: 'Reducer', allowAuto: true,
    info: 'Gear reducer ratio (motor rpm ÷ pulley rpm). Reply "auto" to let the calculator compute it from n1·π·Dp/(v·60).' },

  // ---- Motor / Drive ----
  { id: 'n1',        label: 'Motor revolution (n₁)',           unit: 'rpm',   def: 1487, group: 'Motor & Drive',
    info: 'Synchronous motor speed. 1500 (4-pole 50Hz), 1800 (4-pole 60Hz), 1000 (6-pole).' },
  { id: 'Dp',        label: 'Drive pulley dia. (Dp)',          unit: 'm',     def: 1.2,
    info: 'Drive pulley diameter. Larger = lower belt bending stress.' },
  { id: 'motorKW',   label: 'Motor power per set (Pmot)',      unit: 'kW',    def: 2250,
    info: 'Rated power per motor. Total installed = motorKW × number of drives.' },
  { id: 'nPri',      label: 'Motors @ primary pulley (nPri)',  unit: '-',     def: 1,
    info: 'Number of drive motors at the primary drive pulley.' },
  { id: 'nSec',      label: 'Motors @ secondary pulley (nSec)',unit: '-',     def: 1,
    info: 'Number of drive motors at the secondary drive pulley.' },
  { id: 'nTail',     label: 'Motors @ tail pulley (nTail)',    unit: '-',     def: 2,
    info: 'Number of drive motors at the tail pulley. 0 for head-drive only.' },
  { id: 'nSheave',   label: 'Number of sheaves (nSheave)',     unit: '-',     def: 0,
    info: 'Sheaves the take-up counterweight rope passes over.' },

  // ---- Secondary frictions & cleaners ----
  { id: 'mu2',       label: 'Material-chute friction (μ₂)',    unit: '-',     def: 0.5, group: 'Secondary & Cleaners',
    info: 'Material/skirt friction at the loading chute.' },
  { id: 'mu3',       label: 'Belt-idler friction (μ₃)',        unit: '-',     def: 0.5,
    info: 'Belt-to-idler friction coefficient.' },
  { id: 'mu4',       label: 'Belt-cleaner friction (μ₄)',      unit: '-',     def: 0.6,
    info: 'Scraper drag coefficient.' },
  { id: 'pGr',       label: 'Cleaner pressure (p_Gr)',         unit: 'N/mm²', def: 0.05,
    info: 'Scraper-to-belt contact pressure.' },
  { id: 'nCleaner',  label: 'Number of cleaners (nCleaner)',   unit: '-',     def: 5,
    info: 'Number of belt cleaners/scrapers. Each adds drag.' },
  { id: 'lb',        label: 'Accel length at loading (l_b)',   unit: 'm',     def: 5,
    info: 'Distance over which material accelerates to belt speed.' },
  { id: 'bsch',      label: 'Distance between chute plates (b_sch)', unit: 'm', def: 1.02,
    info: 'Skirtboard width / contact distance at the loading zone.' },

  // ---- Belt safety / take-up ----
  { id: 'safetyS',   label: 'Safety factor (S)',               unit: '-',     def: 6.7, group: 'Safety & Take-up',
    info: 'Belt tensile safety factor. Steel-cord ~6.7, fabric ~10.' },
  { id: 'sag_pct',   label: 'Sag percentage (Sag)',            unit: '%',     def: 1,
    info: 'Allowable belt sag between idlers. Typical 1–2%.' },
  { id: 'lv_add',    label: 'Take-up travel adder (Lv_add)',   unit: 'm',     def: 3,
    info: 'Extra reserve take-up travel beyond calculated belt elongation.' },

  // ---- Brake / life ----
  { id: 'MdbBrake',     label: 'Brake moment (Mdb)',           unit: 'Nm',    def: 2400, group: 'Brake & Life',
    info: 'Brake disc/drum torque rating.' },
  { id: 'reducerBrake', label: 'Reducer ratio – brake (i_b)',  unit: '-',     def: 22.114,
    info: 'Gear ratio in the braking path.' },
  { id: 'hrPerYr',      label: 'Operating hours/year (hr)',    unit: '-',     def: 5000,
    info: 'Used to convert bearing L10 life (hours) into years.' },

  // ---- Pulley geometry ----
  { id: 'Dtu',   label: 'Take-up pulley diameter (Dtu)',       unit: 'mm',    def: 824, group: 'Pulleys (Ø & weight)',
    info: 'Take-up pulley diameter.' },
  { id: 'Wtu',   label: 'Take-up pulley weight (Wtu)',         unit: 'kg',    def: 1250,
    info: 'Take-up pulley assembly weight.' },
  { id: 'Dpri',  label: 'Primary drive pulley dia. (Dpri)',    unit: 'mm',    def: 1230,
    info: 'Primary drive pulley diameter.' },
  { id: 'Wpri',  label: 'Primary drive pulley weight (Wpri)',  unit: 'kg',    def: 3200,
    info: 'Primary drive pulley weight.' },
  { id: 'Dsec',  label: 'Secondary drive pulley dia. (Dsec)',  unit: 'mm',    def: 1230,
    info: 'Secondary drive pulley diameter.' },
  { id: 'Wsec',  label: 'Secondary drive pulley weight (Wsec)',unit: 'kg',    def: 3200,
    info: 'Secondary drive pulley weight.' },
  { id: 'Dtail', label: 'Tail pulley diameter (Dtail)',        unit: 'mm',    def: 1024,
    info: 'Tail pulley diameter.' },
  { id: 'Wtail', label: 'Tail pulley weight (Wtail)',          unit: 'kg',    def: 1300,
    info: 'Tail pulley weight.' },

  // ---- Lift head ----
  { id: 'liftHead', label: 'Lift head (extra head-pulley lift)', unit: 'm',   def: 8.2, group: 'Profile',
    info: 'Extra vertical lift of the head pulley above the last segment. Added to Σ ΔH for total H.' },
];

// Per-segment fields (asked for each segment)
const SEGMENT_FIELDS = [
  { id: 'L',      label: 'Segment length (L)',               unit: 'm', def: null,
    info: 'Horizontal length of this segment. Required.' },
  { id: 'h_end',  label: 'Elevation change (ΔH, +up/−down)', unit: 'm', def: 0,
    info: 'Rise (+) or fall (−) over this segment.' },
  { id: 'l0',     label: 'Top idler spacing (l₀)',           unit: 'm', def: 1.5,
    info: 'Carry (top) idler spacing.' },
  { id: 'lu',     label: 'Return idler spacing (l_u)',       unit: 'm', def: 6,
    info: 'Return idler spacing.' },
  { id: 'trough', label: 'Segment trough angle',             unit: '°', def: 45,
    info: 'Idler trough angle for this segment.' },
];

module.exports = { FIELDS, SEGMENT_FIELDS };
