#!/usr/bin/env python3
"""v6.5 game icons: filled, two-tone, outlined - readable at 20 px on a phone (the hub used thin line icons).
Writes them into client/index.html in place of the old icons, keyed by button id. Run again after editing: idempotent.
Each icon is a 24x24 SVG: a dark outline (#2a1606) under coloured fills, plus a small white highlight."""
import re, pathlib
HTML = pathlib.Path(__file__).resolve().parent.parent / 'index.html'
O = 'stroke="#2a1606" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"'
HL = 'fill="#fff" opacity=".55"'
ICONS = {
  # home: a Lahore rooftop house
  'railHome': f'<path d="M3 11.2 12 4l9 7.2v9.3H3Z" fill="#ffd24d" {O}/><path d="M3 11.2 12 4l9 7.2" fill="none" stroke="#e8402f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 20.5v-5.2h5v5.2" fill="#8a4b1c" {O}/><rect x="15.6" y="12" width="2.6" height="2.6" fill="#7bdff2" {O}/>',
  # online: a globe with land, and a tiny kite
  'onlineBtn': f'<circle cx="12" cy="12" r="8.6" fill="#4cb7ff" {O}/><path d="M6.4 8.6c2 .2 2.6 1.6 4 1.4s1.4 2.6 3.2 2.8-.4 3.4-1.8 4.4M14.6 4.2c-.4 1.4.6 2.2 1.8 2.4s2.6 1.6 2.4 3" fill="#5fd36a" {O}/><path d="M7.5 6.2a5.4 5.4 0 0 1 3-1.6" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>',
  # kites: a patang, red and yellow
  'railKites': f'<path d="M12 2.6 19.2 10 12 21.4 4.8 10Z" fill="#ffd24d" {O}/><path d="M12 2.6 19.2 10H12Z" fill="#e8402f"/><path d="M12 10v11.4L4.8 10Z" fill="#e8402f"/><path d="M12 2.6 19.2 10 12 21.4 4.8 10Z" fill="none" {O}/><path d="M12 2.6v18.8M4.8 10h14.4" fill="none" stroke="#2a1606" stroke-width="1.1"/>',
  # mohalla: two houses side by side
  'mohallaBtn': f'<path d="M2.6 20.4V11l4.6-3.6 4.6 3.6v9.4Z" fill="#e9d3a8" {O}/><path d="M11.8 20.4V9.4l4.8-3.8 4.8 3.8v11Z" fill="#ffb347" {O}/><rect x="5.6" y="14" width="3.2" height="6.4" fill="#8a4b1c" {O}/><rect x="15" y="11.6" width="3.2" height="3" fill="#7bdff2" {O}/>',
  # shop: a bag with a coin
  'shopBtn': f'<path d="M4.2 8.6h15.6l-1.3 11a1.6 1.6 0 0 1-1.6 1.4H7.1a1.6 1.6 0 0 1-1.6-1.4Z" fill="#ff8f3a" {O}/><path d="M8.6 8.6V7a3.4 3.4 0 0 1 6.8 0v1.6" fill="none" {O}/><circle cx="12" cy="14.6" r="3.3" fill="#ffd24d" {O}/><path d="M12 12.9v3.4" stroke="#b8860b" stroke-width="1.3" stroke-linecap="round"/>',
  # trophies: a gold cup
  'trophyBtn': f'<path d="M7.4 3.6h9.2v5.2a4.6 4.6 0 0 1-9.2 0Z" fill="#ffd24d" {O}/><path d="M7.4 5.4H4.6a3.2 3.2 0 0 0 3.2 4.4M16.6 5.4h2.8a3.2 3.2 0 0 1-3.2 4.4" fill="none" {O}/><path d="M12 13.4v3.4" {O}/><path d="M8 20.4h8l-1-3.6H9Z" fill="#c9862a" {O}/><path d="M9.4 5v3.4" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>',
  # daily login: a red calendar with a star
  'loginBtn': f'<rect x="3.6" y="5" width="16.8" height="15.6" rx="2" fill="#fff6e0" {O}/><path d="M3.6 7a2 2 0 0 1 2-2h12.8a2 2 0 0 1 2 2v3H3.6Z" fill="#e8402f" {O}/><path d="M8 3.4v3.4M16 3.4v3.4" {O}/><path d="m12 11.6 1.4 2.8 3 .4-2.2 2.1.5 3-2.7-1.4-2.7 1.4.5-3-2.2-2.1 3-.4Z" fill="#ffc83d" {O}/>',
  # free gift: a green box with a yellow ribbon
  'giftBtn': f'<rect x="3.6" y="9.4" width="16.8" height="11" rx="1.4" fill="#3fbf6a" {O}/><rect x="2.8" y="7" width="18.4" height="3.6" rx="1" fill="#5fd38a" {O}/><path d="M12 7v13.4" stroke="#ffc83d" stroke-width="3"/><path d="M12 7c-1.6-3.6-5.6-3.6-5.6-1.3S9.4 7 12 7Zm0 0c1.6-3.6 5.6-3.6 5.6-1.3S14.6 7 12 7Z" fill="#ffc83d" {O}/>',
  # leaderboard: a podium
  'lbBtn': f'<rect x="8.6" y="8" width="6.8" height="12.6" fill="#ffd24d" {O}/><rect x="2.6" y="12" width="6" height="8.6" fill="#d7dde8" {O}/><rect x="15.4" y="14" width="6" height="6.6" fill="#e0955a" {O}/><path d="m12 3.2.9 1.8 2 .3-1.4 1.3.3 2-1.8-.9-1.8.9.3-2-1.4-1.3 2-.3Z" fill="#fff" {O}/>',
  # collection: an album of kites
  'collBtn': f'<rect x="3.2" y="4" width="17.6" height="16.4" rx="2" fill="#9b6bff" {O}/><path d="M8.4 6.8 11.2 10 8.4 14 5.6 10Z" fill="#ffd24d" {O}/><path d="M15.6 6.8 18.4 10 15.6 14 12.8 10Z" fill="#ff5ea8" {O}/><path d="M12 13 14.8 16.2 12 19.4 9.2 16.2Z" fill="#7bdff2" {O}/>',
  # tutorial: a graduation cap
  'tutBtn': f'<path d="M2 9 12 4.6 22 9 12 13.4Z" fill="#3d4ea8" {O}/><path d="M6.4 11v4.4c0 1.8 2.5 3.2 5.6 3.2s5.6-1.4 5.6-3.2V11L12 13.4Z" fill="#5a6cd0" {O}/><path d="M20 9.8v5.4" {O}/><circle cx="20" cy="16" r="1.3" fill="#ffc83d" {O}/>',
  # how to play: a speech bubble with ?
  'howBtn': f'<path d="M4 5.4h16a1.6 1.6 0 0 1 1.6 1.6v9a1.6 1.6 0 0 1-1.6 1.6H11l-4.6 3.6v-3.6H4A1.6 1.6 0 0 1 2.4 16V7A1.6 1.6 0 0 1 4 5.4Z" fill="#7bdff2" {O}/><path d="M10.2 9.4a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.5" fill="none" stroke="#2a1606" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="14.6" r=".9" fill="#2a1606"/>',
  # settings: a gear
  'setBtnMenu': f'<path d="M10.4 2.6h3.2l.5 2.4 1.6.7 2-1.4 2.3 2.3-1.4 2 .7 1.6 2.4.5v3.2l-2.4.5-.7 1.6 1.4 2-2.3 2.3-2-1.4-1.6.7-.5 2.4h-3.2l-.5-2.4-1.6-.7-2 1.4-2.3-2.3 1.4-2-.7-1.6-2.4-.5v-3.2l2.4-.5.7-1.6-1.4-2 2.3-2.3 2 1.4 1.6-.7Z" fill="#c7cede" {O}/><circle cx="12" cy="12" r="3.2" fill="#3d4466" {O}/>',
  # bots difficulty: a flame
  'hubDiff': f'<path d="M12 21c-4 0-6.6-2.6-6.6-6.2 0-3.6 3-5.6 3.6-9.8 2.8 1.6 4.2 4 4.4 6.4.9-.7 1.6-1.9 1.8-3.2 2.1 1.8 3.5 4.2 3.5 6.6 0 3.6-2.6 6.2-6.7 6.2Z" fill="#ff7a2a" {O}/><path d="M12 21c-2 0-3.2-1.3-3.2-3 0-1.8 1.4-2.6 1.8-4.6 1.5.8 2.2 2 2.3 3.2.5-.4.9-1 1-1.6 1 .9 1.6 2 1.6 3.1 0 1.7-1.4 2.9-3.5 2.9Z" fill="#ffd24d"/>',
  # mode: two crossed kites
  'hubMode': f'<path d="M3 21 15.6 4.4M21 21 8.4 4.4" stroke="#2a1606" stroke-width="1.4"/><path d="M8.4 2.6 12 5.8 9.6 10 5 7.6Z" fill="#e8402f" {O}/><path d="M15.6 2.6 19 7.6 14.4 10 12 5.8Z" fill="#ffd24d" {O}/><circle cx="12" cy="13.6" r="1.6" fill="#fff" {O}/>',
}
s = HTML.read_text(encoding='utf8')
n = 0
for bid, body in ICONS.items():
    pat = re.compile(r'(<button[^>]*\bid="%s"[^>]*>)(<svg[^>]*>.*?</svg>)' % re.escape(bid), re.S)
    new = f'<svg class="gi" viewBox="0 0 24 24" aria-hidden="true">{body}</svg>'
    s, k = pat.subn(lambda m: m.group(1) + new, s, count=1)
    if not k: raise SystemExit('icon target not found: ' + bid)
    n += k
HTML.write_text(s, encoding='utf8')
print(n, 'icons written')
