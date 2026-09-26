import { cn } from "@/lib/utils";
import {
  formatGameClock,
  formatShotClock,
  shotClockIsCritical,
  type ScoreboardState,
} from "@/lib/scoreboard";

interface ClockSpineProps {
  state: ScoreboardState;
  onToggleRun: () => void;
  onSwapPossession: () => void;
}

export function ClockSpine({ state, onToggleRun, onSwapPossession }: ClockSpineProps) {
  const shotClockEnabled = state.settings.shotClockSec > 0;
  const game = formatGameClock(state.gameMs);
  const shot = shotClockEnabled
  ? formatShotClock(state.shotMs)
  : "OFF";
  const critical = shotClockEnabled && state.shotMs > 0 && state.shotMs <= 5_000;
  const homeHasBall = state.possession === "home";

  return (
    <div className="clock-spine flex min-h-0 flex-col gap-3 sm:gap-4">
      <div
        className="game-clock-panel panel flex min-h-0 flex-1 animate-rise flex-col items-center justify-center rounded-3xl px-4 py-4 ring-1 ring-hairline-strong backdrop-blur-2xl sm:px-5 sm:py-6"
        style={{ animationDelay: ".1s" }}
      >
        <span className="text-[10px] uppercase tracking-[0.35em] text-faint">Game clock</span>
        <button
          type="button"
          onClick={onToggleRun}
          title={state.running ? "Stop the clock" : "Start the clock"}
          className={cn(
            "game-clock digit-game mt-1 rounded-lg px-1 sm:mt-2",
            state.gameOver
              ? "text-faint"
              : state.running
                ? "tone-white animate-run-glow"
                : "text-bright",
          )}
        >
          {game}
        </button>
        <span
          className={cn(
            "clock-status mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ring-1 sm:mt-4",
            state.gameOver
              ? "bg-away/15 text-away ring-away/30"
              : state.running
                ? "bg-live/15 text-live ring-live/30"
                : "bg-frost-2 text-soft ring-hairline",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              state.gameOver ? "bg-away" : state.running ? "animate-pulse bg-live" : "bg-soft",
            )}
          />
          {state.gameOver ? "Final" : state.running ? "Running" : "Stopped"}
        </span>
      </div>

      <div
        className={cn(
          "shot-clock-panel panel animate-rise rounded-3xl px-4 py-3 ring-1 backdrop-blur-2xl transition-colors sm:px-5 sm:py-5",
          critical ? "bg-away/[0.09] ring-away/40" : "bg-away/[0.05] ring-away/20",
        )}
        style={{ animationDelay: ".15s" }}
      >
        <span className="block text-center text-[10px] uppercase tracking-[0.35em] text-faint">
          Shot clock
        </span>
        <div
          className={cn(
            "shot-clock digit-shot tone-away mt-1 flex justify-center",
            critical ? "shot-critical" : "glow",
          )}
        >
          {shot}
        </div>
      </div>

      <button
        type="button"
        onClick={onSwapPossession}
        title="Swap possession"
        className="possession-panel panel flex animate-rise items-center justify-center gap-6 rounded-3xl px-4 py-2.5 ring-1 ring-hairline backdrop-blur-xl transition-colors hover:ring-hairline-strong sm:py-3"
        style={{ animationDelay: ".2s" }}
      >
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.2em]",
            homeHasBall ? "text-faint" : "text-away",
          )}
        >
          {state.teams.away.abbr}
        </span>
        <span className={cn("animate-poss text-2xl", homeHasBall ? "tone-home" : "tone-away")}>
          {homeHasBall ? "▶" : "◀"}
        </span>
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.2em]",
            homeHasBall ? "text-home" : "text-faint",
          )}
        >
          {state.teams.home.abbr}
        </span>
      </button>
    </div>
  );
}
