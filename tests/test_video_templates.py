from pathlib import Path

from notebooke.videos.templates import (
    VIDEO_TEMPLATES,
    get_video_template,
    list_video_templates,
    select_video_template,
)

TEMPLATE_PATHS = (
    "templates/1920x1080/image_notebooke_adaptive.html",
    "templates/1080x1920/image_notebooke_adaptive.html",
)


def test_catalog_has_ten_distinct_light_and_dark_templates():
    assert len(VIDEO_TEMPLATES) == 10
    assert len({template.id for template in VIDEO_TEMPLATES}) == 10
    assert {template.tone for template in VIDEO_TEMPLATES} == {"light", "dark"}
    assert len({template.background for template in VIDEO_TEMPLATES}) == 10


def test_auto_selection_matches_document_subject():
    assert select_video_template("auto", "Nghiên cứu giáo dục và phương pháp luận").id == "academic-paper"
    assert select_video_template("auto", "Kiến trúc phần mềm, thuật toán và hệ thống").id == "technical-grid"
    assert select_video_template("auto", "Báo cáo doanh thu, dữ liệu và thống kê tài chính").id == "data-dashboard"
    assert select_video_template("auto", "Sức khỏe tâm lý và phương pháp điều trị").id == "health-calm"


def test_explicit_and_legacy_template_selection():
    assert select_video_template("future-neon", "unrelated").id == "future-neon"
    assert select_video_template("Documentary Cinematic", "unrelated").id == "documentary-night"
    assert get_video_template("Technical Visualization").id == "technical-grid"


def test_api_catalog_does_not_expose_classifier_internals():
    catalog = list_video_templates()
    assert len(catalog) == 10
    assert all("keywords" not in item and "direction" not in item for item in catalog)
    assert all(item["content_types"] for item in catalog)


def test_adaptive_renderers_use_theme_palette_for_every_layout():
    for template_path in TEMPLATE_PATHS:
        html = Path(template_path).read_text(encoding="utf-8")

        for parameter in (
            "background",
            "panel",
            "ink",
            "muted",
            "accent",
            "accent_2",
            "tone",
            "layout",
        ):
            assert f"{{{{{parameter}" in html

        assert "body.theme-light.layout-split .veil" in html
        assert "background:var(--panel)" in html.replace(" ", "")
