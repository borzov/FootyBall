#!/usr/bin/env python3
"""Generate 5 realistic vector (SVG) soccer-ball designs + a preview gallery.

Each ball is rendered as a shaded sphere with a soft drop shadow ("light
shadow"). Geometry of the classic pentagon pattern is computed so seams line up
like a real ball. Designs share a common sphere-shading overlay (rim darkening +
top-left specular highlight) so every variant reads as a 3D object, not a flat
sticker.
"""
import math
import os

CX, CY, R = 110.0, 102.0, 80.0
VB = 220
OUT = os.path.dirname(os.path.abspath(__file__))


def pt(cx, cy, r, rot_deg, i, n=5):
    a = math.radians(rot_deg) + i * 2 * math.pi / n
    return (cx + math.cos(a) * r, cy + math.sin(a) * r)


def pentagon(cx, cy, r, rot_deg):
    pts = [pt(cx, cy, r, rot_deg, i) for i in range(5)]
    d = "M " + " L ".join(f"{x:.2f},{y:.2f}" for x, y in pts) + " Z"
    return d


def f(v):
    return f"{v:.2f}"


def sphere_defs(idsuffix, highlight="rgba(255,255,255,0.92)", rim=0.34):
    """Reusable sphere shading: rim-darkening vignette + specular highlight."""
    return f"""
    <radialGradient id="rim_{idsuffix}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="62%" stop-color="#000" stop-opacity="0"/>
      <stop offset="88%" stop-color="#000" stop-opacity="{rim*0.5:.2f}"/>
      <stop offset="100%" stop-color="#000" stop-opacity="{rim:.2f}"/>
    </radialGradient>
    <radialGradient id="hi_{idsuffix}" cx="34%" cy="28%" r="46%">
      <stop offset="0%" stop-color="{highlight}"/>
      <stop offset="55%" stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>"""


def sphere_overlay(idsuffix):
    return f"""
  <circle cx="{f(CX)}" cy="{f(CY)}" r="{f(R)}" fill="url(#hi_{idsuffix})"/>
  <circle cx="{f(CX)}" cy="{f(CY)}" r="{f(R)}" fill="url(#rim_{idsuffix})"/>
  <circle cx="{f(CX)}" cy="{f(CY)}" r="{f(R)}" fill="none"
          stroke="rgba(0,0,0,0.28)" stroke-width="1.4"/>"""


def shadow(blur="3"):
    sy = CY + R + 9
    return (f'  <ellipse cx="{f(CX)}" cy="{f(sy)}" rx="{f(R*0.82)}" ry="9.5" '
            f'fill="rgba(0,0,0,0.20)" filter="url(#softshadow)"/>')


SHADOW_FILTER = ('  <filter id="softshadow" x="-50%" y="-50%" width="200%" '
                 'height="200%"><feGaussianBlur stdDeviation="4"/></filter>')


def classic_pattern():
    """White ball, black pentagons, grey seams — the timeless Telstar look."""
    centerR, ringDist, outerR = R * 0.34, R * 0.84, R * 0.32
    black, seam = "#1d1d1d", "#454545"
    parts = [f'<path d="{pentagon(CX, CY, centerR, -90)}" fill="{black}"/>']
    for k in range(5):
        a = -90 + k * 72
        ox = CX + math.cos(math.radians(a)) * ringDist
        oy = CY + math.sin(math.radians(a)) * ringDist
        parts.append(f'<path d="{pentagon(ox, oy, outerR, a + 180)}" fill="{black}"/>')
        vx = CX + math.cos(math.radians(a)) * centerR
        vy = CY + math.sin(math.radians(a)) * centerR
        parts.append(f'<line x1="{f(vx)}" y1="{f(vy)}" x2="{f(ox)}" y2="{f(oy)}" '
                     f'stroke="{seam}" stroke-width="1.6"/>')
    return "white", "\n      ".join(parts), {"flat": "#f3f3f3"}


