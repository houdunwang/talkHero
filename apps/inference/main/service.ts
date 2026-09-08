import { PROTOCOL_VERSION, classifyComputeMode } from './contracts'
import { app } from 'electron'
import { release } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import type { EnvironmentSnapshot } from '../types/public'
import { getManagedResourceStatuses } from './resource-service'
import { taskRegistry } from './task-service'
import { runWorkerTask } from './worker-runtime'

const execFileAsync = promisify(execFile)
const detectNvidia = async (): Promise<{
  detected: boolean
  name: string | null
  vramGb: number | null
  cuda: boolean
}> => {
  if (process.platform !== 'win32')
    return { detected: false, name: null, vramGb: null, cuda: false }
  try {
    const { stdout } = await execFileAsync(
      'nvidia-smi.exe',
      ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'],
      { timeout: 10_000, windowsHide: true }
    )
    const first = stdout.trim().split(/\r?\n/u)[0]
    const separator = first.lastIndexOf(',')
    if (separator < 1) return { detected: false, name: null, vramGb: null, cuda: false }
    const name = first.slice(0, separator).trim()
    const memoryMb = Number(first.slice(separator + 1).trim())
    if (!name || !Number.isFinite(memoryMb))
      return { detected: false, name: null, vramGb: null, cuda: false }
    return { detected: true, name, vramGb: Math.round((memoryMb / 1024) * 10) / 10, cuda: false }
  } catch (error) {
    console.error(
      'NVIDIA environment detection failed:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return { detected: false, name: null, vramGb: null, cuda: false }
  }
}

export const getEnvironmentSnapshot = async (): Promise<EnvironmentSnapshot> => {
  const root = join(app.getPath('userData'), 'talkhero')
  const resources = await getManagedResourceStatuses(root)
  let gpu = await detectNvidia()
  const windowsBuild = Number(release().split('.')[2] ?? 0)
  const targetPlatform =
    process.platform === 'win32' && process.arch === 'x64' && windowsBuild >= 22_000
  const workerInstalled =
    resources.find((resource) => resource.name === 'python')?.installed === true
  let workerRunning = false
  if (targetPlatform && workerInstalled) {
    try {
      const health = await runWorkerTask(randomUUID(), 'environment.health', {}, async (output) => {
        if (
          !/^3\.11\./u.test(output.pythonVersion) ||
          !['true', 'false'].includes(output.cuda) ||
          !/^\d+$/u.test(output.vramBytes)
        )
          throw new Error('Worker 健康信息无效')
        return output
      })
      workerRunning = true
      gpu = {
        detected: health.gpuName.length > 0,
        name: health.gpuName || null,
        vramGb: Number.isFinite(Number(health.vramBytes))
          ? Math.round((Number(health.vramBytes) / 1024 ** 3) * 10) / 10
          : null,
        cuda: health.cuda === 'true'
      }
    } catch {
      gpu = { ...gpu, cuda: false }
    }
  }
  const computeMode = targetPlatform
    ? classifyComputeMode({
        platform: process.platform,
        nvidia: gpu.detected,
        vramGb: gpu.vramGb ?? 0,
        cuda: gpu.cuda
      })
    : 'unsupported'
  return {
    platform: process.platform,
    targetPlatform,
    gpu,
    computeMode,
    worker: {
      installed: workerInstalled,
      protocolVersion: PROTOCOL_VERSION,
      running: workerRunning
    },
    resources,
    tasks: taskRegistry.list().map(({ id, operation, state, stage, progress }) => ({
      id,
      operation,
      state,
      stage,
      progress
    })),
    message: targetPlatform
      ? computeMode === 'unsupported'
        ? '未通过受管 Worker 的 CUDA 握手，当前不能启动本地推理'
        : resources.every((resource) => resource.installed)
          ? '本地资源已检测到；模型质量仍需真实任务验证'
          : '本地运行资源尚未完整安装'
      : '当前系统仅支持桌面工作台；完整本地推理首版仅支持 Windows 11 x64 + NVIDIA CUDA'
  }
}
