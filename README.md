# clk — CloakBrowser Manager

Terminal UI + CLI for managing many **CloakBrowser** (stealth Chromium) profiles.
Each profile keeps a persistent fingerprint, its own proxy, and its own cookies —
so one machine can look like many different Windows/Mac devices.

This is the CloakBrowser sibling of [`cfm-cli`](https://github.com/zidanefaqih/cfm-cli)
(Camoufox/Gecko). Use `clk` when you need a Chromium engine (Turnstile, Cloudflare,
Kilo, sites that treat Firefox as second-class).

## What you get

- **1 profile = 1 permanent seed** → canvas / WebGL renderer / audio / hardware
  stay the same every launch (until you `/newseed`).
- **Raw mode by default** — the binary is launched directly, no Playwright, no
  `--remote-debugging-pipe`, no automation signal. Best for login / Turnstile.
- **CDP mode optional** (`--cdp`) for fingerprint measurement and scripting.
- **Per-signal noise** (`/noise`): audio ON, ClientRects **OFF** (Cloudflare
  rejects JS-shimmed rects — see [Noise](#noise)).
- **Engine pinning** per profile (`--engine 156.0.8078.47.1`).
- **Proxy store** for purchased proxies (Webshare, Bright Data, IPRoyal, …)
  in addition to local WireGuard→SOCKS5 (wireproxy) pools.
- Arrow-key TUI + slash commands, tab completion, history.

## Requirements

| Thing | Why | Notes |
|---|---|---|
| Python 3.10+ | runs `clk` | Linux primary; Windows untested |
| [`cloakbrowser`](https://pypi.org/project/cloakbrowser/) wrapper | downloads/launches the Pro Chromium binary | `pip install "cloakbrowser[geoip]"` |
| **License key** | the Pro binary refuses to start without one | **Free plan works** (1 concurrent session) |
| `prompt_toolkit` + `questionary` | TUI menus | installed below |
| ~600 MB disk | one Chromium Pro build | plus 100–300 MB per used profile |
| Proxy (optional but recommended) | otherwise every profile shares your real IP | wireproxy, or any HTTP/SOCKS proxy you bought |

You do **not** need Dolphin Anty, GoLogin, or a paid CloakBrowser plan to start.

## Install (Linux)

```bash
git clone https://github.com/zidanefaqih/clk-cli.git
cd clk-cli

python3 -m venv ~/.clk-venv
~/.clk-venv/bin/python -m pip install -U pip
~/.clk-venv/bin/python -m pip install "cloakbrowser[geoip]" prompt_toolkit questionary

# Put clk on PATH
mkdir -p ~/.local/bin
cp bin/clk ~/.local/bin/clk
chmod +x ~/.local/bin/clk
sed -i "1s|.*|#!$HOME/.clk-venv/bin/python|" ~/.local/bin/clk

# Runtime files (noise shim, GPU catalog)
mkdir -p ~/.cloak
cp extras/noise.js extras/gpus.json extras/gpus-extra.json ~/.cloak/
```

Optional: scoped Windows fonts so a "Windows" profile does not enumerate Linux
fonts. Copy real `.ttf/.ttc` Windows fonts (Segoe UI, Calibri, Consolas, …) to
`~/.cloak/winfonts/` and `examples/fonts.conf` to `~/.cloak/fonts.conf`.
**This repo does not ship Microsoft fonts** (license). `clk --doctor` reports
what is missing.

### Windows 10/11

**Not tested on this project yet** (same caveat as early `cfm-cli`). The
CloakBrowser wrapper and Chromium Pro **do** ship Windows builds, so it should
work for the core path (create profile → launch → login). Install Git, Python
3.10+, and `curl.exe` first. In PowerShell:

```powershell
git clone https://github.com/zidanefaqih/clk-cli.git
cd clk-cli

py -3.12 -m venv "$HOME\.clk-venv"
$python = "$HOME\.clk-venv\Scripts\python.exe"
& $python -m pip install -U pip
& $python -m pip install "cloakbrowser[geoip]" prompt_toolkit questionary

# login (free key by email, or paste cb_...)
& $python -m cloakbrowser login

# run from the clone
& $python .\bin\clk

# or put it on PATH
mkdir -Force "$env:USERPROFILE\.local\bin" | Out-Null
copy-item .\bin\clk "$env:USERPROFILE\.local\bin\clk"
# then edit the first line of that file to:
#   #!C:\Users\<you>\.clk-venv\Scripts\python.exe
# and add that folder to PATH
```

Use `py -3.10` / `py -3.11` if `py -3.12` is unavailable.

**Linux-only helpers (no-op or skipped on Windows):**

- Local WireGuard → SOCKS5 pool (`~/surfshark-proxy`, `ss-up`/`ss-down`, systemd)
  — use `--proxy` / `/addproxy` with a **remote** proxy instead, or `--noproxy`.
- fontconfig isolation (`~/.cloak/fonts.conf`) — Chromium on Windows uses DirectWrite.
- `xdotool` window focus, `xrandr` screen detection (falls back to `1920x1080`;
  set `--screen 1920x1080` or `/set` if you want another value).
- `/proc` scan for running browsers — seat count still works via the license
  server (`clk --doctor`).
- `start_new_session` for `--bg` — handled with `DETACHED_PROCESS`.

Profiles live under your user folder (`~/cloak-profiles` →
`C:\Users\<you>\cloak-profiles`). Purchased proxies go in
`~/.cloak/proxies.json` the same way.

If you hit a Windows-only crash, open an issue with the traceback. PRs that
make the Linux path worse will be rejected.

## Login / license (read this if `clk` refuses to launch)

The CloakBrowser **Pro binary requires a key**, even on the free plan.

```bash
# using the same venv as clk
~/.clk-venv/bin/cloakbrowser login
# or:
python -m cloakbrowser login
# or, after clk is on PATH:
clk login
```

The menu lets you **claim a free key by email** or paste an existing key
(keys start with `cb_`). The key is saved to `~/.cloakbrowser/license.key`
(mode 600). Free plan = **1 concurrent browser session**. Closing the window
normally releases the seat; `kill -9` holds it for ~4 minutes ("ghost seat")
— `clk` waits up to 6 minutes for you.

Check status anytime:

```bash
clk --doctor
# License:   Free (latest binary, 1 concurrent session)
# Sessions:  0/1 in use
```

If you see `License: none (a launch needs a key)` — you have not logged in.
If you see `seat dipakai` / `1/1 in use` — a browser is still running, or the
server still holds a killed session.

**Never commit or paste your license key.**

## First profile

```bash
clk
clk> /new acc1
```

Wizard: name → proxy → CPU cores → RAM → screen → GPU vendor → GPU model.

If you have no proxy yet, pick **tanpa proxy** (real IP) or add one first:

```
clk> /addproxy
Proxy (URL atau host:port:user:pass): 203.0.113.10:6014:myuser:mypass
```

Then:

```bash
clk> /run acc1        # raw mode (no CDP) — use this for login/Turnstile
# or
clk acc1              # same thing from the shell
```

Cookies persist in `~/cloak-profiles/acc1/`. Close the **window** to release
the seat (do not `kill -9`).

## Proxies

`clk` supports two kinds, mixed in the same picker:

### 1. Local wireproxy / Surfshark SOCKS5 (optional)

If you run a WireGuard→SOCKS5 pool at `~/surfshark-proxy/configs/*.conf`
(see [`cfm-cli`](https://github.com/zidanefaqih/cfm-cli)), those ports are
listed automatically (`sg-static-005` → `socks5://127.0.0.1:1091`, etc.).
Override the config dir with `CLK_CONFDIR`.

No Surfshark? Skip this. Use purchased proxies or `--noproxy`.

### 2. Purchased / manual proxies (Webshare, etc.)

Stored in `~/.cloak/proxies.json` (mode `600`, **never commit this file**).

```bash
# TUI
clk> /addproxy
# paste any of these:
#   http://user:pass@203.0.113.10:6014
#   socks5://user:pass@1.2.3.4:1080
#   203.0.113.10:6014:myuser:mypass              # Webshare dashboard format
#   203.0.113.10:6014                            # no auth

# CLI
clk addproxy "http://user:pass@203.0.113.10:6014" ws-uk1
clk addproxy "203.0.113.10:6014:user:pass"
clk testproxy ws-uk1        # exit IP + country
clk rmproxy ws-uk1
```

Attach to a profile:

```bash
clk> /proxy acc1     # pick the custom label from the menu
# or one-shot:
clk acc1 --proxy http://user:pass@203.0.113.10:6014
```

**Auth in raw mode:** Chromium ignores `user:pass` in `--proxy-server`, so `clk`
injects a minimal `webRequest.onAuthRequired` extension per profile. HTTP
proxies with username/password (Webshare default) work. SOCKS5 **with** password
is less reliable in raw mode — prefer HTTP, IP-whitelist the proxy, or use
`--cdp` (Playwright handles auth natively).

Example Webshare free-proxy row (`Proxy Address Port Username Password`):

```
clk addproxy "203.0.113.10:6014:myuser:mypass" webshare-uk
clk testproxy webshare-uk
clk myprofile --proxy http://myuser:mypass@203.0.113.10:6014
```

(Replace with **your** credentials. `203.0.113.10` is a documentation IP.)

### Per-profile default

`/proxy <name>` (or picking a proxy in `/new`) saves the choice in
`~/cloak-profiles/<name>/clk.json`. Later `clk <name>` reuses it.

## Noise

| Signal | Source | Default | Notes |
|---|---|---|---|
| Canvas | engine, per seed | ON | do **not** pass `--fingerprint-noise=false` |
| WebGL renderer | `--fingerprint-gpu-vendor/-renderer` | ON | hash may still match per engine; the *string* differs |
| Audio | JS shim (`getChannelData`) | **ON** | relatively safe |
| ClientRects + SVG | JS shim | **OFF** | Cloudflare/Turnstile rejects non-native `getBoundingClientRect` |

Turn rects on only for non-challenge work:

```
clk> /noise acc1 rects on
clk acc1 --noise-rects on
```

The Bromite flag `--fingerprinting-client-rects-noise` is **not** active in
CloakBrowser 156 (tested; zero effect). Native (C++ level) rect noise is not
available in this engine — that is why the default is OFF.

## Raw vs CDP

| | `clk acc1` (raw, default) | `clk acc1 --cdp` |
|---|---|---|
| Playwright / CDP | no | yes |
| Automation signal | none | `--remote-debugging-pipe` |
| Turnstile / login | **use this** | often rejected |
| Eval JS / measure FP | no | yes |

## Daily commands

| Command | Purpose |
|---|---|
| `/new [name]` | create profile (wizard) |
| `/run [name]` | launch (raw). `/run name cdp` for Playwright |
| `/list` | list profiles |
| `/info [name]` | stored identity |
| `/proxy [name]` | change default proxy |
| `/addproxy` | add purchased proxy |
| `/rmproxy` | remove purchased proxy |
| `/testproxy [label]` | exit IP check |
| `/proxies` | wireproxy + custom list |
| `/noise name rects\|audio on\|off` | per-signal noise |
| `/newseed [name]` | new identity, cookies kept |
| `/newfp [name]` | reroll GPU model |
| `/set [name]` | manual CPU/RAM/screen/GPU |
| `/status` | seat, processes, disk, stale locks |
| `/fixlocks` | remove `SingletonLock` |
| `/doctor` | wrapper diagnostics (binary, fonts, license) |
| `/raw [name]` | force raw launch |
| `/rm [name]` | delete profile |

Shell shortcuts:

```bash
clk acc1
clk acc1 --port 1091
clk acc1 --noproxy
clk acc1 --proxy socks5://user:pass@host:port
clk acc1 --new            # rotate seed
clk acc1 --show
clk acc1 --engine 156.0.8078.47.1
clk addproxy "host:port:user:pass"
clk login
clk --list
clk --doctor
```

## Engine pinning (wrapper 0.7.0)

`ensure_binary(browser_version=…)` is **ignored** when a license key is present
(it always returns the latest Pro build). `clk` therefore sets
`CLOAKBROWSER_BINARY_PATH` to `~/.cloakbrowser/chromium-<engine>-pro/chrome`.
Do not delete old version folders while any profile is still pinned to them.

## Layout

```
~/.clk-venv/                    # or any venv that owns the shebang
~/cloak/                        # CLK_VAULT
  noise.js  gpus.json  gpus-extra.json
  proxies.json                 # purchased proxies (0600) — not in git
  ext/<profile>/               # generated noise + proxy-auth extensions
  logs/<profile>-browser.log
  fonts.conf  winfonts/        # optional, you supply the fonts
~/.cloak-profiles/<name>/       # CLK_PROFILES — user-data-dir, cookies, clk.json
~/.cloakbrowser/                # wrapper cache: binaries + license.key
```

## What this repo does **not** contain

- License keys, `license.key`, `proxies.json` with real credentials
- Profiles, cookies, fingerprints of real accounts
- Windows/Mac font files
- Surfshark WireGuard configs / private keys

Those stay on your machine. `.gitignore` blocks the obvious ones; do not
`git add -f` them.

## Troubleshooting

**Launch fails, "license key is invalid or missing"** → `clk login`.

**"session limit" / seat stuck** → close the window normally; wait ~4 minutes
after a kill; `clk --doctor | grep Sessions`.

**Turnstile fails** → use raw mode (default), rects noise OFF, do not use CDP.
IP reputation still matters; try another proxy.

**`--load-extension` ignored** → already handled (`--disable-features=DisableLoadExtensionCommandLineSwitch`).

**STUN flood in logs** → expected behind SOCKS; `clk` already sends
`--force-webrtc-ip-handling-policy=disable_non_proxied_udp`.

**Profile stuck "existing browser session"** → `clk fixlocks` (make sure the
browser is actually closed).

**Canvas identical across profiles** → you (or something) passed
`--fingerprint-noise=false`. Do not.

## Related

- [`cfm-cli`](https://github.com/zidanefaqih/cfm-cli) — Camoufox (Gecko) manager
- [CloakHQ/CloakBrowser](https://github.com/CloakHQ/CloakBrowser) — the engine wrapper

## License

MIT — see [LICENSE](LICENSE). CloakBrowser itself is a separate project with
its own license and account system.
