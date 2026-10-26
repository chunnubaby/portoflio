# Nocturne: a dark app grid for Samsung TVs

A sideloaded Tizen web app. It shows your installed apps as big, dark tiles. Pinned apps go in the top row, everything else in a grid below. It doesn't delete or change any of your existing apps.

**Needs:** a 2018 or newer Samsung TV (Tizen 4.0+) and a Windows PC on the same Wi-Fi.

## Remote controls

| Button | What it does |
|---|---|
| Arrows / OK | Move / open app |
| 🔴 Red | Pin or unpin the highlighted app |
| 🟢 Green | Reorder mode for pinned apps (← → to move, OK to save) |
| 🟡 Yellow | Change background: Theme colour → Aurora (moving) → Nebula → Dusk → your photos |
| 🔵 Blue | Switch theme: Midnight → OLED black → Aurora |
| Back | Close Nocturne |

If your remote has no colour buttons, press the **123 / ⋯** button to show them on screen.

The app list refreshes on its own whenever you come back to Nocturne, so newly installed apps just show up.

## Your own background photos

1. Put JPG or PNG files in the `backgrounds` folder. Landscape 1920×1080 works best.
2. Add a line for each one in `backgrounds/backgrounds.js`, for example `{ file: 'beach.jpg', name: 'Beach' }`.
3. Reinstall Nocturne on the TV, then press **Yellow** until your photo shows.

Photos are darkened automatically so the tiles stay readable. `sample-night.jpg` is only a demo, so delete its line if you don't want it.

## What it can't do (a Samsung limit, not a bug)

- **Home** still opens Samsung's own home bar. Samsung doesn't let apps replace it. Workaround: move Nocturne to the first spot on the home bar so it's one click away.
- Some models hide their app list from third-party apps. If that happens, Nocturne shows a common set (Netflix, YouTube, Prime, Disney+, and so on) instead.

## Privacy

Nocturne asks for just three permissions: read the app list, open apps, and use the colour buttons. It has **no internet, microphone or camera access** and doesn't send anything anywhere.

---

## Install it, step by step

### On the TV

1. Open **Apps** on the home bar.
2. On the remote, press **1 2 3 4 5** (on remotes without a number pad, use the on-screen number pad from the 123 button). A **Developer Mode** box opens.
3. Turn Developer Mode **On**. For **Host PC IP**, type this PC's IP address (run `ipconfig` and use the "IPv4 Address" under Wi-Fi).
4. Restart the TV by **holding the power button** until the Samsung logo shows. Turning it off normally isn't enough.
5. Note the TV's IP: Settings → General → Network → Network Status → IP Settings.

### On the PC (one-time setup)

1. Install **Tizen Studio** from developer.tizen.org (the version that includes the IDE).
2. Open **Package Manager** → **Extension SDK** tab → install **TV Extensions** and **Samsung Certificate Extension**.
3. Open **Device Manager** → **Remote Device Manager** → **+** → enter the TV's IP → switch it to **On**. The TV appears in the device list.
4. Open **Certificate Manager** → **+** → **Samsung** → **TV** → create a new author and a distributor certificate. **You'll sign in to your Samsung account here yourself.** It adds your TV automatically because it's connected.
5. In Device Manager, right-click the TV → **Permit to install applications**.

### Build and install

In Tizen Studio: **File → Import → Tizen → Tizen Project** → choose this folder → right-click the project → **Run As → Tizen Web Application**.

Or from the command line (Tizen Studio's `tools/ide/bin` must be on your PATH):

```bash
tizen package -t wgt -s <your-certificate-profile-name> -- samsung-tv-launcher
```

```bash
tizen install -n Nocturne.wgt -t <tv-name-from-device-manager> -- samsung-tv-launcher
```

### Afterwards

- Nocturne is now in **Apps**. Highlight it, press down → **Move**, and put it first on the home bar.
- **Security:** turn Developer Mode **off** again (same 12345 menu) once installed, so the TV stops accepting connections from your PC. If Nocturne ever stops opening, turn it back on and reinstall.

## Preview on the PC

You can try it without a TV: run the `tv-launcher` preview, then use the arrow keys, Enter, and **R / G / Y / B** for the colour buttons. Esc acts as Back.
