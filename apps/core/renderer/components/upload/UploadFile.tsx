import { Input } from '@/renderer/shadcn/ui/input'
import { cn } from '@/renderer/shadcn/lib/utils'
import { useMutation } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { type FC, type ReactNode } from 'react'
import { useDropzone, type FileWithPath } from 'react-dropzone'
import { toast } from 'sonner'
import { DeleteIcon } from './DeleteIcon'
import { PreviewBlock } from './PreviewBlock'
import { UploadLoading } from './UploadLoading'

export type UploadFileSuccessData = { data: any; file?: File; duration?: number }
export type UploadFileProps = {
  accept?: Record<string, string[]>
  onSuccess: (data: UploadFileSuccessData) => void
  onDelete?: (url: string) => void
  onError?: (error: any, file: FileWithPath) => void
  onUploading?: (file: FileWithPath) => void
  src?: string
  showComponent?: ReactNode
  defaultComponent?: ReactNode
  uploadingComponent?: ReactNode

  maxFiles?: number
  maxSize?: number
  placeholder?: string
  className?: string
}
export const UploadFile: FC<UploadFileProps> = ({
  onDelete,
  onError,
  onUploading,
  className,
  showComponent,
  defaultComponent,
  uploadingComponent,
  src,
  maxFiles = 1,
  maxSize,
  accept,
  placeholder
}) => {
  const acceptTypes = accept
  const maximumSize = Number(maxSize ?? 50)

  // const getVideoDuration = (file: File): Promise<number> => {
  //   return new Promise((resolve) => {
  //     if (!file.type.startsWith('video/')) {
  //       resolve(0)
  //       return
  //     }
  //     const video = document.createElement('video')
  //     video.preload = 'metadata'
  //     video.onloadedmetadata = () => {
  //       window.URL.revokeObjectURL(video.src)
  //       resolve(Math.round(video.duration))
  //     }
  //     video.onerror = () => {
  //       resolve(0)
  //     }
  //     video.src = URL.createObjectURL(file)
  //   })
  // }

  const mutation = useMutation({})
  const { getRootProps, getInputProps } = useDropzone({
    accept: acceptTypes,
    maxFiles,
    maxSize: 1024 * 1024 * maximumSize,
    multiple: maxFiles > 1,
    onDrop: async (files) => {
      for (const file of files) {
        onUploading?.(file)
        // const duration = await getVideoDuration(file)
        // await mutation.mutateAsync(
        //   { body: { file } as any },
        //   {
        //     onSuccess: ({ data }) => {
        //       onSuccess({ data, file, duration })
        //     }
        //   }
        // )
      }
    },
    onDropRejected: (fileRejections) => {
      for (const rejection of fileRejections) {
        const { file, errors } = rejection
        for (const error of errors) {
          if (error.code) {
            if (onError) {
              onError(error, file)
            } else {
              if (error.code === 'file-too-large') {
                toast.warning(`文件 ${file.name} 超过最大限制 ${maximumSize}MB`)
              } else if (error.code === 'file-invalid-type') {
                toast.warning(`文件 ${file.name} 格式不支持`)
              } else {
                toast.warning(`文件 ${file.name} 无法上传: ${error.message}`)
              }
            }
          }
        }
      }
    },
    onError: () => {
      toast.warning('文件读取失败')
    }
  })
  return (
    <div>
      <div {...getRootProps({ className: `dropzone cursor-pointer inline-flex  ${className}` })}>
        <input {...getInputProps()} />
        <div className={cn('relative overflow-hidden cursor-pointer group flex-1')}>
          {/* <UploadLoading state={mutation.isPending} /> */}
          {mutation.isPending ? (
            (uploadingComponent ?? <UploadLoading state={mutation.isPending} />)
          ) : (
            <>
              {onDelete && <DeleteIcon onDelete={onDelete} src={src} />}
              <PreviewBlock
                src={src}
                defaultComponent={defaultComponent}
                showComponent={
                  showComponent === null
                    ? defaultComponent
                    : (showComponent ?? (
                        <div className="p-3">
                          <Input value={src} readOnly className="bg-background" />
                        </div>
                      ))
                }
                placeholder={placeholder || '拖放文件或单击选择'}
                Icon={Upload}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
