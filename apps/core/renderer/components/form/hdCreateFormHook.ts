import { createFormHook } from '@tanstack/react-form'
import { fieldContext, formContext } from '.'
import { FieldCheckbox } from './FieldCheckbox'
import { FieldFile } from './FieldFile'
import { FieldInput } from './FieldInput'
import { FieldRadio } from './FieldRadio'
import { FieldSelect } from './FieldSelect'
import { FieldSubmitButton } from './FieldSubmitButton'
import { FieldSwitch } from './FieldSwitch'
import { FieldTextarea } from './FieldTextarea'

type IFieldComponents = Parameters<typeof createFormHook>[0]['fieldComponents']

export const hdCreateFormHook: (components?: IFieldComponents) => ReturnType<
  typeof createFormHook<
    {
      FieldInput: typeof FieldInput
      FieldSwitch: typeof FieldSwitch
      FieldTextarea: typeof FieldTextarea
      FieldSelect: typeof FieldSelect
      FieldFile: typeof FieldFile
      FieldRadio: typeof FieldRadio
      FieldCheckbox: typeof FieldCheckbox
    },
    { FieldSubmitButton: typeof FieldSubmitButton }
  >
> = (components: IFieldComponents = {}) =>
  createFormHook({
    fieldComponents: {
      FieldInput,
      FieldTextarea,
      FieldSwitch,
      FieldSelect,
      FieldCheckbox,
      FieldFile,
      FieldRadio,
      ...components
    },
    formComponents: {
      FieldSubmitButton
    },
    fieldContext,
    formContext
  })
