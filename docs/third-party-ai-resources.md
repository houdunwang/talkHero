# 第三方 AI 与媒体资源交付门禁

## 文档目的

本文记录 TalkHero 商业客户端所需模型、权重、运行时、媒体工具、字体和浏览器资源的许可与技术可行性证据。它不是法律意见，也不把“官方仓库可下载”解释为“已允许本项目向客户再分发”。正式资源清单必须进一步固定每个文件的来源、不可变版本、大小、SHA-256、许可证文本和 NOTICE 要求。

当前结论（2026-09-09）：**IndexTTS 2.5 已淘汰，CosyVoice2 0.5B 已获批为默认 TTS；阶段 0 尚未通过，生产资源清单继续保持关闭。** 项目不再采用“联系权利方、等待额外授权”的交付路线；任何必需资源只有在现有许可证文本直接允许商业使用及本产品所需分发方式时才可进入正式清单。

## 初步资源清单

| 资源 | 计划用途 | 官方许可/声明 | 当前判断 | 进入正式清单前必须完成 |
| --- | --- | --- | --- | --- |
| CosyVoice2 0.5B 代码、权重与最小推理链 | 音色与文案语音 | 主代码与官方模型卡为 Apache-2.0；必需 Matcha-TTS 为 MIT；WeTextProcessing 为 Apache-2.0 | 已批准为默认 TTS，尚未完成传递审计与真机验证 | 固定源码/模型 revision、约 4.86GB 逐文件清单、SHA-256、NOTICE 和最小 lock；排除 ttsfrd、vLLM、TensorRT、训练/服务端与未审计可选组件；完成 CUDA、XPU/MPS 或明确 CPU 音频路径的盲听与性能探针 |
| IndexTTS 2.5 及辅助模型 | 已撤销的音色/TTS 方案 | 主项目为自定义许可；实际必需 MaskGCT semantic codec 所在仓库标注 CC-BY-NC-4.0 | **已淘汰，不进入生产清单** | 仅保留审计记录；不发送商业授权邮件、不等待回复、不再作为 fallback |
| MuseTalk 1.5 代码与主模型 | 局部口型生成 | 代码 MIT；模型卡元数据为 CreativeML OpenRAIL-M，官方 README 明确模型可商用 | 现有文本允许免费商业使用和附条件再分发，完整义务与运行链未完成 | 固定代码/权重 revision；随包提供模型许可证与使用限制；继续审计实际辅助权重与运行依赖 |
| MuseTalk 辅助模型 | VAE、Whisper、DWPose、SyncNet、face parsing、face alignment、S3FD 等 | VAE 为 MIT、Whisper 与 DWPose 模型卡为 Apache-2.0、LatentSync SyncNet 为 OpenRAIL++；S3FD 和 Google Drive face-parsing 权重缺少可随文件核验的清晰许可链 | 未完成 | 逐项固定原始来源与条款；S3FD/face-parsing 权重未关闭前不得进入商业资源包；OpenRAIL++ 条款须随产品使用场景复核；不得使用官方互联网 testdata 作商业样片 |
| faster-whisper 与 Whisper 模型 | B 视频转写、音频内容复验、字幕时间锚点 | faster-whisper、CTranslate2、OpenAI Whisper 官方代码均为 MIT | 代码许可方向可接受，发行物未锁定 | 固定代码/模型 revision、NOTICE、大小和 SHA-256；核对转换模型来源；验证离线运行及三平台后端 |
| PyTorch 与平台运行时 | CUDA、XPU、MPS 推理 | PyTorch 主项目为 BSD 风格许可并包含多方版权声明 | 主体许可方向可接受，发行包未审计 | 三套互斥 lock/SBOM 和发行包第三方 notices；不得在客户机执行 pip；验证 CUDA/XPU/MPS 实际算子和安全权重加载 |
| FFmpeg/ffprobe + libass | 探测、合成、H.264/AAC、字幕烧录 | FFmpeg 默认 LGPL-2.1-or-later，启用部分组件后整体变为 GPL；libass 为 ISC | 必须控制构建配置 | 优先评估不含 GPL `libx264` 的 LGPL 兼容构建，使用系统硬件 H.264 编码器；记录 configure flags、源码对应物、NOTICE 与专利风险评估 |
| 中日韩字幕字体 | 双平台一致字幕 | Noto Sans CJK 使用 SIL OFL 1.1，允许随软件嵌入和再分发并要求附带版权/许可 | 候选可接受，发行物未锁定 | 固定上游 release/revision 的未修改简体中文 Regular OTF、保存许可与 SHA-256，并验证中文/英文/数字缺字和 libass 渲染 |
| Playwright/Chromium | 受管平台发布浏览器 | Playwright 使用 Apache-2.0 并包含第三方声明；Chromium 另有大量第三方许可 | 主体许可方向可接受，浏览器包未审计 | 固定浏览器 revision；生成 Chromium third-party notices；确认下载、更新、签名和体积边界 |
| 受管 Python 3.11 | 独立 Worker | Python 及捆绑组件许可 | 未完成 | 固定三平台发行物、来源、大小、SHA-256、许可目录和签名/公证后启动证据 |

