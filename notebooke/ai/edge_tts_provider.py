"""Esperanto-compatible adapter for Microsoft's Edge TTS service."""

from __future__ import annotations

import asyncio
import random
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import aiohttp
from esperanto.providers.tts.base import (
    AudioResponse,
    Model,
    TextToSpeechModel,
    Voice,
)
from loguru import logger

_VI_ENGLISH_TERMS = (
    # Longer phrases must come first so they are not split by single-word rules.
    (r"\bhigh average utility patterns?\b", "hai a-vờ-rịch diu-ti-li-ti pát-tần"),
    (r"\bhigh utility patterns?\b", "hai diu-ti-li-ti pát-tần"),
    (r"\btight re-?scan conditions?\b", "tai-t ri-scan cờn-đi-sần"),
    (r"\btime[- ]fading effects?\b", "tai-m phây-đình i-phéc"),
    (r"\bmaximum utility\b", "mác-xi-mầm diu-ti-li-ti"),
    (r"\btotal utility\b", "tâu-tồ diu-ti-li-ti"),
    (r"\bconcept drift\b", "con-xép đờ-ríp"),
    (r"\binternet of things\b", "in-tờ-nét ờ-v thinh"),
    (r"\breal[- ]time\b", "ri-ồ tai-m"),
    (r"\bpre[- ]large\b", "pờ-ri la-ch"),
    (r"\bbig data\b", "bích đây-tờ"),
    (r"\bprompt injection\b", "pờ-rom in-gấc-sần"),
    (r"\bzero knowledge\b", "di-rô nô-lịch"),
    (r"\bzero day\b", "di-rô đây"),
    (r"\bfine tuning\b", "phai-nờ tiu-nình"),
    (r"\bload balancer\b", "lâu-đờ ba-lần-xờ"),
    (r"\bmachine learning\b", "mờ-shin lơ-nình"),
    (r"\bdeep learning\b", "đíp lơ-nình"),
    (r"\bartificial intelligence\b", "a-ti-fi-sồ in-te-li-gần-x"),
    (r"\bOpenAI\b", "âu-pần ây-ai"),
    (r"\bNotebookE\b", "nốt-búc i"),
    (r"\bJavaScript\b", "gia-va-sờ-cờ-ríp"),
    (r"\bTypeScript\b", "tai-pờ-sờ-cờ-ríp"),
    (r"\bFastAPI\b", "phát ây-pi-ai"),
    (r"\bPython\b", "pai-thần"),
    (r"\bDocker\b", "đóc-cơ"),
    (r"\bpodcasts?\b", "pót-cát"),
    (r"\bprompts?\b", "pờ-rom"),
    (r"\bagents?\b", "ây-gần"),
    (r"\bservers?\b", "sơ-vờ"),
    (r"\bdatasets?\b", "đây-tờ-sét"),
    (r"\bpipelines?\b", "pai-pờ-lai-nờ"),
    (r"\bcaches?\b", "két-sờ"),
    (r"\bbenchmarks?\b", "ben-chờ-mác"),
    (r"\btokens?\b", "tô-cần"),
    (r"\btransformers?\b", "tran-x-pho-mờ"),
    (r"\bembeddings?\b", "em-be-đình"),
    (r"\bframeworks?\b", "phờ-râym-uơc"),
    (r"\bdatabases?\b", "đây-tờ-bâys"),
    (r"\bcloud\b", "cờ-laođ"),
    (r"\bscalability\b", "s-cây-lờ-bi-li-ti"),
    (r"\bstartups?\b", "s-tát-ấp"),
    (r"\bpatterns?\b", "pát-tần"),
    (r"\butility\b", "diu-ti-li-ti"),
    (r"\bworkflow\b", "uốc-phờ-lâu"),
    (r"\bstreaming\b", "sờ-tri-mình"),
    (r"\bperformance\b", "pờ-pho-mần-x"),
    (r"\bkubernetes\b", "cu-bờ-né-tít"),
    (r"\bmicroservices?\b", "mai-cờ-rô sơ-vít"),
    (r"\bmiddlewares?\b", "mít-đồ-oe"),
    (r"\bfullstack\b", "phun-sờ-téc"),
    (r"\bclients?\b", "cờ-lai-ần"),
    (r"\bcookies?\b", "cúc-ki"),
    (r"\bsessions?\b", "sé-sần"),
    (r"\bdebug\b", "đi-bấc"),
    (r"\bfirewalls?\b", "phai-ờ-uo-lờ"),
    (r"\bmalwares?\b", "men-oe"),
    (r"\bphishings?\b", "phi-sình"),
    (r"\bransomwares?\b", "ran-sầm-oe"),
    (r"\bpayloads?\b", "pây-lâuđ"),
    (r"\bqueries?\b", "que-ri"),
    (r"\bdashboards?\b", "đát-bo-đờ"),
    (r"\bplugins?\b", "pờ-lấc-in"),
    (r"\bdevelopers?\b", "đờ-ve-lờ-pờ"),
    (r"\breleases?\b", "ri-lít"),
    (r"\bupdates?\b", "ấp-đây-t"),
    (r"\bdownloads?\b", "đao-lâuđ"),
    (r"\buploads?\b", "ấp-lâuđ"),
    (r"\bonline\b", "on-lai-nờ"),
    (r"\boffline\b", "óp-lai-nờ"),
    (r"\bbackend\b", "béc-en"),
    (r"\bfrontend\b", "phờ-rân-en"),
)

