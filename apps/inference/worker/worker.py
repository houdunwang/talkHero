"""TalkHero JSONL worker; all heavyweight AI and media code stays outside Electron."""

from __future__ import annotations

import gc
import hashlib
import json
import os
import subprocess
import sys
import threading
from contextlib import redirect_stdout
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Callable

PROTOCOL_VERSION = "1.0"
PYTHON_VERSION = (3, 11)
if sys.version_info[:2] != PYTHON_VERSION:
    raise RuntimeError("TalkHero Worker requires managed Python 3.11")
MANAGED_ROOT = os.environ.get("TALKHERO_MANAGED_ROOT")
if not MANAGED_ROOT:
    raise RuntimeError("missing managed root")
ROOT = Path(MANAGED_ROOT).resolve()
WORKER_ROOT = Path(__file__).resolve().parent
FFMPEG = Path(os.environ.get("TALKHERO_FFMPEG", ROOT / "runtime/ffmpeg/ffmpeg.exe"))
FFPROBE = Path(os.environ.get("TALKHERO_FFPROBE", ROOT / "runtime/ffmpeg/ffprobe.exe"))
COSYVOICE_REPO = Path(
    os.environ.get("TALKHERO_COSYVOICE_REPO", ROOT / "models/cosyvoice2-0.5b/repository")
)
COSYVOICE_MODEL = Path(
    os.environ.get("TALKHERO_COSYVOICE_MODEL", ROOT / "models/cosyvoice2-0.5b/model")
)
ASR_MODELS = Path(os.environ.get("TALKHERO_ASR_MODELS", ROOT / "models/faster-whisper-small/model"))

write_lock = threading.Lock()
cancel_events: dict[str, threading.Event] = {}
executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="talkhero-gpu")
tts_model: Any = None


def send(message: dict[str, Any]) -> None:
    with write_lock:
        sys.stdout.write(json.dumps(message, ensure_ascii=False, separators=(",", ":")) + "\n")
        sys.stdout.flush()


def progress(task_id: str, value: float, stage: str) -> None:
    send({"version": PROTOCOL_VERSION, "type": "progress", "taskId": task_id, "progress": value, "stage": stage})


def ensure_managed(path_value: str) -> Path:
    path = Path(path_value).resolve()
    if ROOT == path or ROOT not in path.parents:
        raise ValueError("输出路径不在受管目录")
    return path


def ensure_input(path_value: str) -> Path:
    path = Path(path_value).resolve(strict=True)
    if not path.is_file():
        raise ValueError("输入文件无效")
    return path


def run_tool(executable: Path, arguments: list[str], cancel: threading.Event) -> subprocess.CompletedProcess[str]:
    if not executable.is_file():
        raise RuntimeError(f"受管工具不存在：{executable.name}")
    process = subprocess.Popen(
        [str(executable), *arguments],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
    )
    while process.poll() is None:
        if cancel.wait(0.1):
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
            raise InterruptedError("任务已取消")
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        summary = stderr.strip().splitlines()[-1][:300] if stderr.strip() else "工具执行失败"
        raise RuntimeError(summary)
    return subprocess.CompletedProcess(process.args, process.returncode, stdout, stderr)


