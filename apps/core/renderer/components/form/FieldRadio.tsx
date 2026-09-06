import { RadioGroup, RadioGroupItem } from '@/renderer/shadcn/ui/radio-group'
import { useFieldContext } from '.'
import type { FormFieldProps } from './types'
import { Field, FieldDescription, FieldLabel } from '@/renderer/shadcn/ui/field'
import { Label } from '@/renderer/shadcn/ui/label'
import { cn } from '@/renderer/shadcn/lib/utils'
import type { FC } from 'react'
import { FieldValidateError } from './FieldValidateError'

interface Props extends FormFieldProps<'input'> {
  options: {
    label: string
    value: string | number | boolean
  }[]
  orientation?: 'horizontal' | 'vertical'
}
export const FieldRadio: FC<Props> = ({
  label,
  className,
  description,
  options,
  orientation = 'horizontal'
}) => {
  const field = useFieldContext<string | number | boolean>()
  return (
    <Field>
      {label ? <FieldLabel htmlFor={field.name}>{label}</FieldLabel> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <RadioGroup
        defaultValue={String(field.state.value)}
        className={cn(
          'flex gap-4',
          orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col',
          className
        )}
        onValueChange={(value) => {
          const selectedOption = options.find((opt) => String(opt.value) === value)
          field.handleChange(selectedOption !== undefined ? selectedOption.value : value)
        }}
      >
        {options.map((option, index) => (
          <div className="flex items-center gap-3" key={String(option.value)}>
            <RadioGroupItem value={String(option.value)} id={`option-${index}`} />
            <Label htmlFor={`option-${index}`}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
      <FieldValidateError field={field as any} />
    </Field>
  )
}
