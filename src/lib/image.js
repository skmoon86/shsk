// 이미지 리사이즈/압축 + base64 변환 유틸
// Claude API 입력 토큰을 줄이고 업로드 시간을 단축하기 위해 사용한다.

const DEFAULT_MAX_DIM = 1024
const DEFAULT_QUALITY = 0.8

/**
 * File을 받아서 longest-side를 maxDim으로 줄이고 JPEG로 압축한 Blob을 반환.
 *
 * 단계별 타임아웃을 두어, Samsung Internet 등에서 canvas.toBlob/Image.onload가
 * 콜백을 호출하지 않는 사례에도 무한 대기하지 않도록 한다.
 */
export async function resizeImage(file, { maxDim = DEFAULT_MAX_DIM, quality = DEFAULT_QUALITY } = {}) {
  console.log('[resizeImage] start', { name: file?.name, type: file?.type, size: file?.size })

  const dataUrl = await withStepTimeout(readAsDataURL(file), 10000, 'readAsDataURL')
  const img = await withStepTimeout(loadImage(dataUrl), 10000, 'loadImage')
  console.log('[resizeImage] image loaded', { w: img.width, h: img.height })

  let { width, height } = img
  if (!width || !height) throw new Error('이미지 크기를 읽을 수 없어요 (HEIC 등 미지원 포맷일 수 있음)')

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
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await withStepTimeout(
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) reject(new Error('canvas.toBlob 실패'))
          else resolve(b)
        },
        'image/jpeg',
        quality
      )
    }),
    10000,
    'canvas.toBlob'
  )
  console.log('[resizeImage] done', { size: blob.size })
  return blob
}

function withStepTimeout(promise, ms, label) {
  let t
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} 시간 초과 (${ms / 1000}초)`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t))
}

/**
 * Blob/File → base64 문자열 (data: prefix 제외, 순수 base64만)
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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('이미지 로드 실패'))
    img.src = src
  })
}