def probe_media(path: Path, cancel: threading.Event) -> dict[str, Any]:
    result = run_tool(
        FFPROBE,
        ["-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        cancel,
    )
    value = json.loads(result.stdout)
    if not isinstance(value, dict) or not isinstance(value.get("streams"), list):
        raise RuntimeError("ffprobe 返回无效")
    return value


def media_duration(probe: dict[str, Any]) -> float:
    duration = probe.get("format", {}).get("duration")
    try:
        return float(duration)
    except (TypeError, ValueError) as error:
        raise RuntimeError("无法读取媒体时长") from error


def operation_health(_: str, __: dict[str, Any], ___: threading.Event) -> dict[str, str]:
    if sys.version_info[:2] != PYTHON_VERSION:
        raise RuntimeError("受管 Worker 必须使用 Python 3.11")
    import torch

    cuda = torch.cuda.is_available()
    return {
        "pythonVersion": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "cuda": "true" if cuda else "false",
        "gpuName": torch.cuda.get_device_name(0) if cuda else "",
        "vramBytes": str(torch.cuda.get_device_properties(0).total_memory if cuda else 0),
    }


def operation_voice_create(task_id: str, payload: dict[str, Any], cancel: threading.Event) -> dict[str, str]:
    source = ensure_input(str(payload.get("sourceVideo", "")))
    output_dir = ensure_managed(str(payload.get("outputDir", "")))
    output_dir.mkdir(parents=True, exist_ok=False)
    probe = probe_media(source, cancel)
    duration = media_duration(probe)
    audio_streams = [stream for stream in probe["streams"] if stream.get("codec_type") == "audio"]
    if duration < 10 or duration > 60 or len(audio_streams) != 1:
        raise ValueError("参考视频必须为 10～60 秒且包含一条音轨")
    reference = output_dir / "reference.wav"
    progress(task_id, 15, "extract-audio")
    run_tool(
        FFMPEG,
        ["-v", "error", "-y", "-i", str(source), "-vn", "-ac", "1", "-ar", "24000", str(reference)],
        cancel,
    )
    progress(task_id, 45, "transcribe")
    from faster_whisper import WhisperModel

    model = WhisperModel(str(ASR_MODELS), device="cpu", compute_type="int8")
    segments, _ = model.transcribe(str(reference), language="zh", vad_filter=True, beam_size=5)
    transcript = "".join(segment.text for segment in segments).strip()
    if not transcript:
        raise RuntimeError("未识别到有效单人语音")
    transcript_path = output_dir / "transcript.txt"
    transcript_path.write_text(transcript, encoding="utf-8")
    features = {
        "schemaVersion": 1,
        "model": "cosyvoice2-0.5b",
        "referenceSha256": hashlib.sha256(reference.read_bytes()).hexdigest(),
        "transcriptSha256": hashlib.sha256(transcript.encode("utf-8")).hexdigest(),
    }
    features_path = output_dir / "features.json"
    features_path.write_text(json.dumps(features, ensure_ascii=False), encoding="utf-8")
    progress(task_id, 100, "voice-ready")
    return {
        "referenceAudioPath": str(reference),
        "transcriptPath": str(transcript_path),
        "featuresPath": str(features_path),
    }


def load_tts() -> Any:
    global tts_model
    if tts_model is not None:
        return tts_model
    if not (COSYVOICE_REPO / "cosyvoice/cli/cosyvoice.py").is_file():
        raise RuntimeError("CosyVoice2 代码资源不完整")
    if not (COSYVOICE_MODEL / "llm.pt").is_file():
        raise RuntimeError("CosyVoice2 模型资源不完整")
    sys.path.insert(0, str(COSYVOICE_REPO / "third_party/Matcha-TTS"))
    sys.path.insert(0, str(COSYVOICE_REPO))
    sys.path.insert(0, str(WORKER_ROOT))
    with open(os.devnull, "w", encoding="utf-8") as sink, redirect_stdout(sink):
        import torch
        from cosyvoice_adapter import load_local_cosyvoice2

        tts_model = load_local_cosyvoice2(COSYVOICE_MODEL, fp16=torch.cuda.is_available())
    return tts_model


def operation_voice_synthesize(task_id: str, payload: dict[str, Any], cancel: threading.Event) -> dict[str, str]:
    reference = ensure_input(str(payload.get("referenceAudio", "")))
    output = ensure_managed(str(payload.get("outputAudio", "")))
    reference_transcript = str(payload.get("referenceTranscript", "")).strip()
    text = str(payload.get("text", "")).strip()
    speed = float(payload.get("speed", 1.0))
    emotion = str(payload.get("emotion", "natural"))
    if (
        not text
        or not reference_transcript
        or len(text) > 720
        or speed < 0.8
        or speed > 1.2
        or emotion != "natural"
    ):
        raise ValueError("文案或语速无效")
    if cancel.is_set():
        raise InterruptedError("任务已取消")
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f".{output.stem}-{task_id}.tmp.wav")
    import torch
    import torchaudio

    backend = "cuda" if torch.cuda.is_available() else "cpu"
    progress(task_id, 10, f"load-cosyvoice2-{backend}")
    model = load_tts()
    progress(task_id, 25, "synthesize")
    try:
        with open(os.devnull, "w", encoding="utf-8") as sink, redirect_stdout(sink):
            chunks = []
            for result in model.inference_zero_shot(
                text,
                reference_transcript,
                str(reference),
                speed=speed,
            ):
                if cancel.is_set():
                    raise InterruptedError("任务已取消")
                speech = result.get("tts_speech")
                if speech is None:
                    raise RuntimeError("CosyVoice2 返回无效音频")
                chunks.append(speech.detach().cpu())
            if not chunks:
                raise RuntimeError("CosyVoice2 未生成音频")
            torchaudio.save(str(temporary), torch.cat(chunks, dim=1), model.sample_rate)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    if cancel.is_set():
        temporary.unlink(missing_ok=True)
        raise InterruptedError("任务已取消")
    progress(task_id, 85, "verify-transcript")
    from faster_whisper import WhisperModel

    verifier = WhisperModel(str(ASR_MODELS), device="cpu", compute_type="int8")
    verified_segments, _ = verifier.transcribe(str(temporary), language="zh", vad_filter=True, beam_size=5)
    spoken = "".join(segment.text for segment in verified_segments)
    expected_normalized = "".join(character for character in text.lower() if character.isalnum())
    spoken_normalized = "".join(character for character in spoken.lower() if character.isalnum())
    similarity = SequenceMatcher(None, expected_normalized, spoken_normalized).ratio()
    if similarity < 0.82:
        temporary.unlink(missing_ok=True)
        raise RuntimeError("生成音频与文案一致性检查未通过")
    temporary.replace(output)
    progress(task_id, 100, "audio-ready")
    return {"outputAudioPath": str(output)}


