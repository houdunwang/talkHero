import { type LucideIcon } from 'lucide-react'
import React, { type FC } from 'react'
type Props = {
  src?: string
  showComponent: React.ReactNode
  defaultComponent?: React.ReactNode
  placeholder: string
  Icon: LucideIcon
}
export const PreviewBlock: FC<Props> = ({
  src,
  showComponent,
  defaultComponent,
  placeholder,
  Icon
}) => {
  if (src) {
    return showComponent
  }
  if (defaultComponent) {
    return defaultComponent
  }
  return (
    <div className="flex flex-col items-center justify-center p-3 hover:border-primary/30 duration-200 h-full w-full bg-background rounded-lg cursor-pointer border border-muted-foreground/10 ">
      <Icon size={20} strokeWidth={1} className="cursor-pointer" />
      <div className="text-muted-foreground/90 font-light text-xs mt-2 text-center">
        {placeholder || '拖放图片或单击选择'}
      </div>
    </div>
  )
}
