import { useEffect } from "react";

import { cn } from "@/lib/utils";
import type { ScoreboardState, Settings } from "@/lib/scoreboard";

interface SettingsDialogProps {
  state: ScoreboardState;
  onClose: () => void;
  onConfigure: (patch: Partial<Settings>) => void;
}

const minutes = (values: number[]) =>
  values.map((value) => ({ value, label: `${value / 60} min` }));

const numbers = (values: number[]) => values.map((value) => ({ value, label: String(value) }));

export function SettingsDialog({ state, onClose, onConfigure }: SettingsDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const { settings } = state;

  return (
    <div className="settings-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-board/85 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="League setup"
        className="settings-dialog panel relative max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl animate-rise overflow-y-auto rounded-3xl p-4 ring-1 ring-hairline-strong backdrop-blur-2xl sm:max-h-[85vh] sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-bright">
            League setup
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-faint ring-1 ring-hairline transition-colors hover:bg-frost-2 hover:text-bright"
          >
            Done
          </button>
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-faint">Venue line</span>
          <input
            value={settings.venue}
            maxLength={48}
            onChange={(event) => onConfigure({ venue: event.target.value })}
            className="rounded-lg bg-well px-3 py-2 text-sm text-bright ring-1 ring-hairline outline-none transition-colors focus:ring-hairline-strong"
          />
        </label>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Field
            label="Period length"
            value={settings.periodLengthSec}
            options={minutes([60, 120, 180, 240, 300, 480, 600, 720, 900, 1200])}
            onChange={(periodLengthSec) => onConfigure({ periodLengthSec })}
          />
          <Field
            label="Periods"
            value={settings.periods}
            options={numbers([2, 3, 4, 5])}
            onChange={(periods) => onConfigure({ periods })}
          />
          <Field
            label="Overtime"
            value={settings.overtimeLengthSec}
            options={minutes([120, 180, 300])}
            onChange={(overtimeLengthSec) => onConfigure({ overtimeLengthSec })}
          />
          <Field
            label="Shot clock"
            value={settings.shotClockSec}
            options={[{ value: 0, label: "Off" }, ...numbers([14, 20, 24, 30, 35])]}
            onChange={(shotClockSec) => onConfigure({ shotClockSec })}
          />
          <Field
            label="Backcourt reset"
            value={settings.backcourtShotSec}
            options={numbers([14, 24])}
            onChange={(backcourtShotSec) => onConfigure({ backcourtShotSec })}
          />
          <Field
            label="Timeouts each"
            value={settings.timeoutsPerTeam}
            options={numbers([0, 1, 2, 3, 4, 5, 6, 7])}
            onChange={(timeoutsPerTeam) => onConfigure({ timeoutsPerTeam })}
          />
          <Field
            label="Bonus on"
            value={settings.bonusAt}
            options={numbers([1, 2, 3, 4, 5, 6, 7])}
            onChange={(bonusAt) => onConfigure({ bonusAt })}
          />
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-faint">
          Team fouls clear at the start of every period. Changing a length while the clock is
          stopped rebuilds the board for the next period.
        </p>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
}

function Field({ label, value, options, onChange }: FieldProps) {
  const matched = options.some((option) => option.value === value);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.2em] text-faint">{label}</span>
      <select
        value={matched ? value : ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "rounded-lg bg-well px-3 py-2 text-sm text-bright ring-1 ring-hairline outline-none",
          "transition-colors focus:ring-hairline-strong",
        )}
      >
        {!matched && <option value="">Custom</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
