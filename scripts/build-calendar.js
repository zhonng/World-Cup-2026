import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const ESPN_LEAGUE = process.env.ESPN_LEAGUE || "fifa.world";
const START_DATE = process.env.START_DATE || "2026-06-11";
const END_DATE = process.env.END_DATE || "2026-07-19";
const CALENDAR_NAME = process.env.CALENDAR_NAME || "2026 FIFA World Cup";
const TEAM_LOCALE = process.env.TEAM_LOCALE || "zh-CN";
const SHOW_FLAGS = process.env.SHOW_FLAGS !== "false";
const UID_DOMAIN = process.env.UID_DOMAIN || "calendar.local";
const PRODUCT_ID = "-//World Cup Calendar//2026 FIFA World Cup//CN";
const DEFAULT_DURATION_MINUTES = Number(process.env.MATCH_DURATION_MINUTES || 120);

const TEAMS = {
  "Algeria": { zh: "阿尔及利亚", flag: "🇩🇿" },
  "Argentina": { zh: "阿根廷", flag: "🇦🇷" },
  "Australia": { zh: "澳大利亚", flag: "🇦🇺" },
  "Austria": { zh: "奥地利", flag: "🇦🇹" },
  "Belgium": { zh: "比利时", flag: "🇧🇪" },
  "Bosnia-Herzegovina": { zh: "波黑", flag: "🇧🇦" },
  "Brazil": { zh: "巴西", flag: "🇧🇷" },
  "Canada": { zh: "加拿大", flag: "🇨🇦" },
  "Cape Verde": { zh: "佛得角", flag: "🇨🇻" },
  "Colombia": { zh: "哥伦比亚", flag: "🇨🇴" },
  "Congo DR": { zh: "刚果民主共和国", flag: "🇨🇩" },
  "Croatia": { zh: "克罗地亚", flag: "🇭🇷" },
  "Curaçao": { zh: "库拉索", flag: "🇨🇼" },
  "Czechia": { zh: "捷克", flag: "🇨🇿" },
  "Ecuador": { zh: "厄瓜多尔", flag: "🇪🇨" },
  "Egypt": { zh: "埃及", flag: "🇪🇬" },
  "England": { zh: "英格兰", flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}" },
  "France": { zh: "法国", flag: "🇫🇷" },
  "Germany": { zh: "德国", flag: "🇩🇪" },
  "Ghana": { zh: "加纳", flag: "🇬🇭" },
  "Haiti": { zh: "海地", flag: "🇭🇹" },
  "Iran": { zh: "伊朗", flag: "🇮🇷" },
  "Iraq": { zh: "伊拉克", flag: "🇮🇶" },
  "Ivory Coast": { zh: "科特迪瓦", flag: "🇨🇮" },
  "Japan": { zh: "日本", flag: "🇯🇵" },
  "Jordan": { zh: "约旦", flag: "🇯🇴" },
  "Mexico": { zh: "墨西哥", flag: "🇲🇽" },
  "Morocco": { zh: "摩洛哥", flag: "🇲🇦" },
  "Netherlands": { zh: "荷兰", flag: "🇳🇱" },
  "New Zealand": { zh: "新西兰", flag: "🇳🇿" },
  "Norway": { zh: "挪威", flag: "🇳🇴" },
  "Panama": { zh: "巴拿马", flag: "🇵🇦" },
  "Paraguay": { zh: "巴拉圭", flag: "🇵🇾" },
  "Portugal": { zh: "葡萄牙", flag: "🇵🇹" },
  "Qatar": { zh: "卡塔尔", flag: "🇶🇦" },
  "Saudi Arabia": { zh: "沙特阿拉伯", flag: "🇸🇦" },
  "Scotland": { zh: "苏格兰", flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}" },
  "Senegal": { zh: "塞内加尔", flag: "🇸🇳" },
  "South Africa": { zh: "南非", flag: "🇿🇦" },
  "South Korea": { zh: "韩国", flag: "🇰🇷" },
  "Spain": { zh: "西班牙", flag: "🇪🇸" },
  "Sweden": { zh: "瑞典", flag: "🇸🇪" },
  "Switzerland": { zh: "瑞士", flag: "🇨🇭" },
  "Tunisia": { zh: "突尼斯", flag: "🇹🇳" },
  "Türkiye": { zh: "土耳其", flag: "🇹🇷" },
  "United States": { zh: "美国", flag: "🇺🇸" },
  "Uruguay": { zh: "乌拉圭", flag: "🇺🇾" },
  "Uzbekistan": { zh: "乌兹别克斯坦", flag: "🇺🇿" },
};

const args = new Set(process.argv.slice(2));
const allowEmpty = args.has("--allow-empty");
const outIndex = process.argv.indexOf("--out");
const outputPath = resolve(
  outIndex === -1 ? "public/worldcup2026.ics" : process.argv[outIndex + 1],
);

function yyyymmdd(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function* datesBetween(start, end) {
  const current = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);

  while (current <= last) {
    yield new Date(current);
    current.setUTCDate(current.getUTCDate() + 1);
  }
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line) {
  const chunks = [];
  let rest = line;

  while (Buffer.byteLength(rest, "utf8") > 75) {
    let size = 0;
    let index = 0;

    for (const char of rest) {
      const charSize = Buffer.byteLength(char, "utf8");
      if (size + charSize > 75) break;
      size += charSize;
      index += char.length;
    }

    chunks.push(rest.slice(0, index));
    rest = ` ${rest.slice(index)}`;
  }

  chunks.push(rest);
  return chunks.join("\r\n");
}

