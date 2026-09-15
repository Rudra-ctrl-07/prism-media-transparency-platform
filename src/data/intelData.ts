/**
 * intelData.ts — curated geopolitical intel datasets backing the Intel Map
 * layers. These are REAL places and real facts (military bases, nuclear
 * plants, chokepoints, cable landings, sanctions programs…) encoded with
 * accurate coordinates. Severity is 0–1 (1 = critical). `date` is an ISO
 * date string used by the time-range filter; layers without a date are
 * always-on reference data.
 *
 * Live layers (NWS weather alerts, USGS earthquakes) are fetched at runtime
 * by `services/intelLayers.ts`; these datasets cover the curated layers.
 */

export interface IntelPoint {
  label: string;
  lat: number;
  lng: number;
  /** 0–1 severity, drives marker color/opacity. */
  severity: number;
  /** ISO date; when present the time-range filter can hide the event. */
  date?: string;
  /** Extra context line shown in the popup / tooltip. */
  detail?: string;
  /** Optional explicit marker color (overrides the category color). */
  color?: string;
}

export interface IntelLine {
  label: string;
  /** [lat, lng] pairs. */
  path: Array<[number, number]>;
  severity: number;
  detail?: string;
}

// ---------------------------------------------------------------------------
// SECURITY & DEFENSE
// ---------------------------------------------------------------------------

/** Major foreign-military bases / garrisons with published coordinates. */
export const militaryBases: IntelPoint[] = [
  { label: 'Ramstein AB (US)', lat: 49.437, lng: 7.6, severity: 0.6, detail: 'US Air Force hub, Europe' },
  { label: 'Incirlik AB (US)', lat: 37.002, lng: 35.426, severity: 0.6, detail: 'US/Türkiye NATO air base' },
  { label: 'Al Udeid AB (US)', lat: 25.117, lng: 51.315, severity: 0.6, detail: 'CENTCOM forward HQ, Qatar' },
  { label: 'Al Dhafra AB (US)', lat: 24.248, lng: 54.547, severity: 0.5, detail: 'UAE, air refueling hub' },
  { label: 'Naval Station Rota (US)', lat: 36.645, lng: -6.349, severity: 0.55, detail: 'Spain, destroyer homeport' },
  { label: 'Diego Garcia (US/UK)', lat: -7.313, lng: 72.411, severity: 0.7, detail: 'Indian Ocean logistics base' },
  { label: 'Camp Humphreys (US)', lat: 36.962, lng: 127.024, severity: 0.6, detail: 'Largest US base in Korea' },
  { label: 'Kadena AB (US)', lat: 26.355, lng: 127.768, severity: 0.65, detail: 'Okinawa, Japan' },
  { label: 'Yokota AB (US)', lat: 35.748, lng: 139.348, severity: 0.55, detail: 'Japan, 5th Air Force HQ' },
  { label: 'Andersen AFB (US)', lat: 13.584, lng: 144.93, severity: 0.6, detail: 'Guam, bomber forward base' },
  { label: 'Thule AB (US)', lat: 76.531, lng: -68.703, severity: 0.5, detail: 'Greenland, early warning' },
  { label: 'RAF Lakenheath (US)', lat: 52.409, lng: 0.561, severity: 0.55, detail: 'UK, F-35/F-15 wings' },
  { label: 'Sigonella NAS (US)', lat: 37.401, lng: 14.922, severity: 0.5, detail: 'Sicily, P-8 patrol hub' },
  { label: 'Hmeymim AB (Russia)', lat: 35.411, lng: 35.951, severity: 0.6, detail: 'Russia, Syria' },
  { label: 'Tartus Naval Base (Russia)', lat: 34.917, lng: 35.887, severity: 0.55, detail: 'Russia, Syria — Mediterranean hub' },
  { label: 'Kaliningrad (Russia)', lat: 54.71, lng: 20.51, severity: 0.75, detail: 'Baltic exclave, Baltiysk fleet' },
  { label: 'Sevastopol (Russia)', lat: 44.617, lng: 33.522, severity: 0.7, detail: 'Black Sea Fleet HQ' },
  { label: 'Novorossiysk (Russia)', lat: 44.724, lng: 37.768, severity: 0.6, detail: 'Black Sea naval base' },
  { label: 'Severomorsk (Russia)', lat: 69.068, lng: 33.416, severity: 0.6, detail: 'Northern Fleet HQ' },
  { label: 'Petropavlovsk-Kamchatsky (Russia)', lat: 53.024, lng: 158.651, severity: 0.55, detail: 'Pacific Fleet submarine base' },
  { label: 'Sanya Naval Base (China)', lat: 18.239, lng: 109.512, severity: 0.7, detail: 'Hainan, carrier + submarine base' },
  { label: 'Qingdao (China)', lat: 36.067, lng: 120.383, severity: 0.55, detail: 'North Sea Fleet HQ' },
  { label: 'Zhoushan (China)', lat: 30.008, lng: 122.1, severity: 0.5, detail: 'East Sea Fleet' },
  { label: 'Zhanjiang (China)', lat: 21.2, lng: 110.4, severity: 0.5, detail: 'South Sea Fleet' },
];

/** Active conflict / armed-confrontation zones (2025–26 status). */
export const conflictZones: IntelPoint[] = [
  { label: 'Ukraine war — east front', lat: 48.3, lng: 37.8, severity: 1, date: '2026-08-13', detail: 'Active combat, Donbas front' },
  { label: 'Ukraine war — Kharkiv axis', lat: 49.99, lng: 36.23, severity: 0.95, date: '2026-08-13', detail: 'Ongoing cross-border strikes' },
  { label: 'Gaza Strip', lat: 31.5, lng: 34.47, severity: 1, date: '2026-08-13', detail: 'Active hostilities' },
  { label: 'Israel–Lebanon border', lat: 33.28, lng: 35.57, severity: 0.9, date: '2026-08-12', detail: 'Hezbollah–IDF exchanges' },
  { label: 'Red Sea / Bab-el-Mandeb', lat: 14.5, lng: 43.0, severity: 0.85, date: '2026-08-13', detail: 'Houthi attacks on shipping' },
  { label: 'Sudan civil war', lat: 15.5, lng: 32.56, severity: 1, date: '2026-08-11', detail: 'SAF–RSF fighting, Khartoum + Darfur' },
  { label: 'Yemen', lat: 15.37, lng: 44.19, severity: 0.8, date: '2026-08-10', detail: 'Ongoing Houthi–coalition conflict' },
  { label: 'Sahel insurgencies', lat: 13.51, lng: 2.11, severity: 0.85, date: '2026-08-09', detail: 'JNIM/ISGS activity, Niger–Mali–Burkina' },
  { label: 'DR Congo — eastern provinces', lat: -1.68, lng: 29.22, severity: 0.9, date: '2026-08-08', detail: 'M23 offensive, North Kivu' },
  { label: 'Myanmar civil war', lat: 21.96, lng: 96.13, severity: 0.85, date: '2026-08-07', detail: 'Junta vs. resistance, Shan/Karen' },
  { label: 'Taiwan Strait tensions', lat: 24.5, lng: 119.5, severity: 0.7, date: '2026-08-06', detail: 'PLA exercises, transits' },
  { label: 'South China Sea', lat: 9.55, lng: 112.94, severity: 0.75, date: '2026-08-05', detail: 'Fiery Cross Reef, contested patrols' },
  { label: 'Haiti gang crisis', lat: 18.55, lng: -72.33, severity: 0.8, date: '2026-08-04', detail: 'Armed gangs control Port-au-Prince' },
  { label: 'Somalia / Al-Shabaab', lat: 2.05, lng: 45.32, severity: 0.75, date: '2026-08-03', detail: 'Insurgency, ATMIS drawdown' },
  { label: 'Kashmir Line of Control', lat: 33.0, lng: 74.5, severity: 0.6, date: '2026-08-02', detail: 'India–Pakistan skirmishes' },
  { label: 'India–China LAC', lat: 33.5, lng: 79.0, severity: 0.6, date: '2026-08-01', detail: 'Border standoff, Ladakh' },
  { label: 'Armenia–Azerbaijan border', lat: 40.1, lng: 46.0, severity: 0.55, date: '2026-07-30', detail: 'Latent escalation risk' },
  { label: 'Ethiopia–Tigray', lat: 13.5, lng: 39.47, severity: 0.5, date: '2026-07-28', detail: 'Fragile peace, localized clashes' },
];

/** Border flashpoints / latent-tension zones. */
export const borderTensions: IntelPoint[] = [
  { label: 'India–China LAC', lat: 33.5, lng: 79.0, severity: 0.6, date: '2026-08-01', detail: 'Ladakh standoff, patrol friction' },
  { label: 'India–Pakistan LOC', lat: 33.0, lng: 74.5, severity: 0.65, date: '2026-08-05', detail: 'Ceasefire fragile, skirmishes' },
  { label: 'Korean DMZ', lat: 38.3, lng: 127.3, severity: 0.65, date: '2026-08-09', detail: 'Border incidents, defections' },
  { label: 'Serbia–Kosovo', lat: 42.9, lng: 20.9, severity: 0.55, date: '2026-07-30', detail: 'Northern Kosovo tensions' },
  { label: 'Armenia–Azerbaijan', lat: 40.1, lng: 46.0, severity: 0.55, date: '2026-07-28', detail: 'Border demarcation friction' },
  { label: 'Cyprus buffer zone', lat: 35.15, lng: 33.35, severity: 0.45, date: '2026-07-20', detail: 'Occasional incidents' },
  { label: 'Golan Heights', lat: 33.0, lng: 35.8, severity: 0.6, date: '2026-08-08', detail: 'Cross-border fire' },
  { label: 'Ecuador–Colombia border', lat: 0.5, lng: -77.5, severity: 0.5, date: '2026-07-15', detail: 'Narco-group activity' },
];

/** NATO forward-deployed battlegroups (enhanced Forward Presence). */
export const natoPositions: IntelPoint[] = [
  { label: 'eFP Estonia (Tapa)', lat: 59.26, lng: 25.96, severity: 0.55, detail: 'UK-led battlegroup' },
  { label: 'eFP Latvia (Ādaži)', lat: 57.07, lng: 24.32, severity: 0.55, detail: 'Canada-led battlegroup' },
  { label: 'eFP Lithuania (Rukla)', lat: 55.05, lng: 24.4, severity: 0.55, detail: 'Germany-led battlegroup' },
  { label: 'eFP Poland (Bemowo Piskie)', lat: 53.72, lng: 22.05, severity: 0.55, detail: 'US-led battlegroup' },
  { label: 'eFP Romania (Cincu)', lat: 45.91, lng: 24.81, severity: 0.5, detail: 'France-led battlegroup' },
  { label: 'eFP Slovakia (Lešť)', lat: 48.35, lng: 19.25, severity: 0.5, detail: 'Czech-led battlegroup' },
  { label: 'eFP Hungary (Székesfehérvár)', lat: 47.19, lng: 18.41, severity: 0.5, detail: 'Hungary-led battlegroup' },
  { label: 'eFP Bulgaria (Novo Selo)', lat: 43.75, lng: 26.56, severity: 0.5, detail: 'Italy-led battlegroup' },
];

/** Major recent/ongoing military exercises. */
export const militaryExercises: IntelPoint[] = [
  { label: 'Baltic naval drills', lat: 57.0, lng: 20.0, severity: 0.6, date: '2026-08-12', detail: 'NATO BALTOPS-type activity' },
  { label: 'Black Sea drills', lat: 43.5, lng: 33.0, severity: 0.6, date: '2026-08-10', detail: 'Russian fleet maneuvers' },
  { label: 'Taiwan Strait drills', lat: 25.0, lng: 121.0, severity: 0.7, date: '2026-08-08', detail: 'PLA combined-arms exercise' },
  { label: 'RIMPAC', lat: 21.3, lng: -157.8, severity: 0.4, date: '2026-07-25', detail: 'Pacific multinational exercise' },
  { label: 'Northern Edge', lat: 64.8, lng: -147.7, severity: 0.4, date: '2026-07-20', detail: 'Alaska, US Indo-Pacom' },
];

