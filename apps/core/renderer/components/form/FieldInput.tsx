import { useFieldContext } from '.'
import type { FormFieldProps } from './types'
import { Field, FieldDescription, FieldLabel } from '@/renderer/shadcn/ui/field'
import { Input } from '@/renderer/shadcn/ui/input'
import { cn } from '@/renderer/shadcn/lib/utils'
import { FieldValidateError } from './FieldValidateError'
type Props = FormFieldProps<'input'>
export const FieldInput = ({
  label,
  description,
  className,
  fieldClassName,
  type,
  readOnly,
  ...props
}: Props) => {
  const field = useFieldContext<string>()
  const autoComplete = type === 'password' ? 'new-password' : 'off'
  return (
    <Field className={cn('w-full', className)}>
      {label ? <FieldLabel htmlFor={field.name}>{label}</FieldLabel> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Input
        id={field.name}
        name={field.name}
        type={type}
        readOnly={readOnly}
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(
            (type === 'number' ? Number(event.target.value) : event.target.value) as any
          )
        }}
        className={cn('bg-background', fieldClassName)}
        {...props}
        autoComplete={autoComplete}
      />
      <FieldValidateError field={field} />
    </Field>
  )
}
