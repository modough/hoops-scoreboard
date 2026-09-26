/**
 * Pure basketball scoreboard rules.
 *
 * No browser APIs in here: the reducer is called twice under StrictMode and
 * must stay side-effect free. Timing, storage and sound live in
 * `use-scoreboard.ts`.
 */

export type Side = "home" | "away";

export interface Team {
  name: string;
  abbr: string;
  score: number;
  /** Team fouls in the current period. */
  fouls: number;
  /** Timeouts remaining in the whole game. */
  timeouts: number;
}

export interface Settings {
  venue: string;
  periodLengthSec: number;
  periods: number;
  overtimeLengthSec: number;
  shotClockSec: number;

  backcourtShotSec: number;
  timeoutsPerTeam: number;
  bonusAt: number;
}

export interface ScoreboardState {
  teams: Record<Side, Team>;
  /** 1-based. Anything above `settings.periods` is overtime. */
  period: number;
  gameMs: number;
  shotMs: number;
  running: boolean;
  gameOver: boolean;
  possession: Side;
  notice: string | null;
  settings: Settings;
}

export type Action =
  | { type: "tick"; deltaMs: number }
  | { type: "toggleRun" }
  | { type: "score"; side: Side; points: number }
  | { type: "foul"; side: Side }
  | { type: "timeout"; side: Side }
  | { type: "resetShot"; seconds: number | undefined }
  | { type: "swapPossession" }
  | { type: "rename"; side: Side; name: string }
  | { type: "setAbbr"; side: Side; abbr: string }
  | { type: "configure"; patch: Partial<Settings> }
  | { type: "newGame" }
  | { type: "clearNotice" }
  | { type: "decrementScore"; side: Side; points: number };

export const DEFAULT_SETTINGS: Settings = {
  venue: "Riverside Gym · Rec League",
  periodLengthSec: 720,
  periods: 4,
  overtimeLengthSec: 300,
  shotClockSec: 24,
  backcourtShotSec: 14,
  timeoutsPerTeam: 4,
  bonusAt: 5,
};

export const otherSide = (side: Side): Side => (side === "home" ? "away" : "home");

export function createInitialState(settings?: Partial<Settings>): ScoreboardState {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  return {
    teams: {
      home: { name: "Hawks", abbr: "HOM", score: 0, fouls: 0, timeouts: s.timeoutsPerTeam },
      away: { name: "Comets", abbr: "CMT", score: 0, fouls: 0, timeouts: s.timeoutsPerTeam },
    },
    period: 1,
    gameMs: s.periodLengthSec * 1000,
    shotMs: s.shotClockSec * 1000,
    running: false,
    gameOver: false,
    possession: "home",
    notice: null,
    settings: s,
  };
}

export function periodLengthMs(state: ScoreboardState, settings = state.settings): number {
  const seconds =
    state.period > settings.periods ? settings.overtimeLengthSec : settings.periodLengthSec;
  return seconds * 1000;
}

export function periodLabel(state: ScoreboardState): string {
  const ot = state.period - state.settings.periods;
  return ot > 0 ? `OT${ot}` : `Q${state.period}`;
}

export function periodOrdinal(state: ScoreboardState): string {
  const ot = state.period - state.settings.periods;
  if (ot > 0) return `${ot} overtime`;
  return `${state.period}${ordinalSuffix(state.period)} period`;
}

function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  const last = n % 10;
  if (last === 1) return "st";
  if (last === 2) return "nd";
  if (last === 3) return "rd";
  return "th";
}

export function isBonus(state: ScoreboardState, side: Side): boolean {
  return state.teams[side].fouls >= state.settings.bonusAt;
}

export function leader(state: ScoreboardState): Side | null {
  const { home, away } = state.teams;
  if (home.score === away.score) return null;
  return home.score > away.score ? "home" : "away";
}

/** `12:00`, `04:37`, then tenths under a minute: `09.4`. */
export function formatGameClock(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped >= 60_000) {
    const totalSec = Math.ceil(clamped / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const tenths = Math.ceil(clamped / 100);
  const s = Math.floor(tenths / 10);
  const t = tenths % 10;
  return `${String(s).padStart(2, "0")}.${t}`;
}

/** Whole seconds above five, tenths below: `24`, `05.3`. */
export function formatShotClock(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped > 5_000) return String(Math.ceil(clamped / 1000)).padStart(2, "0");
  const tenths = Math.ceil(clamped / 100);
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}

export function shotClockIsCritical(state: ScoreboardState): boolean {
  return state.running && state.shotMs <= 5_000;
}