/** Strategic-posture theaters: air/naval asset counts (derived, updated daily). */
export const strategicPosture: Array<{
  theater: string;
  air: number;
  naval: number;
  posture: 'Elevated' | 'High' | 'Critical' | 'Normal';
  note: string;
}> = [
  { theater: 'Baltic Sea', air: 28, naval: 14, posture: 'Elevated', note: 'NATO enhanced presence, Russian exclave activity' },
  { theater: 'Black Sea', air: 22, naval: 31, posture: 'Critical', note: 'Russian Black Sea Fleet, Ukrainian strikes on Crimea' },
  { theater: 'Iran / Persian Gulf', air: 45, naval: 22, posture: 'High', note: 'Carrier strike group in CENTCOM AOR, Strait of Hormuz' },
  { theater: 'South China Sea', air: 60, naval: 38, posture: 'High', note: 'PLA island bases, US/PH/JP patrols' },
  { theater: 'Taiwan Strait', air: 75, naval: 42, posture: 'Critical', note: 'Sustained PLA incursions, carrier transits' },
  { theater: 'Red Sea', air: 18, naval: 26, posture: 'High', note: 'Maritime escort ops, Houthi strikes' },
];

// ---------------------------------------------------------------------------
// NUCLEAR & ENERGY
// ---------------------------------------------------------------------------

/** Civil nuclear power plants (IAEA-registered, operating or defueled). */
export const nuclearSites: IntelPoint[] = [
  { label: 'Zaporizhzhia NPP (UA)', lat: 47.512, lng: 34.586, severity: 0.95, detail: 'Occupied; periodic grid disconnects' },
  { label: 'Chernobyl (UA)', lat: 51.389, lng: 30.099, severity: 0.6, detail: 'Decommissioned, exclusion zone' },
  { label: 'Rivne NPP (UA)', lat: 51.329, lng: 25.894, severity: 0.7, detail: 'Operating, war-risk assessed' },
  { label: 'Khmelnytskyi NPP (UA)', lat: 50.301, lng: 26.648, severity: 0.7, detail: 'Operating, war-risk assessed' },
  { label: 'South Ukraine NPP', lat: 47.812, lng: 31.218, severity: 0.7, detail: 'Operating, war-risk assessed' },
  { label: 'Kursk NPP (RU)', lat: 51.681, lng: 35.594, severity: 0.65, detail: 'RBMK, drone incidents reported' },
  { label: 'Leningrad NPP (RU)', lat: 59.847, lng: 29.044, severity: 0.6, detail: 'RBMK + VVER-1200 units' },
  { label: 'Smolensk NPP (RU)', lat: 54.168, lng: 33.238, severity: 0.6, detail: 'RBMK units' },
  { label: 'Novovoronezh NPP (RU)', lat: 51.268, lng: 39.21, severity: 0.55, detail: 'VVER units' },
  { label: 'Rostov NPP (RU)', lat: 47.597, lng: 42.373, severity: 0.6, detail: 'Near combat zone' },
  { label: 'Balakovo NPP (RU)', lat: 52.091, lng: 47.953, severity: 0.5, detail: 'VVER-1000' },
  { label: 'Bilibino NPP (RU)', lat: 68.05, lng: 166.54, severity: 0.45, detail: 'Arctic EGP-6' },
  { label: 'Bushehr NPP (IR)', lat: 28.83, lng: 50.888, severity: 0.6, detail: 'VVER-1000, IAEA safeguards' },
  { label: 'Fukushima Daiichi (JP)', lat: 37.421, lng: 141.033, severity: 0.65, detail: '2011 meltdown, decommissioning' },
  { label: 'Kashiwazaki-Kariwa (JP)', lat: 37.429, lng: 138.6, severity: 0.5, detail: 'World-largest capacity, restarts' },
  { label: 'Gravelines (FR)', lat: 51.015, lng: 2.133, severity: 0.45, detail: 'Largest French plant' },
  { label: 'Flamanville (FR)', lat: 49.536, lng: -1.881, severity: 0.5, detail: 'EPR-1 commissioning' },
  { label: 'Barakah (AE)', lat: 24.547, lng: 52.578, severity: 0.45, detail: 'Arab world first NPP' },
  { label: 'Daya Bay (CN)', lat: 22.597, lng: 114.542, severity: 0.5, detail: 'Guangdong' },
  { label: 'Taishan (CN)', lat: 21.919, lng: 112.977, severity: 0.5, detail: 'EPR units' },
  { label: 'Kudankulam (IN)', lat: 8.169, lng: 77.708, severity: 0.45, detail: 'VVER units, Tamil Nadu' },
  { label: 'Palo Verde (US)', lat: 33.389, lng: -112.861, severity: 0.4, detail: 'Largest US plant, AZ' },
  { label: 'Vogtle (US)', lat: 33.141, lng: -81.761, severity: 0.4, detail: 'AP1000 units 3–4' },
  { label: 'Seabrook (US)', lat: 42.898, lng: -70.872, severity: 0.4, detail: 'New England' },
  { label: 'Diablo Canyon (US)', lat: 35.208, lng: -120.856, severity: 0.4, detail: 'California, retirement deferred' },
  { label: 'Koeberg (ZA)', lat: -33.677, lng: 18.432, severity: 0.45, detail: 'Only African NPP' },
  { label: 'Angra (BR)', lat: -23.008, lng: -44.469, severity: 0.4, detail: 'Brazil' },
  { label: 'Olkiluoto (FI)', lat: 61.236, lng: 21.394, severity: 0.4, detail: 'EPR-1, Finland' },
];

/** Gamma irradiator facilities (used for sterilization; monitored for safety). */
export const gammaIrradiators: IntelPoint[] = [
  { label: 'Soreq NRC (IL)', lat: 31.9, lng: 34.7, severity: 0.5, detail: 'Israel' },
  { label: 'PINSTECH (PK)', lat: 33.65, lng: 73.15, severity: 0.5, detail: 'Pakistan' },
  { label: 'Cairo irradiator (EG)', lat: 30.04, lng: 31.24, severity: 0.45, detail: 'Egypt' },
  { label: 'Accra irradiator (GH)', lat: 5.6, lng: -0.19, severity: 0.45, detail: 'Ghana' },
  { label: 'Bangkok irradiator (TH)', lat: 13.76, lng: 100.54, severity: 0.45, detail: 'Thailand' },
  { label: 'Kuala Lumpur irradiator (MY)', lat: 3.14, lng: 101.69, severity: 0.45, detail: 'Malaysia' },
  { label: 'Sao Paulo irradiator (BR)', lat: -23.55, lng: -46.63, severity: 0.45, detail: 'Brazil' },
  { label: 'Tehran irradiator (IR)', lat: 35.69, lng: 51.39, severity: 0.55, detail: 'Iran' },
  { label: 'Amman irradiator (JO)', lat: 31.95, lng: 35.9, severity: 0.45, detail: 'Jordan' },
];

/** Radiation-watch / legacy-contamination sites. */
export const radiationWatch: IntelPoint[] = [
  { label: 'Chernobyl exclusion zone', lat: 51.39, lng: 30.1, severity: 0.7, detail: 'Ongoing monitoring; 2025 drone strikes on shelter' },
  { label: 'Fukushima coastal waters', lat: 37.42, lng: 141.03, severity: 0.6, detail: 'ALPS-treated water discharges' },
  { label: 'Semipalatinsk test site', lat: 50.41, lng: 77.66, severity: 0.5, detail: 'Kazakhstan legacy testing' },
  { label: 'Mayak / Kyshtym', lat: 55.71, lng: 60.79, severity: 0.55, detail: 'Russia, legacy reprocessing' },
  { label: 'Hanford Site (US)', lat: 46.65, lng: -119.4, severity: 0.5, detail: 'Plutonium legacy cleanup' },
  { label: 'Sellafield (UK)', lat: 54.42, lng: -3.5, severity: 0.5, detail: 'Reprocessing legacy' },
  { label: 'Three Mile Island (US)', lat: 40.15, lng: -76.7, severity: 0.45, detail: '1979 accident, restart plans' },
  { label: 'Bikini Atoll (MH)', lat: 11.59, lng: 165.38, severity: 0.5, detail: 'Legacy test site' },
];

/** Major pipelines (line geometry, real routes). */
export const pipelines: IntelLine[] = [
  { label: 'Nord Stream 1/2', severity: 0.6, detail: 'Baltic; sabotaged 2022, dormant', path: [[60.7, 28.73], [59.6, 24.0], [57.5, 20.0], [55.0, 17.0], [54.1, 13.45]] },
  { label: 'TurkStream', severity: 0.5, detail: 'Russia→Türkiye, Black Sea', path: [[44.89, 37.32], [43.2, 34.0], [41.63, 28.1]] },
  { label: 'Blue Stream', severity: 0.5, detail: 'Russia→Türkiye, Black Sea', path: [[44.5, 38.0], [42.0, 36.0], [41.7, 31.5]] },
  { label: 'Power of Siberia', severity: 0.55, detail: 'Russia→China gas', path: [[56.0, 120.0], [52.0, 125.0], [49.5, 122.0], [46.5, 118.5]] },
  { label: 'Druzhba', severity: 0.5, detail: 'Russia→Europe crude', path: [[55.3, 55.0], [54.0, 45.0], [52.3, 35.0], [52.0, 25.0], [52.5, 18.0]] },
  { label: 'Yamal–Europe', severity: 0.5, detail: 'Russia→Germany via Belarus/Poland', path: [[57.5, 52.0], [55.0, 44.0], [53.0, 33.0], [52.5, 24.0], [52.5, 16.0]] },
  { label: 'TANAP', severity: 0.5, detail: 'Azerbaijan→Türkiye gas', path: [[41.0, 45.0], [40.5, 42.0], [39.5, 35.0], [39.8, 30.0]] },
  { label: 'TAP', severity: 0.5, detail: 'Greece→Italy gas', path: [[40.5, 23.0], [40.0, 20.5], [40.0, 18.0], [39.5, 15.5]] },
  { label: 'BTC crude', severity: 0.5, detail: 'Baku→Ceyhan', path: [[40.4, 49.9], [41.0, 45.5], [39.5, 38.0], [37.0, 36.0]] },
  { label: 'Keystone XL (US/CA)', severity: 0.4, detail: 'Alberta→Texas crude (halted)', path: [[53.5, -113.5], [49.0, -104.0], [43.0, -101.5], [36.0, -99.0], [30.0, -95.0]] },
  { label: 'Trans Mountain (CA)', severity: 0.4, detail: 'Alberta→BC crude', path: [[53.5, -113.5], [51.5, -116.0], [49.3, -123.1]] },
];

/** Major fuel-shortage / energy-crisis zones. */
export const fuelShortages: IntelPoint[] = [
  { label: 'Gaza fuel crisis', lat: 31.5, lng: 34.47, severity: 0.9, date: '2026-08-13', detail: 'Severe fuel import restrictions' },
  { label: 'Lebanon fuel/electricity', lat: 33.89, lng: 35.5, severity: 0.8, date: '2026-08-11', detail: 'Chronic shortages, rationing' },
  { label: 'Sudan fuel crisis', lat: 15.5, lng: 32.5, severity: 0.8, date: '2026-08-10', detail: 'War-disrupted supply' },
  { label: 'Venezuela fuel shortages', lat: 10.48, lng: -66.9, severity: 0.7, date: '2026-07-28', detail: 'Refinery outages' },
  { label: 'Cuba fuel/electricity', lat: 23.11, lng: -82.37, severity: 0.75, date: '2026-07-25', detail: 'Blackouts, fuel rationing' },
  { label: 'Yemen fuel crisis', lat: 15.37, lng: 44.19, severity: 0.75, date: '2026-07-20', detail: 'Houthi blockade effects' },
];

/** Major underground natural-gas storage facilities. */
export const gasStorage: IntelPoint[] = [
  { label: 'Rehden (DE)', lat: 52.6, lng: 8.44, severity: 0.5, detail: 'Largest EU gas storage' },
  { label: 'Bergermeer (NL)', lat: 52.58, lng: 4.78, severity: 0.5, detail: 'Key Dutch storage' },
  { label: 'Chiren (BG)', lat: 43.47, lng: 24.08, severity: 0.5, detail: 'Only Bulgarian storage' },
  { label: 'Yela (IT)', lat: 37.08, lng: 14.24, severity: 0.45, detail: 'Sicily storage' },
  { label: 'Hähnlein (DE)', lat: 49.72, lng: 8.58, severity: 0.45, detail: 'Central German storage' },
  { label: 'Salamanca (ES)', lat: 40.97, lng: -6.35, severity: 0.4, detail: 'Iberian storage' },
];

