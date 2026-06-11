# RideScan

Skyscanner for rideshare. One search → every ride app available in that region, priced for the
exact trip and ranked best deal first. Works worldwide.

**Try it:** once deployed, lives at `farhannaushad.com/ridescan/`

## How it works

1. **Search** — type pickup + dropoff (autocomplete via [Photon](https://photon.komoot.io/), OpenStreetMap data), or tap ◎ to use GPS.
2. **Route** — the real driving route (distance + time) comes from [OSRM](http://project-osrm.org/).
3. **Scan** — every service operating in the pickup region is priced using its published rate card
   (`fare = base + per-km + per-min + booking fee`, floored at the minimum fare), adjusted by a
   time-of-day demand model (rush hour / weekend nights ≈ surge).
4. **Rank** — sort by Cheapest, Fastest pickup, or Best value. Cheapest and best-value rides get badges.
5. **Book** — tapping a ride deep-links into that app (Uber/Lyft open with the exact trip pre-filled)
   where the rider sees the live quote and books.

## Why estimates, not live prices?

Uber, Lyft, Bolt etc. shut their public price APIs years ago — no comparison product
(RideGuru, Bellhop, Obi included) gets live quotes from all of them. The standard approach is
exactly this: rate-card estimates + deep links to the live quote. If you ever get partner API
access (e.g. Lyft's partner program), swap `quoteAll()` in `app.js` to call it.

## Services covered

| Region | Services |
|---|---|
| Everywhere | Uber (X / Comfort / XL / Black), local metered taxi |
| US + Canada | Lyft (+ XL), inDrive |
| Toronto / GTA | Hopp (by Bolt) |
| Smaller Canadian cities | Uride, YRide |
| Europe / Africa | Bolt |
| Southeast Asia | Grab |
| India / ANZ | Ola |
| Latin America / AU / JP | DiDi |
| Middle East | Careem |

## Editing prices & coverage

Everything lives in [rates.js](rates.js) — each service has rate cards per country and an
optional `cities` list. Update numbers there as companies change pricing; nothing else needs
to change. Add a new ride company by adding one entry to `SERVICES`.

## Stack

- Pure HTML/CSS/JS, zero build step (same as the rest of the site)
- Leaflet + Carto dark tiles for the route map
- PWA: installable on iOS ("Add to Home Screen") and Android ("Install app"), works offline for the shell
- Free APIs only — no keys, no backend, no cost
