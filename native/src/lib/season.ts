// @ts-nocheck
/* Seasonal OENOD logo for the app. The calendar and the art are copied as they are from the website's
   splash.js (splash-1), so the app and oenod.com show the same look on the same day.
   Country: company time zone > phone time zone > phone region > Canada. Languages: app language + phone languages.
   HQ's switch (Platform > Seasonal logo) is read from oenod.com once a day; it stays on if that check fails. */
import * as Localization from 'expo-localization';
import { secure as Store } from './secure';
import { BASE } from './api';

var VB = '-25.7 -9.6 2378.2 671.3'; // the logo's own coordinates, with room for the art around the dot

  // Moving dates (Islamic, Hindu and lunar calendars). Add the next years before 2032.
  var EIDF = ['2026-03-20', '2027-03-10', '2028-02-27', '2029-02-15', '2030-02-05', '2031-01-25', '2032-01-14'];
  var EIDA = ['2026-05-27', '2027-05-17', '2028-05-05', '2029-04-24', '2030-04-13', '2031-04-02', '2032-03-22'];
  var RAMA = ['2026-02-18', '2027-02-08', '2028-01-28', '2029-01-16', '2030-01-05', '2030-12-26', '2031-12-15'];
  var DIWALI = ['2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26', '2031-11-14', '2032-11-02'];
  var LUNAR = ['2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11'];

  var set = function (s) { var o = {}; s.split(' ').forEach(function (k) { o[k] = 1; }); return o; };
  var MUSLIM = set('SA AE QA KW BH OM YE IR IQ JO SY LB PS EG LY TN DZ MA MR SD SO DJ TR AZ KZ UZ TJ KG TM AF PK BD MV MY ID BN SN ML NE GM GN NG');
  var NO_XMAS = set('SA AE QA KW BH OM YE IR AF MV MR LY DZ TN MA SO DJ TR AZ UZ TJ TM PK CN JP TH VN IL');
  var NO_VAL = set('SA AE QA KW BH OM YE IR AF MV MR LY DZ TN MA SO DJ PK BD ID MY BN TJ TM UZ');
  var HALLO = set('CA US GB IE AU NZ');
  var POPPY = set('CA GB AU NZ');
  var PAT = set('IE US CA');
  var DIW = set('IN NP SG MY FJ MU TT GY SR LK');
  var LUN = set('CN TW HK MO SG MY VN KR ID PH');
  // National days: [month, day, look options]
  var NATIONAL = {
    IN: [[8, 15], [1, 26]], PK: [[8, 14]], MX: [[9, 16]], FR: [[7, 14]], DE: [[10, 3]], IT: [[6, 2]], ES: [[10, 12]], PL: [[5, 3]], NL: [[4, 27]],
    UA: [[8, 24]], PH: [[6, 12]], AE: [[12, 2]], SA: [[9, 23]], NG: [[10, 1]], CN: [[10, 1]], TR: [[10, 29]], BR: [[9, 7]], CO: [[7, 20]], EG: [[7, 23]],
  };
  var FLAG = { // stripes: [direction h|v, colours...] or a glyph look
    IN: ['h', '#FF9933', '#FFFFFF', '#138808'], MX: ['v', '#006847', '#FFFFFF', '#CE1126'], FR: ['v', '#0055A4', '#FFFFFF', '#EF4135'],
    DE: ['h', '#000000', '#DD0000', '#FFCE00'], IT: ['v', '#009246', '#FFFFFF', '#CE2B37'], ES: ['h', '#AA151B', '#F1BF00', '#F1BF00', '#AA151B'],
    PL: ['h', '#FFFFFF', '#DC143C'], NL: ['h', '#AE1C28', '#FFFFFF', '#21468B'], UA: ['h', '#0057B7', '#FFD700'], PH: ['h', '#0038A8', '#CE1126'],
    AE: ['h', '#00732F', '#FFFFFF', '#000000'], NG: ['v', '#008751', '#FFFFFF', '#008751'], CO: ['h', '#FCD116', '#FCD116', '#003893', '#CE1126'],
    EG: ['h', '#CE1126', '#FFFFFF', '#000000'], BR: ['h', '#009C3B', '#FFDF00', '#009C3B'],
    PK: ['g', '#01411C', 'crescent'], TR: ['g', '#E30A17', 'crescent'], SA: ['g', '#006C35', 'none'], CN: ['g', '#DE2910', 'star'],
  };

  var ymd = function (dt) { return dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2); };
  var parse = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var add = function (dt, n) { var x = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); x.setDate(x.getDate() + n); return x; };
  var within = function (t, a, b) { var s = ymd(t); return s >= ymd(a) && s <= ymd(b); };
  var nthWeekday = function (y, m, wd, n) { var d = new Date(y, m - 1, 1); var off = (wd - d.getDay() + 7) % 7; return new Date(y, m - 1, 1 + off + 7 * (n - 1)); };
  var moving = function (t, list, before, after) { for (var i = 0; i < list.length; i++) { var d = parse(list[i]); if (within(t, add(d, -before), add(d, after))) return true; } return false; };
  var md = function (t, m1, d1, m2, d2) { var y = t.getFullYear(); return within(t, new Date(y, m1 - 1, d1), new Date(y, m2 - 1, d2)); };

  // The looks, in priority order (the first one that matches today wins).
  var LOOKS = [
    { key: 'eid', name: 'Eid Mubarak', when: 'Eid al-Fitr (3 days) and Eid al-Adha (4 days)', who: 'Muslim-majority countries, and anyone using Arabic or Urdu',
      test: function (t, c, L) { return (MUSLIM[c] || L.ar || L.ur) && (moving(t, EIDF, 0, 2) || moving(t, EIDA, 0, 3)); } },
    { key: 'diwali', name: 'Diwali', when: '2 days before to 2 days after Diwali', who: 'India, Nepal, Singapore, Malaysia, Fiji, Mauritius, Sri Lanka, Trinidad, Guyana, and anyone using Hindi or Punjabi',
      test: function (t, c, L) { return (DIW[c] || L.hi || L.pa) && moving(t, DIWALI, 2, 2); } },
    { key: 'lunar', name: 'Lunar New Year', when: 'Eve to 4 days after Lunar New Year', who: 'China, Taiwan, Hong Kong, Macau, Singapore, Malaysia, Vietnam, Korea, Indonesia, Philippines, and anyone using Chinese',
      test: function (t, c, L) { return (LUN[c] || L.zh) && moving(t, LUNAR, 1, 4); } },
    { key: 'canada', name: 'Canada Day', when: 'June 30 and July 1', who: 'Canada', test: function (t, c) { return c === 'CA' && md(t, 6, 30, 7, 1); } },
    { key: 'july4', name: 'Independence Day', when: 'July 3 and 4', who: 'United States', test: function (t, c) { return c === 'US' && md(t, 7, 3, 7, 4); } },
    { key: 'national', name: 'National day', when: "The country's national day", who: 'India, Pakistan, Mexico, France, Germany, Italy, Spain, Poland, Netherlands, Ukraine, Philippines, UAE, Saudi Arabia, Nigeria, China, Turkey, Brazil, Colombia, Egypt',
      test: function (t, c) { var n = NATIONAL[c]; if (!n) return false; for (var i = 0; i < n.length; i++) if (t.getMonth() + 1 === n[i][0] && t.getDate() === n[i][1]) return true; return false; } },
    { key: 'xmas', name: 'Christmas', when: 'December 18 to 26', who: 'Countries that celebrate Christmas', test: function (t, c) { return !NO_XMAS[c] && md(t, 12, 18, 12, 26); } },
    { key: 'newyear', name: 'New Year', when: 'December 31 to January 2', who: 'Everyone', test: function (t) { return md(t, 12, 31, 12, 31) || md(t, 1, 1, 1, 2); } },
    { key: 'poppy', name: 'Remembrance Day', when: 'November 4 to 11', who: 'Canada, United Kingdom, Australia, New Zealand', test: function (t, c) { return POPPY[c] && md(t, 11, 4, 11, 11); } },
    { key: 'halloween', name: 'Halloween', when: 'October 27 to 31', who: 'Canada, United States, United Kingdom, Ireland, Australia, New Zealand', test: function (t, c) { return HALLO[c] && md(t, 10, 27, 10, 31); } },
    { key: 'thanks', name: 'Thanksgiving', when: 'Thanksgiving weekend', who: 'Canada (October) and United States (November)',
      test: function (t, c) { var y = t.getFullYear(); if (c === 'CA') { var m = nthWeekday(y, 10, 1, 2); return within(t, add(m, -2), m); } if (c === 'US') { var th = nthWeekday(y, 11, 4, 4); return within(t, th, add(th, 3)); } return false; } },
    { key: 'stpat', name: "St. Patrick's Day", when: 'March 16 and 17', who: 'Ireland, United States, Canada', test: function (t, c) { return PAT[c] && md(t, 3, 16, 3, 17); } },
    { key: 'valentine', name: "Valentine's Day", when: 'February 13 and 14', who: 'Countries that mark Valentine’s Day', test: function (t, c) { return !NO_VAL[c] && md(t, 2, 13, 2, 14); } },
    { key: 'ramadan', name: 'Ramadan Kareem', when: 'The month of Ramadan', who: 'Muslim-majority countries, and anyone using Arabic or Urdu',
      test: function (t, c, L) { if (!(MUSLIM[c] || L.ar || L.ur)) return false; for (var i = 0; i < RAMA.length; i++) if (within(t, parse(RAMA[i]), add(parse(EIDF[i]), -1))) return true; return false; } },
  ];
  var BY = {}; LOOKS.forEach(function (l) { BY[l.key] = l; });

  // ------------------------------------------------------------------ where is the visitor
  var TZ = {
    'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Lisbon': 'PT',
    'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Warsaw': 'PL', 'Europe/Kyiv': 'UA', 'Europe/Kiev': 'UA', 'Europe/Istanbul': 'TR', 'Europe/Moscow': 'RU',
    'Europe/Zurich': 'CH', 'Europe/Vienna': 'AT', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Athens': 'GR', 'Europe/Bucharest': 'RO',
    'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH',
    'Asia/Muscat': 'OM', 'Asia/Aden': 'YE', 'Asia/Tehran': 'IR', 'Asia/Kabul': 'AF', 'Asia/Dhaka': 'BD', 'Asia/Kathmandu': 'NP', 'Asia/Colombo': 'LK', 'Asia/Baghdad': 'IQ',
    'Asia/Amman': 'JO', 'Asia/Beirut': 'LB', 'Asia/Damascus': 'SY', 'Asia/Jerusalem': 'IL', 'Asia/Gaza': 'PS', 'Asia/Hebron': 'PS', 'Asia/Shanghai': 'CN', 'Asia/Urumqi': 'CN',
    'Asia/Hong_Kong': 'HK', 'Asia/Macau': 'MO', 'Asia/Taipei': 'TW', 'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID',
    'Asia/Manila': 'PH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Bangkok': 'TH', 'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP', 'Asia/Baku': 'AZ', 'Asia/Tashkent': 'UZ',
    'Asia/Almaty': 'KZ', 'Asia/Brunei': 'BN', 'Indian/Maldives': 'MV', 'Indian/Mauritius': 'MU', 'Pacific/Fiji': 'FJ', 'Pacific/Auckland': 'NZ', 'Pacific/Honolulu': 'US',
    'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE', 'Africa/Johannesburg': 'ZA', 'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ', 'Africa/Tunis': 'TN',
    'Africa/Tripoli': 'LY', 'Africa/Khartoum': 'SD', 'Africa/Mogadishu': 'SO', 'Africa/Dakar': 'SN', 'Africa/Accra': 'GH', 'Africa/Addis_Ababa': 'ET',
    'America/Sao_Paulo': 'BR', 'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Santiago': 'CL', 'America/Caracas': 'VE', 'America/Port_of_Spain': 'TT',
    'America/Guyana': 'GY', 'America/Paramaribo': 'SR', 'America/Jamaica': 'JM', 'America/Puerto_Rico': 'PR',
  };
  var CA_TZ = set('Toronto Vancouver Edmonton Winnipeg Halifax St_Johns Regina Moncton Whitehorse Yellowknife Iqaluit Glace_Bay Goose_Bay Dawson_Creek Fort_Nelson Creston Swift_Current Rankin_Inlet Cambridge_Bay Inuvik Atikokan Blanc-Sablon Rainy_River Thunder_Bay Nipigon Montreal Dawson Resolute Pangnirtung Coral_Harbour');
  var MX_TZ = set('Mexico_City Cancun Merida Monterrey Matamoros Chihuahua Ciudad_Juarez Hermosillo Mazatlan Tijuana Bahia_Banderas Ojinaga');
  var tzCountry = function (zone) {
    var z = ''; z = zone || '';
    if (TZ[z]) return TZ[z];
    var p = z.split('/');
    if (p[0] === 'Australia') return 'AU';
    if (p[0] === 'America') { var c = p[p.length - 1]; if (CA_TZ[c]) return 'CA'; if (MX_TZ[c]) return 'MX'; if (p[1] === 'Argentina' || c === 'Buenos_Aires') return 'AR';
      if (/^(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Adak|Menominee|Sitka|Nome|Yakutat|Metlakatla)$/.test(c) || p[1] === 'Indiana' || p[1] === 'Kentucky' || p[1] === 'North_Dakota') return 'US'; }
    return '';
  };
  var pick = function (c, L, t) { for (var i = 0; i < LOOKS.length; i++) if (LOOKS[i].test(t, c, L)) return LOOKS[i].key; return null; };
  // ------------------------------------------------------------------ art (drawn over the logo dot; same coordinates as the logo)
  var n = 0;
  var disc = function (fill, r) { return '<circle cx="184" cy="335" r="' + (r || 178) + '" fill="' + fill + '"/>'; };
  var star = function (cx, cy, ro, ri, fill, rot) {
    var p = []; for (var i = 0; i < 10; i++) { var a = (Math.PI / 5) * i - Math.PI / 2 + (rot || 0), r = i % 2 ? ri : ro; p.push((cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1)); }
    return '<path fill="' + fill + '" d="M' + p.join('L') + 'Z"/>';
  };
  var spark = function (cx, cy, s, fill, op) { return '<path fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + ' d="M' + cx + ' ' + (cy - s) + 'Q' + (cx + s * 0.16) + ' ' + (cy - s * 0.16) + ' ' + (cx + s) + ' ' + cy + 'Q' + (cx + s * 0.16) + ' ' + (cy + s * 0.16) + ' ' + cx + ' ' + (cy + s) + 'Q' + (cx - s * 0.16) + ' ' + (cy + s * 0.16) + ' ' + (cx - s) + ' ' + cy + 'Q' + (cx - s * 0.16) + ' ' + (cy - s * 0.16) + ' ' + cx + ' ' + (cy - s) + 'Z"/>'; };
  var crescent = function (id, cx, cy, r, fill) { // a crescent opening to the right
    return '<mask id="' + id + '"><rect x="-200" y="-200" width="900" height="900" fill="#000"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff"/><circle cx="' + (cx + r * 0.42) + '" cy="' + (cy - r * 0.12) + '" r="' + (r * 0.84) + '" fill="#000"/></mask>' +
      '<rect x="-200" y="-200" width="900" height="900" fill="' + fill + '" mask="url(#' + id + ')"/>';
  };
  var MAPLE = 'm-90 2030 45-863a95 95 0 0 0-111-98l-859 151 116-320a65 65 0 0 0-20-73l-941-762 212-99a65 65 0 0 0 34-79l-186-572 542 115a65 65 0 0 0 73-38l105-247 423 454a65 65 0 0 0 111-57l-204-1052 327 189a65 65 0 0 0 91-27l332-652 332 652a65 65 0 0 0 91 27l327-189-204 1052a65 65 0 0 0 111 57l423-454 105 247a65 65 0 0 0 73 38l542-115-186 572a65 65 0 0 0 34 79l212 99-941 762a65 65 0 0 0-20 73l116 320-859-151a95 95 0 0 0-111 98l45 863z';
  var maple = function (fill, s, dy) { return '<path fill="' + fill + '" transform="translate(184 ' + (335 + (dy || 0)) + ') scale(' + s + ')" d="' + MAPLE + '"/>'; };
  var heart = function (fill, s) { return '<path fill="' + fill + '" transform="translate(184 352) scale(' + s + ')" d="M0 34C-26 14-62-8-62-38-62-60-45-74-27-74-14-74-5-67 0-58 5-67 14-74 27-74 45-74 62-60 62-38 62-8 26 14 0 34Z"/>'; };
  var stripes = function (id, f) {
    var dir = f[0], cols = f.slice(1), k = cols.length, out = '<clipPath id="' + id + '"><circle cx="184" cy="335" r="178"/></clipPath><g clip-path="url(#' + id + ')">';
    for (var i = 0; i < k; i++) out += dir === 'h' ? '<rect x="0" y="' + (157 + (356 / k) * i).toFixed(1) + '" width="370" height="' + (356 / k + 1).toFixed(1) + '" fill="' + cols[i] + '"/>' : '<rect x="' + (6 + (356 / k) * i).toFixed(1) + '" y="150" width="' + (356 / k + 1).toFixed(1) + '" height="370" fill="' + cols[i] + '"/>';
    return out + '</g><circle cx="184" cy="335" r="177" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="6"/>';
  };
  var ring = '<circle cx="184" cy="335" r="176" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="7"/>';

  var art = function (key, cc) {
    var u = 'oes' + (++n), g = '';
    switch (key) {
      case 'xmas': // Santa hat resting on the dot
        return '<g transform="rotate(-14 184 335)"><path fill="#C8102E" d="M40 214C52 120 118 40 214 14 274-2 330 18 356 58 300 54 270 84 276 136 280 168 300 196 330 214Z"/>' +
          '<path fill="#9E0B22" opacity=".55" d="M214 14C274-2 330 18 356 58 318 52 292 66 280 92 262 60 240 34 214 14Z"/>' +
          '<rect x="22" y="196" width="326" height="74" rx="37" fill="#FFFFFF"/><rect x="22" y="230" width="326" height="40" rx="20" fill="#E6EBF5"/>' +
          '<circle cx="358" cy="68" r="46" fill="#FFFFFF"/><circle cx="366" cy="78" r="28" fill="#E6EBF5" opacity=".7"/></g>';
      case 'poppy': // Remembrance poppy
        g = '<g>';
        [[0, -64], [64, 0], [0, 64], [-64, 0]].forEach(function (p, i) { g += '<circle cx="' + (184 + p[0]) + '" cy="' + (335 + p[1]) + '" r="120" fill="' + (i % 2 ? '#B3122B' : '#D0213D') + '"/>'; });
        return g + '<circle cx="184" cy="335" r="122" fill="#D52A43"/><circle cx="184" cy="335" r="50" fill="#141414"/><circle cx="170" cy="322" r="12" fill="#3A3A3A"/></g>';
      case 'canada': return disc('#FFFFFF') + maple('#D80621', 0.062, 6) + ring;
      case 'thanks': return '<defs><linearGradient id="' + u + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2A541"/><stop offset="1" stop-color="#C8621B"/></linearGradient></defs>' + disc('url(#' + u + 'g)') + maple('#FFFFFF', 0.052, 6);
      case 'halloween': // pumpkin
        return '<path fill="#3E7D2C" d="M176 170C172 140 180 118 204 104L220 116C204 130 200 148 204 172Z"/>' +
          '<ellipse cx="108" cy="345" rx="96" ry="160" fill="#E06A12"/><ellipse cx="260" cy="345" rx="96" ry="160" fill="#E06A12"/><ellipse cx="184" cy="345" rx="104" ry="170" fill="#F5831F"/>' +
          '<ellipse cx="184" cy="345" rx="40" ry="164" fill="#FF9838" opacity=".55"/>';
      case 'valentine': return disc('#D7264F') + heart('#FFFFFF', 1.55) + ring;
      case 'stpat':
        g = disc('#169B62') + '<g fill="#FFFFFF">';
        [[0, -58], [55, 18], [-55, 18]].forEach(function (p) { g += '<circle cx="' + (184 + p[0] * 0.9) + '" cy="' + (318 + p[1] * 0.9) + '" r="52"/>'; });
        return g + '<path d="M180 330C188 380 196 420 222 452L208 460C180 428 170 386 168 332Z"/></g>';
      case 'newyear':
        return '<defs><radialGradient id="' + u + 'g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFF4C2"/><stop offset=".45" stop-color="#F1C95B"/><stop offset="1" stop-color="#B8862A"/></radialGradient></defs>' +
          disc('url(#' + u + 'g)') + spark(-30, 150, 58, '#F1C95B') + spark(60, 60, 34, '#FFFFFF', 0.9) + spark(330, 120, 40, '#F1C95B', 0.95) + spark(-60, 470, 30, '#FFFFFF', 0.7);
      case 'lunar': // red lantern
        return '<rect x="150" y="128" width="68" height="30" rx="8" fill="#E2B13C"/><rect x="150" y="512" width="68" height="30" rx="8" fill="#E2B13C"/>' +
          '<ellipse cx="184" cy="335" rx="188" ry="182" fill="#D7261E"/><ellipse cx="184" cy="335" rx="110" ry="182" fill="none" stroke="#B51A14" stroke-width="10"/><ellipse cx="184" cy="335" rx="40" ry="182" fill="none" stroke="#B51A14" stroke-width="10"/>' +
          '<path stroke="#E2B13C" stroke-width="10" d="M184 542V600"/><path fill="#E2B13C" d="M166 596H202L196 650H172Z"/>';
      case 'eid':
        return '<defs><radialGradient id="' + u + 'g" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#FCE7A2"/><stop offset=".5" stop-color="#E3B451"/><stop offset="1" stop-color="#A97A25"/></radialGradient></defs>' +
          disc('url(#' + u + 'g)') + crescent(u + 'm', 168, 340, 112, '#FFFFFF') + star(254, 300, 36, 15, '#FFFFFF', 0.3) + spark(330, 110, 36, '#E3B451') + spark(20, 140, 26, '#FFFFFF', 0.8);
      case 'ramadan':
        return disc('#FFFFFF') + crescent(u + 'm', 166, 340, 114, '#C99A3B') + star(254, 298, 34, 14, '#C99A3B', 0.3) + '<circle cx="184" cy="335" r="176" fill="none" stroke="#C99A3B" stroke-width="7"/>';
      case 'diwali': // diya lamp with a flame
        return '<defs><radialGradient id="' + u + 'g" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#FFD98A"/><stop offset=".55" stop-color="#F0A23B"/><stop offset="1" stop-color="#C26A12"/></radialGradient></defs>' +
          disc('url(#' + u + 'g)') + '<path fill="#FFFFFF" d="M184 196C222 250 236 290 226 322 218 348 200 360 184 360 168 360 150 348 142 322 132 290 146 250 184 196Z"/>' +
          '<path fill="#FFE6A8" d="M184 262C200 288 204 306 198 322 194 334 190 340 184 340 178 340 174 334 170 322 164 306 168 288 184 262Z"/>' +
          '<path fill="#FFFFFF" d="M80 384H288C280 440 240 470 184 470 128 470 88 440 80 384Z"/>';
      case 'july4': return disc('#1F3A93') + star(184, 342, 118, 48, '#FFFFFF') + spark(330, 110, 40, '#E63946') + spark(10, 160, 30, '#FFFFFF', 0.85) + ring;
      case 'national':
        var f = FLAG[cc] || ['h', '#0B1B3F', '#FFFFFF'];
        if (f[0] !== 'g') return stripes(u + 'c', f) + spark(330, 110, 38, '#FFFFFF', 0.9);
        g = disc(f[1]);
        if (f[2] === 'crescent') g += crescent(u + 'm', 168, 340, 108, '#FFFFFF') + star(250, 300, 34, 14, '#FFFFFF', 0.3);
        if (f[2] === 'star') g += star(184, 335, 100, 40, '#FFDE00');
        return g + ring;
    }
    return '';
  };

export const VIEWBOX = VB;
export type LookKey = 'eid' | 'diwali' | 'lunar' | 'canada' | 'july4' | 'national' | 'xmas' | 'newyear' | 'poppy' | 'halloween' | 'thanks' | 'stpat' | 'valentine' | 'ramadan';
export const LOOK_KEYS: LookKey[] = LOOKS.map(function (l) { return l.key; });
export const lookName = (k) => (BY[k] ? BY[k].name : '');

let hqOn = true;
let forced: string | null = null; // preview from Me > Appearance (or ?season=xmas on the web test build)
try { const q = (globalThis as any).location?.search ? new URLSearchParams((globalThis as any).location.search).get('season') : null; if (q) forced = q.toLowerCase(); } catch (e) {}
let zoneOverride = '';
let langOverride = '';
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => { try { f(); } catch (e) {} });
export const onSeason = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export function setSeasonContext(companyZone?: string | null, appLang?: string | null) {
  const z = companyZone === undefined ? zoneOverride : (companyZone || '');
  const l = appLang === undefined ? langOverride : (appLang || '');
  if (z === zoneOverride && l === langOverride) return;
  zoneOverride = z; langOverride = l; emit();
}
export function previewSeason(k: string | null) { forced = k; emit(); }

