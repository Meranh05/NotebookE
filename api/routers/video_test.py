"""
Video Test Router — isolated proof-of-concept for Google Veo video generation.

Correct API (from official docs at ai.google.dev/gemini-api/docs/veo):
  POST  https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning
  GET   https://generativelanguage.googleapis.com/v1beta/{operation_name}
  GET   {video_uri}  (with x-goog-api-key header)

Model names (Gemini Developer API):
  veo-2.0-generate-001          — GA, silent video (no audio), 5-8s
  veo-3.1-generate-preview      — Preview, video+audio (requires allowlist)
  veo-3.1-fast-generate-preview — Preview, video+audio fast (requires allowlist)

Response structure when done=true:
  .response.generateVideoResponse.generatedSamples[0].video.uri   → download URL
  .response.generateVideoResponse.generatedSamples[0].video.encoding

Remove this file + the include_router line in api/main.py to leave zero trace.
"""

from __future__ import annotations

import base64
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel

from notebooke.database.repository import repo_query

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory store: op_id → video_uri (the Google Files URI to stream from)
# ---------------------------------------------------------------------------
_URI_CACHE: dict[str, str] = {}

VEO_BASE = "https://generativelanguage.googleapis.com/v1beta"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_google_api_key() -> str:
    """
    Return a decrypted Google API key from NotebookE's credential table.
    Falls back to GOOGLE_API_KEY / GEMINI_API_KEY env vars.
    """
    try:
        from notebooke.utils.encryption import decrypt_value

        rows = await repo_query(
            "SELECT * FROM credential WHERE provider = 'google' LIMIT 10"
        )
        for row in rows:
            encrypted_key = row.get("api_key")
            if not encrypted_key:
                continue
            try:
                key = decrypt_value(str(encrypted_key))
                if key and key.strip():
                    logger.info(
                        f"[video-test] Using Google credential: {row.get('name', 'unnamed')}"
                    )
                    return key.strip()
            except Exception as e:
                logger.debug(f"[video-test] Skipping credential (decrypt failed): {e}")
    except Exception as e:
        logger.warning(f"[video-test] Could not query credentials: {e}")

    env_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if env_key:
        return env_key.strip()

    raise HTTPException(
        status_code=422,
        detail=(
            "No Google API key found. "
            "Add a Google credential in Settings → Models → Credentials."
        ),
    )


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class VideoGenerateRequest(BaseModel):
    prompt: str
    duration_seconds: int = 8          # Veo 3.x: 4 | 6 | 8
    aspect_ratio: str = "16:9"         # "16:9" | "9:16"
    model: str = "veo-3.1-generate-preview"  # Available: veo-3.1-generate-preview, veo-3.1-fast-generate-preview, veo-3.1-lite-generate-preview


class VideoGenerateResponse(BaseModel):
    operation_id: str
    status: str
    message: str


class VideoStatusResponse(BaseModel):
    operation_id: str
    done: bool
    status: str          # "pending" | "completed" | "failed"
    error: Optional[str] = None
    has_video: bool = False


class CredentialInfo(BaseModel):
    id: str
    name: str
    provider: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/video-test/credentials", response_model=list[CredentialInfo])
async def list_video_credentials():
    """List Google credentials available (for the UI dropdown)."""
    try:
        rows = await repo_query(
            "SELECT id, name, provider FROM credential WHERE provider = 'google'"
        )
        return [
            CredentialInfo(
                id=str(row.get("id", "")),
                name=row.get("name", "unnamed"),
                provider=row.get("provider", "google"),
            )
            for row in rows
        ]
    except Exception as e:
        logger.warning(f"[video-test] Could not list credentials: {e}")
        return []


