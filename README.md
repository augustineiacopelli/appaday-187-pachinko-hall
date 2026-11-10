# AppADay 187: Pachinko Hall

**Live:** https://augustineiacopelli.github.io/appaday-187-pachinko-hall/
**Portfolio:** https://augustineiacopelli.github.io/appaday/

Six pachinko cabinets trace the game from all mechanical bells and tulips to modern digital reels, wings, hidden modes and LCD duels. Pick a seat by reading its data counter, dial in launch power, choose a stream and time your shots. Seeded odds, custom ball physics, play balls only, no money.

## How to play

Walk the hall and choose a seat. Each card shows the machine's data counter (spins since the last hit, with a short history of recent hits), a HOT lamp when odds are raised, and a difficulty meter. Inside a cabinet, hold the dial to fire balls. Turn the dial to set launch power and use LEFT and RIGHT to pick the stream. Balls that fall into the start pocket spin the reels. Jackpots open the attacker, tulips or wings, and every ball you catch pays out. When you run out of balls you can borrow 200 more.

## The six cabinets

Retro Bell (1962) is pure mechanics. The bell pocket opens the five tulips for two seconds, and a jackpot holds them wide. Hanemono (1981) adds a winged start pocket and a seven segment readout, and a jackpot latches the wings open. Digi Reels (1991) is the modern layout with LCD reels, reach, super reach, kakuhen and jitan modes, and a right side attacker that only takes right shots during rounds. Senpuku (2004) hides a favorable mode behind short two round hits, so reading the history pays. Battle Duel (2012) turns reach into an LCD duel with two windmills in the field, where a win means kakuhen and a loss means jitan. Kenrimono (2019) asks you to pass three gate lamps in order, and completing the chain earns the right to a jackpot on the very next spin.

## How it works

The physics is custom and runs at a fixed step of 1/240 of a second with four substeps. Ball speed is capped so a ball can never tunnel through a pin. Pins sit in a uniform grid for fast lookups, and movers such as tulip petals, wings, the attacker lid and windmill fans are resolved as moving segments.

Outcomes never depend on where a ball lands. Each spin draws from a seeded stream where the nth draw depends only on the cabinet seed and n, so a machine's history is the same on every device. Only launch variance uses a separate random source. The hall pre plays each machine so every counter and history looks lived in on the first visit.

Rendering uses PixiJS 8 from the jsDelivr CDN. Everything else is vanilla JavaScript in the single file. State saves to localStorage under one key, and the app still runs if storage is blocked.

## Tech

One self contained `index.html` with inline CSS and JavaScript, PixiJS 8 and Google Fonts from CDNs, no build step needed to run it. Layout holds from 375 px wide, tap targets are at least 44 px, and effects can be reduced in Settings.

## Workspace

The `workspace` folder holds the source sections (`src`), the assembler (`build.py`) and the headless tests (`test`). Run `python3 build.py` from `workspace` to rebuild `index.html`, and `npm install` inside `workspace/test` before running the browser tests.
