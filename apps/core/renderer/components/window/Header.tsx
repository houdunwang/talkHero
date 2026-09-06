import { cn } from '@/renderer/shadcn/lib/utils'
import { title as packageName, version as packageVersion } from '../../../../../package.json'
import icon from '../../../../../build/icon.png'
import { ModeToggle } from '../theme/mode-toggle'
import { Minus, MoveDiagonal2, X } from 'lucide-react'
export const Header = () => {
  return (
    <div
      className={cn(
        'h-8 w-screen flex items-center select-none justify-end px-3 cursor-pointer drag fixed',
        {
          'justify-end': window.core.platform === 'darwin',
          'justify-between': window.core.platform === 'win32'
        }
      )}
    >
      <section
        className={cn('flex items-center gap-2', {
          // 'ml-20': window.core.platform === 'darwin'
        })}
      >
        <div
          className={cn('flex gap-1 nodrag', {
            hidden: true
          })}
        >
          <div
            className="w-4 h-4 bg-orange-600 rounded-full cursor-pointer flex items-center justify-center group"
            onClick={() => window.core.window.closeWindow()}
          >
            <X
              strokeWidth={3}
              size={8}
              className="group-hover:opacity-100 opacity-0 duration-100"
            />
          </div>
          <div
            className="w-4 h-4 bg-yellow-500 rounded-full cursor-pointer flex items-center justify-center group"
            onClick={() => window.core.window.windowToggleMinimize()}
          >
            <Minus
              strokeWidth={3}
              className="size-3 group-hover:opacity-100 opacity-0 duration-100"
            />
          </div>
          <div
            className="w-4 h-4 bg-green-600 rounded-full cursor-pointer flex items-center justify-center group"
            onClick={() => window.core.window.windowToggleFullscreen()}
          >
            <MoveDiagonal2
              strokeWidth={3}
              size={8}
              className="group-hover:opacity-100 opacity-0 duration-100"
            />
          </div>
        </div>
        <div className={cn('text-muted-foreground font-bold text-xs flex items-center gap-2')}>
          <div className="flex items-center gap-1">
            <img src={icon} className="size-4.5 rounded-sm" />
            {packageName}
          </div>{' '}
          <div className="text-xs font-light "> v{packageVersion}</div>
        </div>
      </section>
      <section
        className={cn('flex items-center gap-3 nodrag', {
          'mr-32': window.core.platform === 'win32'
        })}
      >
        <ModeToggle />
      </section>
    </div>
  )
}
