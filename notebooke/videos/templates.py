"""Video visual presets and deterministic content-aware selection."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass


@dataclass(frozen=True, slots=True)
class VideoTemplate:
    id: str
    name: str
    description: str
    tone: str
    content_types: tuple[str, ...]
    keywords: tuple[str, ...]
    direction: str
    background: str
    panel: str
    ink: str
    muted: str
    accent: str
    accent_2: str

    def api_dict(self) -> dict[str, object]:
        data = asdict(self)
        data.pop("keywords")
        data.pop("direction")
        data["content_types"] = list(self.content_types)
        return data

    @property
    def template_params(self) -> dict[str, str]:
        return {
            "tone": self.tone,
            "background": self.background,
            "panel": self.panel,
            "ink": self.ink,
            "muted": self.muted,
            "accent": self.accent,
            "accent_2": self.accent_2,
        }


VIDEO_TEMPLATES: tuple[VideoTemplate, ...] = (
    VideoTemplate(
        "documentary-night", "Phóng sự điện ảnh", "Tối, giàu chiều sâu cho lịch sử và thời sự.", "dark",
        ("Lịch sử", "Thời sự", "Xã hội"),
        ("lịch sử", "chiến tranh", "xã hội", "thời sự", "chính trị", "history", "society", "news"),
        "cinematic documentary, authentic photography, restrained composition, historical depth",
        "#111827", "#172033", "#f8fafc", "#cbd5e1", "#f59e0b", "#fb7185",
    ),
    VideoTemplate(
        "editorial-light", "Tạp chí hiện đại", "Sáng, sạch và dễ đọc cho nội dung tổng hợp.", "light",
        ("Tổng hợp", "Kinh doanh", "Báo cáo"),
        ("tổng quan", "báo cáo", "kinh doanh", "quản trị", "marketing", "report", "business", "overview"),
        "premium editorial photography, generous whitespace, crisp magazine composition",
        "#f7f4ee", "#ffffff", "#18212f", "#5f6b7a", "#2563eb", "#e8793e",
    ),
    VideoTemplate(
        "technical-grid", "Bản vẽ công nghệ", "Tối, chính xác cho kỹ thuật và kiến trúc hệ thống.", "dark",
        ("Công nghệ", "Kỹ thuật", "Phần mềm"),
        ("công nghệ", "phần mềm", "thuật toán", "hệ thống", "kỹ thuật", "code", "software", "algorithm", "engineering"),
        "technical blueprint, precise diagrams, structured grid, engineered detail",
        "#08131f", "#0d2030", "#e6f6ff", "#9fc5d8", "#22d3ee", "#60a5fa",
    ),
    VideoTemplate(
        "academic-paper", "Học thuật tinh gọn", "Sáng, trang nhã cho nghiên cứu và bài giảng.", "light",
        ("Nghiên cứu", "Giáo dục", "Học thuật"),
        ("nghiên cứu", "giáo dục", "luận văn", "phương pháp", "đại học", "research", "study", "education", "paper"),
        "academic publication, precise educational illustration, calm hierarchy, credible detail",
        "#f3f1e9", "#fffdf7", "#1f2937", "#667085", "#4f46e5", "#0f766e",
    ),
    VideoTemplate(
        "data-dashboard", "Dữ liệu quyết định", "Tối, tương phản cao cho số liệu và tài chính.", "dark",
        ("Dữ liệu", "Tài chính", "Phân tích"),
        ("dữ liệu", "thống kê", "tài chính", "doanh thu", "tăng trưởng", "data", "statistics", "finance", "revenue", "metric"),
        "data visualization, analytical dashboard, bold numeric storytelling, precise charts",
        "#101418", "#182027", "#f7fafc", "#aab8c5", "#2dd4bf", "#a3e635",
    ),
    VideoTemplate(
        "nature-journal", "Nhật ký tự nhiên", "Sáng, hữu cơ cho sinh học và môi trường.", "light",
        ("Sinh học", "Môi trường", "Địa lý"),
        ("sinh học", "môi trường", "khí hậu", "động vật", "thực vật", "biology", "nature", "climate", "environment"),
        "natural history journal, organic textures, botanical detail, daylight photography",
        "#eef3e9", "#fbfdf8", "#243126", "#657465", "#3f7d5b", "#d08c45",
    ),
    VideoTemplate(
        "warm-story", "Kể chuyện ấm áp", "Sáng, gần gũi cho văn học và câu chuyện con người.", "light",
        ("Văn học", "Nhân văn", "Tiểu sử"),
        ("câu chuyện", "văn học", "nhân vật", "cuộc đời", "văn hóa", "story", "literature", "biography", "culture"),
        "human-centered storytelling, warm natural light, intimate editorial illustration",
        "#fbf0e8", "#fffaf5", "#352823", "#7c665c", "#c95f45", "#d49b3f",
    ),
    VideoTemplate(
        "cinematic-noir", "Điện ảnh noir", "Tối, kịch tính cho điều tra và chủ đề bí ẩn.", "dark",
        ("Điều tra", "Tâm lý", "Bí ẩn"),
        ("điều tra", "bí ẩn", "tội phạm", "khủng hoảng", "tranh cãi", "investigation", "mystery", "crime", "crisis"),
        "cinematic noir, dramatic side lighting, investigative mood, restrained monochrome photography",
        "#121212", "#1c1c1d", "#f5f5f4", "#b7b7b3", "#ef4444", "#f59e0b",
    ),
    VideoTemplate(
        "health-calm", "Sức khỏe an tâm", "Sáng, dịu và đáng tin cho y tế và tâm lý.", "light",
        ("Y tế", "Sức khỏe", "Tâm lý"),
        ("y tế", "sức khỏe", "bệnh", "điều trị", "tâm lý", "health", "medical", "therapy", "psychology"),
        "calm healthcare editorial, reassuring human imagery, clean clinical clarity",
        "#edf7f5", "#fbfffe", "#163331", "#5c7773", "#0f9f8f", "#5b8def",
    ),
    VideoTemplate(
        "future-neon", "Tương lai số", "Tối, sống động cho AI, không gian và đổi mới.", "dark",
        ("AI", "Tương lai", "Không gian"),
        ("trí tuệ nhân tạo", "ai", "robot", "tương lai", "vũ trụ", "không gian", "innovation", "future", "space"),
        "near-future technology, luminous scientific visualization, sophisticated neon accents",
        "#0c0b1d", "#17142e", "#f4f1ff", "#b9b3d6", "#8b5cf6", "#22d3ee",
    ),
)

_BY_ID = {template.id: template for template in VIDEO_TEMPLATES}
_LEGACY_ALIASES = {
    "ai visual director": "auto",
    "documentary cinematic": "documentary-night",
    "editorial presentation": "editorial-light",
    "technical visualization": "technical-grid",
}


def get_video_template(template_id: str) -> VideoTemplate:
    normalized = _LEGACY_ALIASES.get(template_id.strip().casefold(), template_id.strip().casefold())
    return _BY_ID.get(normalized, _BY_ID["editorial-light"])


def select_video_template(requested: str | None, content: str) -> VideoTemplate:
    """Resolve an explicit preset or score document text for automatic selection."""
    normalized = (requested or "auto").strip().casefold()
    normalized = _LEGACY_ALIASES.get(normalized, normalized)
    if normalized != "auto" and normalized in _BY_ID:
        return _BY_ID[normalized]

    searchable = re.sub(r"\s+", " ", content.casefold())[:120_000]
    def occurrences(keyword: str) -> int:
        needle = keyword.casefold()
        if len(needle) <= 3:
            return len(re.findall(rf"(?<!\w){re.escape(needle)}(?!\w)", searchable))
        return searchable.count(needle)

    scored = [
        (sum(occurrences(keyword) for keyword in template.keywords), -index, template)
        for index, template in enumerate(VIDEO_TEMPLATES)
    ]
    score, _, selected = max(scored, key=lambda item: (item[0], item[1]))
    return selected if score > 0 else _BY_ID["editorial-light"]


def list_video_templates() -> list[dict[str, object]]:
    return [template.api_dict() for template in VIDEO_TEMPLATES]
