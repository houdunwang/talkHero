# CosyVoice2 0.5B 固定资源审计

## 固定身份

- 模型仓库：`FunAudioLLM/CosyVoice2-0.5B`
- 模型 revision：`eec1ae6c79877dbd9379285cf8789c9e0879293d`
- 模型卡许可证：Apache-2.0
- 代码仓库：`QwenAudio/CosyVoice`
- 代码 commit：`074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc`
- Matcha-TTS submodule commit：`dd9105b34bf2be2230f4aa1e4769fb586a3c824e`
- WeTextProcessing 代码候选 commit：`039007e6b819bd40c4c4a0644f3939da1da47e44`
- WeTextProcessing FST 模型仓库：`pengzhendong/wetext`
- WeTextProcessing FST 模型 commit：`dba0737b6bc1093e108eb5bc512babf4a7e157b4`

以上身份于 2026-09-09 从官方仓库读取。CosyVoice2 最小文件和 WeTextProcessing FST 已在隔离临时目录执行探针；Python wheel、完整传递依赖、Windows CUDA/Intel XPU、获授权音色盲听与生产清单仍未闭合。

## 官方模型大文件

以下大小与 SHA-256 来自固定 revision 的 Hugging Face LFS 元数据：

| 文件 | 字节 | SHA-256 | 首版用途 |
| --- | ---: | --- | --- |
| `CosyVoice-BlankEN/model.safetensors` | 988097824 | `130282af0dfa9fe5840737cc49a0d339d06075f83c5a315c3372c9a0740d0b96` | 必需 |
| `campplus.onnx` | 28303423 | `a6ac6a63997761ae2997373e2ee1c47040854b4b759ea41ec48e4e42df0f4d73` | 必需 |
| `flow.pt` | 450575567 | `ff4c2f867674411e0a08cee702996df13fa67c1cd864c06108da88d16d088541` | 必需，受限加载待实测 |
| `hift.pt` | 83390254 | `3386cc880324d4e98e05987b99107f49e40ed925b8ecc87c1f4939432d429879` | 必需，受限加载待实测 |
| `llm.pt` | 2023316821 | `b144ef55b51ce8cfb79a73c90dbba0bdaba4e451c0ebcfab20f769264f84a608` | 必需，受限加载待实测 |
| `speech_tokenizer_v2.onnx` | 496082973 | `d43342aa12163a80bf07bffb94c9de2e120a8df2f9917cd2f642e7f4219c6f71` | 必需 |
| `speech_tokenizer_v2.batch.onnx` | 496095794 | `5b45a98572ed21e3a3ebf50201f3020567f7db40e9a57509b790b2982f5c07b7` | 默认排除；仅探针证明必要才重审 |
| `flow.decoder.estimator.fp32.onnx` | 286317026 | `cd54e4281701e6630730da64502d77b7e8b6e5c057cca65128bffb50f85cbf98` | 默认排除；TensorRT 路径不用 |
| `asset/dingding.png` | 122824 | `7f04815e2e676d31b089af6fa270135f3214f2193d5e0ad98b491d007d48f1c6` | 排除，演示素材不用 |

以下必需小文件已从同一固定 revision 下载到临时流并在本机计算 SHA-256，未写入仓库或应用资源目录：

| 文件 | 字节 | SHA-256 |
| --- | ---: | --- |
| `CosyVoice-BlankEN/config.json` | 659 | `168aa1bd401abc3bc262ba15ba4e499627a8b4e006e9d050b47c22de20660185` |
| `CosyVoice-BlankEN/generation_config.json` | 242 | `e558847a8b4402616f1273797b015104dc266fe4b520056fca88823ba8f8ebe6` |
| `CosyVoice-BlankEN/merges.txt` | 1402109 | `ac8ff86a72bee70828fbc1119bc4398c6f3a9a6e490d7b0dbe917be025478bd0` |
| `CosyVoice-BlankEN/tokenizer_config.json` | 1287 | `482bd979881423375ca5414e4e0d94cd7c5349dbb17fffd46b4d36d71e62a1bc` |
| `CosyVoice-BlankEN/vocab.json` | 2776833 | `ca10d7e9fb3ed18575dd1e277a2579c16d108e32f27439684afa0e10b1440910` |
| `config.json` | 2 | `44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a` |
| `configuration.json` | 47 | `c502b6328c67638b401df8dd05de89e9e8d1cff9cd0ada10dfbdbe13556c20de` |
| `cosyvoice2.yaml` | 7330 | `0af2c0d010c477187c39f3e8fd5f1ae2e4e6f90ad03ba37c10ed6c6a87b05959` |

