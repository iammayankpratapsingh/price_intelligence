/** HS/HSN code -> human readable category, as used across the UI. */
const HS_NAMES = {
  '87089900': 'Vehicle parts, other',
  '87081090': 'Bumpers & parts',
  '87082900': 'Body parts',
  '85443000': 'Wiring harness',
  '94019000': 'Seat parts',
  '84159000': 'AC parts',
  '87083000': 'Brakes',
  '85122010': 'Lighting',
  '87088000': 'Suspension',
  '83012000': 'Locks',
  '87089400': 'Steering',
  '73181500': 'Bolts & screws',
  '70091090': 'Mirrors',
  '40094200': 'Hoses',
  '87082100': 'Seat belts',
  '87081010': 'Bumpers',
  '39199010': 'Adhesive tapes & films',
  '85129000': 'Electrical parts',
  '85365090': 'Switches',
  '70071100': 'Safety glass',
  '84099190': 'Engine parts',
  '84213100': 'Air filters',
  '87089100': 'Radiators',
  '87089300': 'Clutches',
  '87087000': 'Wheels',
  '40169390': 'Rubber seals',
  '85111000': 'Spark plugs',
  '84133000': 'Fuel pumps',
  '87089500': 'Airbags',
};

export function hsName(code) {
  if (!code) return 'Uncategorised';
  return HS_NAMES[code] || `HS ${code}`;
}
