from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "notebooke_animated_review"
ASSET = OUT / "assets" / "notebooke-knowledge-hub.png"
VIDEO_ONLY = OUT / "notebooke-motion.mp4"
MUSIC = OUT / "notebooke-ambient.m4a"
FINAL = OUT / "NotebookE-Animated-Product-Review-VI.mp4"
FFMPEG = Path("C:/ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe")

W, H, FPS = 1280, 720, 24
SCENE_SECONDS = 7

FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD = "C:/Windows/Fonts/seguisb.ttf"

BG = "#071020"
PANEL = "#111d35"
PANEL_2 = "#172541"
WHITE = "#f7f9ff"
MUTED = "#aab7d0"
INDIGO = "#7c8cff"
CYAN = "#37d8ff"
TEAL = "#36dfb5"
CORAL = "#ff7b86"
YELLOW = "#ffd36e"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


F12, F14, F16, F18, F22, F28, F36, F48, F64 = [font(x) for x in (12, 14, 16, 18, 22, 28, 36, 48, 64)]
B12, B14, B16, B18, B22, B28, B36, B48, B64 = [font(x, True) for x in (12, 14, 16, 18, 22, 28, 36, 48, 64)]


SCENES = [
    ("01", "NotebookE", "Biến tài liệu rời rạc thành một không gian nghiên cứu có thể hỏi, phân tích và xuất bản."),
    ("02", "Một luồng làm việc liền mạch", "Tạo sổ tay, thêm nguồn, trò chuyện có trích dẫn, rồi biến kết quả thành nội dung."),
    ("03", "Đưa mọi nguồn về một nơi", "PDF, Word, PowerPoint, Excel, văn bản và website được xử lý trong cùng một thư viện."),
    ("04", "Hỏi tài liệu, kiểm tra được câu trả lời", "RAG tìm đúng đoạn liên quan, tổng hợp câu trả lời và gắn nguồn để bạn đối chiếu."),
    ("05", "Phân tích có chiều sâu", "Tóm tắt, so sánh, rút insight, tạo biểu đồ và lưu ghi chú mà không rời khỏi sổ tay."),
    ("06", "Từ nghiên cứu đến sản phẩm", "Media Studio tạo Podcast và Video kể chuyện bằng hình ảnh, lời dẫn và bố cục theo nội dung."),
    ("07", "Bạn làm chủ mô hình và dữ liệu", "Chọn provider, model, embedding, giọng đọc và mô hình hình ảnh phù hợp cho từng chức năng."),
    ("08", "Bắt đầu với NotebookE", "Tạo một sổ tay, thêm nguồn đầu tiên và để AI giúp bạn hiểu tài liệu nhanh hơn."),
]


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def fade_window(t: float) -> float:
    return min(1.0, t / 0.55, (1 - t) / 0.45)


