import { useFieldContext } from '.'
import { Field, FieldDescription, FieldLabel } from '@/renderer/shadcn/ui/field'
import { Textarea } from '@/renderer/shadcn/ui/textarea'
import { cn } from '@/renderer/shadcn/lib/utils'
import type { ComponentProps, FC } from 'react'
import { FieldValidateError } from './FieldValidateError'

type Props = {
  label: string
  description?: string
  fieldClassName?: string
} & ComponentProps<typeof Textarea>
export const FieldTextarea: FC<Props> = ({
  label,
  description,
  className,
  fieldClassName,
  ...props
}) => {
  const field = useFieldContext<string>()
  return (
    <Field className={cn('w-full', className)}>
      {label ? <FieldLabel htmlFor={field.name}>{label}</FieldLabel> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value)
        }}
        className={cn('bg-background', fieldClassName)}
        {...props}
        autoComplete={'off'}
      />
      <FieldValidateError field={field} />
    </Field>
  )
}
