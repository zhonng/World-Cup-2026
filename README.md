# 2026 World Cup Calendar

This project builds a subscribable iCalendar (`.ics`) feed for the 2026 FIFA World Cup schedule.

The default data source is ESPN's public soccer scoreboard endpoint:

```text
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
```

ESPN is convenient for a personal or small shared calendar, but it is not a formally supported public API. For a commercial product, use a licensed sports data provider and keep FIFA's official schedule as the authority for verification.

## Build

```powershell
npm run build
```

The generated calendar is written to:

```text
public/worldcup2026.ics
```

## Subscribe

After publishing the `public` folder, subscribe to:

```text
https://your-domain.example/worldcup2026.ics
```

Calendar apps will show match times in the subscriber's local timezone because all event start times are emitted as UTC.

## Configuration

Environment variables:

| Name | Default | Description |
| --- | --- | --- |
| `ESPN_LEAGUE` | `fifa.world` | ESPN soccer league slug |
| `START_DATE` | `2026-06-11` | First date to scan |
| `END_DATE` | `2026-07-19` | Last date to scan |
| `CALENDAR_NAME` | `2026 FIFA World Cup` | Calendar display name |
| `TEAM_LOCALE` | `zh-CN` | Team name language. Use `en` for ESPN's English names |
| `SHOW_FLAGS` | `true` | Set to `false` to remove flag emoji from event titles |
| `UID_DOMAIN` | `calendar.local` | Domain-like suffix for stable calendar event UIDs |
| `MATCH_DURATION_MINUTES` | `120` | Event duration |

## Publish With GitHub Pages

1. Push this repository to GitHub.
2. In repository settings, enable GitHub Pages from GitHub Actions.
3. The workflow in `.github/workflows/update-calendar.yml` rebuilds and deploys the ICS file on a schedule.
