import { useState } from "react";

import { ClockSpine } from "@/components/scoreboard/ClockSpine";
import { ControlBar } from "@/components/scoreboard/ControlBar";
import { SettingsDialog } from "@/components/scoreboard/SettingsDialog";
import { TeamPanel } from "@/components/scoreboard/TeamPanel";
import { useScoreboard } from "@/hooks/use-scoreboard";
import { cn } from "@/lib/utils";
import {
  periodLabel,
  periodOrdinal,
  type Action,
  type ScoreboardState,
  type Settings,
  type Side,
} from "@/lib/scoreboard";

export function Scoreboard() {
  const { state, dispatch, undo, canUndo, soundOn, toggleSound, buzzer } = useScoreboard();
  const [setupOpen, setSetupOpen] = useState(false);

  const panelProps = (side: Side) => ({
    side,
    state,
    onScore: (points: number) => dispatch({ type: "score", side, points } satisfies Action),
    onFoul: () => dispatch({ type: "foul", side } satisfies Action),
    onTimeout: () => dispatch({ type: "timeout", side } satisfies Action),
    onRename: (name: string) => dispatch({ type: "rename", side, name } satisfies Action),
    onAbbr: (abbr: string) => dispatch({ type: "setAbbr", side, abbr } satisfies Action),
  });

  return (
    <div className="board-root relative min-h-screen w-full overflow-x-hidden bg-board font-mono text-foreground lg:h-screen lg:overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/4 left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 animate-halo rounded-full bg-frost-2 blur-[130px]" />
        <div className="absolute left-[6%] top-1/3 h-[44vh] w-[32vw] rounded-full bg-home/10 blur-[120px]" />
        <div className="absolute right-[6%] top-1/3 h-[44vh] w-[32vw] rounded-full bg-away/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(1_0_0/7%),transparent_55%)]" />
      </div>

      <div className="board-shell relative z-10 flex min-h-screen flex-col p-3 sm:p-6 lg:h-screen lg:p-8">
        <TopBar
          state={state}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          onOpenSetup={() => setSetupOpen(true)}
        />

        <main className="board-stage mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 lg:mt-5 lg:grid-cols-[1fr_minmax(240px,0.8fr)_1fr] lg:gap-5">
          <TeamPanel
            {...panelProps("home")}
            delay=".05s"
            onUndo={() =>
              dispatch({
                type: "decrementScore",
                side: "home",
                points: 1,
              })
            }
            canUndo={canUndo.home}
          />
          <ClockSpine
            state={state}
            onToggleRun={() => dispatch({ type: "toggleRun" })}
            onSwapPossession={() => dispatch({ type: "swapPossession" })}
          />
          <TeamPanel
            {...panelProps("away")}
            delay=".25s"
            onUndo={() =>
              dispatch({
                type: "decrementScore",
                side: "away",
                points: 1,
              })
            }
            canUndo={canUndo.away}
          />
        </main>

        <ControlBar
          state={state}

          onToggleRun={() => dispatch({ type: "toggleRun" })}
          onResetShot={(seconds) => dispatch({ type: "resetShot", seconds })}
          onSwapPossession={() => dispatch({ type: "swapPossession" })}
          onBuzzer={buzzer}

          onNewGame={() => dispatch({ type: "newGame" })}
        />
      </div>

      {setupOpen && (
        <SettingsDialog
          state={state}
          onClose={() => setSetupOpen(false)}
          onConfigure={(patch: Partial<Settings>) => dispatch({ type: "configure", patch })}
        />
      )}
    </div>
  );
}

interface TopBarProps {
  state: ScoreboardState;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenSetup: () => void;
}

function TopBar({ state, soundOn, onToggleSound, onOpenSetup }: TopBarProps) {
  const status = state.gameOver
    ? { label: "Final", className: "bg-away/15 text-away ring-away/30", dot: "bg-away" }
    : state.running
      ? {
          label: "Live",
          className: "bg-live/15 text-live ring-live/30",
          dot: "animate-pulse bg-live",
        }
      : { label: "Paused", className: "bg-frost-2 text-soft ring-hairline", dot: "bg-soft" };

  return (
    <header className="scoreboard-topbar panel grid grid-cols-[minmax(0,1fr)_auto] animate-rise items-center gap-2 rounded-2xl px-3 py-2.5 ring-1 ring-hairline backdrop-blur-xl sm:px-5 sm:py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-home/15 ring-1 ring-home/30">
            <span className="size-2 rounded-full bg-home" />
          </span>
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.3em] text-bright md:inline">
            Arena Board
          </span>
        </span>
        <span className="rounded-full bg-frost-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-soft ring-1 ring-hairline">
          {periodLabel(state)} · {periodOrdinal(state)}
        </span>
        {state.notice && (
          <span
            key={state.notice}
            className="hidden animate-fade-in truncate text-[11px] uppercase tracking-[0.2em] text-faint xl:inline"
          >
            {state.notice}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <span className="hidden text-[11px] uppercase tracking-[0.2em] text-faint lg:inline">
          {state.settings.venue}
        </span>
        <button
          type="button"
          onClick={onToggleSound}
          title={soundOn ? "Mute buzzer" : "Unmute buzzer"}
          aria-pressed={soundOn}
          className={cn(
            "sound-control",
            "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ring-1 transition-colors",
            soundOn
              ? "bg-frost-2 text-soft ring-hairline hover:text-bright"
              : "bg-frost text-faint ring-hairline-soft hover:text-soft",
          )}
        >
          {soundOn ? "Sound" : "Muted"}
        </button>
        <button
          type="button"
          onClick={onOpenSetup}
          title="League setup"
          className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-soft ring-1 ring-hairline transition-colors hover:bg-frost-2 hover:text-bright"
        >
          Setup
        </button>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ring-1",
            status.className,
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>
    </header>
  );
}