## 已核实的关键事实

### 已淘汰：IndexTTS 2.5

- 官方模型卡要求 Python 3.10～3.11、NVIDIA GPU，并给出约 6GB 显存的推理要求；没有给出 XPU 或 MPS 的生产支持声明。
- 官方模型卡说明部分辅助模型会在首次运行时另行下载。这种行为不符合 TalkHero 的不可变资源要求，必须改为预先审计、固定并由受管清单下载。
- 自定义许可授予有限的全球、非独占、不可转让、免版税使用许可，同时规定规模门槛、下游接收者义务、许可副本/版权保留和第三方权重责任。官方仓库另行建议商业使用联系 `indexspeech@bilibili.com`。
- 因此，本项目不能只根据“免版税”得出已可商业再分发的结论。按当前产品规则，凡是需要另行询问或等待授权的方案直接淘汰，而不是继续作为阶段门禁。

#### 固定源码审计

本次审计固定 IndexTTS 官方源码提交 `ee40fa7d6c6b8a2c7f06105f9f1e65775b74868c`，没有执行或下载模型。该提交不能原样用于商业客户端：

- `indextts/utils/model_download.py` 在资源缺失时从 Hugging Face/ModelScope 下载 `facebook/w2v-bert-2.0`、`amphion/MaskGCT` 的 `semantic_codec/model.safetensors`、`funasr/campplus` 的 `campplus_cn_common.bin` 以及 `nvidia/bigvgan_v2_22khz_80band_256x`，且默认没有固定 revision，部分地址直接使用 `resolve/main`。
- 上游会搜索或迁移用户默认 Hugging Face 缓存。TalkHero 不得读取或改写用户个人模型缓存；Worker 只能访问应用受管资源目录，缺文件时应在启动探针阶段明确失败。
- IndexTTS 2.5 主仓库本身包含 `codec.pth`、`gpt.pth`、`s2mel.pth`、`feat*.pt` 与统计量等 pickle 容器，W2V 统计量、CAMPPlus、情绪/说话人矩阵和 BigVGAN 等调用点没有显式写出 `weights_only=True`。上游固定的 PyTorch 2.8 已从 2.6 起默认采用受限加载，因此这不是“已确认会执行任意代码”，但安全性不应依赖隐含默认值。Worker 必须强制 `TORCH_FORCE_WEIGHTS_ONLY_LOAD=1` 或显式受限加载，并逐文件验证兼容；优先选 `safetensors`，任何需要 `weights_only=False` 的文件都继续阻断。
- BigVGAN 的可选 CUDA kernel 会在首次使用时调用 `nvcc`/`ninja` 编译。客户机不得运行这种临时编译；首版默认关闭 `use_cuda_kernel`。如性能目标因此不达标，只能评估经过审计、签名和平台测试的预编译产物，不能静默恢复现场编译。
- `QwenEmotion` 从本地目录调用 Transformers 的 `from_pretrained`；适配器仍须显式启用离线/本地文件模式并禁止 remote code，不能只依赖传入路径是本地目录。

更严重的是，IndexTTS 运行所需 `amphion/MaskGCT` 仓库明确标注 CC-BY-NC-4.0，而 TalkHero 是收费商业产品。IndexTTS 自身许可并未自动消除第三方权重限制；这一项单独足以淘汰该方案。TalkHero 不再寻求独立商业授权，也不以替换其中一个 codec 的方式继续承担整条自定义依赖链风险。

