import type { IFieldApi } from './types'
import { cn } from '@/renderer/shadcn/lib/utils'
import { MessageCircleWarning } from 'lucide-react'

type Props = {
  field: IFieldApi
}

export const FieldValidateError = ({ field }: Props) => {
  const content = field?.state?.meta?.errors[0]?.message as string
  if (content) {
    return <ShowMessage content={content} />
  }

  return null
}

function ShowMessage({ content }: { content: string }) {
  return (
    <div
      className={cn(
        'text-sm bg-primary/5 border border-primary/20 py-2 px-3 rounded-sm flex items-center gap-1'
      )}
    >
      <MessageCircleWarning size={12} className="text-primary/60" />
      {content}
    </div>
  )
}
