"""Builds assets/sprites/enemy_skeleton.png from the FREE Skeleton Asset Pack (Micaelle Britto).
Usage: python3 tools/build_skeleton_sheet.py "<path to FREE_Skeleton_Asset_Pack_v1.0-Micaelle_Britto folder>"
Output: 128x608 sheet, cells 32x32, columns = down | up | left | right, rows = 0-5 run, 6-13 idle, 14-18 sword attack.
(The pack has front / back / 3-4 views only: "right" is the 3-4 view, "left" is the same view mirrored.)"""
import sys, os
from PIL import Image, ImageOps
root = sys.argv[1]
CROP = (16, 16, 48, 48)  # 32x32 window around the 64x64 frame centre (holds the figure, its shadow and the sword arc)
def frames(path, n):
    im = Image.open(os.path.join(root, path)).convert("RGBA")
    return [im.crop((i * 64, 0, i * 64 + 64, 64)).crop(CROP) for i in range(n)]
sets = [  # (rows, front, 3/4 view, back)
    (6, "Run/Run_F.png", "Run/Run_34F.png", "Run/Run_Back.png"),
    (8, "Idle/Idle_F.png", "Idle/Idle_34F.png", "Idle/Idle_B.png"),
    (5, "Attack_Sword/Attack_Sword_F.png", "Attack_Sword/Attack_Sword_34F.png", "Attack_Sword/Attack_Sword_B.png"),
]
total = sum(s[0] for s in sets)
sheet = Image.new("RGBA", (128, 32 * total), (0, 0, 0, 0))
row = 0
for n, f, q, b in sets:
    F, Q, B = frames(f, n), frames(q, n), frames(b, n)
    for i in range(n):
        for col, fr in enumerate([F[i], B[i], ImageOps.mirror(Q[i]), Q[i]]):
            sheet.paste(fr, (col * 32, (row + i) * 32))
    row += n
out = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "enemy_skeleton.png")
sheet.save(out)
print("wrote", os.path.abspath(out), sheet.size)