def operation_video_inspect(task_id: str, payload: dict[str, Any], cancel: threading.Event) -> dict[str, str]:
    source = ensure_input(str(payload.get("sourceVideo", "")))
    report_path = ensure_managed(str(payload.get("reportPath", "")))
    probe = probe_media(source, cancel)
    duration = media_duration(probe)
    videos = [stream for stream in probe["streams"] if stream.get("codec_type") == "video"]
    if duration <= 0 or duration > 180 or len(videos) != 1:
        raise ValueError("A 视频损坏、超时长或视频轨无效")
    stream = videos[0]
    report = {
        "schemaVersion": 1,
        "durationSeconds": duration,
        "width": stream.get("width"),
        "height": stream.get("height"),
        "codec": stream.get("codec_name"),
        "faceAnalysis": "required",
        "usable": False,
        "reason": "人物检测与身份锁定尚未完成，禁止启动口型生成",
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False), encoding="utf-8")
    progress(task_id, 100, "media-inspected")
    return {"reportPath": str(report_path), "usable": "false"}


def operation_video_lipsync(_: str, __: dict[str, Any], ___: threading.Event) -> dict[str, str]:
    raise RuntimeError("安全人物跟踪与嘴部最小蒙版未就绪，已阻止整脸输出")


def operation_cover(task_id: str, payload: dict[str, Any], cancel: threading.Event) -> dict[str, str]:
    source = ensure_input(str(payload.get("sourceVideo", "")))
    output_dir = ensure_managed(str(payload.get("outputDir", "")))
    title = str(payload.get("title", "")).strip()
    if not title or len(title) > 60:
        raise ValueError("封面标题无效")
    probe = probe_media(source, cancel)
    duration = media_duration(probe)
    output_dir.mkdir(parents=True, exist_ok=False)
    from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageStat

    windows_root = os.environ.get("WINDIR") or os.environ.get("SystemRoot")
    font_path = Path(windows_root, "Fonts", "msyhbd.ttc") if windows_root else Path()
    if not windows_root or not font_path.is_file():
        raise RuntimeError("Windows 中文封面字体不可用")

    paths: list[str] = []
    scores: list[float] = []
    for index, ratio in enumerate((0.2, 0.5, 0.8), start=1):
        frame = output_dir / f"frame-{index}.png"
        run_tool(FFMPEG, ["-v", "error", "-y", "-ss", str(duration * ratio), "-i", str(source), "-frames:v", "1", str(frame)], cancel)
        image = Image.open(frame).convert("RGB")
        luminance = image.convert("L")
        edge_variance = ImageStat.Stat(luminance.filter(ImageFilter.FIND_EDGES)).var[0]
        brightness = ImageStat.Stat(luminance).mean[0]
        scores.append(edge_variance - abs(brightness - 128) * 0.1)
        canvas = Image.new("RGB", (1080, 1440), "#111111")
        image.thumbnail((1000, 1000))
        canvas.paste(image, ((1080 - image.width) // 2, 80))
        draw = ImageDraw.Draw(canvas)
        font = ImageFont.truetype(str(font_path), 72)
        title_lines = "\n".join(title[offset : offset + 12] for offset in range(0, len(title), 12))
        draw.multiline_text((70, 1120), title_lines, fill="#ffffff", font=font, spacing=8, stroke_width=1)
        cover = output_dir / f"cover-{index}.png"
        canvas.save(cover)
        frame.unlink(missing_ok=True)
        paths.append(str(cover))
        progress(task_id, 20 + index * 25, f"cover-{index}")
    return {
        "cover1": paths[0],
        "cover2": paths[1],
        "cover3": paths[2],
        "score1": str(scores[0]),
        "score2": str(scores[1]),
        "score3": str(scores[2]),
    }


OPERATIONS: dict[str, Callable[[str, dict[str, Any], threading.Event], dict[str, str]]] = {
    "environment.health": operation_health,
    "voice.create": operation_voice_create,
    "voice.synthesize": operation_voice_synthesize,
    "video.inspect": operation_video_inspect,
    "video.lipsync": operation_video_lipsync,
    "publish.cover": operation_cover,
}


def execute(task_id: str, operation: str, payload: dict[str, Any], cancel: threading.Event) -> None:
    try:
        handler = OPERATIONS.get(operation)
        if handler is None:
            raise ValueError("未知 Worker 操作")
        output = handler(task_id, payload, cancel)
        send({"version": PROTOCOL_VERSION, "type": "completed", "taskId": task_id, "output": output})
    except InterruptedError:
        send({"version": PROTOCOL_VERSION, "type": "failed", "taskId": task_id, "code": "cancelled", "message": "任务已取消"})
    except Exception:
        send({"version": PROTOCOL_VERSION, "type": "failed", "taskId": task_id, "code": "operation-failed", "message": "本地处理失败，请检查素材或资源状态"})
    finally:
        cancel_events.pop(task_id, None)
        gc.collect()
        try:
            import torch

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass


def main() -> None:
    if not str(ROOT) or str(ROOT) == ".":
        raise RuntimeError("缺少 TALKHERO_MANAGED_ROOT")
    send({"version": PROTOCOL_VERSION, "type": "ready"})
    for line in sys.stdin:
        try:
            request = json.loads(line)
            if request.get("version") != PROTOCOL_VERSION:
                raise ValueError("协议版本不匹配")
            task_id = request.get("taskId")
            if not isinstance(task_id, str) or not task_id:
                raise ValueError("任务 ID 无效")
            if request.get("type") == "cancel":
                event = cancel_events.get(task_id)
                if event is not None:
                    event.set()
                continue
            if request.get("type") != "run" or task_id in cancel_events:
                raise ValueError("任务请求无效或重复")
            operation = request.get("operation")
            payload = request.get("payload")
            if not isinstance(operation, str) or not isinstance(payload, dict):
                raise ValueError("任务参数无效")
            cancel = threading.Event()
            cancel_events[task_id] = cancel
            executor.submit(execute, task_id, operation, payload, cancel)
        except Exception as error:
            send({"version": PROTOCOL_VERSION, "type": "failed", "taskId": "invalid", "code": "invalid-request", "message": str(error)[:300]})


if __name__ == "__main__":
    main()
