// All conveyor calculator inputs, in the order the bot will ask.
// `def` = default value (shown to user; they can type "-" or "default" to accept it).
// `unit` shown for clarity. `group` used only for nice section headers in chat.

const FIELDS = [
  // ---- Capacity & Material ----
  { id: 'Qt',        label: 'Handling rate (Qt)',                 unit: 't/h',      def: 18000, group: 'Capacity & Material' },
  { id: 'rho',       label: 'Bulk density (ρ)',                   unit: 'kg/m³',    def: 970 },
  { id: 'surcharge', label: 'Surcharge angle (β)',                unit: '°',        def: 20 },
  { id: 'vo',        label: 'Speed of incoming material (v₀)',    unit: 'm/s',      def: 0 },

  // ---- Belt & Speed ----
  { id: 'B',         label: 'Belt width (B)',                     unit: 'mm',       def: 2400, group: 'Belt & Speed' },
  { id: 'v',         label: 'Belt speed (v)',                     unit: 'm/s',      def: 5.27 },
  { id: 'mG',        label: 'Mass of belt (mG)',                  unit: 'kg/m',     def: 158 },
  { id: 'e_belt',    label: 'Belt elongation (e)',                unit: '%',        def: 0.2 },

  // ---- Idlers & Tilt ----
  { id: 'mRo_idler', label: "Mass per top idler (m'Ro)",          unit: 'kg/idler', def: 63, group: 'Idlers & Tilt' },
  { id: 'mRu_idler', label: 'Mass per return idler (m"Ru)',       unit: 'kg/idler', def: 33.8 },
  { id: 'nTilt',     label: 'Number of tilted idlers (nTilt)',    unit: '-',        def: 0 },
  { id: 'tilt',      label: 'Tilt angle of idler (λ)',            unit: '°',        def: 0 },
  { id: 'trough',    label: 'Trough angle (δ)',                   unit: '°',        def: 45 },

  // ---- Friction & Drive basics ----
  { id: 'mu',        label: 'Friction belt-pulley (μ)',           unit: '-',        def: 0.35, group: 'Friction & Drive' },
  { id: 'wrap',      label: 'Angle of wrap (α)',                  unit: '°',        def: 180 },
  { id: 'eta',       label: 'Drive efficiency (η)',               unit: '-',        def: 0.955 },
  { id: 'x_accel',   label: 'Acceleration factor (x)',            unit: '-',        def: 1.25 },

  // ---- Motor / Drive ----
  { id: 'n1',        label: 'Motor revolution (n₁)',              unit: 'rpm',      def: 1487, group: 'Motor & Drive' },
  { id: 'Dp',        label: 'Drive pulley dia. (Dp)',             unit: 'm',        def: 1.2 },
  { id: 'motorKW',   label: 'Motor power per set (Pmot)',         unit: 'kW',       def: 2250 },
  { id: 'nPri',      label: 'Motors @ primary pulley (nPri)',     unit: '-',        def: 1 },
  { id: 'nSec',      label: 'Motors @ secondary pulley (nSec)',   unit: '-',        def: 1 },
  { id: 'nTail',     label: 'Motors @ tail pulley (nTail)',       unit: '-',        def: 2 },
  { id: 'nSheave',   label: 'Number of sheaves (nSheave)',        unit: '-',        def: 0 },

  // ---- Secondary frictions & cleaners ----
  { id: 'mu2',       label: 'Material-chute friction (μ₂)',       unit: '-',        def: 0.5, group: 'Secondary & Cleaners' },
  { id: 'mu3',       label: 'Belt-idler friction (μ₃)',           unit: '-',        def: 0.5 },
  { id: 'mu4',       label: 'Belt-cleaner friction (μ₄)',         unit: '-',        def: 0.6 },
  { id: 'pGr',       label: 'Cleaner pressure (p_Gr)',            unit: 'N/mm²',    def: 0.05 },
  { id: 'nCleaner',  label: 'Number of cleaners (nCleaner)',      unit: '-',        def: 5 },
  { id: 'lb',        label: 'Acceleration length at loading (l_b)', unit: 'm',      def: 5 },
  { id: 'bsch',      label: 'Distance between chute plates (b_sch)', unit: 'm',     def: 1.02 },

  // ---- Belt safety / take-up ----
  { id: 'safetyS',   label: 'Safety factor (S)',                  unit: '-',        def: 6.7, group: 'Safety & Take-up' },
  { id: 'sag_pct',   label: 'Sag percentage (Sag)',               unit: '%',        def: 1 },
  { id: 'lv_add',    label: 'Take-up travel adder (Lv_add)',      unit: 'm',        def: 3 },

  // ---- Brake / life ----
  { id: 'MdbBrake',     label: 'Brake moment (Mdb)',              unit: 'Nm',       def: 2400, group: 'Brake & Life' },
  { id: 'reducerBrake', label: 'Reducer ratio – brake (i_b)',     unit: '-',        def: 22.114 },
  { id: 'hrPerYr',      label: 'Operating hours/year (hr)',       unit: '-',        def: 5000 },

  // ---- Pulley geometry ----
  { id: 'Dtu',   label: 'Take-up pulley diameter (Dtu)',          unit: 'mm',       def: 824, group: 'Pulleys (Ø & weight)' },
  { id: 'Wtu',   label: 'Take-up pulley weight (Wtu)',            unit: 'kg',       def: 1250 },
  { id: 'Dpri',  label: 'Primary drive pulley diameter (Dpri)',   unit: 'mm',       def: 1230 },
  { id: 'Wpri',  label: 'Primary drive pulley weight (Wpri)',     unit: 'kg',       def: 3200 },
  { id: 'Dsec',  label: 'Secondary drive pulley diameter (Dsec)', unit: 'mm',       def: 1230 },
  { id: 'Wsec',  label: 'Secondary drive pulley weight (Wsec)',   unit: 'kg',       def: 3200 },
  { id: 'Dtail', label: 'Tail pulley diameter (Dtail)',           unit: 'mm',       def: 1024 },
  { id: 'Wtail', label: 'Tail pulley weight (Wtail)',             unit: 'kg',       def: 1300 },

  // ---- Lift head (separate from segments) ----
  { id: 'liftHead', label: 'Lift head (extra head-pulley lift)',  unit: 'm',        def: 8.2, group: 'Profile' },
];

// Per-segment fields (asked repeatedly for each segment the user adds)
const SEGMENT_FIELDS = [
  { id: 'L',      label: 'Segment length (L)',          unit: 'm',  def: null },   // required, no default
  { id: 'h_end',  label: 'Elevation change (ΔH, +up/−down)', unit: 'm', def: 0 },
  { id: 'l0',     label: 'Top idler spacing (l₀)',      unit: 'm',  def: 1.5 },
  { id: 'lu',     label: 'Return idler spacing (l_u)',  unit: 'm',  def: 6 },
  { id: 'trough', label: 'Segment trough angle',        unit: '°',  def: 45 },
];

module.exports = { FIELDS, SEGMENT_FIELDS };