### 默认替代候选：CosyVoice2 0.5B

- 官方 CosyVoice 代码仓库采用 Apache-2.0；官方 `FunAudioLLM/CosyVoice2-0.5B` 模型卡直接标注 Apache-2.0。许可判断以这些现存文本为依据，不依赖 GitHub issue 回复或另行邮件。
- 官方源码的必需 `third_party/Matcha-TTS` 子模块采用 MIT；文本规范化使用 Apache-2.0 的 WeTextProcessing 派生最小适配与固定 FST，不安装其会默认下载资源的 PyPI/ModelScope 链。Linux 专用且许可/分发边界未闭合的 `ttsfrd` 不是必需项，首版明确排除。
- 官方完整模型仓库约 4.86GB；排除批量 tokenizer、TensorRT flow 和演示素材后的当前最小模型文件候选为 4,073,955,371 字节（约 3.794 GiB），包含 `llm.pt`、`flow.pt`、`hift.pt`、单路 ONNX speech tokenizer/CAMPPlus 和 BlankEN。上游核心加载点已显式使用 `weights_only=True`，但仍须验证每个 pickle 容器只含允许的张量类型；能安全转换且结果一致的权重优先转换为 safetensors。
- 正式包不包含 Gradio/FastAPI、训练、Docker、vLLM、TensorRT/TRT-LLM、deepspeed 或现场编译工具，只提取零样本音色所需的最小离线推理链。客户机不得运行 `pip install`、模型仓库下载器或 Git 子模块命令。
- 上游当前设备选择只直接覆盖 CUDA/CPU，并包含 CUDA stream/autocast 分支；不能宣称原样支持 XPU/MPS。阶段 0 先适配显式 device abstraction；若 XPU/MPS 仍不成立，可在 UI 清楚标识后采用经盲听证明质量等价的 CPU 音频路径。该保底只增加音频等待，不允许扩展到 MuseTalk 视频。
- CosyVoice2 是质量优先选择，不因许可证清楚就假定自然度、音色相似度、数字/多音字读法、三分钟长文分段或各平台性能已经合格；必须使用同一组获授权样本做盲听、内容复验和耗时记录。首版默认只开放自然语音，额外语气需单独通过固定版本质量门禁。
- 已固定的官方模型 revision、代码/submodule commit、WeTextProcessing FST commit 与逐文件 SHA-256 见 [CosyVoice2 资源审计](resource-audits/cosyvoice2-0.5b.md)。Apple Silicon CPU 已完成离线加载和短句技术出波形，但获授权音色盲听、Python wheel/传递依赖及 Windows 后端尚未闭合，因此生产资源目录仍为空。

### MuseTalk 1.5

- 官方 README 声明 MuseTalk 代码使用 MIT，训练模型允许商业用途；同时明确所有其他开源模型仍需分别遵守各自许可证，官方互联网 testdata 仅供非商业研究。
- 官方公开性能是 NVIDIA Tesla V100 上 30fps+；Gradio 路径另给出 RTX 3050 Ti 4GB 生成 8 秒约需 5 分钟的结果。两者不是同一流水线，不能据此推断 RTX 4060、Arc B390 或 Apple Silicon 的三分钟耗时。
- 官方还明确列出身份细节保持不足与单帧流水线抖动限制。TalkHero 必须使用自己的主体锁定、时序门禁、嘴部最小蒙版和失败帧回退，不能直接把官方默认输出当作商业质量闭环。

#### 固定源码审计

本次审计固定 MuseTalk 官方源码提交 `0a89dec45a0192b824e3cf4daf96c239440c5ed8`，没有执行或下载模型。该提交同样只能作为算法参考，不能原样嵌入 Worker：

