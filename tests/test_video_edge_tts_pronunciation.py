from notebooke.ai.edge_tts_provider import prepare_text_for_speech
from notebooke.videos.pixelle_bridge import normalize_vietnamese_tts


def test_video_uses_the_shared_podcast_edge_tts_pronunciation():
    source = "NotebookE dùng FastAPI, AI và Kubernetes"

    assert normalize_vietnamese_tts(source) == prepare_text_for_speech(
        source, "vi-VN"
    )
    assert normalize_vietnamese_tts(source) == (
        "nốt-búc i dùng phát ây-pi-ai, ây ai và cu-bờ-né-tít."
    )
