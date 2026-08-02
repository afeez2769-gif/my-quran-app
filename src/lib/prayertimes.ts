// src/lib/prayertimes.ts
// Lightweight prayer time calculator based on standard sun-position formulas.
// Angles: Fajr 20°, Isha 18° (JAKIM-style), Asr = Shafi (shadow factor 1).

export type PrayerTimesResult = {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
};

const DR = Math.PI / 180;
const DG = 180 / Math.PI;
const sin = (d: number) => Math.sin(d * DR);
const cos = (d: number) => Math.cos(d * DR);
const tan = (d: number) => Math.tan(d * DR);
const arcsin = (x: number) => Math.asin(x) * DG;
const arccos = (x: number) => Math.acos(x) * DG;
const arccot = (x: number) => Math.atan(1 / x) * DG;
const arctan2 = (y: number, x: number) => Math.atan2(y, x) * DG;
const fixHour = (h: number) => h - 24 * Math.floor(h / 24);

function julian(year: number, month: number, day: number): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fixHour(357.529 + 0.98560028 * D);
  const q = fixHour(280.459 + 0.98564736 * D);
  const L = fixHour(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
  const eqt = q / 15 - fixHour(RA);
  const decl = arcsin(sin(e) * sin(L));
  return { declination: decl, equation: eqt };
}

function computeTime(angle: number, lat: number, decl: number, noon: number, isAfter: boolean): number {
  const val = (-sin(angle) - sin(lat) * sin(decl)) / (cos(lat) * cos(decl));
  const clamped = Math.max(-1, Math.min(1, val));
  const H = arccos(clamped) / 15;
  return noon + (isAfter ? H : -H);
}

function asrTime(factor: number, lat: number, decl: number, noon: number): number {
  const angle = -arccot(factor + tan(Math.abs(lat - decl)));
  return computeTime(angle, lat, decl, noon, true);
}

export function getPrayerTimes(
  date: Date,
  lat: number,
  lng: number,
  timezone: number,
  fajrAngle = 20,
  ishaAngle = 18,
  asrFactor = 1
): PrayerTimesResult {
  const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const sp = sunPosition(jd + 0.5 - lng / (15 * 24));
  const decl = sp.declination, eqt = sp.equation;
  const noon = fixHour(12 + timezone - lng / 15 - eqt);

  const fajr = computeTime(fajrAngle, lat, decl, noon, false);
  const sunrise = computeTime(0.833, lat, decl, noon, false);
  const dhuhr = noon;
  const asr = asrTime(asrFactor, lat, decl, noon);
  const maghrib = computeTime(0.833, lat, decl, noon, true);
  const isha = computeTime(ishaAngle, lat, decl, noon, true);

  return { fajr, sunrise, dhuhr, asr, maghrib, isha };
}

export function formatTime(hoursFloat: number): string {
  if (isNaN(hoursFloat)) return '--:--';
  let h = Math.floor(hoursFloat);
  let m = Math.round((hoursFloat - h) * 60);
  if (m === 60) { m = 0; h += 1; }
  h = ((h % 24) + 24) % 24;
  const period = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')}${period}`;
}

export function hijriDate(date: Date): string {
  let jd = Math.floor((1461 * (date.getFullYear() + 4800 + Math.floor((date.getMonth() + 1 - 14) / 12))) / 4)
    + Math.floor((367 * (date.getMonth() + 1 - 2 - 12 * (Math.floor((date.getMonth() + 1 - 14) / 12)))) / 12)
    - Math.floor((3 * Math.floor((date.getFullYear() + 4900 + Math.floor((date.getMonth() + 1 - 14) / 12)) / 100)) / 4)
    + date.getDate() - 32075;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l) / 709);
  const hDay = l - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  const monthNames = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];
  return `${hDay} ${monthNames[hMonth - 1]} ${hYear}H`;
}

export function computeQiblaBearing(lat: number, lng: number): number {
  const KAABA_LAT = 21.4225, KAABA_LNG = 39.8262;
  const toRad = (d: number) => d * Math.PI / 180;
  const toDeg = (r: number) => r * 180 / Math.PI;
  const phiK = toRad(KAABA_LAT), lambdaK = toRad(KAABA_LNG);
  const phi = toRad(lat), lambda = toRad(lng);
  const y = Math.sin(lambdaK - lambda);
  const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
