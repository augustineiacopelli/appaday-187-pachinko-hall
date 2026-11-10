# AppADay 187: Pachinko Hall

**Live:** https://augustineiacopelli.github.io/appaday-187-pachinko-hall/
**Portfolio:** https://augustineiacopelli.github.io/appaday/

Seven pachinko cabinets trace the game from all mechanical bells and tulips to modern digital reels, wings, hidden modes, LCD duels and the 2023 machine that never pays a ball into your hands. Balls are rented, not bought, and the tray you walk out with becomes a prize at the counter and cash at the window round the corner. Seeded odds, custom ball physics, play balls only, no real money.

## How to play

Walk the hall and choose a seat. Each card shows the machine's data counter (spins since the last hit, with a short history of recent hits), a HOT lamp when odds are raised, and a difficulty meter. Inside a cabinet, hold the dial to fire balls. Turn the dial to set launch power and use LEFT and RIGHT to pick the stream. Balls that fall into the start pocket spin the reels. Jackpots open the attacker, tulips or wings, and every ball you catch pours into the tray.

On the digi family cabinets the attacker only catches shots coming down the right side, so when a round opens the RIGHT button pulses amber until you switch to it, matching the arrow that appears on the board.

## The money

This is the part most pachinko games skip. Balls are rented and belong to the hall, so a thousand yen note buys 250 of them on the four yen island or a thousand on the one yen island. A good run means you stop renting and play off your own tray. On the way out the counter tallies the tray, and then the three shop system does its work: four hundred balls make one special prize, a sliver of gold in a plastic case, which the hall is not allowed to buy back for cash, so you carry it to an unmarked window round the corner that pays fifteen hundred yen for it. Those four hundred balls cost sixteen hundred to rent. The gap is the whole business.

The shelf behind the counter is the collection. Twelve general prizes, from a box of caramels at fifty balls to a cased gold bar at twenty five thousand, stay on your shelf once claimed. Leftover balls can sit on a member card until the next visit. Fourteen commemorative plaques hang in the case by the door.

## The seven cabinets

Retro Bell (1962) is pure mechanics. The bell pocket opens the five tulips for two seconds, and a jackpot holds them wide. Hanemono (1981) adds a winged start pocket and a seven segment readout, and a jackpot latches the wings open. Digi Reels (1991) is the modern layout with LCD reels, reach, super reach, kakuhen and jitan modes, and a right side attacker that only takes right shots during rounds. Senpuku (2004) hides a favorable mode behind short two round hits, so reading the history pays. Battle Duel (2012) turns reach into an LCD duel with two windmills in the field, where a win means kakuhen and a loss means jitan. Kenrimono (2019) asks you to pass three gate lamps in order, and completing the chain earns the right to a jackpot on the very next spin. Smart Rush (2023) is the ball-less cabinet: balls still rattle inside but nothing is paid out, the unit simply counts, and that is why its hits are rare and its rushes run long.

## Reading the reach

The last reel to stop is the whole drama, so it is built the way a real machine builds it. A cyan frame is an ordinary reach. A red frame with a CHANCE cut in is a super reach, which is rarer and far more often a hit. The reel decelerates into its stop rather than cutting off, and on a little under half of all reaches it stops dead on the matching symbol, holds long enough to hurt, then creeps one place past you. On a super reach that pause can go the other way and slide into the match instead.

## How it works

The physics is custom and runs at a fixed step of 1/240 of a second with four substeps. Ball speed is capped so a ball can never tunnel through a pin. Pins sit in a uniform grid for fast lookups, and movers such as tulip petals, wings, the attacker lid and windmill fans are resolved as moving segments.

Outcomes never depend on where a ball lands. Each spin draws from a seeded stream where the nth draw depends only on the cabinet seed and n, so a machine's history is the same on every device. Only launch variance uses a separate random source. The hall pre plays each machine so every counter and history looks lived in on the first visit.

Payouts were tuned against a headless simulation that plays every cabinet optimally for eighteen thousand launches. Return per ball lands between 0.86 and 1.26 across the seven, which the exchange spread then taxes again on the way out.

Rendering uses PixiJS 8 from the jsDelivr CDN. Everything else is vanilla JavaScript in the single file. State saves to localStorage under one key, and the app still runs if storage is blocked.

## Tech

One self contained `index.html` with inline CSS and JavaScript, PixiJS 8 and Google Fonts from CDNs, no build step needed to run it. Layout holds from 375 px wide, tap targets are at least 44 px, and effects can be reduced in Settings.

## Workspace

The `workspace` folder holds the source sections (`src`), the assembler (`build.py`) and the headless tests (`test`). Run `python3 build.py` from `workspace` to rebuild `index.html`, and `npm install` inside `workspace/test` before running the browser tests.