- 官方下载脚本从 Hugging Face 的可变分支、Google Drive 和独立 URL 拼装 MuseTalk 1.5、SD VAE、Whisper、DWPose、LatentSync SyncNet、BiSeNet face parsing、ResNet18 与 S3FD；没有形成逐文件不可变 revision、大小和 SHA-256 清单。
- SFD 检测器在本地权重缺失时会从 `adrianbulat.com` 自动下载；Whisper 代码也保留 URL 下载路径。TalkHero 必须删除所有运行时下载分支，由资源安装器统一管理并在加载前校验。
- UNet、S3FD、face parsing、Whisper 与实时缓存等路径使用未显式写出 `weights_only=True` 的 `torch.load`；正式运行时必须固定在 PyTorch 2.6+ 并强制受限加载，或改用安全格式，且缓存文件也只能从应用受管目录读取。任何只能用 `weights_only=False` 才能载入的权重不得进入清单。
- 官方推理脚本使用 `os.system` 拼接 FFmpeg 命令。TalkHero 不复用该入口，必须以参数数组调用固定的受管 FFmpeg，并单独校验所有输入输出路径。
- 可优先选择 SD VAE 和 Whisper 已发布的 `safetensors` 文件，避免下载脚本默认选择的 pickle `.bin`；MuseTalk 1.5 UNet、SyncNet、DWPose、face parsing 与 S3FD 若没有安全等价文件，则需验证受限加载或在发布前转换并做输出一致性测试。

MuseTalk 主模型“允许商业使用”不等于整条流水线已经可商用。当前至少 S3FD、BiSeNet 权重来源/许可链以及 OpenRAIL++ SyncNet 的产品义务仍需关闭。

#### 首版运行资源收缩建议

固定源码显示 `latentsync_syncnet.pt` 只出现在训练/评分路径，不是 MuseTalk 1.5 生成必需资源；因此首版生产生成包不应默认携带它。若后续选它作为质量评分器，须先单独定义评分行为、关闭 OpenRAIL++ 义务并验证三平台，再加入清单。

S3FD 与 BiSeNet 是官方预处理/融合的依赖，但其许可链不清晰，且官方 BiSeNet 蒙版覆盖范围大于本 Spec 的“嘴部最小邻域”。当前更小的首选探针方案是使用模型目录明确采用 MIT 的 OpenCV YuNet：它同时输出人脸框、双眼、鼻尖和两个嘴角，可建立用户确认的唯一主体轨迹及保守嘴部蒙版；候选交叉、遮挡或几何连续性不足时保留原帧，不做不可靠重识别。该方案同时排除 S3FD、BiSeNet、SFace 和 DWPose/mmpose 运行链，详见 [MuseTalk 1.5 资源审计](resource-audits/musetalk-1.5.md)。只有同一获授权走动样片证明身份、融合和失败门禁成立才可进入生产；否则选择另一项许可证明确的检测/关键点实现，找不到时停止 MuseTalk 商业交付，不走额外授权路线。

## 三后端可行性状态

| 后端 | 当前官方证据 | 当前本项目证据 | 阶段 0 状态 |
| --- | --- | --- | --- |
| Windows NVIDIA CUDA | CosyVoice2 与 MuseTalk 上游均主要面向 NVIDIA；MuseTalk 有 V100/3050 Ti 数据 | 已有 Y9000P RTX 4060 8GB 可供后续实测，但本 worktree 尚无该机器日志 | 等待固定资源与授权样片后探针 |
| Windows Intel Arc B390 XPU | PyTorch 提供 XPU 能力，但两个模型官方均未声明完整兼容；CosyVoice2 可另测 CPU 音频 | 无 388H/358H 32GB 真机、无关键算子结果 | 视频阻断正式支持；TTS 可先验证明确 CPU 路径 |
| macOS Apple Silicon MPS | PyTorch 提供 MPS 能力，但两个模型官方均未声明完整兼容；CosyVoice2 可另测 CPU 音频 | M1 Pro 16GB 已完成 Python 3.11、CosyVoice2 CPU 及 MuseTalk UNet/VAE/Whisper 的 MPS FP16 关键算子；PyTorch 2.14.0 核心链机械外推仍约 28～29 分钟/3 分钟视频 | 完整流水线、画质、温度/内存和获授权样片未通过前保持候选，不宣传固定耗时 |

框架能够识别 XPU/MPS 只证明设备后端存在，不能证明 CosyVoice2、MuseTalk、VAE、音频编码器、人物检测和全部融合算子可用，也不能证明性能和画质达标。

