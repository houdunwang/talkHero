import { Checkbox } from '@/renderer/shadcn/ui/checkbox'
import { useFieldContext } from '.'
import type { FormFieldProps } from './types'
import { Field, FieldDescription, FieldLabel } from '@/renderer/shadcn/ui/field'
import { Label } from '@/renderer/shadcn/ui/label'
import { cn } from '@/renderer/shadcn/lib/utils'
import type { FC } from 'react'
import { FieldValidateError } from './FieldValidateError'

type CheckboxValue = string | number | boolean

interface Props extends FormFieldProps<'input'> {
  options: {
    label: string
    value: CheckboxValue
  }[]
  orientation?: 'horizontal' | 'vertical'
}

export const FieldCheckbox: FC<Props> = ({
  label,
  className,
  description,
  options,
  orientation = 'horizontal'
}) => {
  const field = useFieldContext<CheckboxValue[]>()
  const valueArray = Array.isArray(field.state.value) ? field.state.value : []

  return (
    <Field>
      {label ? <FieldLabel htmlFor={field.name}>{label}</FieldLabel> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}

      <div
        className={cn(
          'flex gap-4',
          orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col',
          className
        )}
      >
        {options.map((option, index) => {
          const id = `${field.name}-option-${index}`
          const isChecked = valueArray.includes(option.value)

          return (
            <div className="flex items-center gap-3" key={String(option.value)}>
              <Checkbox
                id={id}
                checked={isChecked}
                onCheckedChange={(checked) => {
                  if (checked) {
                    field.handleChange([...valueArray, option.value])
                  } else {
                    field.handleChange(valueArray.filter((v) => v !== option.value))
                  }
                }}
              />
              <Label htmlFor={id} className="font-normal">
                {option.label}
              </Label>
            </div>
          )
        })}
      </div>
      <FieldValidateError field={field as any} />
    </Field>
  )
}