export function scoreboardReducer(state: ScoreboardState, action: Action): ScoreboardState {
  switch (action.type) {
    case "tick":
      return tick(state, action.deltaMs);

    case "toggleRun": {
      if (state.gameOver) return state;
      const running = !state.running;
      return {
        ...state,
        running,
        notice: running ? `${periodLabel(state)} underway` : "Clock stopped",
      };
    }

    case "score": {
      if (state.gameOver) return state;
      const team = state.teams[action.side];
      const shotMs = state.settings.shotClockSec * 1000;
      return {
        ...state,
        teams: {
          ...state.teams,
          [action.side]: { ...team, score: team.score + action.points },
        },
        // A made basket hands the ball to the other side with a fresh clock.
        possession: otherSide(action.side),
        shotMs: state.running ? shotMs : Math.max(state.shotMs, shotMs),
        notice: `${team.name} ${action.points}`,
      };
    }
    case "decrementScore": {
      const team = state.teams[action.side];

      return {
        ...state,
        teams: {
          ...state.teams,
          [action.side]: {
            ...team,
            score: Math.max(0, team.score - action.points),
          },
        },
      };
    }

    case "foul": {
      if (state.gameOver) return state;
      const team = state.teams[action.side];
      const fouls = team.fouls + 1;
      const bonus = fouls >= state.settings.bonusAt;
      return {
        ...state,
        running: false,
        teams: { ...state.teams, [action.side]: { ...team, fouls } },
        notice: bonus ? `${team.name} in the bonus` : `Foul on ${team.name}`,
      };
    }

    case "timeout": {
      if (state.gameOver) return state;
      const team = state.teams[action.side];
      if (team.timeouts <= 0) return { ...state, notice: `${team.name} has none left` };
      return {
        ...state,
        running: false,
        teams: { ...state.teams, [action.side]: { ...team, timeouts: team.timeouts - 1 } },
        notice: `Timeout ${team.name}`,
      };
    }

    case "resetShot": {
      const seconds = action.seconds ?? state.settings.shotClockSec;
      const shotMs = seconds * 1000;
      if (state.shotMs === shotMs) return state;
      return { ...state, shotMs, notice: `Reset to ${seconds}` };
    }

    case "swapPossession": {
      const possession = otherSide(state.possession);
      return { ...state, possession, notice: `Ball to ${state.teams[possession].name}` };
    }

    case "rename": {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        teams: { ...state.teams, [action.side]: { ...state.teams[action.side], name } },
      };
    }

    case "setAbbr": {
      const abbr = action.abbr.trim().toUpperCase().slice(0, 3);
      if (!abbr) return state;
      return {
        ...state,
        teams: { ...state.teams, [action.side]: { ...state.teams[action.side], abbr } },
      };
    }

    case "configure":
      return configure(state, action.patch);

    case "newGame": {
      const base = createInitialState(state.settings);
      return {
        ...base,
        teams: {
          home: { ...base.teams.home, name: state.teams.home.name, abbr: state.teams.home.abbr },
          away: { ...base.teams.away, name: state.teams.away.name, abbr: state.teams.away.abbr },
        },
        possession: state.possession,
        notice: "New game",
      };
    }

    case "clearNotice":
      return state.notice ? { ...state, notice: null } : state;

    default:
      return state;
  }
}

function tick(state: ScoreboardState, deltaMs: number): ScoreboardState {
  if (!state.running || state.gameOver) return state;

  const gameMs = Math.max(0, state.gameMs - deltaMs);

  // Shot clock disabled: only run the game clock.
  if (state.settings.shotClockSec <= 0) {
    if (gameMs <= 0) {
      return endPeriod({
        ...state,
        gameMs: 0,
      });
    }

    return {
      ...state,
      gameMs,
    };
  }

  const shotMs = Math.max(0, state.shotMs - deltaMs);

  if (gameMs <= 0) {
    return endPeriod({
      ...state,
      gameMs: 0,
      shotMs: 0,
    });
  }

  if (shotMs <= 0) {
    const possession = otherSide(state.possession);

    return {
      ...state,
      gameMs,
      shotMs: 0,
      running: false,
      possession,
      notice: `Shot clock violation — ball to ${state.teams[possession].name}`,
    };
  }

  return {
    ...state,
    gameMs,
    shotMs,
  };
}

function endPeriod(state: ScoreboardState): ScoreboardState {
  const tied = state.teams.home.score === state.teams.away.score;
  const isFinal = state.period >= state.settings.periods && !tied;

  if (isFinal) {
    const winner = leader(state);
    return {
      ...state,
      gameMs: 0,
      shotMs: 0,
      running: false,
      gameOver: true,
      notice: winner ? `Final — ${state.teams[winner].name} win` : "Final",
    };
  }

  const period = state.period + 1;
  const settings = state.settings;
  const next: ScoreboardState = {
    ...state,
    period,
    gameMs: periodLengthMs({ ...state, period }, settings),
    shotMs: settings.shotClockSec * 1000,
    running: false,
    teams: {
      home: { ...state.teams.home, fouls: 0 },
      away: { ...state.teams.away, fouls: 0 },
    },
    notice: tied ? "Level — extra time" : `${periodLabel({ ...state, period })} next`,
  };
  return next;
}

function configure(state: ScoreboardState, patch: Partial<Settings>): ScoreboardState {
  const settings = { ...state.settings, ...patch };
  const previousPeriodMs = periodLengthMs(state);
  const nextPeriodMs = periodLengthMs(state, settings);
  const previousShotMs = state.settings.shotClockSec * 1000;

  const gameUntouched = Math.abs(state.gameMs - previousPeriodMs) < 150;
  const shotUntouched = Math.abs(state.shotMs - previousShotMs) < 150;

  return {
    ...state,
    running: false,
    settings,
    gameMs: gameUntouched ? nextPeriodMs : Math.min(state.gameMs, nextPeriodMs),
    shotMs: shotUntouched
      ? settings.shotClockSec * 1000
      : Math.min(state.shotMs, settings.shotClockSec * 1000),
    teams: {
      home: {
        ...state.teams.home,
        timeouts: Math.min(state.teams.home.timeouts, settings.timeoutsPerTeam),
      },
      away: {
        ...state.teams.away,
        timeouts: Math.min(state.teams.away.timeouts, settings.timeoutsPerTeam),
      },
    },
    notice: "League setup saved",
  };
}
