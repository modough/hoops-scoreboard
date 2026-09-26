import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { playBuzz } from "@/lib/buzzer";
import {
  createInitialState,
  scoreboardReducer,
  type Action,
  type ScoreboardState,
  type Settings,
  type Side,
} from "@/lib/scoreboard";

const STATE_KEY = "arena-board:state:v1";
const SOUND_KEY = "arena-board:sound:v1";
const HISTORY_LIMIT = 30;

/** Actions that change the board but should never become an undo step. */
const TRANSIENT = new Set(["tick", "clearNotice", "load"]);

interface HistoryEntry {
  state: ScoreboardState;
  side: "home" | "away" | null;
}

interface BoardHistory {
  present: ScoreboardState;
  past: HistoryEntry[];
}

type BoardAction =
  Action | { type: "undo"; side?: Side } | { type: "load"; state: ScoreboardState };

function actionSide(action: Action): "home" | "away" | null {
  if ("side" in action && (action.side === "home" || action.side === "away")) {
    return action.side;
  }

  return null;
}

function boardReducer(history: BoardHistory, action: BoardAction): BoardHistory {
  if (action.type === "load") {
    return {
      present: action.state,
      past: [],
    };
  }

  if (action.type === "undo") {
    const last = history.past.at(-1);

    if (!last) return history;

    if (action.side && last.side !== action.side) {
      return history;
    }

    return {
      present: last.state,
      past: history.past.slice(0, -1),
    };
  }
  const present = scoreboardReducer(history.present, action);

  if (present === history.present) {
    return history;
  }

  if (TRANSIENT.has(action.type)) {
    return {
      present,
      past: history.past,
    };
  }

  return {
    present,
    past: [
      ...history.past,
      {
        state: history.present,
        side: actionSide(action),
      },
    ].slice(-HISTORY_LIMIT),
  };
}