def retro_pattern():
    """Vintage tan leather, dark-brown pentagons, dashed stitching."""
    centerR, ringDist, outerR = R * 0.34, R * 0.84, R * 0.32
    brown, stitch = "#5a3b22", "#e9d4a8"
    parts = [f'<path d="{pentagon(CX, CY, centerR, -90)}" fill="{brown}"/>']
    for k in range(5):
        a = -90 + k * 72
        ox = CX + math.cos(math.radians(a)) * ringDist
        oy = CY + math.sin(math.radians(a)) * ringDist
        parts.append(f'<path d="{pentagon(ox, oy, outerR, a + 180)}" fill="{brown}"/>')
        vx = CX + math.cos(math.radians(a)) * centerR
        vy = CY + math.sin(math.radians(a)) * centerR
        parts.append(f'<line x1="{f(vx)}" y1="{f(vy)}" x2="{f(ox)}" y2="{f(oy)}" '
                     f'stroke="{stitch}" stroke-width="1.5" stroke-dasharray="3 3" '
                     f'stroke-linecap="round"/>')
    base = ('<radialGradient id="leather" cx="36%" cy="30%" r="75%">'
            '<stop offset="0%" stop-color="#e7c690"/>'
            '<stop offset="100%" stop-color="#c79a5c"/></radialGradient>')
    return "url(#leather)", "\n      ".join(parts), {"defs": base, "flat": "#d8b074"}


def gold_pattern():
    """Luxe edition: deep-black sphere, metallic gold pentagons + gold rim."""
    centerR, ringDist, outerR = R * 0.34, R * 0.84, R * 0.32
    parts = [f'<path d="{pentagon(CX, CY, centerR, -90)}" fill="url(#gold)"/>']
    for k in range(5):
        a = -90 + k * 72
        ox = CX + math.cos(math.radians(a)) * ringDist
        oy = CY + math.sin(math.radians(a)) * ringDist
        parts.append(f'<path d="{pentagon(ox, oy, outerR, a + 180)}" fill="url(#gold)"/>')
        vx = CX + math.cos(math.radians(a)) * centerR
        vy = CY + math.sin(math.radians(a)) * centerR
        parts.append(f'<line x1="{f(vx)}" y1="{f(vy)}" x2="{f(ox)}" y2="{f(oy)}" '
                     f'stroke="#a9842f" stroke-width="1.6"/>')
    base = ('<radialGradient id="blacksphere" cx="36%" cy="30%" r="78%">'
            '<stop offset="0%" stop-color="#3a3a3d"/>'
            '<stop offset="100%" stop-color="#0c0c0e"/></radialGradient>'
            '<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0%" stop-color="#fdf0b2"/>'
            '<stop offset="45%" stop-color="#e8b54b"/>'
            '<stop offset="100%" stop-color="#a9772a"/></linearGradient>')
    return "url(#blacksphere)", "\n      ".join(parts), {"defs": base, "flat": "#17171a"}


def neon_pattern():
    """Night edition: charcoal sphere, glowing neon-cyan seams + pentagons."""
    centerR, ringDist, outerR = R * 0.34, R * 0.84, R * 0.32
    neon = "#1ef0c8"
    parts = [f'<path d="{pentagon(CX, CY, centerR, -90)}" fill="#10312c" '
             f'stroke="{neon}" stroke-width="2" filter="url(#glow)"/>']
    for k in range(5):
        a = -90 + k * 72
        ox = CX + math.cos(math.radians(a)) * ringDist
        oy = CY + math.sin(math.radians(a)) * ringDist
        parts.append(f'<path d="{pentagon(ox, oy, outerR, a + 180)}" fill="#10312c" '
                     f'stroke="{neon}" stroke-width="2" filter="url(#glow)"/>')
        vx = CX + math.cos(math.radians(a)) * centerR
        vy = CY + math.sin(math.radians(a)) * centerR
        parts.append(f'<line x1="{f(vx)}" y1="{f(vy)}" x2="{f(ox)}" y2="{f(oy)}" '
                     f'stroke="{neon}" stroke-width="2" filter="url(#glow)"/>')
    base = ('<radialGradient id="charcoal" cx="36%" cy="30%" r="80%">'
            '<stop offset="0%" stop-color="#2c3338"/>'
            '<stop offset="100%" stop-color="#0a0e10"/></radialGradient>'
            '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">'
            '<feGaussianBlur stdDeviation="1.4" result="b"/>'
            '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/>'
            '</feMerge></filter>')
    return "url(#charcoal)", "\n      ".join(parts), {"defs": base, "flat": "#141a1d"}


def _star(cx, cy, r, rot_deg=-90):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.42
        a = math.radians(rot_deg) + i * math.pi / 5
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    return "M " + " L ".join(f"{x:.2f},{y:.2f}" for x, y in pts) + " Z"


