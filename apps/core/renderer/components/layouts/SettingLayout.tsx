import { Button } from '@/renderer/shadcn/ui/button'
import { setting } from '@config/menus'
import { Link } from '@tanstack/react-router'
import { Home, Settings2, Sofa } from 'lucide-react'
import { FC, PropsWithChildren } from 'react'
import { Header } from '../window/Header'

export const SettingLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <main className="bg-accent w-screen h-screen flex flex-col select-none">
      <Header />
      <section className="grid grid-cols-[130px_1fr] flex-1 pt-3 mt-6">
        <div className="px-3 flex flex-col justify-between">
          <div className="space-y-1">
            {setting.map((menu, index) => (
              <Link
                key={index}
                to={menu.to}
                className="px-3 py-2 text-sm flex text-muted-foreground hover:text-foreground! rounded-sm items-center gap-1 "
                activeOptions={{
                  exact: true
                }}
                activeProps={{
                  className: 'bg-background shadow-[0_0_1px_0px_rgba(0,0,0,0.01)]'
                }}
              >
                <menu.icon strokeWidth={2} size={15} /> {menu.title}
              </Link>
            ))}
          </div>
          <div className="flex flex-col items-center ">
            <div className="mb-6">
              <HoudunyunDesc />
            </div>
            <div className="mb-6">
              <QuickIcons />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-accent supports-backdrop-filter:backdrop-blur-sm mb-6 mr-6 p-3   overflow-y-auto h-[calc(100vh-70px)] pt-1">
          {children}
        </div>
      </section>
    </main>
  )
}

function HoudunyunDesc() {
  return (
    <div className="text-muted-foreground text-xs opacity-80">
      <div className="flex items-center gap-1 flex-wrap ">
        <a
          href="https://www.houdunyun.com"
          target="_blank"
          className="flex gap-0 "
          rel="noreferrer"
        >
          <Button size={'xs'} variant={'outline'} className="rounded-sm py-3 ">
            <Sofa size={20} /> 后盾云
            <span className="text-destructive">短视频助手</span>
          </Button>
        </a>
      </div>
      <div className="opacity-60 font-light ml-1 flex justify-center">houdunyun.com</div>
    </div>
  )
}

// 快速图标
function QuickIcons() {
  const menus = [
    { to: '/core/config', icon: Settings2 },
    { to: 'https://www.houdunyun.com', icon: Home, target: '_blank' }
  ]
  return (
    <div className="flex items-center gap-4 text-muted-foreground">
      {menus.map((menu) => (
        <Link
          key={menu.to}
          to={menu.to}
          target={menu.target || '_self'}
          className="hover:bg-muted-foreground/10 rounded-sm flex items-center justify-center"
        >
          <menu.icon size={16} />
        </Link>
      ))}
    </div>
  )
}
