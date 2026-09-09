# MuseTalk 1.5 固定资源审计

## 固定身份与许可结论

- MuseTalk 代码仓库：`TMElyralab/MuseTalk`
- 代码 commit：`0a89dec45a0192b824e3cf4daf96c239440c5ed8`
- 代码许可：MIT
- MuseTalk 模型仓库：`TMElyralab/MuseTalk`
- 模型 revision：`3ef28bc5cff08c90ad8178a25f1b570cd800170f`
- 模型卡元数据许可：CreativeML OpenRAIL-M；代码仓库 README 同时明确训练模型可用于任何用途，包括商业用途。

CreativeML OpenRAIL-M 不是 OSI 软件许可证，但其现有文本允许免费商业使用和附条件再分发，不需要联系权利方取得额外许可。正式产品若采用该权重，必须随资源提供完整许可证，并把使用限制和下游通知义务纳入产品条款；若后续固定 revision 的实际许可文本无法随包核验，或限制与产品用途冲突，则直接淘汰 MuseTalk，不走单独授权路线。

## 首版最小生成资源

| 资源 | 固定 revision | 文件 | 字节 | SHA-256 | 许可 |
| --- | --- | --- | ---: | --- | --- |
| MuseTalk 1.5 | `3ef28bc5cff08c90ad8178a25f1b570cd800170f` | `musetalkV15/musetalk.json` | 748 | `5b6923aee04d71692e0e9846c471e0a4ea07a4f686d39545e472bd4ba17e1b47` | CreativeML OpenRAIL-M / 官方商业用途声明 |
| MuseTalk 1.5 | 同上 | `musetalkV15/unet.pth` | 3400074924 | `7ebf6c98c181e20838e4c0054e96e944ac60d5d692cc01db42839fe11b787007` | 同上；受限加载通过 |
| SD VAE FT-MSE | `31f26fdeee1355a5c34592e401dd41e45d25a493` | `config.json` | 547 | `92d3dfb746fca211a2c9e019e285f8597412211728dce3c5bcf4eda0f2d62e7e` | MIT |
| SD VAE FT-MSE | 同上 | `diffusion_pytorch_model.safetensors` | 334643276 | `a1d993488569e928462932c8c38a0760b874d166399b14414135bd9c42df5815` | MIT |
| Whisper tiny | `169d4a4341b33bc18d8881c4b69c2e104e1cc0af` | `model.safetensors` | 151061672 | `7ebd0e69e78190ffe1438491fa05cc1f5c1aa3a4c4db3bc1723adbb551ea2395` | Apache-2.0 模型卡；代码为 MIT |
| OpenCV YuNet | `47534e27c9851bb1128ccc0102f1145e27f23f98` | `face_detection_yunet_2023mar.onnx` | 232589 | `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4` | 模型目录 MIT |

Whisper tiny 还需同 revision 的 tokenizer、预处理和生成配置小文件；其逐文件哈希已在本机临时流复算，正式资源清单形成时一并写入。上述大文件合计约 3.886GB（约 3.62GiB），不含 Python、OpenCV、FFmpeg、字体与中间空间。

## 2026-09-09 Apple Silicon CPU 技术探针

