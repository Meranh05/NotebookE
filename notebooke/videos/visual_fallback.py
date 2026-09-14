"""Topic-aware local artwork used when an image provider is unavailable."""

from __future__ import annotations

import hashlib
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

MOTIF_TERMS = {
    "timeline": ("timeline", "history", "sequence", "stages", "progression"),
    "comparison": ("comparison", "versus", "contrast", "trade-off", "split"),
    "network": ("network", "graph", "node", "architecture", "system", "data stream"),
    "security": ("security", "attack", "threat", "protected", "trust", "privacy"),
    "science": ("cell", "biology", "molecule", "medical", "organism", "chemical"),
    "space": ("space", "planet", "orbit", "astronomy", "galaxy", "satellite"),
    "process": ("process", "workflow", "pipeline", "step", "procedure", "lifecycle"),
    "metrics": ("metric", "metrics", "measurement", "performance", "growth", "percentage", "rate"),
    "code": ("code", "programming", "software", "algorithm", "api", "database", "developer"),
    "people": ("student", "teacher", "team", "community", "conversation", "human", "user"),
    "finance": ("finance", "market", "revenue", "investment", "economy", "cost", "budget"),
    "nature": ("forest", "ocean", "climate", "nature", "ecosystem", "animal", "earth"),
}

VISUAL_PROMPT_LIBRARY = {
    "cinematic": (
        "cinematic editorial scene, strong focal subject, layered depth, atmospheric practical light",
        "documentary wide shot, natural environment, tactile details, subtle motion implied",
        "premium educational film still, thoughtful composition, realistic materials, visual metaphor",
    ),
    "split": (
        "clean split-screen composition, two clearly contrasted visual states, balanced negative space",
        "editorial diptych, left and right evidence connected by a visual bridge, restrained palette",
    ),
    "diagram": (
        "isometric explanatory diagram, clear nodes and directional connections, precise geometry, no labels",
        "layered systems visualization, transparent surfaces, data pathways and focal components, no text",
    ),
    "timeline": (
        "visual timeline with five distinct stages, left-to-right progression, evolving objects, no text",
        "cinematic sequence of connected milestones, depth and scale changing across time, no text",
    ),
    "comparison": (
        "editorial comparison of two approaches, visibly different outcomes, symmetrical framing, no text",
        "before-and-after visual study, contrasting conditions with shared context, clean composition",
    ),
    "focus": (
        "single powerful focal object surrounded by meaningful context, shallow depth of field, no text",
        "macro educational visual of the central concept, dramatic rim light, precise material detail",
    ),
}

MOTIF_PROMPT_LIBRARY = {
    "timeline": "progressive stages connected by a luminous path",
    "comparison": "two visual states with distinct color temperature and outcome",
    "network": "connected nodes, relationships, and information flow",
    "security": "protected boundary, controlled access, and a visible threat path",
    "science": "laboratory scale detail, structures, particles, and evidence",
    "space": "orbital scale, celestial depth, and a sense of discovery",
    "process": "ordered workflow stages with visible inputs and outputs",
    "metrics": "measurable trend, signal lines, and a clear sense of change",
    "code": "software architecture, code abstractions, and glowing data pathways",
    "people": "human interaction, expressive gesture, and an authentic learning context",
    "finance": "market movement, resource exchange, and grounded business context",
    "nature": "organic systems, environmental texture, and interconnected living elements",
    "concept": "an elegant visual metaphor with multiple layers of meaning",
}


def build_visual_prompt(prompt: str, layout: str = "cinematic") -> str:
    """Add a varied, topic-specific art direction to a storyboard prompt."""
    normalized_layout = layout.casefold().strip()
    options = VISUAL_PROMPT_LIBRARY.get(normalized_layout, VISUAL_PROMPT_LIBRARY["cinematic"])
    seed = int(hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:8], 16)
    art_direction = options[seed % len(options)]
    motif = infer_visual_motif(prompt)
    chart_note = ""
    if normalized_layout == "metrics":
        chart_note = ", polished data visualization with a clear trend line or bars and only short essential labels"
    elif normalized_layout in {"diagram", "process", "timeline", "comparison"}:
        chart_note = ", structured infographic with clear visual hierarchy and minimal short labels"
    return f"{prompt.strip()}, {MOTIF_PROMPT_LIBRARY[motif]}, {art_direction}{chart_note}, no logo, no watermark"