function numberOr(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

interface PersistedTeam {
  name?: unknown;
  abbr?: unknown;
  score?: unknown;
  fouls?: unknown;
  timeouts?: unknown;
}

interface PersistedBoard {
  teams?: { home?: PersistedTeam; away?: PersistedTeam };
  period?: unknown;
  gameMs?: unknown;
  shotMs?: unknown;
  gameOver?: unknown;
  possession?: unknown;
  settings?: Partial<Settings> | null;
}

/** Defensive rebuild: a stale or hand-edited payload can never crash the board. */
function revive(raw: unknown, fallback: ScoreboardState): ScoreboardState {
  if (raw === null || typeof raw !== "object") return fallback;
  const r = raw as PersistedBoard;
  const settings = { ...fallback.settings, ...(r.settings ?? {}) };

  const team = (side: "home" | "away") => {
    const t = r.teams?.[side] ?? {};
    const name = typeof t.name === "string" && t.name.trim() ? t.name : fallback.teams[side].name;
    const abbr =
      typeof t.abbr === "string" && t.abbr.trim()
        ? t.abbr.toUpperCase().slice(0, 3)
        : fallback.teams[side].abbr;
    return {
      name,
      abbr,
      score: numberOr(t.score, 0, 0, 999),
      fouls: numberOr(t.fouls, 0, 0, 99),
      timeouts: numberOr(t.timeouts, fallback.teams[side].timeouts, 0, 99),
    };
  };

  const period = numberOr(r.period, 1, 1, 99);

  return {
    teams: { home: team("home"), away: team("away") },
    period,
    gameMs: numberOr(r.gameMs, settings.periodLengthSec * 1000, 0, settings.periodLengthSec * 1000),
    shotMs: numberOr(r.shotMs, settings.shotClockSec * 1000, 0, settings.shotClockSec * 1000),
    running: false,
    gameOver: r.gameOver === true,
    possession: r.possession === "away" ? "away" : "home",
    notice: null,
    settings,
  };
}

export function useScoreboard() {
  const [history, dispatchBoard] = useReducer(boardReducer, undefined, (): BoardHistory => ({
    present: createInitialState(),
    past: [],
  }));
  const [hydrated, setHydrated] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const state = history.present;

  const dispatch = useCallback((action: Action) => dispatchBoard(action), []);
  const canUndo = {
    home: state.teams.home.score > 0,
    away: state.teams.away.score > 0,
  };

  const undo = useCallback((side?: Side) => {
    return dispatchBoard({
      type: "undo",
      ...(side !== undefined ? { side } : {}),
    });
  }, []);
  const buzzer = useCallback(() => playBuzz("horn"), []);

  // Restore the last board. Always arrives stopped, never mid-tick.
  useEffect(() => {
    setHydrated(true);
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        dispatchBoard({
          type: "load",
          state: revive(JSON.parse(raw), createInitialState()),
        });
      }
      const storedSound = localStorage.getItem(SOUND_KEY);
      if (storedSound !== null) setSoundOn(storedSound === "on");
    } catch {
      /* a corrupt entry just means a fresh board */
    }
  }, []);

  // Persist whenever the board is at rest, so the clock never thrashes storage.
  useEffect(() => {
    if (!hydrated || state.running) return;
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      /* private mode: nothing to do */
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    } catch {
      /* ignore */
    }
  }, [soundOn, hydrated]);

  // The clock itself: real elapsed time, so backgrounded tabs stay accurate.
  useEffect(() => {
    if (!state.running || state.gameOver) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const deltaMs = Math.min(Math.max(now - last, 0), 1000);
      last = now;
      dispatchBoard({ type: "tick", deltaMs });
    }, 100);
    return () => window.clearInterval(id);
  }, [state.running, state.gameOver]);

  // Buzzer for the moments a referee would blow one.
  const previous = useRef(state);
  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    if (!soundOn) return;
    const shotViolation = state.notice?.startsWith("Shot clock violation");
    if ((state.gameOver && !before.gameOver) || state.period !== before.period || shotViolation) {
      playBuzz("horn");
    }
  }, [state, soundOn]);

  // Notices are a glance, not a log.
  useEffect(() => {
    if (!state.notice) return;
    const id = window.setTimeout(() => dispatchBoard({ type: "clearNotice" }), 4000);
    return () => window.clearTimeout(id);
  }, [state.notice]);

  const settingsRef = useRef(state.settings);
  useEffect(() => {
    settingsRef.current = state.settings;
  }, [state.settings]);

  // Scorer's keyboard: both hands stay on the keys that matter.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // While the setup dialog is up, the board is off-limits to the keys.
      if (document.querySelector('[role="dialog"]')) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      // Space is the transport key, even straight after clicking a button.
      if (key === " " || key === "spacebar") {
        event.preventDefault();
        dispatchBoard({ type: "toggleRun" });
        return;
      }
      // Left-hand keys drive the left (away) panel, right-hand keys the home panel.
      const map: Record<string, Action | "undo" | "buzzer"> = {
        q: { type: "score", side: "away", points: 3 },
        w: { type: "score", side: "away", points: 2 },
        e: { type: "score", side: "away", points: 1 },
        u: { type: "score", side: "home", points: 3 },
        i: { type: "score", side: "home", points: 2 },
        o: { type: "score", side: "home", points: 1 },
        f: { type: "foul", side: "away" },
        j: { type: "foul", side: "home" },
        h: { type: "timeout", side: "away" },
        k: { type: "timeout", side: "home" },
        r: { type: "resetShot", seconds: settingsRef.current.shotClockSec },
        t: { type: "resetShot", seconds: settingsRef.current.backcourtShotSec },
        p: { type: "swapPossession" },
        b: "buzzer",
        z: "undo",
        n: { type: "newGame" },
      };
      const mapped = map[key];
      if (!mapped) return;
      event.preventDefault();
      if (mapped === "undo") dispatchBoard({ type: "undo" });
      else if (mapped === "buzzer") playBuzz("horn");
      else dispatchBoard(mapped);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleSound = useCallback(() => setSoundOn((on) => !on), []);

  return useMemo(
    () => ({
      state,
      dispatch,
      undo,
      canUndo,
      soundOn,
      toggleSound,
      buzzer,
      hydrated,
    }),
    [state, dispatch, undo, canUndo, soundOn, toggleSound, buzzer, hydrated],
  );
}

export const SCORER_KEYS = [
  "Space start/stop",
  "Q W E away",
  "U I O home",
  "R reset shot",
  "P possession",
  "Z undo",
] as const;