def mix(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def rr(draw: ImageDraw.ImageDraw, box, fill, radius=18, outline=None, width=1):
    draw.rounded_rectangle(box, radius, fill=fill, outline=outline, width=width)


def label(draw: ImageDraw.ImageDraw, xy, value: str, color=INDIGO):
    x, y = xy
    rr(draw, (x, y, x + 92, y + 30), "#172343", 15, "#31446d")
    draw.text((x + 46, y + 15), value, font=B14, fill=color, anchor="mm")


def wrap(draw: ImageDraw.ImageDraw, value: str, fnt, max_width: int) -> list[str]:
    lines, current = [], ""
    for word in value.split():
        test = f"{current} {word}".strip()
        if draw.textbbox((0, 0), test, font=fnt)[2] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def heading(draw: ImageDraw.ImageDraw, index: int, local_t: float):
    no, title, body = SCENES[index]
    a = ease(min(1, local_t * 2.2))
    x = int(mix(74, 92, a))
    label(draw, (x, 54), f"PHẦN {no}")
    draw.text((x, 105), title, font=B36, fill=WHITE)
    for line_no, line in enumerate(wrap(draw, body, F18, 790)):
        draw.text((x, 154 + line_no * 26), line, font=F18, fill=MUTED)


def chrome(draw: ImageDraw.ImageDraw, index: int, opacity: float):
    draw.rectangle((0, 0, W, H), fill=BG)
    draw.rectangle((0, 0, 14, H), fill="#111c33")
    draw.rectangle((0, 0, int(W * ((index + 0.15) / len(SCENES))), 5), fill=INDIGO)
    draw.text((92, 684), "NOTEBOOKE  ·  AI RESEARCH WORKSPACE", font=B12, fill="#7585a6")
    draw.text((1188, 684), f"{index + 1:02d} / {len(SCENES):02d}", font=B12, fill="#7585a6", anchor="ra")


def icon_file(draw, x, y, color, code, scale=1.0):
    w, h = int(74 * scale), int(88 * scale)
    rr(draw, (x, y, x + w, y + h), "#f5f8ff", int(12 * scale))
    draw.polygon([(x + w - 22 * scale, y), (x + w, y + 22 * scale), (x + w - 22 * scale, y + 22 * scale)], fill="#d9e2f5")
    draw.text((x + w / 2, y + h * .62), code, font=font(max(10, int(14 * scale)), True), fill=color, anchor="mm")


def scene_hero(img: Image.Image, draw, t: float, outro=False):
    hero = Image.open(ASSET).convert("RGB")
    zoom = 1.02 + .07 * ease(t)
    target_w, target_h = int(W * zoom), int(H * zoom)
    hero = hero.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (target_w - W) // 2 + int(20 * math.sin(t * math.pi))
    y = (target_h - H) // 2
    img.paste(hero.crop((x, y, x + W, y + H)))
    shade = Image.new("RGBA", (W, H), (2, 8, 20, 75 if not outro else 105))
    img.paste(shade, (0, 0), shade)
    draw = ImageDraw.Draw(img)
    if outro:
        rr(draw, (72, 74, 680, 382), "#081326dd", 28, "#405b91", 2)
        draw.text((112, 112), "NOTEBOOKE", font=B18, fill=CYAN)
        draw.text((112, 160), "Tài liệu của bạn.\nModel của bạn.\nKhông gian của bạn.", font=B36, fill=WHITE, spacing=12)
        rr(draw, (112, 318, 366, 368), INDIGO, 14)
        draw.text((239, 343), "TẠO SỔ TAY ĐẦU TIÊN", font=B14, fill=WHITE, anchor="mm")
    else:
        rr(draw, (72, 72, 660, 306), "#081326dd", 28, "#405b91", 2)
        draw.text((112, 110), "NOTEBOOKE", font=B18, fill=CYAN)
        draw.text((112, 154), "Nghiên cứu nhanh hơn.\nRiêng tư hơn.", font=B48, fill=WHITE, spacing=10)
        draw.text((112, 276), "Trợ lý nghiên cứu AI mã nguồn mở", font=F18, fill="#c2cee4")


def scene_flow(draw, t: float):
    heading(draw, 1, t)
    names = [("Tạo sổ tay", "01"), ("Thêm nguồn", "02"), ("Hỏi & phân tích", "03"), ("Xuất bản", "04")]
    for i, (name, no) in enumerate(names):
        p = ease((t - .08 * i) * 2.1)
        x = int(mix(1320, 100 + i * 292, p))
        if i < 3 and p > .6:
            draw.line((x + 222, 420, x + 278, 420), fill="#456495", width=4)
            draw.polygon([(x + 278, 420), (x + 264, 412), (x + 264, 428)], fill=CYAN)
        rr(draw, (x, 314, x + 230, 526), PANEL, 24, "#2d4268", 2)
        rr(draw, (x + 24, 340, x + 76, 392), "#26385d", 16)
        draw.text((x + 50, 366), no, font=B18, fill=CYAN, anchor="mm")
        draw.text((x + 24, 430), name, font=B22, fill=WHITE)
        draw.text((x + 24, 474), "Một bước, một mục tiêu", font=F14, fill=MUTED)


def scene_sources(draw, t: float):
    heading(draw, 2, t)
    items = [("PDF", CORAL), ("DOCX", "#5594ff"), ("PPTX", "#ff9c59"), ("XLSX", TEAL), ("WEB", CYAN)]
    for i, (name, color) in enumerate(items):
        p = ease((t - i * .07) * 2.5)
        x = 112 + i * 216
        y = int(mix(620, 316 + (i % 2) * 58, p))
        rr(draw, (x, y, x + 176, y + 190), PANEL, 22, "#2b4066", 2)
        icon_file(draw, x + 50, y + 26, color, name, .95)
        draw.text((x + 88, y + 146), name, font=B16, fill=WHITE, anchor="mm")
    rr(draw, (420, 568, 860, 620), "#102c35", 16, "#267964")
    draw.text((640, 594), "✓  Trích xuất  ·  Chia đoạn  ·  Lập chỉ mục", font=B16, fill=TEAL, anchor="mm")


def scene_rag(draw, t: float):
    heading(draw, 3, t)
    rr(draw, (92, 280, 520, 350), "#23345a", 18)
    query = "Điểm khác biệt chính của thuật toán là gì?"
    shown = query[: int(len(query) * min(1, t * 2.4))]
    draw.text((118, 315), shown, font=B18, fill=WHITE, anchor="lm")
    docs_p = ease((t - .18) * 2.2)
    for i in range(3):
        y = int(mix(720, 388 + i * 66, docs_p))
        rr(draw, (120, y, 490, y + 48), PANEL, 12, "#2d4268")
        draw.text((142, y + 24), f"Nguồn {i + 1}  ·  đoạn liên quan", font=F14, fill=MUTED, anchor="lm")
    ans = ease((t - .35) * 2.1)
    x = int(mix(1320, 590, ans))
    rr(draw, (x, 280, x + 598, 548), PANEL, 24, "#385887", 2)
    draw.text((x + 32, 316), "CÂU TRẢ LỜI CÓ CĂN CỨ", font=B14, fill=CYAN)
    for i, line in enumerate(["NotebookE tìm các đoạn có liên quan,", "tổng hợp câu trả lời và giữ liên kết", "tới đúng tài liệu để bạn kiểm tra."]):
        draw.text((x + 32, 365 + i * 34), line, font=F18, fill=WHITE)
    rr(draw, (x + 32, 486, x + 286, 522), "#153a35", 12)
    draw.text((x + 159, 504), "[1] PDF · trang 7", font=B14, fill=TEAL, anchor="mm")


def scene_analysis(draw, t: float):
    heading(draw, 4, t)
    rr(draw, (92, 284, 710, 590), PANEL, 24, "#2f466d", 2)
    draw.text((124, 316), "XU HƯỚNG TRONG TÀI LIỆU", font=B14, fill=MUTED)
    vals = [.38, .56, .48, .76, .88, .68]
    for i, v in enumerate(vals):
        h = 190 * v * ease(t * 1.8 - i * .04)
        x = 132 + i * 82
        draw.rounded_rectangle((x, 548 - h, x + 48, 548), 10, fill=INDIGO if i < 4 else TEAL)
    cards = [("Tóm tắt", "Ý chính trong vài giây", CYAN), ("So sánh", "Nhiều nguồn, một góc nhìn", INDIGO), ("Insight", "Phát hiện điểm đáng chú ý", YELLOW)]
    for i, (title, body, color) in enumerate(cards):
        p = ease((t - .12 * i) * 2)
        x = int(mix(1300, 750, p))
        y = 284 + i * 104
        rr(draw, (x, y, x + 438, y + 88), PANEL_2, 18, "#31486e")
        draw.ellipse((x + 22, y + 24, x + 62, y + 64), fill=color)
        draw.text((x + 84, y + 22), title, font=B18, fill=WHITE)
        draw.text((x + 84, y + 52), body, font=F14, fill=MUTED)


def scene_media(draw, t: float):
    heading(draw, 5, t)
    rr(draw, (92, 286, 602, 584), PANEL, 24, "#30486f", 2)
    draw.text((128, 322), "PODCAST STUDIO", font=B14, fill="#d3a8ff")
    draw.ellipse((132, 380, 220, 468), fill="#39295f")
    draw.text((176, 424), "◖◗", font=B28, fill="#d3a8ff", anchor="mm")
    for i in range(24):
        amp = 10 + 34 * abs(math.sin(i * .7 + t * 16))
        x = 254 + i * 12
        draw.rounded_rectangle((x, 424 - amp, x + 6, 424 + amp), 3, fill="#d3a8ff")
    draw.text((128, 520), "Kịch bản hội thoại · Giọng đọc · Chương", font=F16, fill=MUTED)
    rr(draw, (632, 286, 1188, 584), PANEL, 24, "#30486f", 2)
    draw.text((668, 322), "VIDEO AI", font=B14, fill=CYAN)
    rr(draw, (668, 366, 1152, 516), "#081326", 18, "#395783")
    for i in range(3):
        x = 692 + i * 148
        rr(draw, (x, 390, x + 124, 474), ["#224b68", "#284477", "#2f5962"][i], 12)
        draw.text((x + 62, 432), f"CẢNH {i + 1}", font=B14, fill=WHITE, anchor="mm")
    cursor_x = 690 + (452 * ((t * 1.2) % 1))
    draw.line((690, 538, 1140, 538), fill="#304366", width=5)
    draw.ellipse((cursor_x - 8, 530, cursor_x + 8, 546), fill=CYAN)


def scene_models(draw, t: float):
    heading(draw, 6, t)
    cx, cy = 640, 430
    pulse = 8 * math.sin(t * math.pi * 6)
    draw.ellipse((cx - 88 - pulse, cy - 88 - pulse, cx + 88 + pulse, cy + 88 + pulse), fill="#172b4f", outline=INDIGO, width=4)
    draw.text((cx, cy - 12), "NOTEBOOKE", font=B18, fill=WHITE, anchor="mm")
    draw.text((cx, cy + 20), "ĐIỀU PHỐI", font=B14, fill=CYAN, anchor="mm")
    nodes = [(220, 330, "CHAT", INDIGO), (250, 535, "EMBED", TEAL), (1020, 330, "TTS", CORAL), (1000, 535, "IMAGE", YELLOW)]
    for i, (x, y, title, color) in enumerate(nodes):
        p = ease((t - i * .08) * 2)
        xx, yy = mix(cx, x, p), mix(cy, y, p)
        draw.line((cx, cy, xx, yy), fill="#37527d", width=3)
        rr(draw, (xx - 90, yy - 34, xx + 90, yy + 34), PANEL, 18, color, 2)
        draw.text((xx, yy), title, font=B16, fill=WHITE, anchor="mm")
    draw.text((640, 610), "Mỗi chức năng dùng đúng model phù hợp", font=B18, fill=MUTED, anchor="mm")


def render_frame(scene_index: int, local_t: float) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    if scene_index in (0, 7):
        scene_hero(img, draw, local_t, scene_index == 7)
    else:
        chrome(draw, scene_index, fade_window(local_t))
        [None, scene_flow, scene_sources, scene_rag, scene_analysis, scene_media, scene_models][scene_index](draw, local_t)
    # Cinematic fade at scene boundaries.
    alpha = int(255 * (1 - fade_window(local_t)))
    if alpha > 0:
        img = Image.blend(img, Image.new("RGB", (W, H), BG), alpha / 255)
    return img


def create_motion_video():
    OUT.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(FFMPEG), "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
        "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium",
        "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(VIDEO_ONLY),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = len(SCENES) * SCENE_SECONDS * FPS
    assert proc.stdin is not None
    for frame_no in range(total):
        scene_index = frame_no // (SCENE_SECONDS * FPS)
        local = (frame_no % (SCENE_SECONDS * FPS)) / (SCENE_SECONDS * FPS - 1)
        proc.stdin.write(render_frame(scene_index, local).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError("FFmpeg failed while rendering motion video")


def create_music():
    duration = len(SCENES) * SCENE_SECONDS
    filter_graph = (
        "sine=frequency=110:sample_rate=48000,volume=0.035[a];"
        "sine=frequency=164.81:sample_rate=48000,volume=0.025[b];"
        "sine=frequency=220:sample_rate=48000,volume=0.018[c];"
        f"[a][b][c]amix=inputs=3,afade=t=in:st=0:d=2,afade=t=out:st={duration-3}:d=3"
    )
    subprocess.run([str(FFMPEG), "-y", "-f", "lavfi", "-i", filter_graph, "-t", str(duration), "-c:a", "aac", "-b:a", "128k", str(MUSIC)], check=True)


def mux():
    subprocess.run([
        str(FFMPEG), "-y", "-i", str(VIDEO_ONLY), "-i", str(MUSIC), "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart", str(FINAL),
    ], check=True)


if __name__ == "__main__":
    if not ASSET.exists():
        raise FileNotFoundError(f"Missing generated illustration: {ASSET}")
    create_motion_video()
    create_music()
    mux()
    print(FINAL)