def infer_visual_motif(prompt: str) -> str:
    """Infer a useful diagram family from a storyboard image prompt."""
    lowered = prompt.casefold()
    scores = {
        motif: sum(term in lowered for term in terms)
        for motif, terms in MOTIF_TERMS.items()
    }
    motif, score = max(scores.items(), key=lambda item: item[1])
    return motif if score else "concept"


def _gradient(width: int, height: int, color_a: tuple[int, int, int], color_b: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(round(a + (b - a) * ratio) for a, b in zip(color_a, color_b))
        draw.line((0, y, width, y), fill=color)
    return image


def _arrow(draw: ImageDraw.ImageDraw, start: tuple[float, float], end: tuple[float, float], fill: tuple[int, ...], width: int) -> None:
    draw.line((*start, *end), fill=fill, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    size = width * 4
    for offset in (-0.55, 0.55):
        point = (
            end[0] - size * math.cos(angle + offset),
            end[1] - size * math.sin(angle + offset),
        )
        draw.line((*end, *point), fill=fill, width=width)


def render_topic_visual(prompt: str, output_path: str | Path, width: int, height: int) -> Path:
    """Render a polished, deterministic visual that reflects the prompt's topic."""
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    seed = int(hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:16], 16)
    rng = random.Random(seed)
    motif = infer_visual_motif(prompt)

    image = _gradient(width, height, (5, 16, 31), (13, 39, 58))
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    radius = int(min(width, height) * 0.32)
    gx, gy = int(width * 0.68), int(height * 0.42)
    glow_draw.ellipse((gx - radius, gy - radius, gx + radius, gy + radius), fill=(45, 212, 191, 80))
    glow = glow.filter(ImageFilter.GaussianBlur(radius // 2))
    image = Image.alpha_composite(image.convert("RGBA"), glow)
    draw = ImageDraw.Draw(image, "RGBA")
    cyan = (56, 189, 248, 220)
    teal = (45, 212, 191, 230)
    soft = (226, 232, 240, 130)
    line_width = max(3, width // 420)

    if motif == "timeline":
        y = int(height * 0.52)
        draw.line((width * 0.12, y, width * 0.88, y), fill=soft, width=line_width)
        for index in range(5):
            x = int(width * (0.16 + index * 0.17))
            r = int(min(width, height) * (0.025 + index * 0.004))
            draw.ellipse((x - r, y - r, x + r, y + r), fill=teal if index == 4 else cyan)
            draw.line((x, y - r * 2, x, y - r * (4 + index % 2)), fill=soft, width=line_width)
    elif motif == "comparison":
        margin = int(width * 0.13)
        gap = int(width * 0.05)
        mid = width // 2
        for box, color in (
            ((margin, height * 0.2, mid - gap, height * 0.8), cyan),
            ((mid + gap, height * 0.2, width - margin, height * 0.8), teal),
        ):
            draw.rounded_rectangle(box, radius=32, outline=color, width=line_width * 2, fill=(*color[:3], 25))
        _arrow(draw, (mid - gap * 0.7, height * 0.5), (mid + gap * 0.7, height * 0.5), soft, line_width)
    elif motif == "security":
        cx, cy = width * 0.57, height * 0.47
        shield = [(cx, cy - height * 0.25), (cx + width * 0.17, cy - height * 0.12), (cx + width * 0.12, cy + height * 0.17), (cx, cy + height * 0.27), (cx - width * 0.12, cy + height * 0.17), (cx - width * 0.17, cy - height * 0.12)]
        draw.polygon(shield, fill=(45, 212, 191, 34), outline=teal)
        for angle in (-0.65, 0, 0.65):
            start = (width * 0.12, height * (0.5 + angle * 0.26))
            end = (cx - width * 0.19, cy + height * angle * 0.08)
            _arrow(draw, start, end, cyan, line_width)
    elif motif in {"network", "science"}:
        nodes = [(rng.uniform(0.16, 0.86) * width, rng.uniform(0.17, 0.8) * height) for _ in range(10)]
        for index, point in enumerate(nodes):
            for other in nodes[index + 1:index + 4]:
                draw.line((*point, *other), fill=(148, 163, 184, 90), width=line_width)
        for index, (x, y) in enumerate(nodes):
            r = int(min(width, height) * (0.022 if index else 0.055))
            draw.ellipse((x - r, y - r, x + r, y + r), fill=teal if index == 0 else cyan, outline=(255, 255, 255, 120), width=line_width)
    elif motif == "space":
        cx, cy = width * 0.62, height * 0.47
        for scale in (0.18, 0.29, 0.4):
            box = (cx - width * scale, cy - height * scale, cx + width * scale, cy + height * scale)
            draw.ellipse(box, outline=soft, width=line_width)
        draw.ellipse((cx - height * 0.07, cy - height * 0.07, cx + height * 0.07, cy + height * 0.07), fill=teal)
        for _ in range(45):
            x, y = rng.randrange(width), rng.randrange(height)
            draw.ellipse((x, y, x + line_width, y + line_width), fill=(255, 255, 255, rng.randrange(50, 180)))
    elif motif == "process":
        points = [(int(width * (0.16 + index * 0.17)), int(height * (0.5 + (index % 2) * 0.12))) for index in range(5)]
        for start, end in zip(points, points[1:]):
            _arrow(draw, start, end, cyan, line_width * 2)
        for index, (x, y) in enumerate(points):
            radius = int(min(width, height) * 0.055)
            draw.rounded_rectangle((x - radius, y - radius, x + radius, y + radius), radius=radius // 3, fill=teal if index == 2 else (20, 85, 110, 220), outline=soft, width=line_width)
    elif motif == "metrics":
        points = [(int(width * (0.12 + index * 0.1)), int(height * (0.7 - rng.uniform(0.04, 0.34))) ) for index in range(8)]
        draw.line(points, fill=teal, width=line_width * 3, joint="curve")
        for x, y in points:
            draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=cyan, outline=soft, width=line_width)
    elif motif == "code":
        for index in range(7):
            y = int(height * (0.25 + index * 0.08))
            x = int(width * (0.14 + (index % 3) * 0.06))
            draw.rounded_rectangle((x, y, x + int(width * (0.28 + rng.random() * 0.3)), y + line_width * 3), radius=line_width, fill=cyan if index % 2 else teal)
        _arrow(draw, (width * 0.55, height * 0.5), (width * 0.82, height * 0.5), soft, line_width * 2)
    elif motif in {"people", "finance", "nature"}:
        center = (width * 0.62, height * 0.48)
        for index in range(6):
            x = center[0] + math.cos(index * math.tau / 6) * width * 0.24
            y = center[1] + math.sin(index * math.tau / 6) * height * 0.22
            _arrow(draw, center, (x, y), soft, line_width)
            radius = int(min(width, height) * 0.035)
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=cyan)
        radius = int(min(width, height) * 0.09)
        draw.ellipse((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius), fill=teal)
    else:
        center = (width * 0.62, height * 0.48)
        for index in range(6):
            angle = index * math.tau / 6
            point = (center[0] + math.cos(angle) * width * 0.25, center[1] + math.sin(angle) * height * 0.3)
            _arrow(draw, center, point, soft, line_width)
            r = int(min(width, height) * 0.035)
            draw.ellipse((point[0] - r, point[1] - r, point[0] + r, point[1] + r), fill=cyan)
        r = int(min(width, height) * 0.09)
        draw.ellipse((center[0] - r, center[1] - r, center[0] + r, center[1] + r), fill=teal)

    image.convert("RGB").save(output, quality=94)
    return output
