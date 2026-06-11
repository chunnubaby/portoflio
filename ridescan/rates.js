/* ============================================================
   RideScan — service catalog & rate cards
   ------------------------------------------------------------
   Every entry is one ride product. Pricing follows the standard
   rideshare formula:

     fare = max(minFare, base + perKm·km + perMin·min) + bookingFee

   Rates are representative published rates (big-city averages,
   in the local currency of each market). They drift over time —
   edit them here, nothing else needs to change.

   Availability:
     countries: ISO codes the service operates in ('*' = global)
     cities:    optional — if present, service ONLY shows when the
                pickup city matches one of these (lowercase substring)
   ============================================================ */

const PROVIDERS = {
  uber:  { name: "Uber",   color: "#000000", textColor: "#ffffff" },
  lyft:  { name: "Lyft",   color: "#ea0b8c" },
  hopp:  { name: "Hopp",   color: "#34d186", textColor: "#063a22" },
  uride: { name: "Uride",  color: "#6c3df4" },
  yride: { name: "YRide",  color: "#f5b942", textColor: "#3a2a00" },
  bolt:  { name: "Bolt",   color: "#34d186", textColor: "#063a22" },
  grab:  { name: "Grab",   color: "#00b14f" },
  ola:   { name: "Ola",    color: "#a6c812", textColor: "#1d2400" },
  didi:  { name: "DiDi",   color: "#ff7e33" },
  careem:{ name: "Careem", color: "#37b34a" },
  indrive:{ name: "inDrive", color: "#aeea00", textColor: "#1d2400" },
  taxi:  { name: "Taxi",   color: "#ffc400", textColor: "#3a2a00" },
};