@router.post("/video-test/generate", response_model=VideoGenerateResponse)
async def generate_video(request: VideoGenerateRequest):
    """
    Submit a Veo long-running video generation job.
    Returns an operation_id to poll with GET /video-test/status/{op_id}.
    """
    api_key = await _get_google_api_key()

    url = f"{VEO_BASE}/models/{request.model}:predictLongRunning"
    payload: dict = {
        "instances": [{"prompt": request.prompt}],
        "parameters": {
            "aspectRatio": request.aspect_ratio,
            "durationSeconds": request.duration_seconds,
        },
    }

    logger.info(f"[video-test] Calling Veo: POST {url}")
    logger.info(f"[video-test] Payload: {payload}")

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            url,
            json=payload,
            headers={
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            },
        )

    if resp.status_code != 200:
        body = resp.text[:800]
        logger.error(f"[video-test] Veo generate failed {resp.status_code}: {body}")
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Veo API error: {body}",
        )

    data = resp.json()
    operation_name: str = data.get("name", "")
    if not operation_name:
        raise HTTPException(
            status_code=500,
            detail=f"Veo returned no operation name. Response: {data}",
        )

    logger.info(f"[video-test] Operation started: {operation_name}")

    # URL-safe encode operation name for use in GET paths
    op_id = base64.urlsafe_b64encode(operation_name.encode()).decode()

    return VideoGenerateResponse(
        operation_id=op_id,
        status="pending",
        message=f"Generation started with '{request.model}'. Poll /api/video-test/status/{op_id}",
    )


@router.get("/video-test/status/{op_id}", response_model=VideoStatusResponse)
async def get_video_status(op_id: str):
    """Poll the status of a Veo generation job."""
    # Already completed and URI cached?
    if op_id in _URI_CACHE:
        return VideoStatusResponse(
            operation_id=op_id,
            done=True,
            status="completed",
            has_video=True,
        )

    try:
        operation_name = base64.urlsafe_b64decode(op_id.encode()).decode()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid operation_id")

    api_key = await _get_google_api_key()

    poll_url = f"{VEO_BASE}/{operation_name}"
    logger.debug(f"[video-test] Polling: GET {poll_url}")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            poll_url,
            headers={"x-goog-api-key": api_key},
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Veo poll error: {resp.text[:400]}",
        )

    data = resp.json()
    done: bool = data.get("done", False)
    error_info = data.get("error")

    if error_info:
        return VideoStatusResponse(
            operation_id=op_id,
            done=True,
            status="failed",
            error=error_info.get("message", str(error_info)),
        )

    if not done:
        return VideoStatusResponse(
            operation_id=op_id,
            done=False,
            status="pending",
        )

    # done=True — extract the video URI
    # Official response path (from docs REST example):
    # .response.generateVideoResponse.generatedSamples[0].video.uri
    try:
        samples = (
            data.get("response", {})
            .get("generateVideoResponse", {})
            .get("generatedSamples", [])
        )
        if not samples:
            raise ValueError("No generatedSamples in response")

        video_uri: str = samples[0]["video"]["uri"]
        if not video_uri:
            raise ValueError("Empty video URI")

        _URI_CACHE[op_id] = video_uri
        logger.info(f"[video-test] Video ready, URI cached for op_id={op_id}")

        return VideoStatusResponse(
            operation_id=op_id,
            done=True,
            status="completed",
            has_video=True,
        )

    except (KeyError, IndexError, ValueError) as e:
        logger.warning(
            f"[video-test] Operation done but could not extract URI: {e}. "
            f"Response keys: {list(data.get('response', {}).keys())}"
        )
        return VideoStatusResponse(
            operation_id=op_id,
            done=True,
            status="failed",
            error=(
                f"Operation completed but no video URI found ({e}). "
                "Veo access may not be enabled for this API key, or the model "
                "requires allowlist approval."
            ),
        )


@router.get("/video-test/download/{op_id}")
async def download_video(op_id: str):
    """
    Stream the finished video from Google's Files service.
    Google returns a URI like:
      https://generativelanguage.googleapis.com/v1beta/files/xxx
    which requires the x-goog-api-key header to download.
    """
    video_uri = _URI_CACHE.get(op_id)
    if not video_uri:
        raise HTTPException(
            status_code=404,
            detail="Video not ready yet. Poll /api/video-test/status/{op_id} first.",
        )

    api_key = await _get_google_api_key()

    # Stream from Google → response
    async def _stream():
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            async with client.stream(
                "GET",
                video_uri,
                headers={"x-goog-api-key": api_key},
            ) as r:
                r.raise_for_status()
                async for chunk in r.aiter_bytes(chunk_size=65536):
                    yield chunk

    return StreamingResponse(
        _stream(),
        media_type="video/mp4",
        headers={"Content-Disposition": "attachment; filename=veo-output.mp4"},
    )
