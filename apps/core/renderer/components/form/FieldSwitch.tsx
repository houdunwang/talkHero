import { useFieldContext } from '.'
import type { FormFieldProps } from './types'
import { Field, FieldDescription, FieldLabel } from '@/renderer/shadcn/ui/field'
import { Label } from '@/renderer/shadcn/ui/label'
import { Switch } from '@/renderer/shadcn/ui/switch'
import { cn } from '@/renderer/shadcn/lib/utils'
import { FieldValidateError } from './FieldValidateError'
export const FieldSwitch = ({
  label,
  title,
  className,
  description,
  ...props
}: FormFieldProps<'button'>) => {
  const field = useFieldContext<boolean | number>()
  return (
    <Field className={cn('w-full', className)}>
      {label ? <FieldLabel htmlFor={field.name}>{label}</FieldLabel> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <div className="flex items-center h-full space-x-2">
        <Switch
          id="airplane-mode"
          checked={Boolean(field.state.value)}
          onCheckedChange={(checked) => {
            field.handleChange(checked)
          }}
          {...props}
        />
        <Label htmlFor="airplane-mode">{title}</Label>
      </div>
      <FieldValidateError field={field} />
    </Field>
  )
}
