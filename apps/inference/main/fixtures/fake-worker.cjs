const readline = require('node:readline')

const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`)
const ignoredCancellation = new Set()
send({ version: '1.0', type: 'ready' })

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const request = JSON.parse(line)
  if (request.type === 'cancel') {
    if (ignoredCancellation.has(request.taskId)) return
    send({
      version: '1.0',
      type: 'failed',
      taskId: request.taskId,
      code: 'cancelled',
      message: '任务已取消'
    })
    return
  }
  if (request.operation === 'test.complete') {
    send({
      version: '1.0',
      type: 'progress',
      taskId: request.taskId,
      progress: 25,
      stage: 'prepare'
    })
    send({
      version: '1.0',
      type: 'progress',
      taskId: request.taskId,
      progress: 80,
      stage: 'render'
    })
    send({
      version: '1.0',
      type: 'completed',
      taskId: request.taskId,
      output: { outputPath: 'managed/output.wav' }
    })
  } else if (request.operation === 'test.crash') {
    process.exit(7)
  } else if (request.operation === 'test.malformed') {
    process.stdout.write('{bad json}\n')
  } else if (request.operation === 'test.ignore-cancel') {
    // Intentionally remains pending so the client must enforce its cancellation timeout.
    ignoredCancellation.add(request.taskId)
  }
})
