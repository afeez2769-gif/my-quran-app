// Lightweight prayer time calculator based on standard sun-position formulas.
// Angles: Fajr 20°, Isha 18° (JAKIM-style), Asr = Shafi (shadow factor 1), sunrise/sunset horizon 0.833°.
const PrayerTimes = (function(){
  const DR = Math.PI/180, DG = 180/Math.PI;
  const sin = d => Math.sin(d*DR), cos = d => Math.cos(d*DR), tan = d => Math.tan(d*DR);
  const arcsin = x => Math.asin(x)*DG, arccos = x => Math.acos(x)*DG, arccot = x => Math.atan(1/x)*DG, arctan2 = (y,x) => Math.atan2(y,x)*DG;
  const fixHour = h => { h = h - 24*Math.floor(h/24); return h; };

  function julian(year, month, day){
    if(month <= 2){ year -= 1; month += 12; }
    const A = Math.floor(year/100);
    const B = 2 - A + Math.floor(A/4);
    return Math.floor(365.25*(year+4716)) + Math.floor(30.6001*(month+1)) + day + B - 1524.5;
  }

  function sunPosition(jd){
    const D = jd - 2451545.0;
    const g = fixHour(357.529 + 0.98560028*D) ;
    const q = fixHour(280.459 + 0.98564736*D);
    const L = fixHour(q + 1.915*sin(g) + 0.020*sin(2*g));
    const e = 23.439 - 0.00000036*D;
    const RA = arctan2(cos(e)*sin(L), cos(L)) / 15;
    const eqt = q/15 - fixHour(RA);
    const decl = arcsin(sin(e)*sin(L));
    return { declination: decl, equation: eqt };
  }

  function computeTime(angle, lat, decl, noon, isAfter){
    const val = (-sin(angle) - sin(lat)*sin(decl)) / (cos(lat)*cos(decl));
    let clamped = Math.max(-1, Math.min(1, val));
    const H = arccos(clamped) / 15;
    return noon + (isAfter ? H : -H);
  }

  function asrTime(factor, lat, decl, noon){
    const angle = -arccot(factor + tan(Math.abs(lat - decl)));
    return computeTime(angle, lat, decl, noon, true);
  }

  function getTimes(date, lat, lng, timezone, fajrAngle, ishaAngle, asrFactor){
    fajrAngle = fajrAngle || 20;
    ishaAngle = ishaAngle || 18;
    asrFactor = asrFactor || 1; // Shafi

    const jd = julian(date.getFullYear(), date.getMonth()+1, date.getDate());
    const sp = sunPosition(jd + 0.5 - lng/(15*24));
    const decl = sp.declination, eqt = sp.equation;
    const noon = fixHour(12 + timezone - lng/15 - eqt);

    const fajr = computeTime(fajrAngle, lat, decl, noon, false);
    const sunrise = computeTime(0.833, lat, decl, noon, false);
    const dhuhr = noon;
    const asr = asrTime(asrFactor, lat, decl, noon);
    const sunset = computeTime(0.833, lat, decl, noon, true);
    const maghrib = sunset;
    const isha = computeTime(ishaAngle, lat, decl, noon, true);

    return { fajr, sunrise, dhuhr, asr, maghrib, isha };
  }

  return { getTimes };
})();
