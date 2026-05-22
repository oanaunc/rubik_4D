"""
Assemble Fig. 1 (solved | scrambled) from two MagicCube4D screenshots.

Point SOLVED and SCRAMBLED at full-window captures of the simulator (one in the
solved state, one scrambled).  The cube region is cropped identically from both and
placed side by side with (a)/(b) labels.  The committed figures/fig1_pair.png was
produced from screenshots in ../poze_interfata (not tracked in this repo).
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(__file__); FIG = os.path.join(HERE, "figures")
os.makedirs(FIG, exist_ok=True)
# (left, top, right, bottom) crop of the cube region in the ~3833x1660 screenshots
CROP = (150, 120, 2240, 1610)


def build(solved_path, scrambled_path, out=os.path.join(FIG, "fig1_pair.png")):
    c1 = Image.open(solved_path).convert("RGB").crop(CROP)
    c2 = Image.open(scrambled_path).convert("RGB").crop(CROP)
    bg = c1.getpixel((5, 5)); W = 760
    def scale(im): return im.resize((W, int(im.height * W / im.width)))
    c1, c2 = scale(c1), scale(c2); h = max(c1.height, c2.height); gap, lh = 40, 54
    canvas = Image.new("RGB", (W * 2 + gap, h + lh), bg)
    canvas.paste(c1, (0, 0)); canvas.paste(c2, (W + gap, 0))
    d = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 30)
    except Exception:
        font = ImageFont.load_default()
    for x0, text in [(0, "(a) solved"), (W + gap, "(b) scrambled")]:
        bb = d.textbbox((0, 0), text, font=font)
        d.text((x0 + (W - (bb[2] - bb[0])) // 2, h + 10), text, fill=(235, 235, 235), font=font)
    canvas.save(out); print("wrote", out, canvas.size)


if __name__ == "__main__":
    if len(sys.argv) == 3:
        build(sys.argv[1], sys.argv[2])
    else:
        print("usage: python3 make_fig1.py <solved.png> <scrambled.png>")
