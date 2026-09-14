export type TraumaCenter = {
  name: string;
  address: string;
  city: string;
  state: string;
  level: "Level I" | "Level II";
  latitude: number;
  longitude: number;
};

export const TRAUMA_CENTERS_LEVEL_II_PLUS: TraumaCenter[] = [
  { name: "Tampa General Hospital", address: "1 Tampa General Circle", city: "Tampa", state: "FL", level: "Level I", latitude: 27.9374, longitude: -82.4595 },
  { name: "St. Joseph's Hospital", address: "3001 W Dr Martin Luther King Jr Blvd", city: "Tampa", state: "FL", level: "Level II", latitude: 27.9814, longitude: -82.491 },
  { name: "Bayfront Health St. Petersburg", address: "701 6th St S", city: "St. Petersburg", state: "FL", level: "Level II", latitude: 27.7609, longitude: -82.6408 },
  { name: "Lakeland Regional Health Medical Center", address: "1324 Lakeland Hills Blvd", city: "Lakeland", state: "FL", level: "Level II", latitude: 28.0605, longitude: -81.9496 },
  { name: "Sarasota Memorial Hospital", address: "1700 S Tamiami Trail", city: "Sarasota", state: "FL", level: "Level II", latitude: 27.3165, longitude: -82.531 },
  { name: "Blake Medical Center", address: "2020 59th St W", city: "Bradenton", state: "FL", level: "Level II", latitude: 27.4688, longitude: -82.6145 },
  { name: "UF Health Shands Hospital", address: "1600 SW Archer Rd", city: "Gainesville", state: "FL", level: "Level I", latitude: 29.6399, longitude: -82.344 },
  { name: "UF Health Jacksonville", address: "655 W 8th St", city: "Jacksonville", state: "FL", level: "Level I", latitude: 30.3486, longitude: -81.6644 },
  { name: "Orlando Regional Medical Center", address: "52 W Underwood St", city: "Orlando", state: "FL", level: "Level I", latitude: 28.5266, longitude: -81.3775 },
  { name: "Jackson Memorial Hospital Ryder Trauma Center", address: "1611 NW 12th Ave", city: "Miami", state: "FL", level: "Level I", latitude: 25.7916, longitude: -80.2121 },
  { name: "Broward Health Medical Center", address: "1600 S Andrews Ave", city: "Fort Lauderdale", state: "FL", level: "Level I", latitude: 26.1006, longitude: -80.1411 },
  { name: "St. Mary's Medical Center", address: "901 45th St", city: "West Palm Beach", state: "FL", level: "Level I", latitude: 26.7486, longitude: -80.0647 },
  { name: "Ascension Sacred Heart Hospital", address: "5151 N 9th Ave", city: "Pensacola", state: "FL", level: "Level I", latitude: 30.4747, longitude: -87.2095 },
  { name: "Tallahassee Memorial HealthCare", address: "1300 Miccosukee Rd", city: "Tallahassee", state: "FL", level: "Level II", latitude: 30.4565, longitude: -84.2612 },
  { name: "Halifax Health Medical Center", address: "303 N Clyde Morris Blvd", city: "Daytona Beach", state: "FL", level: "Level II", latitude: 29.2108, longitude: -81.0226 },
  { name: "Lee Memorial Hospital", address: "2776 Cleveland Ave", city: "Fort Myers", state: "FL", level: "Level II", latitude: 26.611, longitude: -81.8775 },
  { name: "NCH Baker Hospital", address: "350 7th St N", city: "Naples", state: "FL", level: "Level II", latitude: 26.1506, longitude: -81.7948 },
  { name: "Holmes Regional Medical Center", address: "1350 S Hickory St", city: "Melbourne", state: "FL", level: "Level II", latitude: 28.0778, longitude: -80.6265 },
  { name: "Lawnwood Regional Medical Center", address: "1700 S 23rd St", city: "Fort Pierce", state: "FL", level: "Level II", latitude: 27.4365, longitude: -80.339 },
  { name: "HCA Florida Ocala Hospital", address: "1431 SW 1st Ave", city: "Ocala", state: "FL", level: "Level II", latitude: 29.1756, longitude: -82.1386 },
  { name: "Grady Memorial Hospital", address: "80 Jesse Hill Jr Dr SE", city: "Atlanta", state: "GA", level: "Level I", latitude: 33.752, longitude: -84.382 },
  { name: "Memorial Health University Medical Center", address: "4700 Waters Ave", city: "Savannah", state: "GA", level: "Level I", latitude: 32.0286, longitude: -81.0885 },
  { name: "University of Alabama at Birmingham Hospital", address: "1802 6th Ave S", city: "Birmingham", state: "AL", level: "Level I", latitude: 33.5058, longitude: -86.8037 },
  { name: "USA Health University Hospital", address: "2451 University Hospital Dr", city: "Mobile", state: "AL", level: "Level I", latitude: 30.7043, longitude: -88.082 },
  { name: "University Medical Center New Orleans", address: "2000 Canal St", city: "New Orleans", state: "LA", level: "Level I", latitude: 29.9586, longitude: -90.0774 },
  { name: "Memorial Hermann-Texas Medical Center", address: "6411 Fannin St", city: "Houston", state: "TX", level: "Level I", latitude: 29.7139, longitude: -95.396 },
  { name: "Parkland Memorial Hospital", address: "5200 Harry Hines Blvd", city: "Dallas", state: "TX", level: "Level I", latitude: 32.8106, longitude: -96.8375 },
  { name: "University Hospital", address: "4502 Medical Dr", city: "San Antonio", state: "TX", level: "Level I", latitude: 29.5068, longitude: -98.5788 },
  { name: "Dell Seton Medical Center", address: "1500 Red River St", city: "Austin", state: "TX", level: "Level I", latitude: 30.2765, longitude: -97.7336 },
  { name: "Vanderbilt University Medical Center", address: "1211 Medical Center Dr", city: "Nashville", state: "TN", level: "Level I", latitude: 36.142, longitude: -86.8017 },
  { name: "Regional One Health", address: "877 Jefferson Ave", city: "Memphis", state: "TN", level: "Level I", latitude: 35.1416, longitude: -90.0331 },
  { name: "Carolinas Medical Center", address: "1000 Blythe Blvd", city: "Charlotte", state: "NC", level: "Level I", latitude: 35.2036, longitude: -80.8392 },
  { name: "UNC Medical Center", address: "101 Manning Dr", city: "Chapel Hill", state: "NC", level: "Level I", latitude: 35.9045, longitude: -79.0496 },
  { name: "Wake Forest Baptist Medical Center", address: "1 Medical Center Blvd", city: "Winston-Salem", state: "NC", level: "Level I", latitude: 36.0902, longitude: -80.2665 },
  { name: "Medical University of South Carolina", address: "171 Ashley Ave", city: "Charleston", state: "SC", level: "Level I", latitude: 32.7844, longitude: -79.9478 },
  { name: "Prisma Health Richland Hospital", address: "5 Richland Medical Park Dr", city: "Columbia", state: "SC", level: "Level I", latitude: 34.0278, longitude: -80.9995 },
  { name: "VCU Medical Center", address: "1250 E Marshall St", city: "Richmond", state: "VA", level: "Level I", latitude: 37.5392, longitude: -77.4294 },
  { name: "Sentara Norfolk General Hospital", address: "600 Gresham Dr", city: "Norfolk", state: "VA", level: "Level I", latitude: 36.8615, longitude: -76.3035 },
  { name: "R Adams Cowley Shock Trauma Center", address: "22 S Greene St", city: "Baltimore", state: "MD", level: "Level I", latitude: 39.2881, longitude: -76.6236 },
  { name: "Christiana Hospital", address: "4755 Ogletown Stanton Rd", city: "Newark", state: "DE", level: "Level I", latitude: 39.6872, longitude: -75.6672 },
  { name: "Penn Presbyterian Medical Center", address: "51 N 39th St", city: "Philadelphia", state: "PA", level: "Level I", latitude: 39.9585, longitude: -75.1994 },
  { name: "UPMC Presbyterian", address: "200 Lothrop St", city: "Pittsburgh", state: "PA", level: "Level I", latitude: 40.4423, longitude: -79.9608 },
  { name: "Robert Wood Johnson University Hospital", address: "1 Robert Wood Johnson Pl", city: "New Brunswick", state: "NJ", level: "Level I", latitude: 40.4956, longitude: -74.4508 },
  { name: "Bellevue Hospital Center", address: "462 First Ave", city: "New York", state: "NY", level: "Level I", latitude: 40.7394, longitude: -73.9754 },
  { name: "Jamaica Hospital Medical Center", address: "8900 Van Wyck Expy", city: "Jamaica", state: "NY", level: "Level I", latitude: 40.7008, longitude: -73.8165 },
  { name: "Westchester Medical Center", address: "100 Woods Rd", city: "Valhalla", state: "NY", level: "Level I", latitude: 41.0865, longitude: -73.8056 },
  { name: "Massachusetts General Hospital", address: "55 Fruit St", city: "Boston", state: "MA", level: "Level I", latitude: 42.3626, longitude: -71.0686 },
  { name: "Rhode Island Hospital", address: "593 Eddy St", city: "Providence", state: "RI", level: "Level I", latitude: 41.8119, longitude: -71.4085 },
  { name: "Yale New Haven Hospital", address: "20 York St", city: "New Haven", state: "CT", level: "Level I", latitude: 41.3044, longitude: -72.9356 },
  { name: "Hartford Hospital", address: "80 Seymour St", city: "Hartford", state: "CT", level: "Level I", latitude: 41.7546, longitude: -72.6794 },
  { name: "Ohio State University Wexner Medical Center", address: "410 W 10th Ave", city: "Columbus", state: "OH", level: "Level I", latitude: 39.9954, longitude: -83.0184 },
  { name: "MetroHealth Medical Center", address: "2500 MetroHealth Dr", city: "Cleveland", state: "OH", level: "Level I", latitude: 41.4655, longitude: -81.6985 },
  { name: "University of Cincinnati Medical Center", address: "234 Goodman St", city: "Cincinnati", state: "OH", level: "Level I", latitude: 39.1378, longitude: -84.5038 },
  { name: "IU Health Methodist Hospital", address: "1701 N Senate Blvd", city: "Indianapolis", state: "IN", level: "Level I", latitude: 39.7906, longitude: -86.1635 },
  { name: "Spectrum Health Butterworth Hospital", address: "100 Michigan St NE", city: "Grand Rapids", state: "MI", level: "Level I", latitude: 42.9695, longitude: -85.6654 },
  { name: "Detroit Receiving Hospital", address: "4201 St Antoine St", city: "Detroit", state: "MI", level: "Level I", latitude: 42.3536, longitude: -83.0568 },
  { name: "University of Chicago Medical Center", address: "5841 S Maryland Ave", city: "Chicago", state: "IL", level: "Level I", latitude: 41.7893, longitude: -87.6047 },
  { name: "John H. Stroger, Jr. Hospital of Cook County", address: "1969 W Ogden Ave", city: "Chicago", state: "IL", level: "Level I", latitude: 41.8735, longitude: -87.675 },
  { name: "Northwestern Memorial Hospital", address: "251 E Huron St", city: "Chicago", state: "IL", level: "Level I", latitude: 41.8948, longitude: -87.6215 },
  { name: "Froedtert Hospital", address: "9200 W Wisconsin Ave", city: "Milwaukee", state: "WI", level: "Level I", latitude: 43.0416, longitude: -88.0225 },
  { name: "Hennepin County Medical Center", address: "701 Park Ave", city: "Minneapolis", state: "MN", level: "Level I", latitude: 44.9724, longitude: -93.262 },
  { name: "Barnes-Jewish Hospital", address: "1 Barnes Jewish Hospital Plaza", city: "St. Louis", state: "MO", level: "Level I", latitude: 38.6372, longitude: -90.2644 },
  { name: "University of Kansas Hospital", address: "4000 Cambridge St", city: "Kansas City", state: "KS", level: "Level I", latitude: 39.0558, longitude: -94.6086 },
  { name: "University of Iowa Hospitals & Clinics", address: "200 Hawkins Dr", city: "Iowa City", state: "IA", level: "Level I", latitude: 41.6595, longitude: -91.5485 },
  { name: "Nebraska Medicine", address: "4350 Dewey Ave", city: "Omaha", state: "NE", level: "Level I", latitude: 41.2556, longitude: -95.9755 },
  { name: "UCHealth University of Colorado Hospital", address: "12605 E 16th Ave", city: "Aurora", state: "CO", level: "Level I", latitude: 39.7428, longitude: -104.837 },
  { name: "Denver Health Medical Center", address: "777 Bannock St", city: "Denver", state: "CO", level: "Level I", latitude: 39.728, longitude: -104.9903 },
  { name: "University of Utah Hospital", address: "50 N Medical Dr", city: "Salt Lake City", state: "UT", level: "Level I", latitude: 40.7716, longitude: -111.8368 },
  { name: "Banner University Medical Center Tucson", address: "1625 N Campbell Ave", city: "Tucson", state: "AZ", level: "Level I", latitude: 32.2416, longitude: -110.9465 },
  { name: "Valleywise Health Medical Center", address: "2601 E Roosevelt St", city: "Phoenix", state: "AZ", level: "Level I", latitude: 33.4576, longitude: -112.0235 },
  { name: "University Medical Center of Southern Nevada", address: "1800 W Charleston Blvd", city: "Las Vegas", state: "NV", level: "Level I", latitude: 36.1594, longitude: -115.1658 },
  { name: "UC San Diego Medical Center Hillcrest", address: "200 W Arbor Dr", city: "San Diego", state: "CA", level: "Level I", latitude: 32.7546, longitude: -117.166 },
  { name: "LAC+USC Medical Center", address: "2051 Marengo St", city: "Los Angeles", state: "CA", level: "Level I", latitude: 34.0586, longitude: -118.2088 },
  { name: "Zuckerberg San Francisco General Hospital", address: "1001 Potrero Ave", city: "San Francisco", state: "CA", level: "Level I", latitude: 37.7556, longitude: -122.4048 },
  { name: "Harborview Medical Center", address: "325 9th Ave", city: "Seattle", state: "WA", level: "Level I", latitude: 47.6038, longitude: -122.3243 },
  { name: "OHSU Hospital", address: "3181 SW Sam Jackson Park Rd", city: "Portland", state: "OR", level: "Level I", latitude: 45.4992, longitude: -122.6856 },
  { name: "The Queen's Medical Center", address: "1301 Punchbowl St", city: "Honolulu", state: "HI", level: "Level I", latitude: 21.3074, longitude: -157.8555 },
  { name: "Ben Taub Hospital", address: "1504 Taub Loop", city: "Houston", state: "TX", level: "Level I", latitude: 29.7106, longitude: -95.3935 },
  { name: "UC Davis Medical Center", address: "2315 Stockton Blvd", city: "Sacramento", state: "CA", level: "Level I", latitude: 38.5545, longitude: -121.4554 },
];

export function haversineMiles(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export type NearestTraumaHospital = TraumaCenter & { distanceMiles: number };

export function nearestTraumaHospital(
  point: { latitude: number; longitude: number },
  maxMiles = 150,
): NearestTraumaHospital | null {
  let best: NearestTraumaHospital | null = null;
  for (const center of TRAUMA_CENTERS_LEVEL_II_PLUS) {
    const distanceMiles = haversineMiles(point, center);
    if (distanceMiles > maxMiles) continue;
    if (!best || distanceMiles < best.distanceMiles) best = { ...center, distanceMiles };
  }
  return best;
}

export function formatTraumaHospital(hospital: NearestTraumaHospital): string {
  const miles = hospital.distanceMiles < 10 ? hospital.distanceMiles.toFixed(1) : String(Math.round(hospital.distanceMiles));
  return `${hospital.name} (${hospital.level}) — ${hospital.address}, ${hospital.city}, ${hospital.state} · ${miles} mi`;
}
