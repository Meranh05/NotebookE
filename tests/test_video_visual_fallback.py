from PIL import Image

from notebooke.videos.visual_fallback import (
    build_visual_prompt,
    infer_visual_motif,
    render_topic_visual,
)


def test_infer_visual_motif_prefers_topic_specific_diagram() -> None:
    assert infer_visual_motif("a network architecture with connected data stream nodes") == "network"
    assert infer_visual_motif("a timeline showing four historical stages") == "timeline"


def test_render_topic_visual_creates_requested_dimensions(tmp_path) -> None:
    output = tmp_path / "fallback.png"
    render_topic_visual("cybersecurity trust boundary and protected data", output, 640, 360)

    with Image.open(output) as image:
        assert image.size == (640, 360)
        assert image.mode == "RGB"


def test_visual_prompt_library_adds_topic_and_layout_direction() -> None:
    prompt = build_visual_prompt("software architecture and API workflow", "diagram")
    assert "software architecture" in prompt
    assert "isometric explanatory diagram" in prompt
    assert "structured infographic" in prompt


def test_new_visual_motifs_are_topic_aware() -> None:
    assert infer_visual_motif("a pipeline workflow with measurable performance metrics") in {"process", "metrics"}
