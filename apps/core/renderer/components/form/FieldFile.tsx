import { Field, FieldDescription, FieldLabel } from '@/renderer/shadcn/ui/field'
import { useFieldContext } from '.'
import { UploadFile, type UploadFileProps, type UploadFileSuccessData } from '../upload/UploadFile'
import { FieldValidateError } from './FieldValidateError'
interface Props extends Omit<UploadFileProps, 'onDelete' | 'onError' | 'onSuccess' | 'name'> {
  label?: string
  description?: string
  onSuccess?: (data: UploadFileSuccessData) => void
  onDelete?: (url: string) => void
}

export function FieldFile({
  label,
  description,
  onSuccess,
  onDelete,
  ...props
}: Props): React.JSX.Element {
  const field = useFieldContext<string>()

  const onSuccessHandle = (data: UploadFileSuccessData) => {
    field.setValue(data.data.url)
    if (onSuccess) {
      onSuccess?.(data)
    }
  }

  const onDeleteHandle = (url: string) => {
    field.handleChange('')
    if (onDelete) {
      onDelete(url)
    }
  }

  return (
    <Field>
      {label ? <FieldLabel htmlFor={field.name}>{label}</FieldLabel> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <UploadFile
        src={field.state.value}
        onSuccess={onSuccessHandle}
        onDelete={onDeleteHandle}
        {...props}
      />
      <FieldValidateError field={field} />
    </Field>
  )
}
