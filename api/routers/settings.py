from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import SettingsResponse, SettingsUpdate
from notebooke.domain.content_settings import ContentSettings
from notebooke.exceptions import (
    InvalidInputError,
    OpenNotebookError,
)

router = APIRouter()


@router.get("/settings", response_model=SettingsResponse)
async def get_settings():
    """Get all application settings."""
    try:
        settings: ContentSettings = await ContentSettings.get_instance()  # type: ignore[assignment]

        return SettingsResponse(
            default_content_processing_engine_doc=settings.default_content_processing_engine_doc,
            default_content_processing_engine_url=settings.default_content_processing_engine_url,
            default_embedding_option=settings.default_embedding_option,
            auto_delete_files=settings.auto_delete_files,
            docling_ocr=settings.docling_ocr,
            docling_formulas=settings.docling_formulas,
            docling_vision=settings.docling_vision,
            youtube_preferred_languages=settings.youtube_preferred_languages,
            default_video_voice=settings.default_video_voice,
            default_video_aspect_ratio=settings.default_video_aspect_ratio,
            default_video_duration=settings.default_video_duration,
            default_video_style=settings.default_video_style,
            default_video_character=settings.default_video_character,
        )
    except HTTPException:
        raise
    except OpenNotebookError:
        raise
    except Exception as e:
        logger.error(f"Error fetching settings: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error fetching settings"
        )


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(settings_update: SettingsUpdate):
    """Update application settings."""
    try:
        settings: ContentSettings = await ContentSettings.get_instance()  # type: ignore[assignment]

        # Update only provided fields
        if settings_update.default_content_processing_engine_doc is not None:
            # Cast to proper literal type
            from typing import Literal, cast

            settings.default_content_processing_engine_doc = cast(
                Literal["auto", "docling", "simple"],
                settings_update.default_content_processing_engine_doc,
            )
        if settings_update.default_content_processing_engine_url is not None:
            from typing import Literal, cast

            settings.default_content_processing_engine_url = cast(
                Literal["auto", "firecrawl", "jina", "crawl4ai", "simple"],
                settings_update.default_content_processing_engine_url,
            )
        if settings_update.default_embedding_option is not None:
            from typing import Literal, cast

            settings.default_embedding_option = cast(
                Literal["ask", "always", "never"],
                settings_update.default_embedding_option,
            )
        if settings_update.auto_delete_files is not None:
            from typing import Literal, cast

            settings.auto_delete_files = cast(
                Literal["yes", "no"], settings_update.auto_delete_files
            )
        if settings_update.docling_ocr is not None:
            settings.docling_ocr = settings_update.docling_ocr
        if settings_update.docling_formulas is not None:
            settings.docling_formulas = settings_update.docling_formulas
        if settings_update.docling_vision is not None:
            settings.docling_vision = settings_update.docling_vision
        if settings_update.youtube_preferred_languages is not None:
            settings.youtube_preferred_languages = (
                settings_update.youtube_preferred_languages
            )
        if settings_update.default_video_voice is not None:
            settings.default_video_voice = settings_update.default_video_voice
        if settings_update.default_video_aspect_ratio is not None:
            from typing import Literal, cast
            settings.default_video_aspect_ratio = cast(
                Literal["16:9", "9:16"], settings_update.default_video_aspect_ratio
            )
        if settings_update.default_video_duration is not None:
            settings.default_video_duration = settings_update.default_video_duration
        if settings_update.default_video_style is not None:
            settings.default_video_style = settings_update.default_video_style
        if settings_update.default_video_character is not None:
            settings.default_video_character = settings_update.default_video_character

        await settings.update()

        return SettingsResponse(
            default_content_processing_engine_doc=settings.default_content_processing_engine_doc,
            default_content_processing_engine_url=settings.default_content_processing_engine_url,
            default_embedding_option=settings.default_embedding_option,
            auto_delete_files=settings.auto_delete_files,
            docling_ocr=settings.docling_ocr,
            docling_formulas=settings.docling_formulas,
            docling_vision=settings.docling_vision,
            youtube_preferred_languages=settings.youtube_preferred_languages,
            default_video_voice=settings.default_video_voice,
            default_video_aspect_ratio=settings.default_video_aspect_ratio,
            default_video_duration=settings.default_video_duration,
            default_video_style=settings.default_video_style,
            default_video_character=settings.default_video_character,
        )
    except HTTPException:
        raise
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except OpenNotebookError:
        raise
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error updating settings"
        )
