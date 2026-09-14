"""Validated read and write paths for generated video files."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional, Union

from notebooke.videos.pixelle_bridge import VIDEOS_FOLDER


def videos_root() -> Path:
    return Path(os.path.realpath(VIDEOS_FOLDER))


def to_relative_video_path(video_path: Union[str, Path]) -> str:
    resolved = Path(os.path.realpath(video_path))
    root = videos_root()
    if resolved == root or not resolved.is_relative_to(root):
        raise ValueError(
            f"Generated video file path is outside the videos folder: {video_path}"
        )
    return resolved.relative_to(root).as_posix()


def resolve_contained_video_path(video_file: Optional[str]) -> Optional[Path]:
    if not video_file or "://" in video_file:
        return None
    candidate = Path(video_file)
    if candidate.is_absolute():
        return None
    root = videos_root()
    resolved = Path(os.path.realpath(root / candidate))
    if resolved == root or not resolved.is_relative_to(root):
        return None
    return resolved
