from pathlib import Path

import pytest

from notebooke.videos import video_paths


def test_video_path_round_trip(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    root = tmp_path / "videos"
    video = root / "episode.mp4"
    video.parent.mkdir()
    video.write_bytes(b"video")
    monkeypatch.setattr(video_paths, "VIDEOS_FOLDER", str(root))

    stored = video_paths.to_relative_video_path(video)

    assert stored == "episode.mp4"
    assert video_paths.resolve_contained_video_path(stored) == video.resolve()


def test_video_paths_reject_files_outside_root(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
):
    root = tmp_path / "videos"
    root.mkdir()
    outside = tmp_path / "outside.mp4"
    outside.write_bytes(b"video")
    monkeypatch.setattr(video_paths, "VIDEOS_FOLDER", str(root))

    with pytest.raises(ValueError, match="outside the videos folder"):
        video_paths.to_relative_video_path(outside)

    assert video_paths.resolve_contained_video_path("../outside.mp4") is None
    assert video_paths.resolve_contained_video_path(str(outside)) is None
