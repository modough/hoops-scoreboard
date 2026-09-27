import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { isBonus, type ScoreboardState, type Side } from "@/lib/scoreboard";

interface TeamPanelProps {
  side: Side;
  state: ScoreboardState;
  delay: string;
  onScore: (points: number) => void;
  onFoul: () => void;
  onTimeout: () => void;
  onRename: (name: string) => void;
  onUndo: () => void;
  canUndo: boolean;
}

export function TeamPanel({
  side,
  state,
  delay,
  onScore,
  onFoul,
  onTimeout,
  onRename,
  onUndo,
  canUndo,
}: TeamPanelProps) {
  const team = state.teams[side];
  const isHome = side === "home";
  const bonus = isBonus(state, side);
  const undoBtnStyle =
    "disabled:pointer-events-none disabled:opacity-40 rounded-xl bg-[oklch(74.5%_0.14602_231.991)] px-4 py-2 text-sm font-bold uppercase tracking-[0.15em] text-board ring-1 ring-hairline transition-all hover:bg-frost-3 hover:text-bright";

  return (
    <section
      className={cn(
        "w-full team-panel panel flex min-h-0 animate-rise flex-col rounded-3xl p-4 ring-1 backdrop-blur-2xl sm:p-6",
        isHome ? "ring-home/20" : "ring-away/20",
      )}
      style={{ animationDelay: delay }}
      aria-label={`${isHome ? "Home" : "Away"} team`}
    >
      {bonus && (
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ring-1",
            isHome ? "bg-home/15 text-home ring-home/25" : "bg-away/15 text-away ring-away/25",
          )}
        >
          Bonus
        </span>
      )}

      <div
        className={cn(
          "team-heading mt-2 flex min-w-0 items-baseline gap-2 sm:mt-3"
          
        )}
      >
        <EditableText
          value={team.name}
          label={`Rename ${isHome ? "home" : "away"} team`}
          maxLength={18}
          onCommit={onRename}
          className={cn(
            "team-name text-xl font-semibold uppercase tracking-[0.2em] text-bright sm:text-2xl",
            isHome ? "text-right" : "text-left",
          )}
        />
      </div>
      <div
        className={cn(
          "w-full flex items-center justify-center team-score digit-score glow mt-3 sm:mt-4",
          isHome ? "tone-home text-right" : "tone-away",
        )}
      >
        {team.score}
      </div>

      <div className="team-actions mt-auto grid grid-cols-2 gap-2.5 pt-4 sm:gap-3 sm:pt-6">
        <button
          type="button"
          onClick={onFoul}
          title="Record a team foul"
          className="flex items-center justify-between max-h-10 rounded-xl bg-well px-3 py-2 text-left ring-1 ring-hairline-soft transition-colors hover:bg-frost-2"
        >
          <span className="block text-[10px] uppercase tracking-[0.2em] text-faint">Fouls</span>
          <span
            className={cn(
              "text-lg font-medium",
              bonus ? (isHome ? "text-home" : "text-away") : "text-bright",
            )}
          >
            {team.fouls}
          </span>
        </button>
        <button
          type="button"
          onClick={onTimeout}
          title="Call a timeout"
          className="flex items-center justify-between max-h-10 rounded-xl bg-well px-3 py-2 text-right ring-1 ring-hairline-soft transition-colors hover:bg-frost-2"
        >
          <span className="block text-[10px] uppercase tracking-[0.2em] text-faint">Timeouts</span>
          <span className="text-lg font-medium text-bright">{team.timeouts}</span>
        </button>

        <div className="col-span-2 grid grid-cols-3 gap-2">
          <button type="button" onClick={onUndo} disabled={!canUndo} className={cn(
                "rounded-xl py-2 text-xl font-semibold uppercase tracking-[0.15em] ring-1 transition-all active:scale-[0.97]",
                isHome
                  ? "bg-home/10 text-home ring-home/25 hover:bg-home/20"
                  : "bg-away/10 text-away ring-away/25 hover:bg-away/20",
              )}>
            -1
          </button>
          {[1, 3].map((points) => (
            <button
              key={points}
              type="button"
              onClick={() => onScore(points)}
              className={cn(
                "rounded-xl py-2 text-xl font-semibold uppercase tracking-[0.15em] ring-1 transition-all active:scale-[0.97]",
                isHome
                  ? "bg-home/10 text-home ring-home/25 hover:bg-home/20"
                  : "bg-away/10 text-away ring-away/25 hover:bg-away/20",
              )}
            >
              +{points}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

interface EditableTextProps {
  value: string;
  label: string;
  className?: string;
  maxLength?: number;
  onCommit: (value: string) => void;
}

function EditableText({ value, label, className, maxLength = 24, onCommit }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const settled = useRef(true);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const start = () => {
    settled.current = false;
    setEditing(true);
  };

  const commit = () => {
    if (settled.current) return;
    settled.current = true;
    setEditing(false);
    onCommit(draft);
  };

  const cancel = () => {
    settled.current = true;
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        maxLength={maxLength}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className={cn(
          "min-w-0 rounded-md bg-frost-2 px-2 py-1 ring-1 ring-hairline-strong outline-none",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      title={label}
      className={cn(
        "min-w-0 cursor-text truncate rounded-md px-2 py-1 transition-colors hover:bg-frost-2",
        className,
      )}
    >
      {value}
    </button>
  );
}