/* typical pickup wait in minutes [low, high] — bigger fleets = faster pickup */
const SERVICES = [
  /* ---------------- Uber (≈70 countries) ---------------- */
  {
    id: "uberx", provider: "uber", name: "UberX", seats: 4,
    countries: ["*"], wait: [3, 6],
    rates: {
      CA: { cur: "CAD", base: 2.55, perKm: 0.81, perMin: 0.33, fee: 2.75, min: 6.50 },
      US: { cur: "USD", base: 1.95, perKm: 0.95, perMin: 0.30, fee: 2.55, min: 7.20 },
      GB: { cur: "GBP", base: 2.50, perKm: 0.78, perMin: 0.14, fee: 1.00, min: 5.25 },
      AU: { cur: "AUD", base: 2.50, perKm: 1.10, perMin: 0.38, fee: 1.20, min: 9.60 },
      IN: { cur: "INR", base: 45,   perKm: 13,   perMin: 1.2,  fee: 8,    min: 60 },
      default: { cur: "USD", base: 2.00, perKm: 0.90, perMin: 0.28, fee: 2.00, min: 6.00 },
    },
    link: (t) => `https://m.uber.com/ul/?action=setPickup` +
      `&pickup[latitude]=${t.from.lat}&pickup[longitude]=${t.from.lng}&pickup[nickname]=${enc(t.from.short)}` +
      `&dropoff[latitude]=${t.to.lat}&dropoff[longitude]=${t.to.lng}&dropoff[nickname]=${enc(t.to.short)}`,
  },
  {
    id: "uber_comfort", provider: "uber", name: "Comfort", sub: "newer cars · more legroom", seats: 4,
    countries: ["CA", "US", "GB", "AU"], wait: [4, 8],
    rates: {
      CA: { cur: "CAD", base: 3.20, perKm: 1.05, perMin: 0.42, fee: 2.75, min: 8.00 },
      US: { cur: "USD", base: 2.60, perKm: 1.20, perMin: 0.38, fee: 2.55, min: 9.00 },
      default: { cur: "USD", base: 2.60, perKm: 1.20, perMin: 0.38, fee: 2.55, min: 9.00 },
    },
    link: null, /* falls back to uberx link */
  },
  {
    id: "uberxl", provider: "uber", name: "UberXL", sub: "up to 6 riders", seats: 6,
    countries: ["*"], wait: [5, 10],
    rates: {
      CA: { cur: "CAD", base: 3.85, perKm: 1.55, perMin: 0.50, fee: 2.75, min: 10.00 },
      US: { cur: "USD", base: 3.10, perKm: 1.70, perMin: 0.45, fee: 2.55, min: 11.00 },
      default: { cur: "USD", base: 3.00, perKm: 1.60, perMin: 0.42, fee: 2.00, min: 9.00 },
    },
    link: null,
  },
  {
    id: "uber_black", provider: "uber", name: "Uber Black", sub: "luxury · pro drivers", seats: 4, premium: true,
    countries: ["CA", "US", "GB", "AU", "AE"], wait: [6, 12],
    rates: {
      CA: { cur: "CAD", base: 7.00, perKm: 2.30, perMin: 0.85, fee: 2.75, min: 18.00 },
      US: { cur: "USD", base: 5.80, perKm: 2.50, perMin: 0.80, fee: 2.55, min: 20.00 },
      default: { cur: "USD", base: 5.80, perKm: 2.50, perMin: 0.80, fee: 2.55, min: 20.00 },
    },
    link: null,
  },

  /* ---------------- Lyft (US + Canada) ---------------- */
  {
    id: "lyft", provider: "lyft", name: "Lyft", seats: 4,
    countries: ["US", "CA"], wait: [4, 7],
    rates: {
      CA: { cur: "CAD", base: 2.75, perKm: 0.85, perMin: 0.31, fee: 2.95, min: 6.50 },
      US: { cur: "USD", base: 2.10, perKm: 1.00, perMin: 0.28, fee: 2.85, min: 7.00 },
    },
    link: (t) => `https://ride.lyft.com/ridetype?id=lyft` +
      `&pickup[latitude]=${t.from.lat}&pickup[longitude]=${t.from.lng}` +
      `&destination[latitude]=${t.to.lat}&destination[longitude]=${t.to.lng}`,
  },
  {
    id: "lyft_xl", provider: "lyft", name: "Lyft XL", sub: "up to 6 riders", seats: 6,
    countries: ["US", "CA"], wait: [6, 11],
    rates: {
      CA: { cur: "CAD", base: 4.00, perKm: 1.60, perMin: 0.45, fee: 2.95, min: 10.50 },
      US: { cur: "USD", base: 3.30, perKm: 1.75, perMin: 0.42, fee: 2.85, min: 11.50 },
    },
    link: (t) => `https://ride.lyft.com/ridetype?id=lyft_plus` +
      `&pickup[latitude]=${t.from.lat}&pickup[longitude]=${t.from.lng}` +
      `&destination[latitude]=${t.to.lat}&destination[longitude]=${t.to.lng}`,
  },

  /* ---------------- Hopp by Bolt (North America) ---------------- */
  {
    id: "hopp", provider: "hopp", name: "Hopp", sub: "by Bolt · launch pricing", seats: 4,
    countries: ["CA", "US"],
    cities: ["toronto", "mississauga", "brampton", "vaughan", "markham", "scarborough", "etobicoke", "north york"],
    wait: [5, 9],
    rates: {
      CA: { cur: "CAD", base: 2.00, perKm: 0.72, perMin: 0.27, fee: 2.00, min: 5.50 },
      US: { cur: "USD", base: 1.80, perKm: 0.85, perMin: 0.25, fee: 1.90, min: 6.00 },
    },
    link: () => `https://hopp.to/`,
  },

  /* ---------------- Uride (smaller Canadian cities) ---------------- */
  {
    id: "uride", provider: "uride", name: "Uride", seats: 4,
    countries: ["CA"],
    cities: ["thunder bay", "sudbury", "greater sudbury", "sault ste. marie", "north bay", "timmins",
             "prince george", "red deer", "lethbridge", "medicine hat", "grande prairie",
             "charlottetown", "moncton", "fredericton", "saint john", "halifax", "sydney", "kamloops"],
    wait: [5, 10],
    rates: { CA: { cur: "CAD", base: 3.00, perKm: 1.10, perMin: 0.25, fee: 1.50, min: 8.00 } },
    link: () => `https://www.uride.com/`,
  },

  /* ---------------- YRide (regional) ---------------- */
  {
    id: "yride", provider: "yride", name: "YRide", seats: 4,
    countries: ["CA"],
    cities: ["london", "windsor", "kitchener", "waterloo", "guelph"], /* edit to match where YRide actually runs near you */
    wait: [6, 12],
    rates: { CA: { cur: "CAD", base: 2.80, perKm: 1.00, perMin: 0.25, fee: 1.00, min: 7.00 } },
    link: () => `https://yride.ca/`,
  },

  /* ---------------- Bolt (Europe / Africa) ---------------- */
  {
    id: "bolt", provider: "bolt", name: "Bolt", seats: 4,
    countries: ["GB", "FR", "DE", "ES", "PT", "PL", "EE", "LV", "LT", "NL", "RO", "CZ", "SK", "HU",
                "NO", "SE", "FI", "AT", "IE", "IT", "GR", "HR", "ZA", "NG", "KE", "GH", "UA"],
    wait: [3, 7],
    rates: { default: { cur: "EUR", base: 1.50, perKm: 1.00, perMin: 0.22, fee: 1.00, min: 4.00 },
             GB: { cur: "GBP", base: 1.80, perKm: 0.85, perMin: 0.15, fee: 0.75, min: 4.50 } },
    link: () => `https://bolt.eu/`,
  },

  /* ---------------- Grab (Southeast Asia) ---------------- */
  {
    id: "grab", provider: "grab", name: "GrabCar", seats: 4,
    countries: ["SG", "MY", "TH", "ID", "PH", "VN", "KH", "MM"],
    wait: [3, 8],
    rates: { default: { cur: "USD", base: 1.80, perKm: 0.55, perMin: 0.12, fee: 0.50, min: 3.50 },
             SG: { cur: "SGD", base: 2.50, perKm: 0.70, perMin: 0.16, fee: 0.70, min: 5.00 } },
    link: () => `https://www.grab.com/`,
  },

  /* ---------------- Ola (India / ANZ) ---------------- */
  {
    id: "ola", provider: "ola", name: "Ola", seats: 4,
    countries: ["IN", "AU", "NZ"],
    wait: [4, 9],
    rates: { IN: { cur: "INR", base: 40, perKm: 11, perMin: 1.0, fee: 10, min: 55 },
             default: { cur: "AUD", base: 2.20, perKm: 1.05, perMin: 0.35, fee: 1.10, min: 9.00 } },
    link: () => `https://www.olacabs.com/`,
  },

  /* ---------------- DiDi (LatAm / AU / MX) ---------------- */
  {
    id: "didi", provider: "didi", name: "DiDi", seats: 4,
    countries: ["MX", "BR", "AR", "CL", "CO", "PE", "AU", "NZ", "JP", "CR", "PA", "DO", "EC"],
    wait: [3, 8],
    rates: { default: { cur: "USD", base: 1.40, perKm: 0.65, perMin: 0.16, fee: 0.80, min: 3.50 },
             AU: { cur: "AUD", base: 2.00, perKm: 1.00, perMin: 0.32, fee: 1.00, min: 8.50 } },
    link: () => `https://web.didiglobal.com/`,
  },

  /* ---------------- Careem (Middle East) ---------------- */
  {
    id: "careem", provider: "careem", name: "Careem GO", seats: 4,
    countries: ["AE", "SA", "QA", "BH", "KW", "OM", "JO", "EG", "PK", "MA"],
    wait: [4, 9],
    rates: { AE: { cur: "AED", base: 5.00, perKm: 1.60, perMin: 0.45, fee: 2.00, min: 12.00 },
             default: { cur: "USD", base: 1.30, perKm: 0.45, perMin: 0.12, fee: 0.60, min: 3.00 } },
    link: () => `https://www.careem.com/`,
  },

  /* ---------------- inDrive (bid your fare) ---------------- */
  {
    id: "indrive", provider: "indrive", name: "inDrive", sub: "you propose the fare", seats: 4,
    countries: ["US", "MX", "BR", "CO", "PE", "EC", "KZ", "ID", "IN", "PK", "EG", "ZA", "TH"],
    wait: [5, 12],
    rates: { default: { cur: "USD", base: 1.00, perKm: 0.60, perMin: 0.10, fee: 0.00, min: 3.00 } },
    link: () => `https://indrive.com/`,
  },

  /* ---------------- Local metered taxi (everywhere) ---------------- */
  {
    id: "taxi", provider: "taxi", name: "Local taxi", sub: "metered city rate", seats: 4,
    countries: ["*"], wait: [8, 15],
    rates: {
      CA: { cur: "CAD", base: 4.50, perKm: 1.75, perMin: 0.10, fee: 0, min: 4.50 },
      US: { cur: "USD", base: 3.50, perKm: 1.85, perMin: 0.12, fee: 0, min: 3.50 },
      GB: { cur: "GBP", base: 3.80, perKm: 1.60, perMin: 0.20, fee: 0, min: 3.80 },
      default: { cur: "USD", base: 3.00, perKm: 1.40, perMin: 0.10, fee: 0, min: 3.00 },
    },
    link: (t) => `https://www.google.com/maps/search/taxi/@${t.from.lat},${t.from.lng},14z`,
  },
];

/* country code → currency for countries not explicitly listed in a rate card */
const COUNTRY_CURRENCY = {
  CA: "CAD", US: "USD", GB: "GBP", AU: "AUD", NZ: "NZD", IN: "INR", SG: "SGD",
  AE: "AED", SA: "SAR", MX: "MXN", BR: "BRL", JP: "JPY", ZA: "ZAR",
  FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", PT: "EUR", IE: "EUR",
  AT: "EUR", GR: "EUR", FI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", SK: "EUR",
};

function enc(s) { return encodeURIComponent(s || ""); }
