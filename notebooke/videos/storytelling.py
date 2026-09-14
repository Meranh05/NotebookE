"""Structured scene planning helpers for adaptive educational videos."""

from __future__ import annotations

import base64
import json
import math
import re
from dataclasses import dataclass, field
from typing import Any

SCENE_PREFIX = "[[NBSCENE:"
SCENE_SUFFIX = "]]"
SUPPORTED_LAYOUTS = {
    "cinematic",
    "split",
    "diagram",
    "timeline",
    "comparison",
    "focus",
    "process",
    "metrics",
}

LAYOUT_PURPOSES = {
    "cinematic": "Góc nhìn trọng tâm",
    "split": "Giải thích trực quan",
    "diagram": "Cơ chế vận hành",
    "timeline": "Tiến trình phát triển",
    "comparison": "Phân tích đánh đổi",
    "focus": "Điểm nhấn quan trọng",
    "process": "Quy trình vận hành",
    "metrics": "Tín hiệu dữ liệu",
}


def _viewer_facing_purpose(value: str, layout: str) -> str:
    purpose = " ".join(value.split())
    instruction_markers = (
        "hook",
        "sử dụng",
        "hãy ",
        "yêu cầu",
        "phân cảnh",
        "cảnh số",
    )
    if not purpose or any(marker in purpose.casefold() for marker in instruction_markers):
        return LAYOUT_PURPOSES[layout]
    return purpose[:60]


@dataclass(slots=True)
class ScenePlan:
    """A narration plus the visual direction needed to render one scene."""

    title: str
    narration: str
    layout: str = "cinematic"
    visual_prompt: str = ""
    visual_keywords: list[str] = field(default_factory=list)
    purpose: str = "explain"

    def normalized(self) -> "ScenePlan":
        layout = self.layout.strip().lower()
        if layout not in SUPPORTED_LAYOUTS:
            layout = "cinematic"
        return ScenePlan(
            title=" ".join(self.title.split())[:90] or "Ý CHÍNH",
            narration=" ".join(self.narration.split()),
            layout=layout,
            visual_prompt=" ".join(self.visual_prompt.split()),
            visual_keywords=[
                " ".join(str(item).split())[:36]
                for item in self.visual_keywords[:4]
                if str(item).strip()
            ],
            purpose=_viewer_facing_purpose(self.purpose, layout),
        )


def encode_scene_plan(scene: ScenePlan) -> str:
    """Pack scene metadata into a narration string understood by Pixelle."""
    normalized = scene.normalized()
    payload = json.dumps(
        {
            "title": normalized.title,
            "layout": normalized.layout,
            "visual_prompt": normalized.visual_prompt,
            "visual_keywords": normalized.visual_keywords,
            "purpose": normalized.purpose,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    encoded = base64.urlsafe_b64encode(payload).decode("ascii")
    return f"{SCENE_PREFIX}{encoded}{SCENE_SUFFIX}|||{normalized.narration}"


def decode_scene_plan(value: str, index: int = 0) -> ScenePlan:
    """Decode new scene metadata and remain compatible with older videos."""
    raw = value.strip()
    metadata: dict[str, Any] = {}
    narration = raw

    if raw.startswith(SCENE_PREFIX):
        marker_end = raw.find(SCENE_SUFFIX)
        if marker_end > len(SCENE_PREFIX):
            encoded = raw[len(SCENE_PREFIX) : marker_end]
            try:
                metadata = json.loads(
                    base64.urlsafe_b64decode(encoded.encode("ascii")).decode("utf-8")
                )
            except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
                metadata = {}
            remainder = raw[marker_end + len(SCENE_SUFFIX) :]
            narration = remainder.removeprefix("|||").strip()
    elif "|||" in raw:
        parts = [part.strip() for part in raw.split("|||") if part.strip()]
        if parts:
            metadata["title"] = parts[0]
            narration = parts[-1]

    return ScenePlan(
        title=str(metadata.get("title") or f"Ý CHÍNH {index + 1}"),
        narration=narration,
        layout=str(metadata.get("layout") or "cinematic"),
        visual_prompt=str(metadata.get("visual_prompt") or narration),
        visual_keywords=list(metadata.get("visual_keywords") or []),
        purpose=str(metadata.get("purpose") or "explain"),
    ).normalized()


def split_narration_sentences(text: str) -> list[str]:
    """Split narration into natural TTS units while preserving common tech names."""
    protected = text
    replacements = {
        "Next.js": "Next__DOT__js",
        "Node.js": "Node__DOT__js",
        "Vue.js": "Vue__DOT__js",
    }
    for source, target in replacements.items():
        protected = protected.replace(source, target)
    sentences = [
        item.replace("__DOT__", ".").strip()
        for item in re.split(r"(?<=[.!?;])\s+|\n+", protected)
        if item.strip()
    ]
    return sentences or [text.strip()]


def build_caption_cues(
    sentence: str,
    duration: float,
    *,
    min_words: int = 3,
    max_words: int = 7,
) -> list[tuple[str, float]]:
    """Create short progressive captions whose durations exactly fill the audio."""
    words = sentence.split()
    if not words:
        return [("", max(duration, 0.05))]

    target_size = min(max_words, max(min_words, round(math.sqrt(len(words)) + 2)))
    chunks: list[list[str]] = []
    current: list[str] = []
    for word in words:
        current.append(word)
        ends_phrase = word.rstrip('"”’').endswith((",", ":", ";"))
        if len(current) >= target_size or (ends_phrase and len(current) >= min_words):
            chunks.append(current)
            current = []
    if current:
        if chunks and len(current) < min_words:
            chunks[-1].extend(current)
        else:
            chunks.append(current)

    weights = [
        max(1.0, len(chunk) + (0.7 if chunk[-1].endswith((".", "!", "?", ";")) else 0))
        for chunk in chunks
    ]
    total_weight = sum(weights)
    raw_durations = [max(0.18, duration * weight / total_weight) for weight in weights]
    scale = duration / sum(raw_durations) if duration > 0 else 1.0
    cue_durations = [item * scale for item in raw_durations]
    if cue_durations:
        cue_durations[-1] += duration - sum(cue_durations)
    return [(" ".join(chunk), cue_duration) for chunk, cue_duration in zip(chunks, cue_durations)]


def scene_from_mapping(value: Any, index: int) -> ScenePlan:
    """Validate one LLM-produced scene without trusting its JSON shape."""
    if not isinstance(value, dict):
        return ScenePlan(title=f"Ý CHÍNH {index + 1}", narration=str(value))
    return ScenePlan(
        title=str(value.get("title") or f"Ý CHÍNH {index + 1}"),
        narration=str(value.get("narration") or ""),
        layout=str(value.get("visual_layout") or value.get("layout") or "cinematic"),
        visual_prompt=str(value.get("visual_prompt") or value.get("narration") or ""),
        visual_keywords=[str(item) for item in value.get("visual_keywords", [])],
        purpose=str(value.get("purpose") or "explain"),
    ).normalized()
