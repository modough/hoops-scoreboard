import { createFileRoute } from "@tanstack/react-router";

import { Scoreboard } from "@/components/scoreboard/Scoreboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arena Board — Basketball Scoreboard & Game Clock" },
      {
        name: "description",
        content:
          "A full basketball scoreboard for the gym or the rec league: running game clock, 24-second shot clock, scores, fouls, bonuses, timeouts and possession in one big-screen view.",
      },
      { author: "Arena Board" },
      { property: "og:title", content: "Arena Board — Basketball Scoreboard" },
      {
        property: "og:description",
        content:
          "Run a whole game from one screen: game clock, shot clock, scores, team fouls, bonuses, timeouts and the possession arrow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Scoreboard,
});