_VI_ENGLISH_LETTERS = {
    "A": "ây",
    "B": "bi",
    "C": "xi",
    "D": "đi",
    "E": "i",
    "F": "ép",
    "G": "gi",
    "H": "âych",
    "I": "ai",
    "J": "giây",
    "K": "cây",
    "L": "eo",
    "M": "em",
    "N": "en",
    "O": "âu",
    "P": "pi",
    "Q": "kiu",
    "R": "a",
    "S": "ét",
    "T": "ti",
    "U": "diu",
    "V": "vi",
    "W": "đắp-bồ-diu",
    "X": "ếch",
    "Y": "oai",
    "Z": "di",
}


def normalize_english_terms_for_vietnamese(text: str) -> str:
    """Give common English technical terms stable pronunciation in vi-VN voices."""
    normalized = text
    for pattern, pronunciation in _VI_ENGLISH_TERMS:
        normalized = re.sub(
            pattern,
            pronunciation,
            normalized,
            flags=re.IGNORECASE,
        )
    normalized = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", normalized)
    normalized = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", normalized)
    normalized = re.sub(
        r"\b([A-Za-z0-9]+)\.(js|ts|py|ai|io|sh|cpp|rs)\b",
        r"\1 \2",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"(?<=[A-Za-z0-9])\s*/\s*(?=[A-Za-z0-9])",
        " và ",
        normalized,
    )
    normalized = re.sub(r"(?<=[A-Za-z0-9])_(?=[A-Za-z0-9])", " ", normalized)
    for pattern, pronunciation in _VI_ENGLISH_TERMS:
        normalized = re.sub(
            pattern,
            pronunciation,
            normalized,
            flags=re.IGNORECASE,
        )
    def spell_acronym(match: re.Match[str]) -> str:
        return " ".join(_VI_ENGLISH_LETTERS[letter] for letter in match.group(0))

    return re.sub(r"\b[A-Z]{2,6}\b", spell_acronym, normalized)


def prepare_text_for_speech(text: str, language: Optional[str] = None) -> str:
    """Convert written content into cleaner narration for Edge TTS."""
    spoken = text.strip()
    spoken = re.sub(r"```[a-zA-Z0-9_-]*", "", spoken)
    spoken = spoken.replace("```", "")
    spoken = re.sub(r"`([^`]+)`", r"\1", spoken)
    spoken = re.sub(r"\*\*([^*]+)\*\*", r"\1", spoken)
    spoken = re.sub(r"(?m)^\s*[-*•]\s+", "", spoken)
    spoken = re.sub(r"\s*\n+\s*", ". ", spoken)

    normalized_language = (language or "").strip().lower()
    if (
        normalized_language.startswith("vi")
        or normalized_language in {"vietnamese", "tiếng việt", "tieng viet"}
    ):
        spoken = normalize_english_terms_for_vietnamese(spoken)
        replacements = (
            (r"\s*&\s*", " và "),
            (r"\s*%", " phần trăm"),
            (r"\s*[×x]\s*(?=\d)", " nhân "),
            (r"\s*=\s*", " bằng "),
            (r"\s*\+\s*", " cộng "),
            (r"\s*/\s*(?=\d)", " chia "),
        )
        for pattern, replacement in replacements:
            spoken = re.sub(pattern, replacement, spoken)

    spoken = re.sub(r"\s+([,.;:!?])", r"\1", spoken)
    spoken = re.sub(r"([,.;:!?])(?=\S)", r"\1 ", spoken)
    spoken = re.sub(r"(?:\.\s*){2,}", ". ", spoken)
    spoken = re.sub(r"[ \t]+", " ", spoken).strip()
    if spoken and spoken[-1] not in ".!?":
        spoken += "."
    return spoken


