"""Minimal offline CosyVoice2 adapter; excludes upstream download and server entry points."""

from __future__ import annotations

import os
import importlib
import logging
import sys
import types
from pathlib import Path
from typing import Any, Iterator


def _install_matcha_inference_shim() -> None:
    """Avoid Matcha's training-only Hydra/Lightning package initializer."""
    import matcha

    utils_name = "matcha.utils"
    if utils_name in sys.modules:
        return
    utils_module = types.ModuleType(utils_name)
    utils_module.__path__ = [str(Path(matcha.__file__).parent / "utils")]
    utils_module.get_pylogger = logging.getLogger
    pylogger_module = types.ModuleType(f"{utils_name}.pylogger")
    pylogger_module.get_pylogger = logging.getLogger
    sys.modules[utils_name] = utils_module
    sys.modules[f"{utils_name}.pylogger"] = pylogger_module
    matcha.utils = utils_module
    importlib.import_module(f"{utils_name}.audio")


class LocalCosyVoice2:
    """Load a fixed local CosyVoice2 model and expose only zero-shot synthesis."""

    def __init__(self, model_dir: Path, fp16: bool) -> None:
        import torch

        _install_matcha_inference_shim()
        from cosyvoice.cli.frontend import CosyVoiceFrontEnd
        from cosyvoice.cli.model import CosyVoice2Model
        from hyperpyyaml import load_hyperpyyaml
        from wetext_adapter import LocalNormalizer

        config_path = Path(__file__).with_name("cosyvoice2_inference.yaml")
        if not config_path.is_file():
            raise RuntimeError("CosyVoice2 模型配置不存在")
        with config_path.open("r", encoding="utf-8") as config_file:
            configs = load_hyperpyyaml(
                config_file,
                overrides={"qwen_pretrain_path": str(model_dir / "CosyVoice-BlankEN")},
            )
        wetext_root = model_dir / "wetext"
        required_fst = {
            language: (
                wetext_root / language / "tn" / "tagger.fst",
                wetext_root / language / "tn" / "verbalizer.fst",
            )
            for language in ("zh", "en")
        }
        if not all(path.is_file() for pair in required_fst.values() for path in pair):
            raise RuntimeError("CosyVoice2 本地 WeTextProcessing 资源不完整")
        normalizer_calls = 0

        def local_normalizer(*args: Any, **kwargs: Any) -> Any:
            nonlocal normalizer_calls
            expected = ({"remove_erhua": False}, {})
            if args or normalizer_calls >= len(expected) or kwargs != expected[normalizer_calls]:
                raise RuntimeError("CosyVoice2 WeTextProcessing 初始化契约已变化")
            language = "zh" if normalizer_calls == 0 else "en"
            normalizer_calls += 1
            tagger_path, verbalizer_path = required_fst[language]
            return LocalNormalizer(tagger_path, verbalizer_path, language)

        wetext_module = types.ModuleType("wetext")
        wetext_module.Normalizer = local_normalizer
        previous_wetext = sys.modules.get("wetext")
        sys.modules["wetext"] = wetext_module
        try:
            self.frontend = CosyVoiceFrontEnd(
                configs["get_tokenizer"],
                configs["feat_extractor"],
                str(model_dir / "campplus.onnx"),
                str(model_dir / "speech_tokenizer_v2.onnx"),
                "",
                configs["allowed_special"],
            )
        finally:
            if previous_wetext is None:
                sys.modules.pop("wetext", None)
            else:
                sys.modules["wetext"] = previous_wetext
        if normalizer_calls != 2:
            raise RuntimeError("CosyVoice2 WeTextProcessing 初始化不完整")
        if getattr(self.frontend, "text_frontend", "") != "wetext":
            raise RuntimeError("CosyVoice2 必须使用已审计的 WeTextProcessing 前端")
        if fp16 and not torch.cuda.is_available():
            raise RuntimeError("CosyVoice2 FP16 只允许在 CUDA 后端启用")
        self.sample_rate = configs["sample_rate"]
        self.model = CosyVoice2Model(configs["llm"], configs["flow"], configs["hift"], fp16)
        self.model.load(
            str(model_dir / "llm.pt"),
            str(model_dir / "flow.pt"),
            str(model_dir / "hift.pt"),
        )

    def inference_zero_shot(
        self,
        text: str,
        prompt_text: str,
        prompt_wav: str,
        speed: float,
    ) -> Iterator[dict[str, Any]]:
        normalized_prompt = self.frontend.text_normalize(
            prompt_text, split=False, text_frontend=True
        )
        for segment in self.frontend.text_normalize(text, split=True, text_frontend=True):
            model_input = self.frontend.frontend_zero_shot(
                segment,
                normalized_prompt,
                prompt_wav,
                self.sample_rate,
                "",
            )
            yield from self.model.tts(**model_input, stream=False, speed=speed)


def load_local_cosyvoice2(model_dir: Path, fp16: bool) -> LocalCosyVoice2:
    if os.environ.get("HF_HUB_OFFLINE") != "1" or os.environ.get("TRANSFORMERS_OFFLINE") != "1":
        raise RuntimeError("CosyVoice2 必须在强制离线模式运行")
    return LocalCosyVoice2(model_dir, fp16)
