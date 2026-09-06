import { CircleX } from 'lucide-react'
import { type FC } from 'react'
type Props = {
  onDelete: (url: string) => void
  src?: string
}

export const DeleteIcon: FC<Props> = ({ onDelete, src }) => {
  if (!src) return null
  return (
    <div
      className="absolute hidden group-hover:block right-1 top-1 z-10 bg-background border border-muted-foreground/20 rounded-full cursor-pointer hover:scale-150 duration-300"
      onClick={(e) => {
        e.stopPropagation()
        onDelete?.(src)
      }}
    >
      <CircleX className="text-primary" size={20} />
    </div>
  )
}
