import { Card } from '@/renderer/shadcn/ui/card'
import { createFileRoute } from '@tanstack/react-router'
import { CirclePower, EyeOff, RefreshCw, Server } from 'lucide-react'
import { hdCreateFormHook } from '../components/form'
import { SettingLayout } from '../components/layouts/SettingLayout'
import { useConfig } from '../hooks/useConfig'

export const Route = createFileRoute('/core/config')({
  component: RouteComponent
})

function RouteComponent() {
  const { useAppForm } = hdCreateFormHook()
  const { config } = useConfig()
  const form = useAppForm({
    defaultValues: config || {},
    listeners: {
      onChangeDebounceMs: 200,
      onChange() {
        void form.handleSubmit()
      }
    },
    async onSubmit({ value }) {
      await window.core.config.setAll(value)
    }
  })

  return (
    <SettingLayout>
      <section className="space-y-3 text-accent-foreground">
        <Card className="px-6 py-3 grid grid-cols-[auto_1fr] gap-3 items-center text-sm">
          <CirclePower className="text-red-500 size-6" />
          <div className="flex justify-between ">
            <div>
              <h2>开机启动</h2>
              <div className="text-muted-foreground text-xs">跟随系统自动运行软件</div>
            </div>
            <div>
              <form.AppField name="autoStart">{(field) => <field.FieldSwitch />}</form.AppField>
            </div>
          </div>
        </Card>
        <Card className="px-6 py-3 grid grid-cols-[auto_1fr] gap-3 items-center text-sm ">
          <Server className="text-sky-600 size-6" />
          <div className="flex justify-between ">
            <div>
              <h2>隐藏任务栏/Dock图标</h2>
              <div className="text-muted-foreground text-xs">
                隐藏任务栏/Dock图标后，仅显示在系统托盘
              </div>
            </div>
            <div>
              <form.AppField name="hideDockIcon">{(field) => <field.FieldSwitch />}</form.AppField>
            </div>
          </div>
        </Card>
        <Card className="px-6 py-3 grid grid-cols-[auto_1fr] gap-3 items-center text-sm">
          <EyeOff className="text-green-500 size-6" />
          <div className="flex justify-between ">
            <div>
              <h2>静默启动</h2>
              <div className="text-muted-foreground text-xs">
                程序启动时不显示主窗口，仅在系统托盘运行
              </div>
            </div>
            <div>
              <form.AppField name="silentStart">{(field) => <field.FieldSwitch />}</form.AppField>
            </div>
          </div>
        </Card>

        <Card className="px-6 py-3 grid grid-cols-[auto_1fr] gap-3 items-center text-sm">
          <RefreshCw className="text-orange-500 size-6" />
          <div className="flex justify-between ">
            <div>
              <h2>自动检查更新</h2>
              <div className="text-muted-foreground text-xs">程序启动时自动检查是否有新版本</div>
            </div>
            <div>
              <form.AppField name="autoCheckUpdate">{(field) => <field.FieldSwitch />}</form.AppField>
            </div>
          </div>
        </Card>
      </section>
    </SettingLayout>
  )
}