function line(name, value) {
  return foldLine(`${name}:${escapeText(value)}`);
}

async function fetchScoreboard(date) {
  const url = new URL(`https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_LEAGUE}/scoreboard`);
  url.searchParams.set("dates", yyyymmdd(date));
  url.searchParams.set("limit", "200");

  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "worldcup2026-calendar/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN returned ${response.status} for ${url}`);
  }

  return response.json();
}

function competitorName(competitor) {
  return (
    competitor?.team?.displayName ||
    competitor?.team?.shortDisplayName ||
    competitor?.team?.name ||
    competitor?.displayName ||
    "TBD"
  );
}

function translatePlaceholder(name) {
  return name
    .replace(/^Group ([A-L]) Winner$/, "$1组第1")
    .replace(/^Group ([A-L]) 2nd Place$/, "$1组第2")
    .replace(/^Third Place Group ([A-L/]+)$/, "$1组成绩较好的第3")
    .replace(/^Round of 32 (\d+) Winner$/, "32强赛第$1场胜者")
    .replace(/^Round of 16 (\d+) Winner$/, "16强赛第$1场胜者")
    .replace(/^Quarterfinal (\d+) Winner$/, "1/4决赛第$1场胜者")
    .replace(/^Semifinal (\d+) Winner$/, "半决赛第$1场胜者")
    .replace(/^Semifinal (\d+) Loser$/, "半决赛第$1场负者");
}

function displayTeamName(name) {
  const team = TEAMS[name];
  const translated = TEAM_LOCALE === "zh-CN" ? team?.zh || translatePlaceholder(name) : name;
  const flag = SHOW_FLAGS && team?.flag ? `${team.flag} ` : "";
  return `${flag}${translated}`;
}

function normalizeEvent(event) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find((item) => item.homeAway === "home");
  const away = competitors.find((item) => item.homeAway === "away");
  const start = new Date(event.date || competition.date);

  if (!event.id || Number.isNaN(start.getTime())) {
    return null;
  }

  const homeName = competitorName(home);
  const awayName = competitorName(away);
  const completed = event.status?.type?.state === "post";
  const homeScore = home?.score;
  const awayScore = away?.score;
  const hasScore = completed && homeScore != null && awayScore != null;

  let summary;
  if (homeName === "TBD" && awayName === "TBD") {
    summary = event.name || event.shortName || "FIFA World Cup Match";
  } else if (hasScore) {
    summary = `${displayTeamName(homeName)} ${homeScore}-${awayScore} ${displayTeamName(awayName)}`;
  } else {
    summary = `${displayTeamName(homeName)} vs ${displayTeamName(awayName)}`;
  }

  const descParts = [
    event.season?.slug || event.season?.type ? "FIFA World Cup 2026" : "FIFA World Cup",
  ];
  if (hasScore) {
    descParts.push(`Final Score: ${homeName} ${homeScore} - ${awayScore} ${awayName}`);
  }
  if (event.status?.type?.description) {
    descParts.push(`Status: ${event.status.type.description}`);
  }
  if (event.links?.[0]?.href) {
    descParts.push(`ESPN: ${event.links[0].href}`);
  }

  return {
    id: event.id,
    uid: `espn-${event.id}-worldcup2026@${UID_DOMAIN}`,
    start,
    end: new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000),
    summary,
    location:
      competition.venue?.fullName ||
      competition.venue?.displayName ||
      event.venue?.displayName ||
      "",
    description: descParts.filter(Boolean).join("\n"),
    sequence: hasScore ? 1 : 0,
  };
}

async function loadMatches() {
  const events = new Map();

  for (const date of datesBetween(START_DATE, END_DATE)) {
    const scoreboard = await fetchScoreboard(date);

    for (const event of scoreboard.events || []) {
      const match = normalizeEvent(event);
      if (match) events.set(match.id, match);
    }
  }

  return [...events.values()].sort((a, b) => a.start - b.start);
}

function buildCalendar(matches) {
  const now = formatIcsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODUCT_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    line("X-WR-CALNAME", CALENDAR_NAME),
    "X-WR-TIMEZONE:UTC",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const match of matches) {
    lines.push(
      "BEGIN:VEVENT",
      line("UID", match.uid),
      `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(match.start)}`,
      `DTEND:${formatIcsDate(match.end)}`,
      line("SUMMARY", match.summary),
      line("LOCATION", match.location),
      line("DESCRIPTION", match.description),
      "STATUS:CONFIRMED",
      line("SEQUENCE", String(match.sequence)),
      "BEGIN:VALARM",
      "TRIGGER:-PT5M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${match.summary}即将开始`,
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

const matches = await loadMatches();

if (!matches.length && !allowEmpty) {
  throw new Error(
    `No matches found from ESPN for ${START_DATE} to ${END_DATE}. Use --allow-empty only for testing.`,
  );
}

const ics = buildCalendar(matches);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, ics, "utf8");

console.log(`Wrote ${matches.length} matches to ${outputPath}`);
