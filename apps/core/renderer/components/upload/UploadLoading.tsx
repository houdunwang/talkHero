import { type FC } from 'react'
import { ScaleLoader } from 'react-spinners'

export const UploadLoading: FC<{ state: boolean }> = ({ state }) => {
  if (!state) return null
  return (
    <div className="absolute inset-0 flex z-10 items-center justify-center rounded-lg backdrop-blur-2xl bg-muted-foreground/20">
      <ScaleLoader color="#fff" />
    </div>
  )
}
