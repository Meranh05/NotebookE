"""
Service layer for video generation.  Mirrors api/podcast_service.py.
"""

from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from fastapi import HTTPException
from loguru import logger
from pydantic import BaseModel, Field
from surreal_commands import get_command_status, submit_command

from notebooke.domain.notebook import Notebook
from notebooke.videos.models import VideoEpisode


class VideoGenerationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=240)
    content: Optional[str] = Field(default=None, max_length=2_000_000)
    notebook_id: Optional[str] = Field(default=None, max_length=200)
    n_scenes: int = Field(default=5, ge=3, le=16)
    duration_minutes: Literal[1, 3, 5] = 3
    image_workflow: Optional[str] = Field(default=None, max_length=180)
    visual_mode: str = Field(default="auto", max_length=80)
    tts_voice: str = Field(default="vi-VN-HoaiMyNeural", min_length=1, max_length=100)
    language: Optional[str] = Field(default=None, max_length=80)
    video_type: str = Field(default="summary", min_length=1, max_length=100)
    style: str = Field(
        default="AI Visual Director", min_length=1, max_length=100
    )
    character_id: str = Field(default="AI", min_length=1, max_length=100)
    custom_prompt: Optional[str] = Field(default=None, max_length=4_000)
    aspect_ratio: str = Field(default="16:9", pattern=r"^(16:9|9:16)$")


class VideoGenerationResponse(BaseModel):
    job_id: str
    status: str
    message: str
    name: str


class VideoService:

    @staticmethod
    async def submit_generation_job(
        name: str,
        notebook_id: Optional[str] = None,
        content: Optional[str] = None,
        n_scenes: int = 5,
        duration_minutes: Literal[1, 3, 5] = 3,
        image_workflow: Optional[str] = None,
        visual_mode: str = "auto",
        tts_voice: str = "vi-VN-HoaiMyNeural",
        language: Optional[str] = None,
        video_type: str = "summary",
        style: str = "AI Visual Director",
        character_id: str = "AI",
        custom_prompt: Optional[str] = None,
        aspect_ratio: str = "16:9",
    ) -> str:
        try:
            name = name.strip()
            if not name:
                raise ValueError("Video name is required")

            # Resolve content from notebook if not directly supplied.
            if not content and notebook_id:
                try:
                    notebook = await Notebook.get(notebook_id)
                    content = await notebook.get_context()
                except Exception as e:
                    logger.warning(f"[video-service] Could not get notebook context: {e}")
                    raise ValueError(
                        "Unable to read content from the selected notebook"
                    ) from e

            content = content.strip() if content else ""
            if not content:
                raise ValueError(
                    "The selected notebook has no usable source or note content"
                )

            command_args = {
                "name": name,
                "content": content,
                "notebook_id": notebook_id,
                "n_scenes": n_scenes,
                "duration_minutes": duration_minutes,
                "image_workflow": image_workflow,
                "visual_mode": visual_mode,
                "tts_voice": tts_voice,
                "language": language,
                "video_type": video_type,
                "style": style,
                "character_id": character_id,
                "custom_prompt": custom_prompt,
                "aspect_ratio": aspect_ratio,
            }

            # Ensure command module is imported before submitting
            try:
                import commands.video_commands  # noqa: F401
            except ImportError as e:
                logger.error(f"[video-service] Could not import video_commands: {e}")
                raise ValueError("Video commands not available")

            job_id = submit_command("notebooke", "generate_video", command_args)
            if not job_id:
                raise ValueError("Failed to get job_id from submit_command")

            job_id_str = str(job_id)
            logger.info(f"[video-service] Submitted job {job_id_str} for '{name}'")
            return job_id_str

        except HTTPException:
            raise
        except ValueError as e:
            logger.warning(f"[video-service] Request rejected: {e}")
            raise HTTPException(status_code=400, detail=str(e)) from e
        except Exception as e:
            logger.error(f"[video-service] Failed to submit job: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to submit video generation job",
            ) from e

    @staticmethod
    async def get_job_status(job_id: str) -> Dict[str, Any]:
        try:
            status = await get_command_status(job_id)
            if not status:
                return {"job_id": job_id, "status": "unknown"}
            
            job_status = status.status
            
            result_dict = status.result if isinstance(status.result, dict) else getattr(status.result, "model_dump", lambda: {})()
            error_message = getattr(status, "error_message", None) or result_dict.get("error_message")
            success = result_dict.get("success")
            
            if job_status == "completed" and (success is False or error_message):
                job_status = "failed"
                
            return {
                "job_id": job_id,
                "status": job_status,
                "result": status.result,
                "error_message": error_message,
                "created": str(status.created) if getattr(status, "created", None) else None,
                "updated": str(status.updated) if getattr(status, "updated", None) else None,
            }
        except Exception as e:
            logger.error(f"[video-service] get_job_status error: {e}")
            raise HTTPException(status_code=500, detail="Failed to get job status")

    @staticmethod
    async def list_episodes() -> list:
        try:
            return await VideoEpisode.get_all(order_by="created desc")
        except Exception as e:
            logger.error(f"[video-service] list_episodes error: {e}")
            raise HTTPException(status_code=500, detail="Failed to list episodes")

    @staticmethod
    async def get_episode(episode_id: str) -> VideoEpisode:
        try:
            return await VideoEpisode.get(episode_id)
        except Exception as e:
            logger.error(f"[video-service] get_episode error: {e}")
            raise HTTPException(status_code=404, detail="Episode not found")