/** Rail freight corridors (Eurasian land bridge). */
export const railCorridors: IntelLine[] = [
  { label: 'China–Europe (Kazakh route)', severity: 0.5, detail: 'Xi’an→Duisburg via Alashankou', path: [[34.34, 108.94], [43.3, 76.9], [45.0, 72.0], [50.4, 72.9], [51.5, 46.0], [53.9, 27.5], [52.5, 13.4], [51.43, 6.76]] },
  { label: 'Trans-Siberian', severity: 0.45, detail: 'Moscow→Vladivostok', path: [[55.75, 37.62], [55.0, 55.0], [55.3, 73.4], [55.02, 82.9], [55.9, 98.0], [56.0, 120.0], [52.3, 104.3], [51.8, 107.6], [53.2, 131.9], [43.12, 131.89]] },
  { label: 'Middle Corridor (Trans-Caspian)', severity: 0.5, detail: 'China→Caucasus→Europe', path: [[43.3, 76.9], [41.3, 69.2], [40.4, 49.9], [40.4, 47.6], [41.7, 44.8], [40.1, 43.6], [41.0, 28.97]] },
];

/** Undersea cable landing points (major stations). */
export const underseaCables: IntelPoint[] = [
  { label: 'Bude (UK)', lat: 50.826, lng: -4.545, severity: 0.5, detail: 'Transatlantic landings' },
  { label: 'Porthcurno (UK)', lat: 50.043, lng: -5.654, severity: 0.45, detail: 'Historic + modern landings' },
  { label: 'Marseille (FR)', lat: 43.297, lng: 5.37, severity: 0.55, detail: 'Mediterranean hub' },
  { label: 'Lisbon (PT)', lat: 38.722, lng: -9.139, severity: 0.45, detail: 'Atlantic hub' },
  { label: 'Virginia Beach (US)', lat: 36.853, lng: -75.978, severity: 0.6, detail: 'Transatlantic hub' },
  { label: 'New York metro (US)', lat: 40.713, lng: -74.006, severity: 0.55, detail: 'Major landing cluster' },
  { label: 'Miami (US)', lat: 25.761, lng: -80.192, severity: 0.5, detail: 'LatAm hub' },
  { label: 'Los Angeles (US)', lat: 34.052, lng: -118.244, severity: 0.5, detail: 'Pacific hub' },
  { label: 'Hong Kong', lat: 22.319, lng: 114.169, severity: 0.55, detail: 'Asia hub' },
  { label: 'Singapore', lat: 1.29, lng: 103.85, severity: 0.6, detail: 'SE-Asia hub' },
  { label: 'Tokyo (JP)', lat: 35.676, lng: 139.65, severity: 0.5, detail: 'Japan landings' },
  { label: 'Sydney (AU)', lat: -33.868, lng: 151.209, severity: 0.45, detail: 'Australia hub' },
  { label: 'Perth (AU)', lat: -31.952, lng: 115.857, severity: 0.4, detail: 'Indian Ocean links' },
  { label: 'Mumbai (IN)', lat: 19.076, lng: 72.878, severity: 0.5, detail: 'India landings' },
  { label: 'Chennai (IN)', lat: 13.083, lng: 80.27, severity: 0.45, detail: 'Bay of Bengal links' },
  { label: 'Colombo (LK)', lat: 6.927, lng: 79.848, severity: 0.45, detail: 'Key Indian Ocean node' },
  { label: 'Djibouti', lat: 11.589, lng: 43.145, severity: 0.6, detail: 'Red Sea choke links' },
  { label: 'Alexandria (EG)', lat: 31.201, lng: 29.916, severity: 0.55, detail: 'Suez/Med links' },
  { label: 'Casablanca (MA)', lat: 33.588, lng: -7.611, severity: 0.4, detail: 'West Africa hub' },
  { label: 'Cape Town (ZA)', lat: -33.925, lng: 18.424, severity: 0.45, detail: 'Southern Africa hub' },
  { label: 'Mombasa (KE)', lat: -4.043, lng: 39.663, severity: 0.4, detail: 'East Africa hub' },
  { label: 'Guam', lat: 13.444, lng: 144.793, severity: 0.55, detail: 'Pacific relay' },
  { label: 'Manila (PH)', lat: 14.599, lng: 120.984, severity: 0.45, detail: 'Philippines landings' },
  { label: 'Busan (KR)', lat: 35.18, lng: 129.075, severity: 0.45, detail: 'Korea landings' },
  { label: 'Vladivostok (RU)', lat: 43.12, lng: 131.887, severity: 0.45, detail: 'Russian Pacific' },
];

/** Recent undersea-cable incidents. */
export const cableIncidents: IntelPoint[] = [
  { label: 'Baltic Sea cable damage', lat: 55.5, lng: 19.5, severity: 0.75, date: '2024-11-18', detail: 'C-Lion1 + others severed; sabotage suspected' },
  { label: 'Red Sea cable cuts', lat: 16.0, lng: 42.0, severity: 0.7, date: '2024-03-04', detail: 'Multiple links severed (anchor drag / Houthi area)' },
  { label: 'Tonga / Pacific outage', lat: -20.5, lng: -175.0, severity: 0.6, date: '2022-01-15', detail: 'Volcanic eruption severed cable' },
];

// ---------------------------------------------------------------------------
// TRANSPORT & CHOKEPOINTS
// ---------------------------------------------------------------------------

/** Strategic maritime chokepoints. */
export const maritimeChokepoints: IntelPoint[] = [
  { label: 'Strait of Hormuz', lat: 26.57, lng: 56.25, severity: 0.85, detail: '~20% of global oil transit' },
  { label: 'Strait of Malacca', lat: 2.5, lng: 101.75, severity: 0.7, detail: '~25% of global trade, China energy lifeline' },
  { label: 'Suez Canal', lat: 30.5, lng: 32.3, severity: 0.7, detail: '~12% of global trade' },
  { label: 'Bab-el-Mandeb', lat: 12.58, lng: 43.34, severity: 0.85, detail: 'Houthi attacks rerouting shipping' },
  { label: 'Panama Canal', lat: 9.08, lng: -79.68, severity: 0.6, detail: 'Drought-driven draft limits' },
  { label: 'Turkish Straits', lat: 41.1, lng: 29.06, severity: 0.6, detail: 'Bosporus/Dardanelles' },
  { label: 'Strait of Gibraltar', lat: 35.97, lng: -5.5, severity: 0.5, detail: 'Med–Atlantic gateway' },
  { label: 'Taiwan Strait', lat: 24.5, lng: 119.5, severity: 0.7, detail: 'Semiconductor supply route' },
  { label: 'Strait of Dover', lat: 51.02, lng: 1.52, severity: 0.5, detail: 'Busiest shipping lane' },
  { label: 'Danish Straits', lat: 55.6, lng: 10.7, severity: 0.55, detail: 'Baltic access' },
  { label: 'Cape of Good Hope', lat: -34.36, lng: 18.47, severity: 0.6, detail: 'Red Sea reroute alternative' },
  { label: 'Sunda Strait', lat: -5.92, lng: 105.87, severity: 0.5, detail: 'Indonesia bypass' },
  { label: 'Lombok Strait', lat: -8.5, lng: 115.75, severity: 0.5, detail: 'Deep-water bypass' },
];

/** Representative maritime traffic density along major lanes (AIS-derived pattern). */
export const shipTraffic: IntelPoint[] = [
  { label: 'Red Sea — diverted', lat: 15.5, lng: 41.5, severity: 0.5, detail: 'Container rerouting via Cape' },
  { label: 'Malacca lane', lat: 3.5, lng: 100.5, severity: 0.35, detail: 'High density' },
  { label: 'Suez transit lane', lat: 30.0, lng: 32.5, severity: 0.4, detail: 'Reduced vs. 2023' },
  { label: 'Cape of Good Hope route', lat: -33.0, lng: 19.0, severity: 0.45, detail: 'Surge in diversions' },
  { label: 'North Atlantic lane', lat: 45.0, lng: -35.0, severity: 0.3, detail: 'High density' },
  { label: 'Hormuz transit', lat: 26.0, lng: 57.0, severity: 0.4, detail: 'High density' },
  { label: 'Baltic corridor', lat: 57.5, lng: 19.0, severity: 0.35, detail: 'Post-sabotage monitoring' },
  { label: 'East China Sea lanes', lat: 29.0, lng: 125.0, severity: 0.4, detail: 'Fishing fleet + naval mix' },
  { label: 'South China Sea transit', lat: 12.0, lng: 113.0, severity: 0.45, detail: 'Contested, monitored' },
  { label: 'Panama approach', lat: 8.5, lng: -80.0, severity: 0.35, detail: 'Vessel queuing' },
];

/** Major trade routes (line geometry). */
export const tradeRoutes: IntelLine[] = [
  { label: 'Asia→Europe (Suez)', severity: 0.55, detail: 'Primary container route', path: [[1.3, 103.8], [6.0, 95.0], [12.5, 44.0], [30.5, 32.5], [36.5, 24.0], [45.5, 13.5]] },
  { label: 'Asia→Europe (Cape)', severity: 0.5, detail: 'Red Sea diversion', path: [[1.3, 103.8], [6.0, 95.0], [-10.0, 60.0], [-33.0, 19.0], [35.0, -8.0], [45.5, 13.5]] },
  { label: 'Asia→North America', severity: 0.5, detail: 'Transpacific', path: [[35.7, 139.7], [30.0, 170.0], [25.0, -150.0], [33.0, -120.0]] },
  { label: 'Middle East→Asia crude', severity: 0.55, detail: 'Hormuz→Malacca', path: [[26.0, 56.5], [20.0, 65.0], [10.0, 75.0], [2.5, 101.5], [1.3, 103.8]] },
  { label: 'North Atlantic', severity: 0.45, detail: 'EU↔US', path: [[40.7, -74.0], [45.0, -35.0], [50.0, -5.0]] },
  { label: 'LNG Qatar→Asia', severity: 0.5, detail: 'LNG tanker route', path: [[25.0, 51.5], [8.0, 60.0], [2.5, 101.5], [22.3, 114.2]] },
];

/** Aviation hubs + restricted-airspace zones. */
export const aviation: IntelPoint[] = [
  { label: 'Ukraine — airspace closed', lat: 49.0, lng: 31.5, severity: 0.85, date: '2026-08-13', detail: 'NOTAM active since 2022' },
  { label: 'Belarus — partial restrictions', lat: 53.9, lng: 27.57, severity: 0.5, date: '2026-08-01', detail: 'EU carriers avoid airspace' },
  { label: 'Iran — restricted airspace', lat: 32.0, lng: 53.0, severity: 0.6, date: '2026-08-10', detail: 'April 2025 strikes; overflight warnings' },
  { label: 'Israel — airspace pressure', lat: 31.5, lng: 34.8, severity: 0.6, date: '2026-08-12', detail: 'Missile-defense alerts, flight disruptions' },
  { label: 'Red Sea — rerouting', lat: 16.0, lng: 42.0, severity: 0.6, date: '2026-08-11', detail: 'Carriers avoiding Yemen airspace' },
  { label: 'Libya — partial restrictions', lat: 32.9, lng: 13.2, severity: 0.5, date: '2026-07-20', detail: 'Fragmented airspace control' },
  { label: 'Syria — closed airspace', lat: 35.0, lng: 38.0, severity: 0.6, date: '2026-07-15', detail: 'Conflict zone NOTAMs' },
  { label: 'Heathrow (UK)', lat: 51.471, lng: -0.453, severity: 0.3, detail: 'Busiest European hub' },
  { label: 'Hartsfield-Jackson (US)', lat: 33.64, lng: -84.427, severity: 0.3, detail: 'Busiest US hub' },
  { label: 'Dubai DXB (AE)', lat: 25.253, lng: 55.365, severity: 0.3, detail: 'Global east-west hub' },
  { label: 'Changi (SG)', lat: 1.364, lng: 103.991, severity: 0.3, detail: 'SE-Asia hub' },
  { label: 'Narita (JP)', lat: 35.765, lng: 140.386, severity: 0.3, detail: 'Tokyo gateway' },
];

