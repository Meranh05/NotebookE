from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import edge_tts


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "notebooke_product_review"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1280, 720


def font(size: int, bold: bool = False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


F_TITLE = font(44, True)
F_STEP = font(18, True)
F_BODY = font(22)
F_SMALL = font(16)
F_UI = font(15)
F_UI_BOLD = font(16, True)


def rounded(draw, box, fill, outline=None, radius=16, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, fill="#e8eefc", f=F_BODY, anchor=None):
    draw.text(xy, value, font=f, fill=fill, anchor=anchor)


def wrap(draw, value, max_width, f):
    words, lines, line = value.split(), [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=f) <= max_width:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def ui_shell(draw, title):
    rounded(draw, (54, 42, 1226, 678), "#111a2e", "#2b3a5d", 22, 2)
    draw.rectangle((54, 42, 1226, 98), fill="#16213a")
    for x, color in [(82, "#ff6b6b"), (106, "#ffd166"), (130, "#43d17a")]:
        draw.ellipse((x, 62, x + 12, 74), fill=color)
    text(draw, (168, 60), "NotebookE", "#b9c7e8", F_UI_BOLD)
    text(draw, (1138, 60), title, "#8193b8", F_UI)
    draw.rectangle((54, 98, 230, 678), fill="#0d1527")
    text(draw, (84, 132), "NOTEBOOKE", "#ffffff", F_UI_BOLD)
    items = [("＋", "Tạo mới"), ("▣", "Nguồn"), ("▤", "Sổ tay"), ("✦", "Hỏi & Tìm kiếm"), ("◉", "Podcast"), ("▣", "Videos"), ("⚙", "Cài đặt")]
    for i, (icon, label) in enumerate(items):
        y = 182 + i * 48
        active = label in title
        if active:
            rounded(draw, (70, y - 8, 214, y + 28), "#26395f", None, 10)
        text(draw, (88, y), icon, "#7d8ff7" if active else "#8090ad", F_UI_BOLD)
        text(draw, (120, y + 1), label, "#ffffff" if active else "#9cabc8", F_UI)


def card(draw, box, heading, body, accent="#6675f5"):
    rounded(draw, box, "#1a2742", "#2d4167", 14, 1)
    draw.rectangle((box[0], box[1], box[0] + 5, box[3]), fill=accent)
    text(draw, (box[0] + 22, box[1] + 18), heading, "#ffffff", F_UI_BOLD)
    y = box[1] + 54
    for line in wrap(draw, body, box[2] - box[0] - 44, F_SMALL):
        text(draw, (box[0] + 22, y), line, "#aebbd4", F_SMALL)
        y += 24


def scene(index, step, title, subtitle, draw_ui):
    image = Image.new("RGB", (W, H), "#080f1f")
    draw = ImageDraw.Draw(image)
    draw_ui(draw)
    rounded(draw, (84, 560, 1188, 648), "#0a1224", "#31466f", 14, 1)
    text(draw, (112, 584), f"0{index}  ·  {step.upper()}", "#8d9cff", F_STEP)
    text(draw, (112, 612), title, "#ffffff", F_UI_BOLD)
    text(draw, (1160, 612), subtitle, "#91a1c1", F_SMALL, "ra")
    image.save(OUT / f"scene-{index:02d}.png")


def build_scenes():
    scene(1, "Chào mừng", "NotebookE — biến tài liệu thành tri thức có thể hành động", "AI research workspace", lambda d: (
        text(d, (92, 136), "Nghiên cứu nhanh hơn. Riêng tư hơn.", "#ffffff", F_TITLE),
        text(d, (92, 202), "Một không gian self-hosted để đọc, hỏi, phân tích và xuất bản nội dung từ tài liệu của bạn.", "#aebbd4", F_BODY),
        card(d, (92, 286, 420, 478), "Nguồn tài liệu", "PDF · DOCX · PPTX · XLSX · Web", "#3aa6ff"),
        card(d, (448, 286, 776, 478), "AI Chat & RAG", "Trả lời có trích dẫn từ chính nguồn đã tải lên.", "#7d8ff7"),
        card(d, (804, 286, 1132, 478), "Media Studio", "Tạo Podcast và Video kể chuyện theo nội dung.", "#d875ff"),
    ))
    scene(2, "Tạo sổ tay", "Bắt đầu bằng một không gian làm việc riêng", "01 · Workspace", lambda d: (
        ui_shell(d, "Sổ tay"),
        text(d, (278, 140), "Sổ tay", "#ffffff", F_TITLE),
        rounded(d, (930, 130, 1160, 174), "#6575f6", None, 12), text(d, (1045, 152), "+  Sổ tay mới", "#ffffff", F_UI_BOLD, "mm"),
        card(d, (278, 220, 560, 390), "NotebookE", "Không gian tập trung cho từng môn học, dự án hoặc chủ đề.", "#7d8ff7"),
        card(d, (584, 220, 866, 390), "PIHAUPA", "Tất cả nguồn, ghi chú và lịch sử chat được gom theo ngữ cảnh.", "#43d1a3"),
        card(d, (890, 220, 1170, 390), "Bố cục linh hoạt", "Chuyển giữa dạng lưới và danh sách theo nhu cầu.", "#ffb454"),
    ))
    scene(3, "Thêm nguồn", "Kéo thả tài liệu và để NotebookE xử lý phần còn lại", "02 · Ingestion", lambda d: (
        ui_shell(d, "Nguồn"),
        text(d, (278, 140), "Nguồn tài liệu", "#ffffff", F_TITLE),
        rounded(d, (280, 208, 1164, 332), "#162745", "#536ef0", 16, 2),
        text(d, (722, 250), "＋", "#8d9cff", font(38, True), "mm"),
        text(d, (722, 286), "Tải file hoặc dán đường dẫn", "#ffffff", F_UI_BOLD, "mm"),
        text(d, (722, 312), "PDF · Word · PowerPoint · Excel · Web", "#9eadd0", F_SMALL, "mm"),
        card(d, (280, 376, 560, 512), "Đang xử lý", "Trích xuất nội dung · chia chunk · tạo embedding", "#ffb454"),
        card(d, (864, 376, 1164, 512), "Đã sẵn sàng", "File gốc luôn được giữ để xem lại đúng định dạng.", "#43d1a3"),
    ))
    scene(4, "Hỏi đáp", "Đặt câu hỏi trực tiếp với tài liệu và kiểm tra từng trích dẫn", "03 · RAG Chat", lambda d: (
        ui_shell(d, "Hỏi & Tìm kiếm"),
        text(d, (278, 136), "Trò chuyện với sổ tay", "#ffffff", font(34, True)),
        rounded(d, (278, 192, 1160, 420), "#16213a", "#2d4167", 14, 1),
        text(d, (308, 222), "Bạn", "#7d8ff7", F_UI_BOLD),
        text(d, (308, 252), "Tóm tắt các điểm chính và chỉ ra nguồn liên quan.", "#e8eefc", F_UI),
        text(d, (308, 316), "NotebookE", "#43d1a3", F_UI_BOLD),
        text(d, (308, 346), "Mình đã đối chiếu nội dung trong 3 tài liệu và rút ra 4 kết luận chính...", "#e8eefc", F_UI),
        rounded(d, (308, 382, 520, 410), "#26395f", None, 8), text(d, (324, 396), "[1]  [2]  [3]  · Xem nguồn", "#9eadd0", F_SMALL, "lm"),
        rounded(d, (278, 462, 1160, 520), "#101a2e", "#2d4167", 12, 1), text(d, (304, 490), "Hỏi bất cứ điều gì về nguồn của bạn...", "#8193b8", F_UI, "lm"),
    ))
    scene(5, "Insight", "Biến dữ liệu dài thành bản tóm tắt, so sánh và kế hoạch rõ ràng", "04 · Analysis", lambda d: (
        ui_shell(d, "Hỏi & Tìm kiếm"),
        text(d, (278, 136), "Insight", "#ffffff", F_TITLE),
        card(d, (278, 208, 552, 450), "Tóm tắt điều hành", "Nắm ý chính trong vài giây với cấu trúc rõ ràng, có trích dẫn và điểm cần kiểm chứng.", "#7d8ff7"),
        card(d, (576, 208, 850, 450), "So sánh tài liệu", "Đặt hai nguồn cạnh nhau để thấy điểm giống, khác và khoảng trống thông tin.", "#43d1a3"),
        card(d, (874, 208, 1160, 450), "Ghi chú & xuất bản", "Lưu insight, tạo ghi chú và xuất nội dung phục vụ học tập hoặc báo cáo.", "#ffb454"),
    ))
    scene(6, "Media Studio", "Tạo Podcast và Video có cấu trúc từ cùng một bộ tài liệu", "05 · Podcast + Video", lambda d: (
        ui_shell(d, "Videos"),
        text(d, (278, 136), "Media Studio", "#ffffff", F_TITLE),
        card(d, (278, 208, 686, 450), "Podcast", "Kịch bản hội thoại · giọng đọc nữ tự nhiên · chọn ngôn ngữ và độ dài · audio player", "#d875ff"),
        card(d, (716, 208, 1160, 450), "Video AI", "Chia cảnh theo nội dung · hình minh họa · chữ ngắn theo lời nói · tỷ lệ khung hình tùy chọn", "#3aa6ff"),
    ))
    scene(7, "Bắt đầu ngay", "Tài liệu của bạn. Model của bạn. Không gian của bạn.", "NotebookE", lambda d: (
        text(d, (92, 148), "NotebookE", "#ffffff", font(62, True)),
        text(d, (92, 230), "Một trợ lý nghiên cứu AI mã nguồn mở, chạy ngay trong hệ thống của bạn.", "#aebbd4", font(26)),
        rounded(d, (92, 330, 548, 416), "#6575f6", None, 14), text(d, (320, 373), "Tạo sổ tay đầu tiên  →", "#ffffff", F_UI_BOLD, "mm"),
        text(d, (92, 476), "Self-hosted  ·  Multi-model  ·  RAG  ·  Podcast  ·  Video", "#8d9cff", F_UI_BOLD),
    ))


NARRATION = """Đây là NotebookE, một trợ lý nghiên cứu AI mã nguồn mở giúp bạn biến tài liệu thành tri thức có thể hành động. Mọi thứ bắt đầu từ một sổ tay riêng cho từng môn học, dự án hoặc chủ đề. Bạn chỉ cần tạo không gian làm việc, sau đó thêm các nguồn tài liệu của mình. NotebookE hỗ trợ PDF, Word, PowerPoint, Excel, văn bản và đường dẫn web. Hệ thống sẽ trích xuất nội dung, chia nhỏ tài liệu và lập chỉ mục để tìm kiếm nhanh, trong khi vẫn giữ lại file gốc để bạn xem đúng định dạng. Khi dữ liệu đã sẵn sàng, hãy đặt câu hỏi trực tiếp với sổ tay. Cơ chế RAG kết hợp tìm kiếm từ khóa và tìm kiếm ngữ nghĩa để tìm đúng đoạn liên quan, rồi trả lời kèm trích dẫn để bạn kiểm tra nguồn. Bạn cũng có thể tạo insight, tóm tắt, so sánh nhiều tài liệu, lưu ghi chú và chuẩn bị nội dung cho báo cáo. Từ cùng một bộ tài liệu, Media Studio giúp bạn tạo Podcast với kịch bản hội thoại và giọng đọc tự nhiên, hoặc tạo Video AI với các cảnh minh họa, chữ ngắn và lời thuyết minh đồng bộ. Trong phần cài đặt, bạn chọn nhà cung cấp, model mặc định, giọng đọc và phong cách hình ảnh theo nhu cầu. NotebookE phù hợp cho học tập, nghiên cứu và sản xuất nội dung. Hãy tạo sổ tay đầu tiên và bắt đầu khám phá tài liệu của bạn ngay hôm nay."""


async def make_voice(path: Path):
    try:
        communicate = edge_tts.Communicate(NARRATION, "vi-VN-HoaiMyNeural", rate="-4%", pitch="+2Hz")
        await communicate.save(str(path))
        return
    except Exception as exc:
        print(f"Edge TTS unavailable ({exc}); using Windows offline voice.")

    # Keep the video reproducible when network TTS is unavailable. Windows ships
    # with an English female voice, so the Vietnamese captions remain the source
    # of truth while the fallback still provides a clear product-demo narration.
    fallback = OUT / "narration-fallback.txt"
    fallback.write_text(
        "Welcome to NotebookE, an open source AI research workspace. Create a notebook for each project, "
        "add PDF, Word, PowerPoint, Excel and web sources, then ask questions with cited answers. "
        "NotebookE extracts, indexes and connects your documents so you can compare ideas, create insights, "
        "write notes and prepare reports. Media Studio turns the same research into natural podcasts and visual AI videos. "
        "Choose your providers, models, voice and visual style in settings. NotebookE keeps your work in your own system. "
        "Create your first notebook and start exploring.",
        encoding="utf-8",
    )
    ps = (
        "Add-Type -AssemblyName System.Speech; "
        "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$s.SelectVoice('Microsoft Zira Desktop'); "
        f"$s.SetOutputToWaveFile('{str(path).replace(chr(39), chr(39) * 2)}'); "
        f"$s.Speak((Get-Content -Raw '{str(fallback).replace(chr(39), chr(39) * 2)}')); $s.Dispose()"
    )
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)


def make_video(audio: Path, output: Path):
    concat = OUT / "scenes.txt"
    with concat.open("w", encoding="utf-8") as handle:
        for i in range(1, 8):
            handle.write(f"file 'scene-{i:02d}.png'\n")
            handle.write("duration 12\n")
        handle.write("file 'scene-07.png'\n")
    ffmpeg = "C:/ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe"
    subprocess.run([ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-i", str(audio), "-vf", "format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-c:a", "aac", "-b:a", "160k", "-shortest", str(output)], cwd=OUT, check=True)


async def main():
    build_scenes()
    audio = OUT / "narration-vi.mp3"
    await make_voice(audio)
    make_video(audio, OUT / "NotebookE-Product-Review-VI.mp4")


if __name__ == "__main__":
    asyncio.run(main())
