import { cn } from '@/renderer/shadcn/lib/utils'
import { useState } from 'react'

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta'])

const SPECIAL_KEY_MAP: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Enter: 'Enter',
  Tab: 'Tab',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Insert: 'Insert'
}

const FUNCTION_KEY_PATTERN = /^F([1-9]|1[0-9]|2[0-4])$/

const CODE_KEY_MAP: Record<string, string> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  Space: 'Space'
}

// 按住 Option/Alt 或 Shift 时 event.key 会变成特殊字符（如 £、@），优先用物理键位 event.code 识别
const normalizeKey = (event: React.KeyboardEvent<HTMLDivElement>): string => {
  const { code, key } = event
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (CODE_KEY_MAP[code]) return CODE_KEY_MAP[code]
  if (FUNCTION_KEY_PATTERN.test(key)) return key
  return SPECIAL_KEY_MAP[key] || ''
}

interface AcceleratorInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function AcceleratorInput({
  value,
  onChange,
  placeholder = '点击录制快捷键',
  className,
  disabled = false
}: AcceleratorInputProps): React.JSX.Element {
  const [recording, setRecording] = useState(false)
  const [hint, setHint] = useState('')

  const stopRecording = (target: HTMLDivElement): void => {
    setRecording(false)
    target.blur()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return

    if (event.key === 'Tab') {
      setHint('')
      setRecording(false)
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      setHint('')
      stopRecording(event.currentTarget)
      return
    }

    const hasModifier = event.metaKey || event.ctrlKey || event.altKey || event.shiftKey

    if ((event.key === 'Backspace' || event.key === 'Delete') && !hasModifier) {
      onChange('')
      setHint('')
      stopRecording(event.currentTarget)
      return
    }

    if (MODIFIER_KEYS.has(event.key)) return

    const base = normalizeKey(event)
    if (!base) {
      setHint('不支持该按键')
      return
    }

    if (!event.metaKey && !event.ctrlKey && !event.altKey && !FUNCTION_KEY_PATTERN.test(base)) {
      setHint('需配合 Command / Ctrl / Alt')
      return
    }

    const parts: string[] = []
    if (event.metaKey) parts.push('CommandOrControl')
    if (event.ctrlKey) parts.push('Control')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')
    parts.push(base)

    onChange(parts.join('+'))
    setHint('')
    stopRecording(event.currentTarget)
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      title={value ? `点击重新录制：${value}` : '点击后按下快捷键'}
      onFocus={() => {
        if (disabled) return
        setRecording(true)
        setHint('')
      }}
      onBlur={() => setRecording(false)}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex h-7 w-40 shrink-0 cursor-pointer items-center truncate rounded-md border border-input bg-transparent px-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        recording && 'border-primary',
        hint ? 'text-rose-500' : value ? '' : 'text-muted-foreground',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      {recording ? hint || '按下快捷键…' : value || placeholder}
    </div>
  )
}