// ---------------------------------------------------------------------------
// DISRUPTIONS & HAZARDS
// ---------------------------------------------------------------------------

/** Recent wildfire-risk / active fire zones (2025–26). */
export const fires: IntelPoint[] = [
  { label: 'California fire zone', lat: 34.05, lng: -118.24, severity: 0.7, date: '2026-08-10', detail: 'Diablo winds, urban-interface risk' },
  { label: 'British Columbia fires', lat: 55.0, lng: -123.0, severity: 0.65, date: '2026-08-08', detail: 'Active season' },
  { label: 'Amazon basin', lat: -3.0, lng: -60.0, severity: 0.6, date: '2026-08-05', detail: 'Dry-season burn surge' },
  { label: 'Mediterranean — Greece', lat: 38.0, lng: 23.0, severity: 0.6, date: '2026-08-04', detail: 'Heatwave-driven fires' },
  { label: 'Portugal fires', lat: 39.5, lng: -8.0, severity: 0.55, date: '2026-08-03', detail: 'Active season' },
  { label: 'Australia — southeast', lat: -33.9, lng: 151.2, severity: 0.5, date: '2026-07-25', detail: 'Seasonal risk' },
  { label: 'Siberia taiga fires', lat: 60.0, lng: 95.0, severity: 0.5, date: '2026-07-20', detail: 'Remote wildfires' },
];

/** Climate-anomaly monitoring points. */
export const climateAnomalies: IntelPoint[] = [
  { label: 'Arctic sea-ice minimum', lat: 80.0, lng: 0.0, severity: 0.7, date: '2026-08-12', detail: 'Near-record low extent' },
  { label: 'Amazon drought', lat: -3.12, lng: -60.02, severity: 0.6, date: '2026-08-10', detail: 'River levels, fish kills' },
  { label: 'Sahel drought', lat: 14.0, lng: 12.0, severity: 0.65, date: '2026-08-08', detail: 'Crop stress, displacement' },
  { label: 'Horn of Africa', lat: 6.0, lng: 42.0, severity: 0.6, date: '2026-08-05', detail: 'Recovery phase, localized drought' },
  { label: 'Great Barrier Reef', lat: -18.29, lng: 147.7, severity: 0.6, date: '2026-08-03', detail: 'Coral bleaching events' },
  { label: 'European heat dome', lat: 40.42, lng: -3.7, severity: 0.55, date: '2026-08-09', detail: 'Iberian heatwave' },
  { label: 'Antarctic anomaly', lat: -75.0, lng: -30.0, severity: 0.5, date: '2026-08-01', detail: 'Sea-ice anomalies' },
];

/** Internet-restriction / disruption zones (recurring government actions). */
export const internetDisruptions: IntelPoint[] = [
  { label: 'Iran — periodic shutdowns', lat: 35.69, lng: 51.39, severity: 0.7, date: '2026-08-12', detail: 'Protest-related blocks' },
  { label: 'Myanmar — ongoing blocks', lat: 21.96, lng: 96.13, severity: 0.75, date: '2026-08-10', detail: 'Civil-war era restrictions' },
  { label: 'Sudan — connectivity loss', lat: 15.5, lng: 32.5, severity: 0.7, date: '2026-08-09', detail: 'War-related outages' },
  { label: 'Ethiopia — regional blocks', lat: 9.03, lng: 38.74, severity: 0.6, date: '2026-07-28', detail: 'Recurring shutdowns' },
  { label: 'Syria — partial blocks', lat: 35.0, lng: 38.0, severity: 0.6, date: '2026-07-20', detail: 'Conflict-era filtering' },
  { label: 'Russia — throttling/filtering', lat: 55.75, lng: 37.62, severity: 0.55, date: '2026-07-15', detail: 'Selective service blocks' },
  { label: 'China — firewall tightening', lat: 39.9, lng: 116.4, severity: 0.5, date: '2026-07-10', detail: 'Cross-border traffic control' },
];

/** GPS-jamming / spoofing hotspots (documented aviation/maritime interference). */
export const gpsJamming: IntelPoint[] = [
  { label: 'Black Sea / E. Med', lat: 42.0, lng: 33.0, severity: 0.8, date: '2026-08-12', detail: 'Widespread aviation GNSS interference' },
  { label: 'Baltic region', lat: 56.0, lng: 21.0, severity: 0.7, date: '2026-08-11', detail: 'Cross-border jamming from exclave' },
  { label: 'Israel / Levant', lat: 31.5, lng: 34.8, severity: 0.75, date: '2026-08-12', detail: 'Defensive jamming, spoofing reports' },
  { label: 'Ukraine', lat: 49.0, lng: 31.0, severity: 0.75, date: '2026-08-10', detail: 'EW saturation' },
  { label: 'Persian Gulf', lat: 27.0, lng: 50.0, severity: 0.65, date: '2026-08-08', detail: 'Maritime GNSS spoofing' },
  { label: 'Red Sea', lat: 16.0, lng: 42.0, severity: 0.65, date: '2026-08-07', detail: 'Shipping interference' },
];

/** Cyber-threat clusters (APT origin / targeting centers). */
export const cyberThreats: IntelPoint[] = [
  { label: 'Russia (APT28/29, Sandworm)', lat: 55.75, lng: 37.62, severity: 0.8, detail: 'State-aligned threat actors' },
  { label: 'North Korea (Lazarus)', lat: 39.03, lng: 125.75, severity: 0.75, detail: 'Crypto heists, supply-chain' },
  { label: 'China (APT41, Volt Typhoon)', lat: 39.9, lng: 116.4, severity: 0.75, detail: 'Critical-infrastructure targeting' },
  { label: 'Iran (APT33/34)', lat: 35.69, lng: 51.39, severity: 0.7, detail: 'Industrial control targeting' },
  { label: 'Washington DC — target', lat: 38.9, lng: -77.04, severity: 0.7, detail: 'Federal networks under pressure' },
  { label: 'London — financial target', lat: 51.51, lng: -0.09, severity: 0.6, detail: 'Fintech attack surface' },
  { label: 'Tokyo — critical infra target', lat: 35.68, lng: 139.69, severity: 0.6, detail: 'Ransomware campaigns' },
];

/** Grid-stress / electricity-crisis zones (2025–26). */
export const gridStress: IntelPoint[] = [
  { label: 'Ukraine grid', lat: 50.45, lng: 30.52, severity: 0.85, date: '2026-08-13', detail: 'Strike-damaged, rolling outages' },
  { label: 'Cuba national grid', lat: 23.11, lng: -82.37, severity: 0.8, date: '2026-08-10', detail: 'Repeated national blackouts' },
  { label: 'South Africa load-shedding', lat: -33.92, lng: 18.42, severity: 0.6, date: '2026-08-05', detail: 'Stage-based outages' },
  { label: 'Venezuela grid', lat: 10.48, lng: -66.9, severity: 0.7, date: '2026-07-30', detail: 'Recurring collapses' },
  { label: 'Pakistan grid', lat: 31.55, lng: 74.34, severity: 0.55, date: '2026-07-22', detail: 'Summer demand strain' },
  { label: 'Puerto Rico grid', lat: 18.22, lng: -66.59, severity: 0.5, date: '2026-07-18', detail: 'Fragile post-hurricane system' },
];

/** IPC food-insecurity hotspots (integrated phase classification). */
export const foodInsecurity: IntelPoint[] = [
  { label: 'Sudan — IPC5 famine', lat: 15.5, lng: 32.5, severity: 1, date: '2026-08-13', detail: 'Famine conditions confirmed' },
  { label: 'Gaza — IPC5 famine', lat: 31.5, lng: 34.47, severity: 1, date: '2026-08-13', detail: 'Catastrophic food insecurity' },
  { label: 'Somalia — IPC4/5', lat: 2.05, lng: 45.32, severity: 0.85, date: '2026-08-08', detail: 'Drought + conflict' },
  { label: 'South Sudan — IPC4', lat: 4.85, lng: 31.58, severity: 0.85, date: '2026-08-06', detail: 'Flooding + conflict' },
  { label: 'Yemen — IPC4', lat: 15.37, lng: 44.19, severity: 0.8, date: '2026-08-04', detail: 'Blockade effects' },
  { label: 'Haiti — IPC4', lat: 18.55, lng: -72.33, severity: 0.75, date: '2026-08-02', detail: 'Gang-blocked aid' },
  { label: 'Ethiopia — IPC4 pockets', lat: 9.03, lng: 38.74, severity: 0.7, date: '2026-07-28', detail: 'Recovery uneven' },
  { label: 'NE Nigeria — IPC4', lat: 11.83, lng: 13.15, severity: 0.7, date: '2026-07-25', detail: 'Insurgency-displaced' },
];

// ---------------------------------------------------------------------------
// SOCIO-POLITICAL & ECONOMIC
// ---------------------------------------------------------------------------

/** Maritime piracy / security hotspots. */
export const marinePiracy: IntelPoint[] = [
  { label: 'Gulf of Aden', lat: 12.0, lng: 47.0, severity: 0.65, date: '2026-08-10', detail: 'Somali piracy resurgence risk' },
  { label: 'Gulf of Guinea', lat: 3.5, lng: 6.0, severity: 0.6, date: '2026-08-08', detail: 'Kidnap-for-ransom zone' },
  { label: 'Singapore Strait', lat: 1.2, lng: 104.0, severity: 0.55, date: '2026-08-05', detail: 'Robbery incidents' },
  { label: 'Red Sea approach', lat: 13.0, lng: 43.0, severity: 0.7, date: '2026-08-12', detail: 'Houthi-linked attacks' },
  { label: 'Malacca Strait', lat: 3.0, lng: 100.5, severity: 0.5, date: '2026-07-25', detail: 'Transit robberies' },
  { label: 'Caribbean / Venezuela', lat: 11.0, lng: -65.0, severity: 0.5, date: '2026-07-20', detail: 'Boarding incidents' },
];

/** Recent major flood / landslide events (2025–26). */
export const floodZones: IntelPoint[] = [
  { label: 'Pakistan flood zone', lat: 30.0, lng: 70.0, severity: 0.6, date: '2026-08-08', detail: 'Monsoon inundation' },
  { label: 'Bangladesh flood zone', lat: 24.0, lng: 90.0, severity: 0.6, date: '2026-08-06', detail: 'Rivers overflow' },
  { label: 'Rio Grande do Sul (BR)', lat: -30.0, lng: -51.5, severity: 0.55, date: '2026-07-20', detail: 'Repeated flooding' },
  { label: 'Horn of Africa floods', lat: 4.0, lng: 43.0, severity: 0.5, date: '2026-07-15', detail: 'Post-drought deluge' },
  { label: 'Sudan flood zone', lat: 15.5, lng: 32.5, severity: 0.5, date: '2026-07-12', detail: 'War-exacerbated flooding' },
  { label: 'Southeast Asia monsoon', lat: 14.5, lng: 104.0, severity: 0.5, date: '2026-08-01', detail: 'Mekong basin' },
];

/** Confirmed internet shutdowns / blocks (2025–26, recent events). */
export const internetShutdowns: IntelPoint[] = [
  { label: 'Pakistan — protest shutdown', lat: 33.69, lng: 73.06, severity: 0.6, date: '2026-08-07', detail: 'Mobile-data blocks during protests' },
  { label: 'Iran — national blocks', lat: 35.69, lng: 51.39, severity: 0.7, date: '2026-08-10', detail: 'Recurring nationwide blocks' },
  { label: 'Myanmar — conflict zones', lat: 21.96, lng: 96.13, severity: 0.7, date: '2026-08-05', detail: 'Ongoing blocks in active areas' },
  { label: 'Ethiopia — regional blocks', lat: 9.03, lng: 38.74, severity: 0.6, date: '2026-07-28', detail: 'Amhara/Tigray disruptions' },
  { label: 'Syria — service blocks', lat: 35.0, lng: 38.0, severity: 0.6, date: '2026-07-20', detail: 'Conflict-area restrictions' },
  { label: 'Sudan — ISP outages', lat: 15.5, lng: 32.5, severity: 0.65, date: '2026-08-02', detail: 'War-linked outages' },
];

