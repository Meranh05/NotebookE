import pytest

from notebooke.videos.storytelling import (
    ScenePlan,
    build_caption_cues,
    decode_scene_plan,
    encode_scene_plan,
    scene_from_mapping,
    split_narration_sentences,
)


def test_scene_plan_round_trip_preserves_visual_direction():
    scene = ScenePlan(
        title="CƠ CHẾ PHÂN RÃ",
        narration="Dữ liệu mới được ưu tiên. Dữ liệu cũ giảm trọng số theo thời gian.",
        layout="timeline",
        visual_prompt="A clear timeline of decaying data weights, no text",
        visual_keywords=["Dữ liệu mới", "Time-Fading"],
        purpose="explain causality",
    )

    decoded = decode_scene_plan(encode_scene_plan(scene))

    assert decoded == scene


def test_decode_scene_plan_supports_legacy_title_delimiter():
    decoded = decode_scene_plan("TIÊU ĐỀ|||Một lời kể đầy đủ.")

    assert decoded.title == "TIÊU ĐỀ"
    assert decoded.narration == "Một lời kể đầy đủ."
    assert decoded.layout == "cinematic"


def test_caption_cues_are_short_and_fill_audio_duration():
    cues = build_caption_cues(
        "Thuật toán chỉ quét lại dữ liệu khi ngưỡng thay đổi thực sự bị vượt qua.",
        8.4,
    )

    assert len(cues) >= 2
    assert all(3 <= len(text.split()) <= 9 for text, _ in cues)
    assert sum(duration for _, duration in cues) == pytest.approx(8.4)


def test_sentence_split_keeps_common_javascript_names_intact():
    sentences = split_narration_sentences(
        "Next.js xử lý giao diện. Node.js điều phối dịch vụ phía sau."
    )

    assert sentences == [
        "Next.js xử lý giao diện.",
        "Node.js điều phối dịch vụ phía sau.",
    ]


def test_unknown_layout_falls_back_to_cinematic():
    scene = scene_from_mapping(
        {"title": "T", "narration": "Nội dung", "visual_layout": "random"},
        0,
    )

    assert scene.layout == "cinematic"


def test_internal_director_instruction_is_not_shown_to_viewer():
    scene = scene_from_mapping(
        {
            "title": "NGHỊCH LÝ DỮ LIỆU",
            "narration": "Nội dung",
            "visual_layout": "cinematic",
            "purpose": "Sử dụng Hook 4 để đặt vấn đề trong phân cảnh mở đầu",
        },
        0,
    )

    assert scene.purpose == "Góc nhìn trọng tâm"