class EdgeTTSProvider(TextToSpeechModel):
    """Use ``edge-tts`` through Esperanto's text-to-speech interface."""

    PROVIDER = "edgetts"

    async def agenerate_speech(
        self,
        text: str,
        voice: str,
        output_file: Optional[Union[str, Path]] = None,
        **kwargs: Any,
    ) -> AudioResponse:
        self.validate_parameters(text, voice, self.model_name)

        import edge_tts

        language = kwargs.get("language") or (self.config or {}).get("language")
        spoken_text = prepare_text_for_speech(text, language)

        temporary_path: Optional[Path] = None
        if output_file is None:
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as handle:
                temporary_path = Path(handle.name)
            target = temporary_path
        else:
            target = Path(output_file).expanduser().resolve()
            target.parent.mkdir(parents=True, exist_ok=True)

        communicate_options = {
            key: value
            for key, value in {
                "rate": kwargs.get("rate") or (self.config or {}).get("rate"),
                "volume": kwargs.get("volume") or (self.config or {}).get("volume"),
                "pitch": kwargs.get("pitch") or (self.config or {}).get("pitch"),
            }.items()
            if value is not None
        }

        try:
            max_attempts = int(kwargs.get("max_attempts", 4))
            if max_attempts < 1:
                raise ValueError("max_attempts must be at least 1")

            for attempt in range(1, max_attempts + 1):
                try:
                    logger.info(
                        "Generating Edge TTS audio with voice '{}' (attempt {}/{})",
                        voice,
                        attempt,
                        max_attempts,
                    )
                    await edge_tts.Communicate(
                        text=spoken_text,
                        voice=voice,
                        **communicate_options,
                    ).save(str(target))
                    if target.stat().st_size > 0:
                        break
                    raise edge_tts.exceptions.NoAudioReceived(
                        "Edge TTS created an empty audio file"
                    )
                except (
                    edge_tts.exceptions.NoAudioReceived,
                    aiohttp.ClientError,
                    asyncio.TimeoutError,
                ) as exc:
                    target.unlink(missing_ok=True)
                    if attempt == max_attempts:
                        raise
                    delay = min(8.0, 2 ** (attempt - 1)) + random.uniform(0, 0.25)
                    logger.warning(
                        "Transient Edge TTS error ({}); retrying in {:.2f}s",
                        type(exc).__name__,
                        delay,
                    )
                    await asyncio.sleep(delay)

            audio_data = target.read_bytes()
            if not audio_data:
                raise RuntimeError("Edge TTS created an empty audio file")
            return AudioResponse(
                audio_data=audio_data,
                content_type="audio/mpeg",
                model=self.model_name or "edge-tts",
                voice=voice,
                provider=self.PROVIDER,
                metadata={"text": spoken_text, "source_text": text},
            )
        except Exception as exc:
            target.unlink(missing_ok=True)
            raise RuntimeError(f"Edge TTS failed to generate speech: {exc}") from exc
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)

    def generate_speech(
        self,
        text: str,
        voice: str,
        output_file: Optional[Union[str, Path]] = None,
        **kwargs: Any,
    ) -> AudioResponse:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(
                self.agenerate_speech(text, voice, output_file=output_file, **kwargs)
            )
        raise RuntimeError(
            "generate_speech cannot run inside an active event loop; use "
            "agenerate_speech instead"
        )

    @property
    def available_voices(self) -> Dict[str, Voice]:
        voices = (
            ("vi-VN-NamMinhNeural", "MALE", "vi-VN"),
            ("vi-VN-HoaiMyNeural", "FEMALE", "vi-VN"),
            ("en-US-JennyNeural", "FEMALE", "en-US"),
            ("en-US-GuyNeural", "MALE", "en-US"),
            ("en-US-AvaMultilingualNeural", "FEMALE", "en-US"),
            ("en-US-AndrewMultilingualNeural", "MALE", "en-US"),
            ("en-US-EmmaMultilingualNeural", "FEMALE", "en-US"),
        )
        return {
            voice_id: Voice(
                name=voice_id,
                id=voice_id,
                gender=gender,
                language_code=language_code,
            )
            for voice_id, gender, language_code in voices
        }

    def _get_models(self) -> List[Model]:
        return [
            Model(
                id=self.model_name or "edge-tts",
                owned_by="microsoft",
                type="text_to_speech",
            )
        ]