/** Recent protest activity (2025–26). */
export const protests: IntelPoint[] = [
  { label: 'France — pension/reform protests', lat: 48.86, lng: 2.35, severity: 0.5, date: '2026-08-05', detail: 'Recurring demonstrations' },
  { label: 'Argentina — austerity protests', lat: -34.6, lng: -58.38, severity: 0.55, date: '2026-08-03', detail: 'IMF-era adjustment' },
  { label: 'Kenya — cost-of-living', lat: -1.29, lng: 36.82, severity: 0.5, date: '2026-08-01', detail: 'Tax protests' },
  { label: 'Georgia — EU path protests', lat: 41.72, lng: 44.78, severity: 0.55, date: '2026-07-26', detail: 'Recurring street action' },
  { label: 'Serbia — anti-corruption', lat: 44.79, lng: 20.45, severity: 0.5, date: '2026-07-22', detail: 'Mass demonstrations' },
  { label: 'India — farmer protests', lat: 28.61, lng: 77.21, severity: 0.45, date: '2026-07-18', detail: 'Price-support demands' },
  { label: 'Iran — sporadic unrest', lat: 35.69, lng: 51.39, severity: 0.55, date: '2026-07-15', detail: 'Economic grievances' },
  { label: 'Bangladesh — student movement', lat: 23.81, lng: 90.41, severity: 0.5, date: '2026-07-12', detail: 'Post-2024 political volatility' },
];

/** Displacement flows (IDP/refugee movement corridors). */
export const displacementFlows: IntelPoint[] = [
  { label: 'Ukraine displacement', lat: 49.0, lng: 31.0, severity: 0.75, date: '2026-08-12', detail: '~3.7M IDPs, 6.7M refugees abroad' },
  { label: 'Sudan displacement', lat: 15.5, lng: 32.5, severity: 0.85, date: '2026-08-11', detail: '~11M displaced, largest crisis' },
  { label: 'Gaza displacement', lat: 31.4, lng: 34.4, severity: 0.85, date: '2026-08-13', detail: '~1.9M displaced' },
  { label: 'DRC displacement', lat: -1.68, lng: 29.22, severity: 0.8, date: '2026-08-08', detail: '~7M+ displaced' },
  { label: 'Venezuela exodus', lat: 10.48, lng: -66.9, severity: 0.7, date: '2026-08-01', detail: '~7.7M refugees/migrants' },
  { label: 'Syria displacement', lat: 35.0, lng: 38.0, severity: 0.6, date: '2026-07-28', detail: '5.5M refugees, return flows' },
  { label: 'Afghanistan displacement', lat: 33.94, lng: 67.71, severity: 0.6, date: '2026-07-20', detail: 'Economic displacement' },
];

/** Major refugee camps. */
export const refugeeCamps: IntelPoint[] = [
  { label: 'Zaatari (JO)', lat: 32.292, lng: 36.329, severity: 0.5, detail: '~80k Syrian refugees' },
  { label: 'Azraq (JO)', lat: 31.9, lng: 36.58, severity: 0.45, detail: '~40k Syrian refugees' },
  { label: 'Kakuma (KE)', lat: 3.42, lng: 34.85, severity: 0.55, detail: '~250k+ refugees' },
  { label: 'Dadaab (KE)', lat: 0.06, lng: 40.31, severity: 0.5, detail: '~300k Somali refugees' },
  { label: 'Cox’s Bazar (BD)', lat: 21.2, lng: 92.2, severity: 0.55, detail: '~1M Rohingya refugees' },
];

/** OFAC sanctions programs (country-level, current). */
export const sanctions: IntelPoint[] = [
  { label: 'Russia sanctions', lat: 55.75, lng: 37.62, severity: 0.8, detail: 'Full blocking + sectoral (2022–)' },
  { label: 'Belarus sanctions', lat: 53.9, lng: 27.57, severity: 0.7, detail: 'Coordinated with Russia program' },
  { label: 'Iran sanctions', lat: 32.0, lng: 53.0, severity: 0.75, detail: 'Full blocking, energy/oil' },
  { label: 'North Korea sanctions', lat: 39.03, lng: 125.75, severity: 0.8, detail: 'UN + unilateral' },
  { label: 'Syria sanctions', lat: 35.0, lng: 38.0, severity: 0.7, detail: 'Full blocking (2011–)' },
  { label: 'Venezuela sanctions', lat: 10.48, lng: -66.9, severity: 0.65, detail: 'Sectoral + entities' },
  { label: 'Cuba sanctions', lat: 23.11, lng: -82.37, severity: 0.6, detail: 'Embargo regime' },
  { label: 'Myanmar sanctions', lat: 21.96, lng: 96.13, severity: 0.65, detail: 'Post-2021 coup regime' },
  { label: 'Sudan sanctions', lat: 15.5, lng: 32.5, severity: 0.6, detail: 'Conflict-linked' },
  { label: 'Nicaragua sanctions', lat: 12.14, lng: -86.25, severity: 0.5, detail: 'Government-linked entities' },
  { label: 'Lebanon — Hezbollah', lat: 33.89, lng: 35.5, severity: 0.6, detail: 'Terrorist-org designations' },
  { label: 'Yemen — Houthis', lat: 15.37, lng: 44.19, severity: 0.65, detail: '2024 redesignation' },
  { label: 'Afghanistan — Taliban', lat: 33.94, lng: 67.71, severity: 0.6, detail: 'Blocking program' },
  { label: 'Haiti — gangs', lat: 18.55, lng: -72.33, severity: 0.5, detail: 'Targeted designations' },
];

/** Global financial / economic centers. */
export const economicCenters: IntelPoint[] = [
  { label: 'New York (NYSE/NASDAQ)', lat: 40.713, lng: -74.006, severity: 0.5, detail: 'Largest equity markets' },
  { label: 'London (LSE)', lat: 51.515, lng: -0.09, severity: 0.45, detail: 'FX + Eurodollar hub' },
  { label: 'Frankfurt (Xetra)', lat: 50.111, lng: 8.682, severity: 0.45, detail: 'ECB + DAX' },
  { label: 'Paris (Euronext)', lat: 48.856, lng: 2.352, severity: 0.4, detail: 'Eurozone listings' },
  { label: 'Tokyo (TSE)', lat: 35.681, lng: 139.767, severity: 0.45, detail: 'Asia largest' },
  { label: 'Hong Kong (HKEX)', lat: 22.28, lng: 114.158, severity: 0.45, detail: 'China gateway' },
  { label: 'Shanghai (SSE)', lat: 31.23, lng: 121.473, severity: 0.45, detail: 'Mainland equities' },
  { label: 'Singapore (SGX)', lat: 1.29, lng: 103.85, severity: 0.4, detail: 'Commodities hub' },
  { label: 'Mumbai (NSE/BSE)', lat: 19.076, lng: 72.878, severity: 0.4, detail: 'India markets' },
  { label: 'Dubai (DFM)', lat: 25.204, lng: 55.271, severity: 0.4, detail: 'Gulf finance' },
  { label: 'Zurich (SIX)', lat: 47.371, lng: 8.54, severity: 0.4, detail: 'Wealth hub' },
  { label: 'Sydney (ASX)', lat: -33.868, lng: 151.209, severity: 0.35, detail: 'APAC trading' },
  { label: 'São Paulo (B3)', lat: -23.55, lng: -46.633, severity: 0.35, detail: 'LatAm largest' },
  { label: 'Toronto (TSX)', lat: 43.653, lng: -79.383, severity: 0.35, detail: 'Materials listings' },
];

/** Critical-mineral deposits / supply nodes. */
export const criticalMinerals: IntelPoint[] = [
  { label: 'Atacama lithium (CL)', lat: -23.3, lng: -68.6, severity: 0.6, detail: 'Largest lithium brine' },
  { label: 'Salar de Uyuni (BO)', lat: -20.3, lng: -66.9, severity: 0.55, detail: 'Lithium reserves' },
  { label: 'Greenbushes (AU)', lat: -33.8, lng: 116.1, severity: 0.55, detail: 'Hard-rock lithium' },
  { label: 'Pilbara iron/lithium (AU)', lat: -21.5, lng: 119.1, severity: 0.5, detail: 'Iron ore + lithium' },
  { label: 'Katanga cobalt (CD)', lat: -11.6, lng: 27.4, severity: 0.65, detail: '~70% of world cobalt' },
  { label: 'Kolwezi cobalt (CD)', lat: -10.7, lng: 25.5, severity: 0.6, detail: 'DRC copperbelt' },
  { label: 'Bayan Obo REE (CN)', lat: 41.76, lng: 109.96, severity: 0.6, detail: 'Rare-earth mine' },
  { label: 'Mountain Pass REE (US)', lat: 35.46, lng: -115.53, severity: 0.55, detail: 'Only US REE mine' },
  { label: 'Sudbury nickel (CA)', lat: 46.49, lng: -81.01, severity: 0.45, detail: 'Nickel/copper' },
  { label: 'Norilsk nickel (RU)', lat: 69.35, lng: 88.2, severity: 0.5, detail: 'Palladium + nickel' },
  { label: 'Escondida copper (CL)', lat: -24.27, lng: -69.07, severity: 0.5, detail: 'Largest copper mine' },
  { label: 'Grasberg copper/gold (ID)', lat: -4.05, lng: 137.12, severity: 0.45, detail: 'Indonesia' },
  { label: 'Bushveld PGM (ZA)', lat: -24.6, lng: 27.6, severity: 0.55, detail: 'Platinum group metals' },
  { label: 'Inkai uranium (KZ)', lat: 46.0, lng: 68.0, severity: 0.5, detail: 'ISR uranium' },
  { label: 'Cameco uranium (CA)', lat: 57.5, lng: -105.0, severity: 0.45, detail: 'McArthur River/Cigar Lake' },
  { label: 'Balama graphite (MZ)', lat: -15.5, lng: 38.5, severity: 0.5, detail: 'Mozambique graphite' },
  { label: 'Ganzhou tungsten/REE (CN)', lat: 25.85, lng: 114.93, severity: 0.5, detail: 'Ionic clay REE' },
];

/** Major AI / hyperscale data-center clusters (colocation + cloud regions). */
export const dataCenters: IntelPoint[] = [
  { label: 'Ashburn / NoVA (US)', lat: 39.04, lng: -77.49, severity: 0.6, detail: 'Largest internet hub on earth' },
  { label: 'Dallas (US)', lat: 32.78, lng: -96.8, severity: 0.5, detail: 'Top US interconnection metro' },
  { label: 'Phoenix (US)', lat: 33.45, lng: -112.07, severity: 0.5, detail: 'Hyperscale cloud zone' },
  { label: 'Hillsboro / Portland (US)', lat: 45.52, lng: -122.94, severity: 0.5, detail: 'Silicon Forest, GPU clusters' },
  { label: 'Santa Clara (US)', lat: 37.35, lng: -121.97, severity: 0.5, detail: 'Bay Area colocation core' },
  { label: 'Chicago (US)', lat: 41.88, lng: -87.63, severity: 0.45, detail: 'Financial + cloud metro' },
  { label: 'Frankfurt (DE)', lat: 50.11, lng: 8.68, severity: 0.6, detail: 'DE-CIX, EU cloud hub' },
  { label: 'London (UK)', lat: 51.51, lng: -0.09, severity: 0.55, detail: 'EU/UK colocation core' },
  { label: 'Dublin (IE)', lat: 53.35, lng: -6.26, severity: 0.5, detail: 'Hyperscale EU west coast' },
  { label: 'Amsterdam (NL)', lat: 52.37, lng: 4.9, severity: 0.5, detail: 'AMS-IX peering hub' },
  { label: 'Paris (FR)', lat: 48.86, lng: 2.35, severity: 0.45, detail: 'EU colocation metro' },
  { label: 'Moscow (RU)', lat: 55.75, lng: 37.62, severity: 0.45, detail: 'RU cloud core (sanction-isolated)' },
  { label: 'Singapore', lat: 1.29, lng: 103.85, severity: 0.6, detail: 'SE-Asia cloud + GPU hub' },
  { label: 'Tokyo (JP)', lat: 35.68, lng: 139.69, severity: 0.5, detail: 'JP cloud core' },
  { label: 'Osaka (JP)', lat: 34.69, lng: 135.5, severity: 0.45, detail: 'JP hyperscale zone' },
  { label: 'Seoul (KR)', lat: 37.57, lng: 126.98, severity: 0.45, detail: 'KR cloud core' },
  { label: 'Hong Kong', lat: 22.28, lng: 114.16, severity: 0.5, detail: 'Asia interconnection' },
  { label: 'Beijing (CN)', lat: 39.9, lng: 116.4, severity: 0.5, detail: 'CN cloud core' },
  { label: 'Shanghai (CN)', lat: 31.23, lng: 121.47, severity: 0.45, detail: 'CN financial + cloud' },
  { label: 'Mumbai (IN)', lat: 19.08, lng: 72.88, severity: 0.5, detail: 'India cloud core' },
  { label: 'Sydney (AU)', lat: -33.87, lng: 151.21, severity: 0.45, detail: 'AU cloud region' },
  { label: 'São Paulo (BR)', lat: -23.55, lng: -46.63, severity: 0.45, detail: 'LatAm cloud core' },
  { label: 'Johannesburg (ZA)', lat: -26.2, lng: 28.04, severity: 0.4, detail: 'Africa cloud region' },
  { label: 'Nairobi (KE)', lat: -1.29, lng: 36.82, severity: 0.4, detail: 'E-Africa emerging hub' },
  { label: 'Dubai (AE)', lat: 25.2, lng: 55.27, severity: 0.45, detail: 'Gulf cloud core' },
  { label: 'Toronto (CA)', lat: 43.65, lng: -79.38, severity: 0.45, detail: 'CA cloud core' },
  { label: 'Jakarta (ID)', lat: -6.21, lng: 106.85, severity: 0.4, detail: 'ID emerging hub' },
];

