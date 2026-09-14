# Fixes & Maintenance Scripts

Thư mục này chứa các script dùng để sửa lỗi (fix data, models, fonts) và đồng bộ cấu hình trong cơ sở dữ liệu NotebookE.

## Danh sách scripts

| Script | Mục đích | Cách chạy |
| --- | --- | --- |
| `fix_all_models.py` | Cập nhật cấu hình mô hình mặc định trong DB (Groq, Deepgram, LLM/TTS) | `uv run python fixes/fix_all_models.py` |
| `fix_db.py` | Sửa trực tiếp tên các model trong bảng `model` (ví dụ cập nhật các model Gemini) | `uv run python fixes/fix_db.py` |
| `fix_fonts.py` | Quét và chuẩn hóa font tiếng Việt / hệ thống cho các template HTML render video | `uv run python fixes/fix_fonts.py` |
| `fix_models_test.py` | Cập nhật gán model cho `episode_profile`, `speaker_profile` và `speaker` | `uv run python fixes/fix_models_test.py` |
| `fix_profiles.py` | Cập nhật model ID cho các hồ sơ tập (episode) và hồ sơ người nói (speaker) | `uv run python fixes/fix_profiles.py` |
