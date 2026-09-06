import { useFormContext } from '.'
import { Button } from '@/renderer/shadcn/ui/button'

type Props = React.ComponentProps<typeof Button>

export const FieldSubmitButton = ({ className, ...props }: Props) => {
  const form = useFormContext()
  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button type="submit" size={'lg'} disabled={!canSubmit} className={className} {...props}>
          {isSubmitting ? '提交中...' : '保存提交'}
        </Button>
      )}
    </form.Subscribe>
  )
}