def _arm(d_local, color, width, rot, idsfx=""):
    return (f'<path d="{d_local}" fill="none" stroke="{color}" '
            f'stroke-width="{width}" stroke-linecap="round" '
            f'stroke-linejoin="round" '
            f'transform="translate({f(CX)},{f(CY)}) rotate({rot})"/>')


def _maple(cx, cy, s, rot=0, fill="#ffffff", op=0.9):
    # Compact stylised maple-leaf silhouette, scaled by s, centred at (cx,cy).
    d = ("M 0,-10 L 1.6,-4 L 7,-6 L 4.5,-1 L 9,1 L 4,2 L 5,7 L 1,4 "
         "L 0,9 L -1,4 L -5,7 L -4,2 L -9,1 L -4.5,-1 L -7,-6 L -1.6,-4 Z")
    return (f'<path d="{d}" fill="{fill}" fill-opacity="{op}" '
            f'transform="translate({f(cx)},{f(cy)}) scale({s}) rotate({rot})"/>')


def trionda_pattern():
    """adidas Trionda (FIFA World Cup 2026): white ball, three teardrop 'la ola'
    waves (blue=USA, red=Canada, green=Mexico) spiralling out of the centre in a
    pinwheel, gold-outlined. Stars on the blue wave, a maple leaf on the red."""
    # One teardrop blade pointing along +x (tip at centre, bulb out near the
    # rim), slightly asymmetric so the three read as a swirling pinwheel.
    blade = ("M 0,0 C 22,-24 58,-27 73,-11 "
             "C 81,-3 79,10 64,17 C 45,26 18,17 0,0 Z")
    SWIRL = 16  # extra rotation -> the waves spin rather than sit radially
    gold = "#e8bf57"
    # (colour, local motif markup drawn on the bulb of that blade)
    stars = "".join(
        f'<path d="{_star(mx, my, mr, -90)}" fill="#eaf2ff" fill-opacity="0.95"/>'
        for mx, my, mr in [(50, -9, 4.6), (63, 1, 3.8), (49, 9, 3.2)])
    blades = [
        ("#2f6fd6", stars),                                     # USA — stars
        ("#d8332f", _maple(60, 2, 2.0, 90, "#ffffff", 0.95)),   # Canada — maple leaf
        ("#1f9d57", ""),                                        # Mexico — plain wave
    ]
    parts = []
    for k, (col, motif) in enumerate(blades):
        ang = -90 + k * 120 + SWIRL
        tf_ = f'transform="translate({f(CX)},{f(CY)}) rotate({ang})"'
        parts.append(
            f'<g {tf_}>'
            f'<path d="{blade}" fill="{col}"/>'
            f'<path d="{blade}" fill="none" stroke="{gold}" stroke-width="1.8"/>'
            f'{motif}'
            f'</g>')
    base = ('<radialGradient id="tri_base" cx="36%" cy="30%" r="78%">'
            '<stop offset="0%" stop-color="#ffffff"/>'
            '<stop offset="100%" stop-color="#e2e7ec"/></radialGradient>')
    return "url(#tri_base)", "\n      ".join(parts), {"defs": base, "flat": "#f5f6f8"}


def redsport_pattern():
    """Red-and-white sport ball: white base with bold red swooshes and thin
    charcoal pinstripes — a fast, modern street/training look."""
    arm = "M 4,-4 C -20,-10 -30,-32 -20,-54 C -13,-69 12,-68 24,-52"
    parts = []
    for k in range(3):
        rot = k * 120
        parts.append(_arm(arm, "#d62828", 16, rot))            # bold red wave
        parts.append(_arm(arm, "#2a2a2a", 2.2, rot - 7))       # charcoal pinstripe
    parts.append(f'<circle cx="{f(CX)}" cy="{f(CY)}" r="7" fill="#d62828"/>')
    base = ('<radialGradient id="rs_base" cx="36%" cy="30%" r="78%">'
            '<stop offset="0%" stop-color="#ffffff"/>'
            '<stop offset="100%" stop-color="#e6e9ec"/></radialGradient>')
    return "url(#rs_base)", "\n      ".join(parts), {"defs": base, "flat": "#f2f4f6"}