export function seasonCountry(): string {
  let phoneZone = '';
  try { phoneZone = (Localization.getCalendars()[0] || {}).timeZone || ''; } catch (e) {}
  let region = '';
  try { region = (Localization.getLocales()[0] || {}).regionCode || ''; } catch (e) {}
  return tzCountry(zoneOverride) || tzCountry(phoneZone) || (region ? String(region).toUpperCase() : '') || 'CA';
}
function seasonLangs() {
  const L = {};
  try { Localization.getLocales().forEach((x) => { if (x.languageCode) L[String(x.languageCode).slice(0, 2).toLowerCase()] = 1; }); } catch (e) {}
  if (langOverride) L[langOverride.slice(0, 2)] = 1;
  return L;
}
/** Today's look, or null for the plain logo. */
export function currentLook(dt?: Date): { key: string; cc: string } | null {
  const cc = seasonCountry();
  if (forced === 'none') return null;
  if (forced && BY[forced]) return { key: forced, cc };
  if (!hqOn) return null;
  const k = pick(cc, seasonLangs(), dt || new Date());
  return k ? { key: k, cc } : null;
}
/** The art as SVG markup (no <svg> wrapper), in the logo's own coordinates. */
export const seasonArt = (key: string, cc: string): string => art(key, cc);

/** Reads HQ's on/off switch from the website's page once a day. Never blocks; failure keeps it on. */
export async function loadSeasonSwitch() {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const saved = await Store.get('oes.switch');
    if (saved && saved.slice(0, 10) === day) { const was = hqOn; hqOn = saved.slice(11) !== 'off'; if (was !== hqOn) emit(); return; }
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(BASE + '/?oes=1', { signal: ctl.signal, headers: { Accept: 'text/html' } });
    clearTimeout(tm);
    const html = (await r.text()).slice(0, 6000);
    const m = /data-season="(on|off)"/.exec(html);
    if (!m) return;
    const was = hqOn; hqOn = m[1] !== 'off';
    await Store.set('oes.switch', day + ' ' + m[1]);
    if (was !== hqOn) emit();
  } catch (e) { /* offline: keep the calendar */ }
}