WeTextProcessing 0.0.4 默认会调用 ModelScope 下载词法 FST，即使已设置 Hugging Face 离线变量也不例外。TalkHero 不采用该默认行为，受管资源包还必须包含同一固定模型 commit 的四个文件：

| 文件 | 字节 | SHA-256 |
| --- | ---: | --- |
| `wetext/en/tn/tagger.fst` | 5645674 | `245e2dc9174cdd007a8e9e50f3339773d1adbbc7535b71cf67478dc1683cc3ec` |
| `wetext/en/tn/verbalizer.fst` | 6398822 | `03155c88f317b2795969e264c19f87faf98b9853d5ac631e419bacdc3b3ee15a` |
| `wetext/zh/tn/tagger.fst` | 527178 | `cf341314c51f7ce59049f3b2c42f0ce8fd71e6d08d4d6969613aad384a5e2ae8` |
| `wetext/zh/tn/verbalizer.fst` | 1069758 | `5a13cd679dd54637d12d2bd1bd33ee2165d91c867e14468c93195af02256e5da` |

当前模型权重、tokenizer、ONNX 与四个 FST 的最小集合为 4,087,596,803 字节（约 3.807 GiB），比上游模型仓库展示的约 4.86GB 小；该数字尚未包含固定代码、Python、PyTorch、ONNX Runtime 和其他最小运行依赖，因此不是最终下载量。

## 2026-09-09 Apple Silicon CPU 技术探针

- 环境：macOS arm64、Python 3.11.16、PyTorch/torchaudio 2.3.1、ONNX Runtime 1.18.0；CosyVoice、Matcha-TTS 与模型均使用上文固定身份。
- 配置：使用项目内推理专用 YAML，排除数据集、训练、GAN 判别器、服务端、JIT/TRT/vLLM；Matcha 兼容层跳过其 `utils` 的 Hydra/Lightning 训练初始化。
- 依赖发现：官方 2023 版 `openai-whisper` 需固定兼容的 setuptools 才能构建；推理配置实际仍需 OmegaConf 2.3.0 和 Diffusers 0.29.0。上述版本只属于本次探针记录，生产前仍要形成按平台预构建 wheel、完整 hash/license/NOTICE 与可复现 lock，客户机不得现场构建。
- macOS 探针环境从上述直接依赖反推得到 69 个 Python 分发包的传递闭包；元数据未出现非商用限制，但包含 `soxr` 的 LGPL-2.1-or-later、`frozendict` 的 LGPLv3 以及 NumPy/Scipy wheel 所带本机库义务。它们允许商业使用不等于可以忽略再分发条件；正式 runtime 必须按实际 wheel 而非仅包名收集许可证、NOTICE、动态库清单和必要源码提供方式。该审计未完成前不把布尔许可门禁设为通过。
- 离线：首次探针证明 PyPI WeTextProcessing 默认路径会访问 ModelScope；改为项目内 Apache-2.0 最小 TN 适配和四个受管 FST 的显式路径后，从隔离环境卸载 `wetext`、`modelscope`、`modelscope-hub`，再以不可连接代理运行。模型加载以及中英文数字规范化均通过，没有网络下载。
- 权重加载：CPU 加载通过，第二次实测 11.82 秒，进程峰值内存约 6.06GB。
- 技术出波形：仅用 CosyVoice Apache-2.0 仓库自带演示参考音频生成“你好，欢迎使用。”，得到 24kHz 单声道 float WAV、时长 2.0 秒；包含加载的总耗时 17.98 秒，进程峰值约 6.08GB。该素材只证明通路，不作为商业音质、音色相似度或性能验收证据。

## 允许与排除边界

- 只接入 `CosyVoice2.inference_zero_shot`，输入当前音色档案的 `reference.wav` 和 `transcript.txt`。
- 文本前端必须为固定的 WeTextProcessing 派生适配和 FST；首版不安装 PyPI `wetext`/ModelScope。上游捕获导入错误后继续运行的空前端、运行时下载和用户全局缓存均不允许进入 TalkHero。
- 不安装或调用 ttsfrd、Gradio、FastAPI、Docker、训练、deepspeed、vLLM、JIT、TensorRT/TRT-LLM 或现场编译入口。
- CUDA 首版可探针 FP16；Windows Intel 与 Apple Silicon 先明确探针 CPU 音频路径。XPU/MPS 只有真实算子与盲听证明成立才切换，不做静默设备回退。
- 固定模型 revision 与 WeTextProcessing FST 的必需文件哈希已形成候选集合；代码、Python wheel、ONNX Runtime、PyTorch/torchaudio 及全部传递包仍需固定 lock、许可证和 NOTICE，完成前 `MANAGED_RESOURCE_PACKAGES` 保持为空。