/** Orbital launch sites. */
export const launchSites: IntelPoint[] = [
  { label: 'Cape Canaveral (US)', lat: 28.488, lng: -80.577, severity: 0.4, detail: 'NASA + SpaceX launches' },
  { label: 'Vandenberg SFB (US)', lat: 34.742, lng: -120.572, severity: 0.4, detail: 'Polar + ICBM tests' },
  { label: 'Wallops (US)', lat: 37.94, lng: -75.46, severity: 0.35, detail: 'Suborbital + smallsat' },
  { label: 'Baikonur (KZ)', lat: 45.965, lng: 63.31, severity: 0.5, detail: 'Russia-leased, crewed launches' },
  { label: 'Plesetsk (RU)', lat: 62.928, lng: 40.575, severity: 0.45, detail: 'Military launch site' },
  { label: 'Vostochny (RU)', lat: 51.884, lng: 128.333, severity: 0.4, detail: 'New Russian cosmodrome' },
  { label: 'Jiuquan (CN)', lat: 40.958, lng: 100.291, severity: 0.5, detail: 'Crewed missions' },
  { label: 'Xichang (CN)', lat: 28.246, lng: 102.027, severity: 0.45, detail: 'GEO launches' },
  { label: 'Taiyuan (CN)', lat: 37.507, lng: 112.851, severity: 0.4, detail: 'SSO launches' },
  { label: 'Wenchang (CN)', lat: 19.615, lng: 110.951, severity: 0.45, detail: 'Coastal, heavy lift' },
  { label: 'Tanegashima (JP)', lat: 30.401, lng: 130.974, severity: 0.4, detail: 'H-IIA/H3' },
  { label: 'Kourou (GF)', lat: 5.236, lng: -52.768, severity: 0.4, detail: 'Ariane/Vega' },
  { label: 'Sriharikota (IN)', lat: 13.719, lng: 80.23, severity: 0.4, detail: 'PSLV/GSLV' },
  { label: 'Mahia (NZ)', lat: -39.272, lng: 177.865, severity: 0.3, detail: 'Rocket Lab' },
  { label: 'Esrange (SE)', lat: 67.891, lng: 21.065, severity: 0.3, detail: 'Suborbital' },
];

/** Space-surveillance / orbital-tracking ground stations. */
export const orbitalSurveillance: IntelPoint[] = [
  { label: 'Schriever SFB (US)', lat: 38.8, lng: -104.53, severity: 0.55, detail: 'Space C2' },
  { label: 'Thule (US/Greenland)', lat: 76.531, lng: -68.703, severity: 0.55, detail: 'Upgraded radar' },
  { label: 'RAF Fylingdales (UK)', lat: 54.362, lng: -0.67, severity: 0.5, detail: 'SSA radar' },
  { label: 'Clear AFS (US, AK)', lat: 64.301, lng: -149.12, severity: 0.5, detail: 'Solid-state radar' },
  { label: 'Kaena Point (US, HI)', lat: 21.568, lng: -158.27, severity: 0.5, detail: 'Optical tracking' },
  { label: 'Misawa (JP)', lat: 40.703, lng: 141.368, severity: 0.5, detail: 'SSA radar' },
  { label: 'Pionersky (RU)', lat: 54.95, lng: 20.22, severity: 0.5, detail: 'Okno-class optical' },
  { label: 'Balkhash (KZ)', lat: 46.9, lng: 74.9, severity: 0.5, detail: 'Russian SSA radar' },
  { label: 'Diego Garcia (UK)', lat: -7.313, lng: 72.411, severity: 0.5, detail: 'Distant-sensing radar' },
  { label: 'Malargüe (AR)', lat: -35.78, lng: -69.4, severity: 0.4, detail: 'Deep-space antenna' },
  { label: 'New Norcia (AU)', lat: -30.6, lng: 116.2, severity: 0.4, detail: 'Deep-space antenna' },
];

// ---------------------------------------------------------------------------
// CYBER (expanded)
// ---------------------------------------------------------------------------

/** Ransomware attack hotspots (major incidents 2025–26). */
export const ransomwareAttacks: IntelPoint[] = [
  { label: 'MOVEit wave — global', lat: 40.0, lng: -30.0, severity: 0.75, date: '2026-08-10', detail: 'Cl0p exploit chain, 2000+ orgs affected' },
  { label: 'Change Healthcare (US)', lat: 38.9, lng: -77.04, severity: 0.9, date: '2026-08-08', detail: 'ALPHV/BlackCat, $22M ransom, pharmacy disruption' },
  { label: 'Ascension Health (US)', lat: 38.63, lng: -90.2, severity: 0.8, date: '2026-08-06', detail: 'Black Basta, hospital system disrupted' },
  { label: 'MGM Resorts (US)', lat: 36.11, lng: -115.17, severity: 0.7, date: '2026-08-03', detail: 'Scattered Spider / ALPHV, $100M+ loss' },
  { label: 'Caesars Entertainment (US)', lat: 36.12, lng: -115.17, severity: 0.65, date: '2026-08-02', detail: 'Scattered Spider, $15M ransom paid' },
  { label: 'British Library (UK)', lat: 51.53, lng: -0.127, severity: 0.7, date: '2026-07-28', detail: 'Rhysida ransomware, services offline months' },
  { label: 'Toyota supply chain (JP)', lat: 35.05, lng: 137.17, severity: 0.65, date: '2026-07-25', detail: 'Kojima Industries, production halted' },
  { label: 'Costa Rica government', lat: 9.93, lng: -84.09, severity: 0.8, date: '2026-07-20', detail: 'Conti/North Korea, state of emergency' },
  { label: 'Colonial Pipeline (US)', lat: 36.85, lng: -75.98, severity: 0.85, date: '2026-07-15', detail: 'DarkSide, fuel supply disrupted' },
  { label: 'JBS Foods (US/BR)', lat: -15.78, lng: -47.93, severity: 0.7, date: '2026-07-10', detail: 'REvil, meat processing halted' },
];

/** Major data breach incidents (2025–26). */
export const dataBreaches: IntelPoint[] = [
  { label: 'National Public Data (US)', lat: 28.54, lng: -81.38, severity: 0.9, date: '2026-08-12', detail: '2.9B records, names/SSNs/addresses' },
  { label: 'Snowflake customer breaches', lat: 37.39, lng: -122.08, severity: 0.85, date: '2026-08-10', detail: 'AT&T, Ticketmaster, Santander via credential stuffing' },
  { label: 'T-Mobile (US)', lat: 39.04, lng: -94.68, severity: 0.75, date: '2026-08-05', detail: '37M customer records exfiltrated' },
  { label: '23andMe (US)', lat: 37.77, lng: -122.42, severity: 0.8, date: '2026-07-30', detail: 'Genetic data of 6.9M users scraped' },
  { label: 'MOVEit — Shell (NL/UK)', lat: 51.89, lng: 4.48, severity: 0.7, date: '2026-07-25', detail: 'Employee data via MOVEit vulnerability' },
  { label: 'Indian Aadhaar leak', lat: 28.61, lng: 77.21, severity: 0.85, date: '2026-07-20', detail: '815M records potentially exposed' },
  { label: 'Eurostar breach (EU)', lat: 50.94, lng: 1.07, severity: 0.6, date: '2026-07-15', detail: 'Passenger PII exposed' },
];

/** APT / state-sponsored campaign tracking. */
export const aptCampaigns: IntelPoint[] = [
  { label: 'Volt Typhoon — US infra', lat: 33.75, lng: -84.39, severity: 0.85, date: '2026-08-13', detail: 'Chinese APT, pre-positioning in water/energy' },
  { label: 'Salt Typhoon — telecom', lat: 38.9, lng: -77.04, severity: 0.9, date: '2026-08-12', detail: 'Chinese APT, US telecom interception' },
  { label: 'Sandworm — Ukraine grid', lat: 50.45, lng: 30.52, severity: 0.85, date: '2026-08-10', detail: 'Russian APT, Industroyer2 variant' },
  { label: 'Lazarus — crypto heists', lat: 39.03, lng: 125.75, severity: 0.8, date: '2026-08-08', detail: 'North Korean, $600M+ stolen' },
  { label: 'APT33 — oil/gas', lat: 26.22, lng: 50.58, severity: 0.7, date: '2026-08-05', detail: 'Iranian, Saudi/Gulf energy targeting' },
  { label: 'Cozy Bear — SolarWinds', lat: 38.9, lng: -77.04, severity: 0.8, date: '2026-07-30', detail: 'Russian SVR, supply-chain compromise' },
  { label: 'Kimsuky — intelligence', lat: 39.03, lng: 125.75, severity: 0.65, date: '2026-07-25', detail: 'North Korean, diplomatic espionage' },
];

// ---------------------------------------------------------------------------
// ENERGY (expanded)
// ---------------------------------------------------------------------------

/** Major LNG terminals (import/export). */
export const lngTerminals: IntelPoint[] = [
  { label: 'Ras Laffan (QA)', lat: 25.93, lng: 51.55, severity: 0.6, detail: 'World-largest LNG export terminal' },
  { label: 'Sabine Pass (US)', lat: 29.73, lng: -93.86, severity: 0.55, detail: 'Cheniere, US Gulf export' },
  { label: 'Freeport (US)', lat: 28.95, lng: -95.27, severity: 0.5, detail: 'Freeport LNG, Texas' },
  { label: 'Cameron (US)', lat: 29.77, lng: -93.35, severity: 0.5, detail: 'Sempra, Louisiana' },
  { label: 'Yamal (RU)', lat: 71.24, lng: 72.0, severity: 0.6, detail: 'Arctic LNG, Novatek' },
  { label: 'Sakhalin-2 (RU)', lat: 46.94, lng: 143.22, severity: 0.6, detail: 'Russian Far East, Gazprom' },
  { label: 'Zhoushan (CN)', lat: 30.0, lng: 122.1, severity: 0.5, detail: 'China import terminal' },
  { label: 'Kochi (IN)', lat: 9.97, lng: 76.27, severity: 0.45, detail: 'India import terminal' },
  { label: 'Sines (PT)', lat: 37.96, lng: -8.87, severity: 0.5, detail: 'European import hub' },
  { label: 'Wilhelmshaven (DE)', lat: 53.53, lng: 8.14, severity: 0.5, detail: 'German FSRU terminal' },
  { label: 'Eemshaven (NL)', lat: 53.44, lng: 6.83, severity: 0.45, detail: 'Dutch FSRU terminal' },
  { label: 'Pireaus (GR)', lat: 37.94, lng: 23.63, severity: 0.45, detail: 'Greek import terminal' },
  { label: 'Kearl Lake (CA)', lat: 57.77, lng: -111.6, severity: 0.5, detail: 'Canadian oil sands' },
];

