#!/usr/bin/env bash
# Install clk into ~/.clk-venv and ~/.local/bin
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
VENV="${CLK_VENV:-$HOME/.clk-venv}"

echo "==> venv: $VENV"
python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install -U pip
"$VENV/bin/python" -m pip install "cloakbrowser[geoip]" prompt_toolkit questionary

echo "==> install clk"
mkdir -p "$HOME/.local/bin" "$HOME/.cloak"
cp "$HERE/bin/clk" "$HOME/.local/bin/clk"
chmod +x "$HOME/.local/bin/clk"
sed -i "1s|.*|#!$VENV/bin/python|" "$HOME/.local/bin/clk"

echo "==> extras -> ~/.cloak"
cp -n "$HERE/extras/noise.js" "$HOME/.cloak/noise.js" 2>/dev/null || true
cp -n "$HERE/extras/gpus.json" "$HOME/.cloak/gpus.json" 2>/dev/null || true
cp -n "$HERE/extras/gpus-extra.json" "$HOME/.cloak/gpus-extra.json" 2>/dev/null || true

echo
echo "Done. Next:"
echo "  1) ~/.clk-venv/bin/cloakbrowser login    # free key by email"
echo "  2) clk                                   # TUI"
echo "  3) /addproxy                             # if you have purchased proxies"
echo "  4) /new acc1 && /run acc1"