PyTorch 当前官方文档已经把 Windows 11 上的 Core Ultra Mobile Series 3（Panther Lake）列为 Intel XPU 验证硬件，并声明 XPU 支持推理、FP16/BF16 和 Windows `torch.compile`。这使 Arc B390 方案具备继续探针的框架基础，但仍不能代替 388H/358H 真机上的模型级验证。MPS 官方文档同样只证明 PyTorch 能把 Tensor/Module 放到 Apple GPU，不保证本项目所有算子存在或不会回落 CPU。

## Electron 支持版本结论

- 当前项目 Electron `39.2.6` 已于 2026-05-05 结束上游支持，不适合作为商业首发基线。
- 截至 2026-09-09，最新稳定线是 Electron 44，最新补丁为 `44.2.0`；官方计划支持至 2027-03-02。阶段 1 的升级候选固定为 `44.2.0`，但仍须经过依赖兼容、窗口/IPC/媒体协议、Windows/macOS 打包与真实启动回归后才能确认。
- Electron 45 仍处于预发布阶段，不作为首版候选。Electron 的版本只影响桌面壳、安全更新与兼容性，不改变模型输出画质；AI 结果仍由独立 Worker、固定模型和媒体合成规则决定。

## 媒体与字幕资源建议

- 字幕字体首选未修改的 Noto Sans CJK SC Regular OTF。它覆盖简体中文、日文、韩文、拉丁字母与常用符号，SIL OFL 1.1 允许随软件嵌入/再分发；资源包必须同时附带版权和完整许可文本。正式文件仍需固定 release/revision、大小和 SHA-256。
- FFmpeg 首版不启用 `libx264`，避免把受管二进制整体切换到 GPL。目标机本来均具备硬件 H.264 路线：NVIDIA 使用 `h264_nvenc`，Arc 使用 `h264_qsv`，Apple Silicon 使用 `h264_videotoolbox`。资源探针必须实际编码短片并验证 MP4/H.264/AAC、像素格式、色彩元数据和播放器兼容；编码器不可用时明确报错，不静默换成未经审计的软件编码器。
- “使用硬件编码器”只缩短合成阶段，不会改变 MuseTalk 推理帧本身；但不同编码器的码控可能影响肉眼画质，因此三平台应按同一视觉目标分别固定质量参数，而不是强求完全相同的码率参数。

## TTS 方案决策（已批准）

| 候选 | 当前许可证据 | 产品判断 |
| --- | --- | --- |
| CosyVoice2 0.5B | 官方代码与模型卡均标注 Apache-2.0；Matcha-TTS 为 MIT；WeTextProcessing 为 Apache-2.0 | **拟选默认方案**。中文自然度与音色相似度优先；代价是约 4.86GB、上游只直接覆盖 CUDA/CPU，必须收缩依赖并验证 XPU/MPS 或明确 CPU 音频路径 |
| OpenVoice V2 | 官方当前代码与模型卡标注 MIT，并明确称可免费商业使用；模型仓库约 131MB | 不作为首选。资源更轻，但历史许可痕迹、MeloTTS/转换器组合链、中文只提供默认风格以及公开的转换稳定性问题，使其生产风险并不一定更低；只在 CosyVoice2 真实盲听或平台探针失败后重新提 Spec |

IndexTTS 不再保留等待授权的回退路径。用户已于 2026-09-09 00:53:52 +0800 批准把 CosyVoice2 0.5B 写入默认方案；下一步先完成最小传递依赖审计和 5～10 秒探针，探针失败则回到 Spec 决策，不自动切换其他模型。

## 阶段 0 通过条件

1. CosyVoice2 0.5B 最小离线推理链的所有代码、权重和传递依赖均有现存许可证文本直接允许本产品商用与所需分发方式；ttsfrd、服务端、训练和加速可选项被排除；不存在等待邮件或另行授权的必需项。
2. MuseTalk 主模型及所有实际使用的辅助权重许可证关闭，S3FD 等不明条目被替换或取得明确依据。
3. 三个平台资源包都有不可变版本、逐文件大小/SHA-256、完整 SBOM/NOTICE 和安全加载规则；客户机不执行包管理器或仓库克隆。
4. 使用同一组获授权 5～10 秒素材，在 CUDA、XPU、MPS 分别完成模型加载、关键算子、内存和结果探针；CosyVoice2 另记录明确的 CPU 音频保底质量与耗时。没有真机的平台不得开放完整支持。
5. FFmpeg/libass、字幕字体、Python、Playwright/Chromium 的分发许可、构建来源和签名边界可执行。
6. 探针只决定能否继续完整实现，不把短样片外推值宣传为三分钟正式 SLA。

