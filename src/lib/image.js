// 이미지 리사이즈/압축 + base64 변환 유틸
// Claude API 입력 토큰을 줄이고 업로드 시간을 단축하기 위해 사용한다.

const DEFAULT_MAX_DIM = 1024
const DEFAULT_QUALITY = 0.8

/**
 * File을 받아서 longest-side를 maxDim으로 줄이고 JPEG로 압축한 Blob을 반환.
 */
export async function resizeImage(file, { maxDim = DEFAULT_MAX_DIM, quality = DEFAULT_QUALITY } = {}) {
  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)

  let { width, height } = img
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

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('이미지 변환 실패'))
        else resolve(blob)
      },
      'image/jpeg',
      quality
    )
  })
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
