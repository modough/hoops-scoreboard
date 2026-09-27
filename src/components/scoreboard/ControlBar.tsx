import { cn } from "@/lib/utils";
import { SCORER_KEYS } from "@/hooks/use-scoreboard";
import type { ScoreboardState } from "@/lib/scoreboard";

const secondary =
  "rounded-xl bg-frost-2 px-4 py-2 text-sm font-medium uppercase tracking-[0.15em] text-soft ring-1 ring-hairline transition-all hover:bg-frost-3 hover:text-bright active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

interface ControlBarProps {
  state: ScoreboardState;

  onToggleRun: () => void;
  onResetShot: (seconds?: number) => void;
  onSwapPossession: () => void;
  onBuzzer: () => void;
  onNewGame: () => void;
}

export function ControlBar({
  state,
  onToggleRun,
  onSwapPossession,
  onBuzzer,
  onNewGame,
}: ControlBarProps) {
  return (
    <div
      className="control-bar panel mt-3 flex animate-rise flex-wrap items-center justify-center gap-2 rounded-3xl px-3 py-2.5 ring-1 ring-hairline backdrop-blur-2xl sm:gap-3 sm:px-4 sm:py-3 lg:mt-5"
      style={{ animationDelay: ".3s" }}
    >
      <button
        type="button"
        onClick={onToggleRun}
        disabled={state.gameOver}
        className={cn(
          "rounded-xl px-6 py-2 text-sm font-semibold uppercase tracking-[0.15em] ring-1 transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
          state.running
            ? "bg-away text-board ring-away hover:bg-away/90"
            : "bg-live text-board ring-live hover:bg-live/90",
        )}
      >
        {state.running ? "Stop" : "Start"}
      </button>

      <button
        type="button"
        onClick={onBuzzer}
        title="Buzzer"
        className={cn(
          secondary,
          "bg-home/10 text-home ring-home/30 hover:bg-home/20 hover:text-home",
        )}
      >
        Buzzer
      </button>

      <button type="button" onClick={onSwapPossession} className={secondary}>
        Possession
      </button>

      <button type="button" onClick={onNewGame} className={secondary}>
        New game
      </button>
    </div>
  );
}
