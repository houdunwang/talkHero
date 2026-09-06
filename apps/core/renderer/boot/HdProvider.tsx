import { TooltipProvider } from '@/renderer/shadcn/ui/tooltip'
import '@apps/core/renderer/assets/shadcn.css'
import { ThemeProvider } from '@apps/core/renderer/components/theme/theme-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, type AnyRouter } from '@tanstack/react-router'
import { HashLoader } from 'react-spinners'
import { Toaster } from 'sonner'
import { useInit } from '@apps/core/renderer/hooks/useInit'
import '../plugin/dayjs'
import { tanstackRouter } from './tanstackRouter'

const queryClient = new QueryClient()

export const HdProvider = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme={'light'} storageKey="hdcms-ui-theme">
        <TooltipProvider>
          <App router={tanstackRouter} />
        </TooltipProvider>
        <Toaster position="top-center" className="text-primary" />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

function App({ router }: { router: AnyRouter }) {
  const { isLoading } = useInit()
  if (isLoading) return <InitLoading />
  return <RouterProvider router={router} context={{ title: '' }} />
}

function InitLoading() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <HashLoader size={50} color="#fb2c36" />
    </div>
  )
}
