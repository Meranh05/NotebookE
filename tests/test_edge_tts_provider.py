from pathlib import Path

import edge_tts
import pytest
from esperanto import AIFactory

import notebooke.ai.models  # noqa: F401 - installs the Esperanto adapter
from notebooke.ai.edge_tts_provider import (
    EdgeTTSProvider,
    normalize_english_terms_for_vietnamese,
    prepare_text_for_speech,
)


def test_english_terms_are_pronounceable_by_vietnamese_voice():
    assert normalize_english_terms_for_vietnamese(
        "NotebookE dùng AI, API và Python."
    ) == "nốt-búc i dùng ây ai, ây pi ai và pai-thần."


def test_mixed_business_terms_are_normalized_before_vietnamese_tts():
    spoken = normalize_english_terms_for_vietnamese(
        "High Utility Patterns hỗ trợ real-time và scalability cho startup."
    )

    assert spoken == (
        "hai diu-ti-li-ti pát-tần hỗ trợ ri-ồ tai-m và "
        "s-cây-lờ-bi-li-ti cho s-tát-ấp."
    )


def test_compound_terms_paths_and_extended_vocabulary_are_normalized():
    spoken = normalize_english_terms_for_vietnamese(
        "FastAPI dùng CI/CD, Kubernetes, microservices và dashboard."
    )

    assert "phát ây-pi-ai" in spoken
    assert "xi ai và xi đi" in spoken
    assert "cu-bờ-né-tít" in spoken
    assert "mai-cờ-rô sơ-vít" in spoken
    assert "đát-bo-đờ" in spoken


def test_vietnamese_display_name_enables_pronunciation_pipeline():
    assert prepare_text_for_speech("NotebookE dùng API", "Tiếng Việt") == (
        "nốt-búc i dùng ây pi ai."
    )

def test_prepare_vietnamese_text_for_natural_speech():
    source = "**Kết quả**\n- Hiệu suất tăng 25% & chi phí giảm."

    assert prepare_text_for_speech(source, "vi-VN") == (
        "Kết quả. Hiệu suất tăng 25 phần trăm và chi phí giảm."
    )


def test_factory_keeps_classmethod_contract_for_edge_tts():
    provider = AIFactory.create_text_to_speech("edgetts", "edge-tts")

    assert isinstance(provider, EdgeTTSProvider)
    assert provider.model_name == "edge-tts"


@pytest.mark.asyncio
async def test_edge_tts_provider_writes_audio_and_returns_response(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
):
    class FakeCommunicate:
        def __init__(self, text: str, voice: str, **kwargs):
            assert text == "Xin chào."
            assert voice == "vi-VN-NamMinhNeural"

        async def save(self, output_file: str) -> None:
            Path(output_file).write_bytes(b"fake-mp3")

    monkeypatch.setattr(edge_tts, "Communicate", FakeCommunicate)
    provider = EdgeTTSProvider(model_name="edge-tts")
    output_file = tmp_path / "clip.mp3"

    response = await provider.agenerate_speech(
        "Xin chào",
        "vi-VN-NamMinhNeural",
        output_file=output_file,
    )

    assert output_file.read_bytes() == b"fake-mp3"
    assert response.audio_data == b"fake-mp3"
    assert response.provider == "edgetts"


@pytest.mark.asyncio
async def test_edge_tts_provider_retries_empty_responses(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
):
    attempts = 0

    class FlakyCommunicate:
        def __init__(self, text: str, voice: str, **kwargs):
            pass

        async def save(self, output_file: str) -> None:
            nonlocal attempts
            attempts += 1
            if attempts < 3:
                raise edge_tts.exceptions.NoAudioReceived("temporary failure")
            Path(output_file).write_bytes(b"recovered-mp3")

    async def no_wait(_delay: float) -> None:
        return None

    monkeypatch.setattr(edge_tts, "Communicate", FlakyCommunicate)
    monkeypatch.setattr("notebooke.ai.edge_tts_provider.asyncio.sleep", no_wait)
    provider = EdgeTTSProvider(model_name="edge-tts")

    response = await provider.agenerate_speech(
        "Xin chào",
        "vi-VN-NamMinhNeural",
        output_file=tmp_path / "retry.mp3",
    )

    assert attempts == 3
    assert response.audio_data == b"recovered-mp3"
