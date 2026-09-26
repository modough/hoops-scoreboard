<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- All game rules live in `src/lib/scoreboard.ts` as a pure reducer with no browser APIs; the React layer only dispatches actions and derives display strings from it. Why: rules stay deterministic, testable and safe under StrictMode double-invocation.
- Persisted state is a single snapshot under localStorage key `arena-board:state:v1`, written only while the clock is stopped; the buzzer setting is `arena-board:sound:v1`. Why: avoids 10Hz writes and restores mid-period cleanly.
- Sound is synthesised on demand in `src/lib/buzzer.ts` (WebAudio), created lazily on the first user gesture. Why: no autoplay-blocked AudioContext and no audio assets.
- Keyboard shortcuts are defined once in `src/hooks/use-scoreboard.ts`; the on-screen legend renders the exported `SCORER_KEYS`. Why: the printed hint can never drift from the real bindings.
- Visual language lives entirely in `src/styles.css` (oklch tokens, `tone-*`, `panel`, `glow`, `digit-*`, `shot-critical`). Why: one theming source, no hardcoded colours in components.
