// Trade catalog used by the setup wizard and the quote generator.
//
// Each service is a job template: typical labor hours plus the materials it
// usually needs (at cost, before the owner's markup). They are starting points
// that get priced with the owner's own rates, then edited per job — not a
// price book. Tune or extend freely; nothing else needs to change.
//
// s(id, name, keywords, hours, materials, scope)
//   keywords  – matched against the owner's job description (word-prefix match)
//   materials – [description, unit cost] pairs

const s = (id, name, kw, hours, mats, scope) => ({
  id,
  name,
  kw,
  hours,
  mats: mats.map(([description, cost]) => ({ description, cost })),
  scope,
});

export const TRADES = [
  {
    id: 'plumbing',
    label: 'Plumbing',
    noun: 'plumbing',
    icon: 'water',
    warranty: '1-year warranty on workmanship. Fixtures and parts carry the manufacturer’s warranty.',
    exclusions: [
      'Repair of concealed or pre-existing pipe damage discovered once work begins',
      'Drywall, tile or flooring repair beyond what is listed',
      'Permit fees unless listed above',
    ],
    services: [
      s('pl-leak', 'Leak repair', ['leak', 'drip', 'burst', 'pipe repair'], 1.5, [['Pipe, fittings & sealant', 35]], 'Locate the leak, cut out the damaged section and replace with new pipe and fittings. Pressure-test on completion.'),
      s('pl-drain', 'Drain cleaning', ['drain', 'clog', 'blocked', 'snake', 'backed up'], 1.5, [['Drain cleaning consumables', 15]], 'Clear the blockage with a professional drain machine and confirm full flow.'),
      s('pl-heater', 'Water heater replacement', ['water heater', 'hot water', 'tankless'], 4, [['Water heater (40–50 gal tank)', 780], ['Supply lines, valve & fittings', 95]], 'Drain and remove the existing water heater, install the new unit with new supply lines and shut-off valve, test, and haul away the old unit.'),
      s('pl-toilet', 'Toilet install / replace', ['toilet'], 2, [['Toilet', 240], ['Wax ring, supply line & bolts', 28]], 'Remove the existing toilet, install the new toilet with a new wax ring and supply line, and test for leaks.'),
      s('pl-faucet', 'Faucet / fixture install', ['faucet', 'tap', 'new sink', 'replace sink', 'sink install'], 1.5, [['Faucet', 160], ['Supply lines & fittings', 22]], 'Remove the old fixture, install the new one with new supply lines, and test for leaks.'),
      s('pl-disposal', 'Garbage disposal install', ['disposal', 'disposer'], 1.5, [['Garbage disposal (1/2 HP)', 140], ['Fittings & connectors', 18]], 'Remove the existing disposal, install and wire the new unit, and test.'),
      s('pl-sewer', 'Sewer line inspection / repair', ['sewer', 'main line', 'camera'], 3, [['Camera inspection & locating', 60]], 'Camera-inspect the sewer line, locate the fault and report findings with repair options.'),
      s('pl-repipe', 'Repipe / new line', ['repipe', 're-pipe', 'new line', 'gas line'], 8, [['Pipe, fittings & hangers', 420]], 'Run new supply piping as described, secure, pressure-test and restore service.'),
    ],
  },
  {
    id: 'hvac',
    label: 'HVAC',
    noun: 'heating & cooling',
    icon: 'thermometer',
    warranty: '1-year labor warranty. Equipment is covered by the manufacturer’s parts warranty once registered.',
    exclusions: [
      'Ductwork modifications or electrical upgrades unless listed above',
      'Repairs to pre-existing code violations',
      'Permit fees unless listed above',
    ],
    services: [
      s('hv-diag', 'System diagnostic', ['not cooling', 'not heating', 'no heat', 'no cool', 'diagnos', 'not working', 'noise'], 1, [], 'Full system diagnostic to identify the fault, with findings and repair options explained before any further work.'),
      s('hv-tune', 'Maintenance tune-up', ['tune', 'maintenance', 'annual service', 'clean coil'], 1.5, [['Filter & cleaning supplies', 30]], 'Clean coils, check refrigerant pressures, electrical connections and safeties, and replace the filter.'),
      s('hv-ac', 'AC replacement', ['ac replace', 'new ac', 'air condition', 'condenser', 'ac unit', 'install ac'], 8, [['Condenser & evaporator coil (3 ton, 14.3 SEER2)', 3400], ['Line set, pad, disconnect & materials', 380]], 'Recover refrigerant, remove the existing equipment, install the new condenser and coil, pressure-test, evacuate, charge and commission the system.'),
      s('hv-furnace', 'Furnace replacement', ['furnace', 'heater replace'], 7, [['Gas furnace (80k BTU, 96% AFUE)', 1900], ['Venting, gas flex & materials', 260]], 'Remove the existing furnace, install the new unit with new venting and gas connection, then test and commission.'),
      s('hv-heatpump', 'Heat pump install', ['heat pump'], 9, [['Heat pump system (3 ton)', 4200], ['Line set, pad & materials', 420]], 'Install the new heat pump system, pressure-test, evacuate, charge and commission.'),
      s('hv-minisplit', 'Mini-split install', ['mini split', 'mini-split', 'ductless'], 6, [['Ductless mini-split (12k BTU)', 1150], ['Line set, cover & electrical whip', 190]], 'Mount the indoor and outdoor units, run and cover the line set, evacuate and commission.'),
      s('hv-thermo', 'Thermostat install', ['thermostat'], 1, [['Smart thermostat', 170]], 'Remove the old thermostat, install and configure the new one, and verify heating and cooling operation.'),
      s('hv-recharge', 'Refrigerant recharge', ['refrigerant', 'recharge', 'freon'], 1.5, [['Refrigerant (R-410A, per lb)', 75]], 'Leak-check the system, then recharge to the manufacturer’s specification.'),
      s('hv-duct', 'Duct repair / cleaning', ['duct'], 3, [['Duct materials, mastic & tape', 120]], 'Repair, seal or clean the ductwork as described and verify airflow.'),
    ],
  },
  {
    id: 'electrical',
    label: 'Electrical',
    noun: 'electrical',
    icon: 'flash',
    warranty: '1-year warranty on workmanship. All work completed to current electrical code.',
    exclusions: [
      'Drywall patching and painting after wiring work',
      'Correction of pre-existing code violations unless listed above',
      'Utility company and permit fees unless listed above',
    ],
    services: [
      s('el-outlet', 'Outlet / switch install', ['outlet', 'receptacle', 'switch', 'gfci', 'dimmer'], 0.75, [['Device, plate & connectors', 18]], 'Install or replace the device, terminate to code and test.'),
      s('el-light', 'Light fixture install', ['light', 'fixture', 'chandelier', 'recessed', 'pot light'], 1, [['Mounting hardware & connectors', 12]], 'Install the light fixture, connect and test. Fixture supplied by customer unless listed.'),
      s('el-fan', 'Ceiling fan install', ['ceiling fan', 'fan'], 1.5, [['Fan-rated box & hardware', 28]], 'Install a fan-rated box where required, assemble, mount and balance the fan.'),
      s('el-panel', 'Panel upgrade', ['panel', 'breaker box', 'service upgrade', 'fuse box'], 8, [['200A panel & breakers', 620], ['Wire, connectors & grounding', 210]], 'Replace the existing panel with a new 200A panel, re-terminate and label all circuits, and coordinate inspection.'),
      s('el-circuit', 'New dedicated circuit', ['circuit', 'dedicated', '240v', '220v'], 3, [['Breaker, wire & box', 140]], 'Run a new dedicated circuit from the panel to the location described, terminate and test.'),
      s('el-ev', 'EV charger install', ['ev charger', 'car charger', 'tesla', 'level 2'], 4, [['50A breaker, wire & conduit', 260]], 'Install a dedicated 240V circuit and mount and connect the EV charger. Charger supplied by customer unless listed.'),
      s('el-trouble', 'Troubleshooting', ['troubleshoot', 'tripping', 'flicker', 'no power', 'not working'], 1.5, [], 'Trace and identify the fault, with findings and repair options explained before further work.'),
      s('el-rewire', 'Rewiring', ['rewire', 're-wire', 'knob and tube', 'aluminum wiring'], 16, [['Wire, boxes & devices', 900]], 'Replace the existing wiring in the areas described and bring them up to current code.'),
    ],
  },
  {
    id: 'general',
    label: 'General Contracting',
    noun: 'construction & remodeling',
    icon: 'hammer',
    warranty: '1-year warranty on workmanship from the date of completion.',
    exclusions: [
      'Hidden conditions (rot, mold, asbestos, structural defects) discovered after work begins',
      'Changes to the scope — these are priced separately as a written change order',
      'Permit and engineering fees unless listed above',
    ],
    services: [
      s('gc-bath', 'Bathroom remodel', ['bathroom', 'bath remodel', 'shower', 'vanity'], 60, [['Tile, backer board & setting materials', 1400], ['Vanity, fixtures & trim', 1800]], 'Demo the existing bathroom, then install new tile, vanity, fixtures and trim as specified.'),
      s('gc-kitchen', 'Kitchen remodel', ['kitchen', 'cabinet', 'countertop', 'backsplash'], 120, [['Cabinets & hardware', 6500], ['Countertops & backsplash', 3800]], 'Demo the existing kitchen, then install new cabinets, countertops and backsplash as specified.'),
      s('gc-drywall', 'Drywall install / repair', ['drywall', 'sheetrock', 'patch', 'plaster'], 6, [['Drywall, compound & tape', 110]], 'Hang or patch drywall, tape, apply three coats of compound and sand ready for paint.'),
      s('gc-framing', 'Framing / carpentry', ['framing', 'frame', 'wall', 'carpentry', 'partition'], 12, [['Lumber, fasteners & hardware', 480]], 'Frame the walls or openings described, plumb and square, ready for finishes.'),
      s('gc-deck', 'Deck build / repair', ['deck', 'porch', 'pergola'], 40, [['Decking, framing lumber & hardware', 3200]], 'Build or repair the deck as described, including footings, framing, decking and railings.'),
      s('gc-door', 'Door / window install', ['door', 'window'], 3, [['Shims, flashing, foam & trim', 60]], 'Remove the existing unit, install the new one plumb and level, then insulate, flash and trim.'),
      s('gc-demo', 'Demolition & haul-away', ['demo', 'demolition', 'tear out', 'haul'], 8, [['Dumpster & disposal fees', 450]], 'Demolish and remove the items described and dispose of all debris.'),
    ],
  },
  {
    id: 'roofing',
    label: 'Roofing',
    noun: 'roofing',
    icon: 'home',
    warranty: '5-year workmanship warranty. Roofing materials carry the manufacturer’s warranty.',
    exclusions: [
      'Replacement of rotten decking beyond the allowance listed — charged per sheet if found',
      'Interior repairs from previous leaks',
      'Permit fees unless listed above',
    ],
    services: [
      s('rf-repair', 'Roof leak repair', ['leak', 'repair', 'missing shingle', 'flashing'], 3, [['Shingles, flashing & sealant', 120]], 'Locate the source of the leak, replace damaged shingles and flashing, and seal.'),
      s('rf-replace', 'Roof replacement', ['replace', 'reroof', 're-roof', 'new roof', 'tear off'], 48, [['Architectural shingles, underlayment & accessories', 5200], ['Dump & disposal fees', 550]], 'Tear off the existing roof to the deck, install new underlayment, drip edge, flashing and architectural shingles, then clean up with a magnetic sweep.'),
      s('rf-inspect', 'Roof inspection', ['inspect', 'inspection', 'assessment'], 1.5, [], 'Full roof inspection with photos and a written condition report.'),
      s('rf-gutter', 'Gutter install / repair', ['gutter', 'downspout'], 5, [['Seamless gutter, downspouts & hangers', 520]], 'Install or repair gutters and downspouts, pitched for proper drainage.'),
      s('rf-vent', 'Vent / skylight work', ['skylight', 'vent', 'ridge'], 4, [['Vent or skylight flashing kit', 180]], 'Install or re-flash the vent or skylight and seal watertight.'),
    ],
  },
  {
    id: 'painting',
    label: 'Painting',
    noun: 'painting',
    icon: 'color-palette',
    warranty: '2-year warranty against peeling, blistering or flaking caused by workmanship.',
    exclusions: [
      'Major drywall or wood repair beyond minor patching',
      'Moving of large furniture, pianos or appliances',
      'Lead paint abatement',
    ],
    services: [
      s('pt-room', 'Interior room painting', ['room', 'bedroom', 'interior', 'living room', 'walls'], 6, [['Premium interior paint & primer', 95], ['Tape, plastic & sundries', 25]], 'Protect floors and furniture, patch minor holes, then apply two coats of premium paint to the walls.'),
      s('pt-ext', 'Exterior painting', ['exterior', 'outside', 'siding', 'house paint'], 40, [['Exterior paint & primer', 620], ['Caulk, tape & sundries', 110]], 'Pressure wash, scrape and prime bare areas, caulk gaps, then apply two coats of exterior paint.'),
      s('pt-cab', 'Cabinet refinishing', ['cabinet'], 24, [['Cabinet enamel, primer & supplies', 280]], 'Remove doors and hardware, degrease, sand and prime, then spray-finish with cabinet-grade enamel.'),
      s('pt-trim', 'Trim & doors', ['trim', 'baseboard', 'door', 'crown'], 5, [['Trim enamel & supplies', 70]], 'Sand, caulk and apply two coats of enamel to trim and doors.'),
      s('pt-ceiling', 'Ceiling painting', ['ceiling'], 3, [['Ceiling paint & supplies', 60]], 'Mask the room and apply two coats of flat ceiling paint.'),
      s('pt-deck', 'Deck / fence staining', ['stain', 'deck', 'fence'], 8, [['Stain / sealer & supplies', 190]], 'Clean and prep the surface, then apply stain or sealer.'),
    ],
  },
  {
    id: 'landscaping',
    label: 'Landscaping',
    noun: 'landscaping',
    icon: 'leaf',
    warranty: 'Plants are guaranteed for 30 days with proper watering. Hardscape workmanship is warrantied for 1 year.',
    exclusions: [
      'Damage to unmarked underground utilities or irrigation lines',
      'Ongoing watering and maintenance after installation',
      'Removal of buried debris, stumps or rock unless listed above',
    ],
    services: [
      s('ls-mow', 'Lawn mowing & maintenance', ['mow', 'lawn care', 'maintenance', 'edging'], 1.5, [], 'Mow, edge and trim the lawn areas and blow off all hard surfaces.'),
      s('ls-clean', 'Yard clean-up', ['clean up', 'cleanup', 'clean-up', 'leaves', 'overgrown', 'weeds'], 6, [['Disposal fees', 80]], 'Clear leaves, weeds and debris, cut back overgrowth and haul everything away.'),
      s('ls-mulch', 'Mulch & bed refresh', ['mulch', 'beds', 'flower bed'], 5, [['Mulch (per cubic yard)', 45]], 'Weed and edge the beds, then spread fresh mulch to a 2–3 inch depth.'),
      s('ls-sod', 'Sod / lawn install', ['sod', 'new lawn', 'seed', 'turf'], 12, [['Sod, topsoil & starter fertilizer', 900]], 'Remove the existing lawn, grade and prep the soil, then lay and roll new sod.'),
      s('ls-tree', 'Tree & shrub trimming', ['tree', 'shrub', 'hedge', 'prune', 'trim'], 4, [['Disposal fees', 60]], 'Trim and shape trees and shrubs as described and remove all cuttings.'),
      s('ls-irrig', 'Irrigation install / repair', ['irrigation', 'sprinkler'], 4, [['Sprinkler heads, pipe & fittings', 140]], 'Install or repair the irrigation as described, then test and adjust every zone.'),
      s('ls-patio', 'Patio / paver install', ['patio', 'paver', 'walkway', 'retaining wall'], 32, [['Pavers, base gravel, sand & edging', 2400]], 'Excavate, install and compact the base, lay pavers, then edge and sweep in joint sand.'),
    ],
  },
  {
    id: 'flooring',
    label: 'Flooring',
    noun: 'flooring',
    icon: 'grid',
    warranty: '1-year warranty on installation. Flooring materials carry the manufacturer’s warranty.',
    exclusions: [
      'Subfloor repair or leveling beyond what is listed',
      'Moving of appliances, pianos or heavy furniture unless listed above',
      'Trimming of doors after installation',
    ],
    services: [
      s('fl-lvp', 'Vinyl plank / laminate install', ['vinyl', 'lvp', 'laminate', 'plank'], 10, [['Flooring & underlayment (per 300 sq ft)', 1050], ['Transitions & trim', 120]], 'Prep the subfloor, install underlayment and flooring, then fit transitions and trim.'),
      s('fl-hard', 'Hardwood install', ['hardwood', 'engineered wood', 'oak'], 16, [['Hardwood flooring (per 300 sq ft)', 2100], ['Fasteners, underlayment & trim', 190]], 'Acclimate and install the hardwood flooring, then fit transitions and trim.'),
      s('fl-refin', 'Hardwood refinishing', ['refinish', 'sand and finish', 'sanding'], 14, [['Abrasives, stain & finish', 260]], 'Sand to bare wood, stain to the chosen color and apply three coats of finish.'),
      s('fl-tile', 'Tile install', ['tile', 'backsplash', 'grout'], 14, [['Tile (per 100 sq ft)', 520], ['Thinset, grout & backer board', 180]], 'Prep the surface, set the tile, then grout and seal.'),
      s('fl-carpet', 'Carpet install', ['carpet'], 6, [['Carpet & pad (per 300 sq ft)', 900]], 'Install new pad and carpet, power-stretched and seamed.'),
      s('fl-remove', 'Old flooring removal', ['remove', 'tear out', 'demo', 'rip up'], 5, [['Disposal fees', 120]], 'Remove and dispose of the existing flooring and prep the subfloor.'),
    ],
  },
  {
    id: 'handyman',
    label: 'Handyman',
    noun: 'home repair',
    icon: 'construct',
    warranty: '90-day warranty on workmanship.',
    exclusions: [
      'Work requiring a licensed trade or permit',
      'Materials or fixtures not listed above',
      'Repair of hidden damage discovered during the job',
    ],
    services: [
      s('hm-mount', 'TV / shelf mounting', ['tv', 'mount', 'shelf', 'shelves', 'hang'], 1.5, [['Anchors & mounting hardware', 15]], 'Locate studs, mount securely and level, and conceal cables where possible.'),
      s('hm-assemble', 'Furniture assembly', ['assemble', 'assembly', 'ikea', 'furniture'], 2, [], 'Assemble the items per the manufacturer’s instructions and remove packaging.'),
      s('hm-drywall', 'Drywall patch & paint', ['drywall', 'hole', 'patch'], 2.5, [['Patch materials & paint', 35]], 'Patch, sand, prime and touch-up paint the damaged area.'),
      s('hm-door', 'Door repair / install', ['door', 'lock', 'hinge', 'deadbolt'], 2, [['Hardware & shims', 25]], 'Repair, adjust or install the door and hardware so it closes and latches properly.'),
      s('hm-caulk', 'Caulking & sealing', ['caulk', 'seal', 'weatherstrip'], 1.5, [['Caulk & sealant', 18]], 'Remove old caulk, clean and re-caulk for a watertight seal.'),
      s('hm-fence', 'Fence / gate repair', ['fence', 'gate'], 3, [['Lumber, posts & hardware', 90]], 'Repair or replace the damaged sections and adjust the gate.'),
      s('hm-misc', 'General repairs', ['odd job', 'general repair', 'misc', 'punch list'], 2, [['Miscellaneous materials', 25]], 'Complete the repairs described.'),
    ],
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    noun: 'cleaning',
    icon: 'sparkles',
    warranty: 'Satisfaction guarantee — tell us within 24 hours and we will come back and re-clean any missed area free of charge.',
    exclusions: [
      'Biohazard, mold or pest-related cleaning',
      'Moving of heavy furniture or appliances',
      'Exterior windows above ground level unless listed above',
    ],
    services: [
      s('cl-std', 'Standard clean', ['standard', 'regular', 'weekly', 'biweekly', 'house clean'], 3, [['Cleaning supplies', 12]], 'Dust, vacuum and mop throughout, and clean and sanitize the kitchen and bathrooms.'),
      s('cl-deep', 'Deep clean', ['deep'], 6, [['Cleaning supplies', 25]], 'Top-to-bottom deep clean including baseboards, inside the oven and fridge, and detailed bathroom scrubbing.'),
      s('cl-move', 'Move-in / move-out clean', ['move out', 'move in', 'move-out', 'move-in', 'end of lease'], 7, [['Cleaning supplies', 30]], 'Full move-out standard clean of the empty property, including inside all cabinets and appliances.'),
      s('cl-carpet', 'Carpet cleaning', ['carpet', 'rug', 'upholstery'], 2.5, [['Carpet cleaning solution', 20]], 'Pre-treat stains, then hot-water extract the carpeted areas.'),
      s('cl-window', 'Window cleaning', ['window'], 3, [['Window cleaning supplies', 10]], 'Clean the glass inside and out and wipe down sills and tracks.'),
      s('cl-office', 'Office / commercial clean', ['office', 'commercial', 'janitorial'], 3, [['Cleaning supplies', 18]], 'Clean and sanitize workspaces, kitchens and washrooms, and empty all bins.'),
      s('cl-post', 'Post-construction clean', ['construction', 'renovation', 'builder'], 8, [['Cleaning supplies & disposal', 45]], 'Remove construction dust and debris and detail-clean all surfaces.'),
    ],
  },
  {
    id: 'other',
    label: 'Other trade',
    noun: 'service',
    icon: 'briefcase',
    warranty: '1-year warranty on workmanship.',
    exclusions: ['Work or materials not listed above', 'Permit fees unless listed above'],
    services: [],
  },
];

export function getTrade(id) {
  return TRADES.find((trade) => trade.id === id) || TRADES[TRADES.length - 1];
}

export function tradeLabel(profile) {
  if (profile.trade === 'other') return (profile.otherTrade || '').trim() || 'Trade services';
  return getTrade(profile.trade).label;
}

// Everything the owner said they offer: chosen catalog services plus the
// custom ones they typed in. Custom services have no template, so they get a
// modest default and match on the words in their name.
export function getOfferedServices(profile) {
  const trade = getTrade(profile.trade);
  const chosen = trade.services.filter((service) => (profile.services || []).includes(service.id));
  const custom = (profile.customServices || []).map((name, index) => ({
    id: `custom-${index}`,
    name,
    kw: [name.toLowerCase(), ...name.toLowerCase().split(/\s+/).filter((word) => word.length > 3)],
    hours: 2,
    mats: [],
    scope: `${name} as described.`,
    custom: true,
  }));
  return [...chosen, ...custom];
}