- 固定 revision 的 MuseTalk UNet、VAE safetensors 和 Whisper safetensors 均已下载并复算 SHA-256，与上表及 Hugging Face LFS 元数据一致。
- `unet.pth` 在 PyTorch 2.3.1 以 `weights_only=True` 成功读取；结果为 686 项 `OrderedDict`，每项均为 Tensor。随后以 strict 模式装入 849947844 参数的固定 UNet，加载约 8.85 秒，进程峰值约 7.10GB。
- SD VAE 与 Whisper tiny 均以 `local_files_only=True`、safetensors 和不可连接代理加载；一次 256×256 VAE encode/decode 及一秒静音 Whisper encoder 前向通过，合计约 8.25 秒，峰值约 4.25GB。未安装 Accelerate，证明它不是该通路必需项。
- MuseTalk UNet 使用 1×8×32×32 latent、timestep 0 和 1×50×384 音频条件执行一次 CPU 前向，输出 1×4×32×32 且全部为有限值；含模型加载总计约 8.69 秒，峰值约 7.28GB。
- 上游固定的 PyTorch 2.3.1 在 MPS FP16 可得到有限输出，但热身后 batch 1 的 UNet 仍约 0.83 秒/帧，batch 4 约 1.25 秒/帧，不能作为 Mac 商业交付运行时。
- 独立 PyTorch 2.14.0 环境在 `PYTORCH_ENABLE_MPS_FALLBACK=0` 下通过同一权重与 FP16 前向；热身后 UNet batch 1 约 0.11～0.13 秒/帧。两次 VAE encode + UNet + VAE decode 的完整 256×256 核心链约 0.384 秒/帧，batch 8 约 0.374 秒/帧，没有显著批处理收益。按 25fps、3 分钟机械外推约 28～29 分钟，尚未包含检测、融合与编码，也未扣除预编码 latent 缓存收益；该外推不是产品承诺。
- 结论：Mac 运行时必须使用通过审计的新版平台专用 PyTorch，不得照搬上游 2.3.1。MPS 关键算子已成立，但完整 3 分钟流水线、数值/画质对比、温度/内存与可接受耗时仍未关闭；CPU 结果仍只作为安全加载证据，不开放 CPU 视频。

## 明确排除

- `latentsync_syncnet.pt` 只用于训练/评分，不进入生成运行包。
- S3FD、`face-alignment`、BiSeNet face parsing、ResNet18 和 DWPose 不进入首版候选运行包。前两组权重许可链不够清晰，官方融合区域也大于嘴部最小邻域；DWPose/mmpose 对本方案不是必需，并显著扩大三平台依赖。
- TensorFlow、TensorBoard、Accelerate、Gradio、gdown、MoviePy、imageio-ffmpeg、ffmpeg-python 与上游下载脚本不进入推理运行包。
- 不运行上游 `scripts/inference.py`：其动态 PATH、`os.system`、pickle 坐标缓存、异常后继续和整脸/下半脸融合不满足 TalkHero 的路径、恢复、身份和嘴部最小修改契约。
- 不使用官方互联网 testdata 作商业验收或发行素材。

## YuNet 主体锁定候选

YuNet 输出人脸框、双眼、鼻尖、两个嘴角与置信度。TalkHero 候选实现以用户确认的初始主体为唯一轨迹，只按人脸框 IoU、中心运动、尺度变化和五点几何连续性匹配后续检测；候选交叉、遮挡、低置信、过大侧脸或轨迹中断时保留原帧并标记失败，不做无依据的重新识别。嘴部蒙版由两个嘴角与受约束的下脸几何构成，经小范围羽化后还须通过嘴部区域面积门禁。

在上游非商业测试视频上进行的技术探针中，固定 YuNet 模型在 576×768 的连续 100 帧上检测 100 次，总计 1.25 秒，约 80fps；首、中、末帧均得到单人框和 5 点。该结果仅证明 macOS CPU 检测通路和速度，不证明多人交叉、走动、遮挡、身份稳定或商业样片质量。

## 尚未关闭

- MuseTalk 模型许可证全文随资源分发和产品使用限制展示方式。
- `unet.pth` 的权重键白名单需要在正式适配器固定；当前已证明受限加载和 strict 装载通过。
- VAE/Whisper 已通过 macOS CPU 的 `local_files_only`、离线网络阻断和关键算子；CUDA/XPU/MPS 仍待实际后端验证。
- YuNet 主体轨迹、嘴部蒙版、失败片段和只改嘴部差分的自动化与获授权走动样片验收。
- Windows RTX 4060、Intel Arc B390 与 Apple Silicon MPS 的完整流水线性能、内存和结果对比；MPS 单算子已通过，但尚未达到完整视频验收。
- Python/OpenCV/FFmpeg/字体的实际平台发行物、逐文件 hash、SBOM、许可证与 NOTICE。