## 需要外部落实的事项

- 提供 388H/358H Arc B390 32GB 真机或远程执行环境。
- 提供固定且可商用测试的人脸/人声素材矩阵。
- 正式发布前提供版本化资源存储、Apple Developer ID/公证与 Windows 代码签名方案。

## 官方依据

- IndexTTS 2.5 模型卡：https://huggingface.co/IndexTeam/IndexTTS-2.5
- IndexTTS 官方仓库：https://github.com/index-tts/index-tts
- IndexTTS 许可：https://github.com/index-tts/index-tts/blob/main/LICENSE
- W2V-BERT 2.0 模型与 MIT 标记：https://huggingface.co/facebook/w2v-bert-2.0
- MaskGCT 模型与 CC-BY-NC-4.0 标记：https://huggingface.co/amphion/MaskGCT
- CAMPPlus 模型与 Apache-2.0 标记：https://huggingface.co/funasr/campplus
- BigVGAN 模型、MIT 许可与首次 CUDA 编译说明：https://huggingface.co/nvidia/bigvgan_v2_22khz_80band_256x
- MuseTalk 官方仓库与商业/测试素材声明：https://github.com/TMElyralab/MuseTalk
- MuseTalk 汇总许可：https://github.com/TMElyralab/MuseTalk/blob/main/LICENSE
- SD VAE 模型与 MIT 标记：https://huggingface.co/stabilityai/sd-vae-ft-mse
- Whisper Tiny 模型与 Apache-2.0 标记：https://huggingface.co/openai/whisper-tiny
- DWPose 模型与 Apache-2.0 标记：https://huggingface.co/yzd-v/DWPose
- LatentSync 模型与 OpenRAIL++ 标记：https://huggingface.co/ByteDance/LatentSync
- faster-whisper 许可：https://github.com/SYSTRAN/faster-whisper/blob/master/LICENSE
- CTranslate2 许可：https://github.com/OpenNMT/CTranslate2/blob/master/LICENSE
- OpenAI Whisper 许可：https://github.com/openai/whisper/blob/main/LICENSE
- FFmpeg 法律与许可说明：https://ffmpeg.org/legal.html
- libass 许可：https://github.com/libass/libass/blob/master/COPYING
- Playwright 许可：https://github.com/microsoft/playwright/blob/main/LICENSE
- PyTorch 许可：https://github.com/pytorch/pytorch/blob/main/LICENSE
- PyTorch MPS 说明：https://docs.pytorch.org/docs/stable/notes/mps.html
- PyTorch XPU 说明：https://docs.pytorch.org/docs/stable/notes/get_start_xpu.html
- PyTorch 权重安全加载说明：https://docs.pytorch.org/docs/stable/notes/serialization.html#torch-load-with-weights-only-true
- Electron 稳定版本：https://releases.electronjs.org/
- Electron 支持周期：https://releases.electronjs.org/schedule
- Noto Sans CJK 与 OFL 1.1：https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE
- FFmpeg 编码器文档：https://ffmpeg.org/ffmpeg-codecs.html
- CosyVoice 代码与 Apache-2.0 许可：https://github.com/QwenAudio/CosyVoice
- CosyVoice2 0.5B 模型与 Apache-2.0 标记：https://huggingface.co/FunAudioLLM/CosyVoice2-0.5B
- Matcha-TTS MIT 许可：https://github.com/shivammehta25/Matcha-TTS/blob/main/LICENSE
- WeTextProcessing Apache-2.0 许可：https://github.com/wenet-e2e/WeTextProcessing
- OpenVoice V2 代码与 MIT/商业声明：https://github.com/myshell-ai/OpenVoice
- OpenVoice V2 模型与 MIT/商业声明：https://huggingface.co/myshell-ai/OpenVoiceV2