def build_svg(name, base_fill, pattern, extra):
    defs = SHADOW_FILTER + "\n" + sphere_defs(name)
    if "defs" in extra:
        defs += "\n    " + extra["defs"]
    clip = (f'<clipPath id="clip_{name}">'
            f'<circle cx="{f(CX)}" cy="{f(CY)}" r="{f(R)}"/></clipPath>')
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB} {VB}" width="{VB}" height="{VB}">
  <defs>
    {clip}
    {defs}
  </defs>
{shadow()}
  <circle cx="{f(CX)}" cy="{f(CY)}" r="{f(R)}" fill="{base_fill}"/>
  <g clip-path="url(#clip_{name})">
      {pattern}
  </g>
{sphere_overlay(name)}
</svg>
"""


def build_skin(name, pattern, extra):
    """Flat 'skin' SVG for the app: pattern only, NO sphere shading, rim or drop
    shadow (the canvas adds fixed lighting). Normalised so the ball fills a
    200x200 viewBox (centre 100,100, r 100) -> trivial to draw on the canvas."""
    flat = extra.get("flat", "#f0f0f0")
    defs = extra.get("defs", "")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs><clipPath id="skc_{name}"><circle cx="100" cy="100" r="100"/></clipPath>{defs}</defs>
  <g clip-path="url(#skc_{name})">
    <g transform="translate(100,100) scale(1.25) translate(-110,-102)">
      <circle cx="{f(CX)}" cy="{f(CY)}" r="{f(R)}" fill="{flat}"/>
      {pattern}
    </g>
  </g>
</svg>
"""


DESIGNS = {
    "classic": ("Classic", classic_pattern),
    "trionda": ("World Cup 2026", trionda_pattern),
    "retro": ("Retro Leather", retro_pattern),
    "redsport": ("Red-White Sport", redsport_pattern),
    "neon": ("Neon Night", neon_pattern),
    "gold": ("Gold Edition", gold_pattern),
}


SKIN_DIR = os.path.normpath(os.path.join(OUT, "..", "src", "balls"))


def main():
    os.makedirs(SKIN_DIR, exist_ok=True)
    cards = []
    for key, (label, fn) in DESIGNS.items():
        base, pattern, extra = fn()
        # Gallery SVG (shaded, for the approval preview).
        with open(os.path.join(OUT, f"{key}.svg"), "w") as fh:
            fh.write(build_svg(key, base, pattern, extra))
        # App skin SVG (flat pattern; canvas adds fixed lighting + spin).
        with open(os.path.join(SKIN_DIR, f"{key}.svg"), "w") as fh:
            fh.write(build_skin(key, pattern, extra))
        cards.append((key, label))

    items = "\n".join(
        f'    <figure><div class="ball">{open(os.path.join(OUT, k + ".svg")).read()}</div>'
        f'<figcaption>{lbl}</figcaption></figure>'
        for k, lbl in cards
    )
    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>FootyBall — ball designs</title>
<style>
  body {{ margin:0; font:16px/1.5 -apple-system,system-ui,sans-serif;
         background:#1b1f24; color:#e9edf1; }}
  header {{ padding:32px 24px 8px; text-align:center; }}
  header h1 {{ margin:0; font-size:24px; }}
  header p {{ margin:6px 0 0; color:#9aa4ad; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
           gap:20px; padding:28px; max-width:1100px; margin:0 auto; }}
  figure {{ margin:0; background:#262c33; border-radius:16px; padding:18px;
            text-align:center; box-shadow:0 6px 20px rgba(0,0,0,.3); }}
  .ball svg {{ width:180px; height:180px; }}
  figcaption {{ margin-top:8px; font-weight:600; letter-spacing:.2px; }}
  .light .grid figure {{ background:#fff; }}
  .toggle {{ display:block; margin:0 auto; }}
</style></head>
<body>
<header>
  <h1>⚽ FootyBall — {len(DESIGNS)} ball designs</h1>
  <p>Realistic vector balls with soft shadow. Pick the ones you like.</p>
  <button class="toggle" onclick="document.body.classList.toggle('light')">
    Toggle background</button>
</header>
<section class="grid">
{items}
</section>
</body></html>
"""
    with open(os.path.join(OUT, "index.html"), "w") as fh:
        fh.write(html)
    print("Generated gallery + skins:", ", ".join(k for k, _ in cards))


if __name__ == "__main__":
    main()
