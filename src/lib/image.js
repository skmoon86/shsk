import toast from 'react-hot-toast'

// 디버깅용: 삼성 인터넷 문제 추적 끝나면 false 로 내릴 것
export const DEBUG_PHOTO = true
const dbg = (msg) => { if (DEBUG_PHOTO) toast(msg, { duration: 2500 }) }

// 이미지 리사이즈/압축 + base64 변환 유틸
// Claude API 입력 토큰을 줄이고 업로드 시간을 단축하기 위해 사용한다.
//
// 삼성 인터넷 등 모바일 브라우저에서 대용량 사진을 처리할 때
// readAsDataURL + <img> + canvas.toBlob 조합이 무한 대기하거나
// 메모리 부족으로 실패하는 사례가 있어서, 아래 방어 로직을 쓴다:
//   1) 가능하면 createImageBitmap 사용 (비동기 디코딩 + EXIF orientation 자동 처리)
//   2) 실패 시 <img> + ObjectURL (dataURL보다 메모리 적게 씀)
//   3) canvas.toBlob 실패 시 toDataURL → fetch 로 Blob 복구
//   4) 모든 단계에 타임아웃

const DEFAULT_MAX_DIM = 1024
const DEFAULT_QUALITY = 0.8
const STEP_TIMEOUT = 15000

export async function resizeImage(file, { maxDim = DEFAULT_MAX_DIM, quality = DEFAULT_QUALITY } = {}) {
  console.log('[resizeImage] start', { name: file?.name, type: file?.type, size: file?.size })
  dbg(`1/5 시작 ${(file?.size / 1024).toFixed(0)}KB ${file?.type || '?'}`)

  const { bitmap, width: srcW, height: srcH, cleanup } = await withStepTimeout(
    loadBitmap(file),
    STEP_TIMEOUT,
    'loadBitmap'
  )
  console.log('[resizeImage] image loaded', { w: srcW, h: srcH })
  dbg(`3/5 디코드 OK ${srcW}x${srcH}`)

  try {
    if (!srcW || !srcH) throw new Error('이미지 크기를 읽을 수 없어요 (HEIC 등 미지원 포맷일 수 있음)')

    let width = srcW
    let height = srcH
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width)
        width  = maxDim
      } else {
        width  = Math.round((width * maxDim) / height)
        height = maxDim
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width  = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, width, height)

    dbg(`4/5 canvas 그림 OK ${width}x${height}`)
    const blob = await withStepTimeout(canvasToBlob(canvas, quality), STEP_TIMEOUT, 'canvas.toBlob')
    console.log('[resizeImage] done', { size: blob.size })
    dbg(`5/5 인코딩 OK ${(blob.size / 1024).toFixed(0)}KB`)
    return blob
  } finally {
    cleanup?.()
  }
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    let settled = false
    try {
      canvas.toBlob(
        (b) => {
          if (settled) return
          settled = true
          if (b) return resolve(b)
          // fallback: toDataURL → Blob
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality)
            dataUrlToBlob(dataUrl).then(resolve, reject)
          } catch (err) {
            reject(err)
          }
        },
        'image/jpeg',
        quality
      )
    } catch (err) {
      if (settled) return
      settled = true
      reject(err)
    }
  })
}

function dataUrlToBlob(dataUrl) {
  // fetch(dataUrl)가 일부 모바일에서 느린 경우가 있어서 수동 디코딩
  return new Promise((resolve, reject) => {
    try {
      const [header, base64] = dataUrl.split(',')
      const mime = /data:(.*?);base64/.exec(header)?.[1] || 'image/jpeg'
      const bin = atob(base64)
      const len = bin.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i)
      resolve(new Blob([bytes], { type: mime }))
    } catch (err) {
      reject(err)
    }
  })
}

async function loadBitmap(file) {
  // 1) createImageBitmap: 가장 안정적 (비동기 디코드, orientation 처리)
  if (typeof createImageBitmap === 'function') {
    try {
      dbg('2/5 createImageBitmap 시도')
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        bitmap: bmp,
        width: bmp.width,
        height: bmp.height,
        cleanup: () => bmp.close?.(),
      }
    } catch (err) {
      console.warn('[loadBitmap] createImageBitmap failed, fallback to <img>', err)
      dbg(`createImageBitmap 실패: ${err?.message || err}`)
    }
  } else {
    dbg('createImageBitmap 미지원')
  }

  // 2) Fallback: <img> + ObjectURL (dataURL보다 훨씬 메모리 효율적)
  dbg('2/5 <img> + ObjectURL 시도')
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImageFromUrl(url)
    return {
      bitmap: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => URL.revokeObjectURL(url),
    }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
}

function loadImageFromUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('이미지 로드 실패'))
    img.src = src
  })
}

function withStepTimeout(promise, ms, label) {
  let t
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} 시간 초과 (${ms / 1000}초)`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t))
}

/**
 * Blob/File → base64 문자열 (data: prefix 제외)
 */
export async function blobToBase64(blob) {
  const dataUrl = await readAsDataURL(blob)
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('파일 읽기 실패'))
    reader.readAsDataURL(file)
  })
}
