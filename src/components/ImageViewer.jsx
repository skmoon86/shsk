import { useState } from 'react'
import { X } from 'lucide-react'

export default function ImageViewer({ src, alt = '사진', children }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setOpen(false)}>
          <button className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2"
            onClick={() => setOpen(false)}>
            <X size={24} />
          </button>
          <img src={src} alt={alt}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
