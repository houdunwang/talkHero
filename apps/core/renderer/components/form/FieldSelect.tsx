import { useFieldContext } from '.'
import type { FormFieldProps } from './types'
import { Field, FieldLabel } from '@/renderer/shadcn/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/renderer/shadcn/ui/select'
import { cn } from '@/renderer/shadcn/lib/utils'
import type { FC } from 'react'
import { FieldValidateError } from './FieldValidateError'
import { CardDescription } from '@/renderer/shadcn/ui/card'

interface Props extends FormFieldProps<'input'> {
  // defaultValue: any
  onValueChange?: (value: string) => void
  options: {
    label: string
    value: string
  }[]
}
export const FieldSelect: FC<Props> = ({
  label,
  className,
  fieldClassName,
  placeholder,
  options,
  onValueChange,
  description
}) => {
  const field = useFieldContext<string>()

  return (
    <Field className={cn('h-full', className)}>
      {label ? <FieldLabel htmlFor={field.name}>{label}</FieldLabel> : null}
      {description ? <CardDescription>{description}</CardDescription> : null}
      <Select
        value={field.state.value}
        onValueChange={(value) => {
          onValueChange?.(value)
          field.handleChange(value)
        }}
      >
        <SelectTrigger className={cn('h-full bg-background', fieldClassName)}>
          <SelectValue placeholder={placeholder} className="h-full flex" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{placeholder}</SelectLabel>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldValidateError field={field} />
    </Field>
  )
}
