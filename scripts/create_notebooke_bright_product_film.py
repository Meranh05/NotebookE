from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "notebooke_animated_review_v2"
ASSETS = OUT / "assets"
FFMPEG = Path("C:/ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe")
FPS = 24
SCENE_DURATION = 15.25

SCENES = [
    ("opening-bright.png", "01  ·  TỔNG QUAN", "Từ tài liệu rời rạc", "đến không gian nghiên cứu thống nhất"),
    ("research-bright.png", "02  ·  NGUỒN TÀI LIỆU", "Mọi định dạng, một sổ tay", "PDF · Word · Excel · Website"),
    ("research-bright.png", "03  ·  AI CHAT & RAG", "Câu trả lời có căn cứ", "Tìm đúng đoạn · Dẫn đúng nguồn"),
    ("opening-bright.png", "04  ·  PHÂN TÍCH", "Từ dữ liệu đến insight", "Tóm tắt · So sánh · Biểu đồ · Ghi chú"),
    ("media-bright.png", "05  ·  MEDIA STUDIO", "Biến nghiên cứu thành nội dung", "Podcast tự nhiên · Video trực quan"),
    ("media-bright.png", "06  ·  BẮT ĐẦU", "NotebookE", "Tài liệu của bạn · Model của bạn · Không gian của bạn"),
]


def fnt(size: int, bold: bool = False):
    name = "C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"
    return ImageFont.truetype(name, size)


def make_overlays() -> None:
    for i, (_, eyebrow, title, detail) in enumerate(SCENES, 1):
        canvas = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        # Soft glass title panel. Placement alternates to preserve the useful UI area.
        left = 66 if i not in (3, 5) else 650
        right = left + 560
        draw.rounded_rectangle((left, 58, right, 242), 26, fill=(255, 255, 255, 228), outline=(210, 221, 242, 235), width=2)
        draw.rounded_rectangle((left + 28, 82, left + 195, 116), 17, fill=(237, 239, 255, 255))
        draw.text((left + 111, 99), eyebrow, font=fnt(14, True), fill="#5b5ce2", anchor="mm")
        draw.text((left + 30, 136), title, font=fnt(31, True), fill="#111b35")
        draw.text((left + 30, 190), detail, font=fnt(17), fill="#53617b")
        # Branded chapter marker and progress rail.
        draw.rounded_rectangle((66, 654, 1214, 660), 3, fill=(218, 225, 240, 235))
        progress = int(1148 * i / len(SCENES))
        draw.rounded_rectangle((66, 654, 66 + progress, 660), 3, fill=(91, 92, 226, 255))
        draw.text((66, 678), "NOTEBOOKE  ·  PRODUCT TOUR", font=fnt(12, True), fill=(39, 54, 83, 230))
        draw.text((1214, 678), f"{i:02d} / {len(SCENES):02d}", font=fnt(12, True), fill=(39, 54, 83, 230), anchor="ra")
        canvas.save(OUT / f"overlay-{i:02d}.png")


def render_scenes() -> None:
    for i, (asset, *_rest) in enumerate(SCENES, 1):
        direction = 1 if i % 2 else -1
        zoom = "min(zoom+0.00018,1.045)"
        x = f"iw/2-(iw/zoom/2)+{direction}*10*sin(on/72)"
        y = "ih/2-(ih/zoom/2)+6*cos(on/84)"
        graph = (
            f"[0:v]scale=1680:945,zoompan=z='{zoom}':x='{x}':y='{y}':d=1:s=1280x720:fps={FPS},"
            f"fade=t=in:st=0:d=0.65,fade=t=out:st={SCENE_DURATION-.65}:d=0.65[base];"
            "[1:v]format=rgba,fade=t=in:st=0.35:d=0.55:alpha=1[ui];"
            "[base][ui]overlay=0:0:format=auto,format=yuv420p[v]"
        )
        subprocess.run([
            str(FFMPEG), "-y", "-loop", "1", "-i", str(ASSETS / asset), "-loop", "1", "-i", str(OUT / f"overlay-{i:02d}.png"),
            "-filter_complex", graph, "-map", "[v]", "-t", str(SCENE_DURATION), "-r", str(FPS),
            "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", str(OUT / f"scene-{i:02d}.mp4")
        ], check=True)


def concat_scenes() -> Path:
    listing = OUT / "scenes.txt"
    listing.write_text("".join(f"file 'scene-{i:02d}.mp4'\n" for i in range(1, len(SCENES) + 1)), encoding="utf-8")
    merged = OUT / "visual-track.mp4"
    subprocess.run([str(FFMPEG), "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(merged)], cwd=OUT, check=True)
    return merged


def make_music() -> Path:
    output = OUT / "music.m4a"
    duration = SCENE_DURATION * len(SCENES)
    graph = (
        "sine=frequency=174.61:sample_rate=48000,volume=.020[a];"
        "sine=frequency=220:sample_rate=48000,volume=.016[b];"
        "sine=frequency=261.63:sample_rate=48000,volume=.012[c];"
        "anoisesrc=color=pink:sample_rate=48000,lowpass=f=900,volume=.003[d];"
        f"[a][b][c][d]amix=inputs=4,afade=t=in:st=0:d=2,afade=t=out:st={duration-3}:d=3"
    )
    subprocess.run([str(FFMPEG), "-y", "-f", "lavfi", "-i", graph, "-t", str(duration), "-c:a", "aac", "-b:a", "128k", str(output)], check=True)
    return output


def finish(visual: Path, music: Path) -> Path:
    final = OUT / "NotebookE-Bright-Animated-Product-Film-VI.mp4"
    narration = OUT / "narration-vi.mp3"
    subtitles = (OUT / "narration-vi.srt").as_posix().replace(":", "\\:")
    audio = (
        "[1:a]volume=1.35,aresample=48000[voice];"
        "[2:a]volume=.16,aresample=48000[music];"
        "[voice][music]amix=inputs=2:duration=first:dropout_transition=2,"
        "pan=stereo|c0=c0|c1=c0,loudnorm=I=-16:LRA=7:TP=-1.5[a]"
    )
    subtitle_filter = (
        f"subtitles='{subtitles}':force_style='FontName=Segoe UI,FontSize=18,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&HCC17213B,BorderStyle=3,Outline=1,Shadow=0,MarginV=28,Alignment=2'"
    )
    subprocess.run([
        str(FFMPEG), "-y", "-i", str(visual), "-i", str(narration), "-i", str(music),
        "-filter_complex", f"[0:v]{subtitle_filter}[v];{audio}", "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
        "-shortest", "-movflags", "+faststart", str(final)
    ], check=True)
    return final


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    if "--remux-only" in sys.argv:
        result = finish(OUT / "visual-track.mp4", OUT / "music.m4a")
    else:
        make_overlays()
        render_scenes()
        result = finish(concat_scenes(), make_music())
    print(result)