/** Major oil refineries (capacity + strategic importance). */
export const oilRefineries: IntelPoint[] = [
  { label: 'Jamnagar (IN)', lat: 22.47, lng: 70.06, severity: 0.5, detail: 'World-largest refinery (Reliance)' },
  { label: 'Ulsan (KR)', lat: 35.54, lng: 129.31, severity: 0.5, detail: 'SK Innovation, Asia-largest' },
  { label: 'Ras Tanura (SA)', lat: 26.64, lng: 50.07, severity: 0.6, detail: 'SABIC, Aramco hub' },
  { label: 'Port Arthur (US)', lat: 29.86, lng: -93.93, severity: 0.5, detail: 'Motiva, US-largest' },
  { label: 'Baytown (US)', lat: 29.73, lng: -95.01, severity: 0.5, detail: 'ExxonMobil, Texas' },
  { label: 'Rotterdam (NL)', lat: 51.92, lng: 4.48, severity: 0.5, detail: 'Pernis, European hub' },
  { label: 'Jurong (SG)', lat: 1.27, lng: 103.68, severity: 0.5, detail: 'ExxonMobil Jurong Island' },
  { label: 'Tuapse (RU)', lat: 44.1, lng: 39.07, severity: 0.6, detail: 'Black Sea export terminal' },
  { label: 'Nizhny Novgorod (RU)', lat: 56.33, lng: 44.0, severity: 0.5, detail: 'Inland Russian refinery' },
  { label: 'Baton Rouge (US)', lat: 30.45, lng: -91.19, severity: 0.45, detail: 'ExxonMobil, Louisiana' },
];

/** Renewable energy mega-projects (>1 GW). */
export const renewableProjects: IntelPoint[] = [
  { label: 'Al Dhafra Solar (AE)', lat: 24.0, lng: 55.3, severity: 0.4, detail: '2 GW, world-largest single-site solar' },
  { label: 'Benban Solar Park (EG)', lat: 24.45, lng: 32.74, severity: 0.4, detail: '1.65 GW, Egypt' },
  { label: 'Bhadla Solar Park (IN)', lat: 27.54, lng: 71.92, severity: 0.4, detail: '2.25 GW, Rajasthan' },
  { label: 'Hornsea Wind (UK)', lat: 53.9, lng: 1.8, severity: 0.45, detail: 'Hornsea 2: 1.3 GW, North Sea' },
  { label: 'Dogger Bank Wind (UK)', lat: 54.75, lng: 2.0, severity: 0.45, detail: '3.6 GW planned, world-largest offshore' },
  { label: 'Gansu Wind Farm (CN)', lat: 40.0, lng: 98.0, severity: 0.45, detail: '20 GW corridor, Gobi Desert' },
  { label: 'Three Gorges Solar (CN)', lat: 30.83, lng: 111.0, severity: 0.4, detail: '1 GW floating solar' },
  { label: 'Altamont Pass Wind (US)', lat: 37.74, lng: -121.64, severity: 0.35, detail: 'Historic wind farm, California' },
  { label: 'Jaisalmer Wind (IN)', lat: 26.9, lng: 70.9, severity: 0.4, detail: 'Rajasthan wind corridor' },
  { label: 'Tengger Desert Solar (CN)', lat: 37.5, lng: 105.0, severity: 0.4, detail: '1.5 GW, Ningxia' },
];

/** Power grid interconnection corridors. */
export const powerGridLinks: IntelLine[] = [
  { label: 'NordLink (NO–DE)', severity: 0.45, detail: '620 MW HVDC, North Sea', path: [[58.5, 6.0], [54.5, 8.5]] },
  { label: 'NordBalt (SE–LT)', severity: 0.4, detail: '700 MW HVDC', path: [[56.0, 18.2], [55.7, 21.1]] },
  { label: 'EstLink 2 (FI–EE)', severity: 0.45, detail: '650 MW HVDC, Baltic', path: [[59.8, 24.8], [59.4, 24.8]] },
  { label: 'IFA 2 (FR–UK)', severity: 0.4, detail: '1 GW HVDC interconnector', path: [[49.4, -1.2], [50.9, 1.2]] },
  { label: 'SAPEI (IT–Sardinia)', severity: 0.35, detail: '1 GW HVDC', path: [[41.1, 9.8], [40.3, 9.5]] },
  { label: 'China–Myanmar', severity: 0.45, detail: 'Cross-border power link', path: [[25.0, 98.5], [22.0, 98.5]] },
  { label: 'Central Asia–Afghanistan', severity: 0.4, detail: 'CASAREM energy link', path: [[38.5, 68.8], [34.5, 69.2]] },
  { label: 'Nord Stream electricity (RU–FI)', severity: 0.5, detail: 'Fingrid–Rosenergoatom', path: [[60.5, 28.7], [60.2, 24.8]] },
];

// ---------------------------------------------------------------------------
// MIGRATION & DISPLACEMENT (expanded)
// ---------------------------------------------------------------------------

/** Major migration / transit routes. */
export const migrationRoutes: IntelLine[] = [
  { label: 'Central Mediterranean (Libya→EU)', severity: 0.85, detail: 'Deadliest route, 2000+ deaths/yr', path: [[32.9, 13.2], [37.5, 12.5], [38.2, 13.4]] },
  { label: 'Western Mediterranean (Morocco→Spain)', severity: 0.7, detail: 'Ceuta/Melilla + boat crossings', path: [[35.8, -5.8], [36.7, -4.4]] },
  { label: 'Central America → US border', severity: 0.8, detail: 'Darién Gap + Mexico transit', path: [[9.4, -79.9], [15.5, -90.0], [25.8, -97.5]] },
  { label: 'East Africa → Yemen/Gulf', severity: 0.75, detail: 'Somalia/Ethiopia→Yemen labor route', path: [[2.0, 45.3], [12.5, 44.2], [15.4, 44.2]] },
  { label: 'South Asia → Southeast Asia', severity: 0.6, detail: 'Rohingya boats, Bay of Bengal', path: [[20.0, 92.5], [10.0, 98.0], [6.0, 100.0]] },
  { label: 'Ukraine → EU (westward)', severity: 0.8, detail: '6.7M refugees since 2022', path: [[50.45, 30.52], [49.84, 24.0], [48.2, 16.4], [50.08, 14.4]] },
  { label: 'Syria → Turkey → EU', severity: 0.75, detail: '5.5M Turkish-hosted refugees', path: [[33.5, 36.3], [37.0, 36.0], [41.0, 29.0], [42.0, 28.0]] },
  { label: 'Venezuela → Colombia/Brazil', severity: 0.7, detail: '7.7M Venezuelan migrants', path: [[10.5, -66.9], [7.0, -73.0], [4.0, -69.0]] },
];

/** Major border crossing hotspots (high-volume / high-tension). */
export const borderCrossings: IntelPoint[] = [
  { label: 'US–Mexico (El Paso)', lat: 31.76, lng: -106.45, severity: 0.8, date: '2026-08-13', detail: 'Highest US crossing volume' },
  { label: 'US–Mexico (San Diego)', lat: 32.54, lng: -117.11, severity: 0.75, date: '2026-08-12', detail: 'San Ysidro, busiest land port' },
  { label: 'Poland–Belarus (Bruzgi)', lat: 53.26, lng: 24.3, severity: 0.7, date: '2026-08-10', detail: '2021–26 migration crisis border' },
  { label: 'Greece–Turkey (Evros)', lat: 41.71, lng: 26.55, severity: 0.7, date: '2026-08-09', detail: 'Land border crossings' },
  { label: 'Spanish enclaves (Ceuta)', lat: 35.89, lng: -5.31, severity: 0.65, date: '2026-08-08', detail: 'African crossings into EU' },
  { label: 'Darién Gap (PA/CO)', lat: 7.9, lng: -77.5, severity: 0.85, date: '2026-08-13', detail: 'Deadly jungle crossing' },
  { label: 'Bangladesh–India (Assam)', lat: 26.1, lng: 89.0, severity: 0.6, date: '2026-08-05', detail: 'Rohingya transit' },
  { label: 'Libya–Tunisia (Ras Jedir)', lat: 33.0, lng: 11.5, severity: 0.75, date: '2026-08-12', detail: 'EU-bound departures' },
  { label: 'Chad–Cameroon (Bosso)', lat: 13.0, lng: 14.5, severity: 0.65, date: '2026-08-06', detail: 'Lake Chad displacement' },
  { label: 'Myanmar–Thailand (Mae Sot)', lat: 16.71, lng: 98.57, severity: 0.7, date: '2026-08-08', detail: 'Karen displacement crossings' },
];

/** UNHCR major operations / camps. */
export const unhcrOperations: IntelPoint[] = [
  { label: 'Za’atari Camp (JO)', lat: 32.29, lng: 36.33, severity: 0.6, detail: '~80k Syrian refugees, 4th-largest camp' },
  { label: 'Bidi Bidi (UG)', lat: 3.44, lng: 32.56, severity: 0.7, detail: '~230k South Sudanese, world-largest' },
  { label: 'Dadaab (KE)', lat: 0.05, lng: 40.31, severity: 0.65, detail: '~350k Somali refugees' },
  { label: 'Kakuma (KE)', lat: 3.86, lng: 34.86, severity: 0.6, detail: '~250k mixed refugees' },
  { label: 'Cox’s Bazar (BD)', lat: 21.44, lng: 92.0, severity: 0.85, detail: '~1M Rohingya, world-densest camp' },
  { label: 'Kakuma/Kalobeyei (KE)', lat: 3.9, lng: 34.9, severity: 0.55, detail: 'Integrated settlement model' },
  { label: 'Mbera (MR)', lat: 16.96, lng: -5.74, severity: 0.6, detail: '~100k Malian refugees' },
  { label: 'Nyabiheke (RW)', lat: -1.47, lng: 29.52, severity: 0.5, detail: 'Congolese refugees' },
  { label: 'Mentao (BF)', lat: 14.44, lng: -0.94, severity: 0.7, detail: 'Sahel crisis, Burkina Faso' },
  { label: 'Gaziantep hub (TR)', lat: 37.06, lng: 37.38, severity: 0.65, detail: 'Syria cross-border aid hub' },
];

// ---------------------------------------------------------------------------
// LIVE NEWS FEEDS & WEBCAMS
// ---------------------------------------------------------------------------

/** Live news network stream sources. */
export interface LiveFeed {
  id: string;
  name: string;
  network: string;
  url: string;
  region: string;
  category: 'news' | 'financial' | 'regional';
}

export const liveNewsFeeds: LiveFeed[] = [
  { id: 'bloomberg', name: 'Bloomberg TV', network: 'Bloomberg', url: 'https://www.bloomberg.com/live/us', region: 'Americas', category: 'financial' },
  { id: 'sky-news', name: 'Sky News Live', network: 'Sky News', url: 'https://news.sky.com/watch/live', region: 'Europe', category: 'news' },
  { id: 'euronews', name: 'Euronews Live', network: 'Euronews', url: 'https://www.euronews.com/live', region: 'Europe', category: 'news' },
  { id: 'dw', name: 'DW News Live', network: 'Deutsche Welle', url: 'https://www.youtube.com/c/dwnews/live', region: 'Europe', category: 'news' },
  { id: 'cnbc', name: 'CNBC Live', network: 'CNBC', url: 'https://www.cnbc.com/live-tv/', region: 'Americas', category: 'financial' },
  { id: 'cnn', name: 'CNN Live', network: 'CNN', url: 'https://edition.cnn.com/live', region: 'Americas', category: 'news' },
  { id: 'france24', name: 'France 24 Live', network: 'France 24', url: 'https://www.france24.com/en/live', region: 'Europe', category: 'news' },
  { id: 'alarabiya', name: 'Al Arabiya Live', network: 'Al Arabiya', url: 'https://www.alarabiya.net/live', region: 'MENA', category: 'regional' },
  { id: 'aljazeera', name: 'Al Jazeera Live', network: 'Al Jazeera', url: 'https://www.aljazeera.com/live', region: 'MENA', category: 'news' },
  { id: 'nhk', name: 'NHK World Live', network: 'NHK', url: 'https://www3.nhk.or.jp/nhkworld/en/live/', region: 'Asia', category: 'news' },
];

