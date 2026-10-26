/* Brand colours, default pins and fallback data for Nocturne. */

// Matched against app names (lower-case "contains"). Order = default pin order.
window.NOCTURNE_BRANDS = [
  { match: 'netflix',       color: '#e50914', pin: true },
  { match: 'youtube tv',    color: '#ff0033' },
  { match: 'youtube',       color: '#ff0033', pin: true },
  { match: 'prime video',   color: '#00a8e1', pin: true },
  { match: 'disney',        color: '#113ccf', pin: true },
  { match: 'spotify',       color: '#1db954', pin: true },
  { match: 'max',           color: '#002be7' },
  { match: 'hulu',          color: '#1ce783' },
  { match: 'apple tv',      color: '#3a3a3c' },
  { match: 'plex',          color: '#e5a00d' },
  { match: 'twitch',        color: '#9146ff' },
  { match: 'crunchyroll',   color: '#f47521' },
  { match: 'paramount',     color: '#0064ff' },
  { match: 'peacock',       color: '#2b2b2b' },
  { match: 'tubi',          color: '#fa382f' },
  { match: 'samsung tv plus', color: '#1428a0' },
  { match: 'internet',      color: '#1259c3' },
  { match: 'gallery',       color: '#6c4bd8' }
];

// Used only if the TV refuses to share its app list. These are Samsung store app IDs.
window.NOCTURNE_FALLBACK_APPS = [
  { id: '3201907018807', name: 'Netflix' },
  { id: '111299001912',  name: 'YouTube' },
  { id: '3201910019365', name: 'Prime Video' },
  { id: '3201901017640', name: 'Disney+' },
  { id: '3201606009684', name: 'Spotify' },
  { id: '3201807016597', name: 'Apple TV' },
  { id: '3201601007625', name: 'Hulu' },
  { id: '3201512006963', name: 'Plex' }
];

// Browser preview only (no `tizen` object): a stand-in for a typical installed-app list.
window.NOCTURNE_MOCK_APPS = [
  'Netflix', 'YouTube', 'Prime Video', 'Disney+', 'Spotify', 'Max', 'Hulu', 'Apple TV',
  'Plex', 'Twitch', 'Crunchyroll', 'Paramount+', 'Tubi', 'Samsung TV Plus', 'Internet',
  'Gallery', 'YouTube TV', 'Peacock'
].map(function (name, i) { return { id: 'mock.' + i, name: name, iconPath: '' }; });
