// Supabase Edge Function: parse-receipt
// 영수증 이미지를 받아 Claude Haiku 4.5로 분석한 뒤
// { total, items: [{ name, quantity, amount }], memo } JSON을 반환한다.
//
// 배포:
//   supabase functions deploy parse-receipt --no-verify-jwt
// (JWT 검증을 켜고 싶다면 --no-verify-jwt 제거 후 클라이언트에서 anon key를 Authorization 헤더로 보내면 됨)
//
// Secrets:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

// @ts-ignore — Deno 환경
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `당신은 한국 영수증 OCR 전문가입니다.
사용자가 보낸 영수증 사진을 보고 다음 JSON 스키마에 정확히 맞춰 응답하세요.

규칙:
- 모든 금액은 정수(원). 콤마, 통화기호 제거.
- quantity가 표기되지 않으면 1로 간주.
- 품목명은 영수증에 적힌 그대로(공백 정리만 허용).
- 합계/총액/카드결제 금액 등은 items가 아닌 total로.
- 부가세/봉투료 등 비품목 라인은 items에서 제외하고 total에만 반영.
- memo에는 가게 이름과 날짜가 보이면 "가게명 / YYYY-MM-DD" 형식으로.
- 영수증을 읽을 수 없으면 모든 필드를 비우고 error 필드에 사유를 적으세요.

응답은 반드시 단일 JSON 객체이며, 그 외 텍스트/마크다운/코드펜스 금지.`

const TOOL_SCHEMA = {
  name: 'submit_receipt',
  description: '영수증에서 추출한 정보를 제출합니다.',
  input_schema: {
    type: 'object',
    properties: {
      total: { type: 'integer', description: '총 결제 금액(원). 알 수 없으면 0.' },
      memo:  { type: 'string',  description: '가게명/날짜 등 짧은 메모. 없으면 빈 문자열.' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:     { type: 'string',  description: '품목명' },
            quantity: { type: 'integer', description: '수량(기본 1)' },
            amount:   { type: 'integer', description: '단가(원)' },
          },
          required: ['name', 'quantity', 'amount'],
        },
      },
      error: { type: 'string', description: '인식 실패 시 사유. 성공이면 빈 문자열.' },
    },
    required: ['total', 'memo', 'items', 'error'],
  },
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }
  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY not configured' }, 500)
  }

  try {
    const body = await req.json()
    // 클라이언트는 base64 데이터(`image_base64`)와 mime 타입(`mime`)을 보낸다.
    const { image_base64, mime, known_items } = body
    if (!image_base64 || typeof image_base64 !== 'string') {
      return jsonResponse({ error: 'image_base64 is required' }, 400)
    }
    const mediaType = mime && typeof mime === 'string' ? mime : 'image/jpeg'

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: Array.isArray(known_items) && known_items.length > 0
          ? SYSTEM_PROMPT + `\n\n기존 품목명 목록:\n${known_items.join(', ')}\n\n위 목록에 유사한 품목이 있으면 영수증 원문 대신 기존 품목명을 사용하세요. 예: 영수증에 "무농약새송이버섯"이 있고 기존 목록에 "새송이버섯"이 있으면 "새송이버섯"으로 통일.`
          : SYSTEM_PROMPT,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: 'tool', name: 'submit_receipt' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: image_base64,
                },
              },
              {
                type: 'text',
                text: '이 영수증을 분석해서 submit_receipt 도구로 제출해주세요.',
              },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text()
      console.error('[parse-receipt] Anthropic error', anthropicRes.status, text)
      return jsonResponse({ error: `Anthropic API ${anthropicRes.status}` }, 502)
    }

    const data = await anthropicRes.json()
    // tool_use 블록에서 input 추출
    const toolUse = (data.content || []).find((c: any) => c.type === 'tool_use')
    if (!toolUse) {
      console.error('[parse-receipt] no tool_use in response', JSON.stringify(data))
      return jsonResponse({ error: '응답 파싱 실패' }, 502)
    }

    return jsonResponse({
      ok: true,
      result: toolUse.input,
      usage: data.usage || null,
    })
  } catch (err) {
    console.error('[parse-receipt] unexpected', err)
    return jsonResponse({ error: (err as Error).message || 'Unexpected error' }, 500)
  }
})