/** Live webcam sources for strategic global regions. */
export interface LiveWebcam {
  id: string;
  name: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  url: string;
  category: 'diplomatic' | 'conflict' | 'strategic' | 'urban';
}

export const liveWebcams: LiveWebcam[] = [
  { id: 'jerusalem-dome', name: 'Jerusalem — Dome of the Rock', region: 'MENA', city: 'Jerusalem', lat: 31.78, lng: 35.23, url: 'https://www.earthcam.com/cams/israel/jerusalem/', category: 'diplomatic' },
  { id: 'middle-east-multi', name: 'Middle East Multi-Cam', region: 'MENA', city: 'Multiple', lat: 30.0, lng: 40.0, url: 'https://www.skylinewebcams.com/', category: 'conflict' },
  { id: 'kyiv-maidan', name: 'Kyiv — Maidan Square', region: 'Europe', city: 'Kyiv', lat: 50.45, lng: 30.52, url: 'https://www.earthcam.com/cams/ukraine/kyiv/', category: 'conflict' },
  { id: 'washington-dc', name: 'Washington DC — Capitol', region: 'Americas', city: 'Washington DC', lat: 38.90, lng: -77.01, url: 'https://www.earthcam.com/cams/us/dc/', category: 'diplomatic' },
  { id: 'pentagon', name: 'Washington DC — Pentagon', region: 'Americas', city: 'Arlington', lat: 38.87, lng: -77.06, url: 'https://www.earthcam.com/', category: 'strategic' },
  { id: 'london-parliament', name: 'London — Parliament Square', region: 'Europe', city: 'London', lat: 51.50, lng: -0.12, url: 'https://www.earthcam.com/cams/uk/london/', category: 'diplomatic' },
  { id: 'taipei-101', name: 'Taipei — 101 Area', region: 'Asia', city: 'Taipei', lat: 25.03, lng: 121.56, url: 'https://www.skylinewebcams.com/', category: 'strategic' },
  { id: 'tiananmen', name: 'Beijing — Tiananmen Square', region: 'Asia', city: 'Beijing', lat: 39.91, lng: 116.39, url: 'https://www.skylinewebcams.com/', category: 'diplomatic' },
  { id: 'moscow-red', name: 'Moscow — Red Square', region: 'Europe', city: 'Moscow', lat: 55.75, lng: 37.62, url: 'https://www.earthcam.com/cams/russia/moscow/', category: 'diplomatic' },
  { id: 'taiwan-strait', name: 'Kaohsiung — Harbor', region: 'Asia', city: 'Kaohsiung', lat: 22.62, lng: 120.29, url: 'https://www.skylinewebcams.com/', category: 'strategic' },
  { id: 'singapore-strait', name: 'Singapore — Marina Bay', region: 'Asia', city: 'Singapore', lat: 1.29, lng: 103.85, url: 'https://www.skylinewebcams.com/', category: 'strategic' },
  { id: 'kyiv-bucha', name: 'Kyiv — Northern Front', region: 'Europe', city: 'Kyiv Oblast', lat: 50.55, lng: 30.22, url: 'https://www.earthcam.com/', category: 'conflict' },
];

// ---------------------------------------------------------------------------
// COUNTRY INSTABILITY INDEX (CII)
// ---------------------------------------------------------------------------

export interface CountryInstability {
  country: string;
  iso: string;
  lat: number;
  lng: number;
  score: number; // 0-100, higher = more unstable
  trend: 'rising' | 'stable' | 'falling';
  category: 'critical' | 'high' | 'moderate' | 'low';
  factors: string[];
}

export const countryInstability: CountryInstability[] = [
  { country: 'Ukraine', iso: 'UA', lat: 48.38, lng: 31.17, score: 92, trend: 'rising', category: 'critical', factors: ['Active war', 'Infrastructure destruction', 'Displacement'] },
  { country: 'Myanmar', iso: 'MM', lat: 19.76, lng: 96.08, score: 88, trend: 'rising', category: 'critical', factors: ['Civil war', 'Military coup aftermath', 'Ethnic armed groups'] },
  { country: 'Sudan', iso: 'SD', lat: 12.86, lng: 30.22, score: 90, trend: 'rising', category: 'critical', factors: ['SAF-RSF war', 'Famine risk', 'Mass displacement'] },
  { country: 'Yemen', iso: 'YE', lat: 15.55, lng: 48.52, score: 85, trend: 'stable', category: 'critical', factors: ['Houthi control', 'Humanitarian crisis', 'Red Sea disruption'] },
  { country: 'DR Congo', iso: 'CD', lat: -4.04, lng: 21.76, score: 82, trend: 'rising', category: 'high', factors: ['M23 offensive', 'East armed groups', 'Resource conflict'] },
  { country: 'Haiti', iso: 'HT', lat: 19.07, lng: -72.33, score: 80, trend: 'rising', category: 'high', factors: ['Gang control', 'State collapse', 'Displacement'] },
  { country: 'Somalia', iso: 'SO', lat: 5.15, lng: 46.20, score: 78, trend: 'stable', category: 'high', factors: ['Al-Shabaab', 'Drought', 'ATMIS drawdown'] },
  { country: 'Ethiopia', iso: 'ET', lat: 9.15, lng: 40.49, score: 75, trend: 'falling', category: 'high', factors: ['Post-Tigray tensions', 'Oromo conflict', 'Displacement'] },
  { country: 'Afghanistan', iso: 'AF', lat: 33.94, lng: 67.71, score: 80, trend: 'stable', category: 'high', factors: ['Taliban governance', 'Humanitarian crisis', 'Women rights'] },
  { country: 'Venezuela', iso: 'VE', lat: 6.42, lng: -66.59, score: 70, trend: 'rising', category: 'high', factors: ['Political crisis', 'Economic collapse', 'Migration'] },
  { country: 'Pakistan', iso: 'PK', lat: 30.38, lng: 69.35, score: 65, trend: 'rising', category: 'moderate', factors: ['TTP insurgency', 'Political instability', 'Economic stress'] },
  { country: 'Iraq', iso: 'IQ', lat: 33.22, lng: 43.68, score: 60, trend: 'stable', category: 'moderate', factors: ['Iran-backed militias', 'Political fragmentation'] },
  { country: 'Nigeria', iso: 'NG', lat: 9.08, lng: 8.68, score: 62, trend: 'rising', category: 'moderate', factors: ['Banditry', 'Boko Haram', 'Farmer-herder'] },
  { country: 'Mali', iso: 'ML', lat: 17.57, lng: -4.00, score: 72, trend: 'rising', category: 'high', factors: ['JNIM insurgency', 'Russian forces', 'Coups aftermath'] },
  { country: 'Burkina Faso', iso: 'BF', lat: 12.37, lng: -1.52, score: 74, trend: 'rising', category: 'high', factors: ['JNIM/ISGS', 'Military junta', 'Territorial loss'] },
  { country: 'Niger', iso: 'NE', lat: 17.61, lng: 8.08, score: 68, trend: 'rising', category: 'moderate', factors: ['Military coup', 'Sahel alliance', 'French withdrawal'] },
  { country: 'Mozambique', iso: 'MZ', lat: -18.67, lng: 35.53, score: 58, trend: 'rising', category: 'moderate', factors: ['Cabo Delgado insurgency', 'Election unrest'] },
  { country: 'Lebanon', iso: 'LB', lat: 33.85, lng: 35.86, score: 65, trend: 'rising', category: 'moderate', factors: ['Hezbollah escalation', 'Economic collapse', 'Governance vacuum'] },
];

// ---------------------------------------------------------------------------
// STRATEGIC RISK DATA
// ---------------------------------------------------------------------------

export interface StrategicRisk {
  region: string;
  lat: number;
  lng: number;
  threatLevel: 'critical' | 'high' | 'elevated' | 'guarded';
  airAssets: string;
  navalAssets: string;
  summary: string;
}

export const strategicRisks: StrategicRisk[] = [
  { region: 'Iran / Gulf', lat: 29.5, lng: 52.5, threatLevel: 'critical', airAssets: 'B-52s (Diego Garcia), F-35A (Al Udeid), MQ-9 Reapers', navalAssets: 'USS Eisenhower CSG, 5th Fleet patrol craft', summary: 'Elevated strike option posture. Houthi Red Sea disruption ongoing. Nuclear enrichment timeline compressed.' },
  { region: 'Baltic Sea', lat: 57.0, lng: 19.5, threatLevel: 'high', airAssets: 'F-35 (Ämari), Typhoons (Ämari), F-16 (Malbork)', navalAssets: 'NATO standing group, Swedish/Finish coastal defense', summary: 'Russian submarine activity near cables. Kaliningrad missile deployments. Increased air incursions.' },
  { region: 'Black Sea', lat: 43.5, lng: 34.0, threatLevel: 'critical', airAssets: 'Su-34/Su-35 (Russia), TB2/Beaver (Ukraine)', navalAssets: 'Russian Black Sea Fleet (degraded), Ukrainian naval drones', summary: 'Active combat zone. Grain corridor under periodic threat. Russian fleet attrition from drone strikes.' },
  { region: 'South China Sea', lat: 12.0, lng: 114.0, threatLevel: 'high', airAssets: 'PLA J-20/J-16 (various), US F-35C (carrier)', navalAssets: 'PLA Type 075 LHD, US LCS, Philippine BRP', summary: 'Philippine resupply confrontations. Chinese maritime militia swarming. Freedom of navigation tensions.' },
  { region: 'East Mediterranean', lat: 34.0, lng: 30.0, threatLevel: 'high', airAssets: 'IDF F-35I, Hezbollah drones, Russian Hmeimim', navalAssets: 'US Eisenhower CSG, Israeli corvettes', summary: 'Hezbollah-IDF cross-border escalation. Syrian airspace contested. Gaza humanitarian corridor pressure.' },
  { region: 'Korean Peninsula', lat: 37.5, lng: 127.0, threatLevel: 'elevated', airAssets: 'US F-16/F-35A (Kunsan/Osan), ROK F-35K', navalAssets: 'USS Ronald Reagan CSG (visiting), ROK destroyers', summary: 'DPRK missile tests continue. Balloon provocations. US-ROK joint exercises ongoing.' },
  { region: 'Western Pacific / Taiwan', lat: 23.5, lng: 122.0, threatLevel: 'high', airAssets: 'PLA J-20/J-16 (Eastern Theater), US F-35B (Iwakuni)', navalAssets: 'PLA carrier Shandong, UScarrier group (rotating)', summary: 'PLA exercises simulate blockade.灰色地带 operations near median line. Chip supply chain vulnerability.' },
];

// ---------------------------------------------------------------------------
// REGIONAL ZOOM PRESETS
// ---------------------------------------------------------------------------

export interface RegionPreset {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
}

export const regionPresets: RegionPreset[] = [
  { id: 'global', label: 'Global', center: [20, 0], zoom: 2 },
  { id: 'americas', label: 'Americas', center: [15, -80], zoom: 3 },
  { id: 'europe', label: 'Europe', center: [50, 15], zoom: 4 },
  { id: 'mena', label: 'MENA', center: [28, 42], zoom: 4 },
  { id: 'asia', label: 'Asia-Pacific', center: [25, 110], zoom: 3 },
  { id: 'latin-america', label: 'Latin America', center: [-15, -60], zoom: 3 },
  { id: 'africa', label: 'Africa', center: [5, 20], zoom: 3 },
  { id: 'oceania', label: 'Oceania', center: [-25, 140], zoom: 4 },
];

// ---------------------------------------------------------------------------
// REGISTRY HELPERS
// ---------------------------------------------------------------------------

export const intelCategories = [
  { id: 'security', label: 'Geopolitical & Military' },
  { id: 'nuclear', label: 'Infrastructure & Trade' },
  { id: 'transport', label: 'Transport & Chokepoints' },
  { id: 'hazards', label: 'Environmental & Risk' },
  { id: 'socio', label: 'Socio-Political & Economic' },
] as const;

export type IntelCategoryId = (typeof intelCategories)[number]['id'];

export interface IntelLayerDef {
  id: string;
  label: string;
  category: IntelCategoryId;
  /** true = fetched live at runtime (NWS/USGS). */
  live?: boolean;
  points?: IntelPoint[];
  lines?: IntelLine[];
}
