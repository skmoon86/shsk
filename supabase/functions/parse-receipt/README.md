# parse-receipt Edge Function

영수증 사진을 받아 Claude Haiku 4.5로 분석한 뒤
`{ total, items, memo }` JSON을 반환합니다.

---

## 1. Anthropic API 키 발급

1. https://console.anthropic.com 접속 → 가입/로그인
2. **Settings → API Keys → Create Key**
3. 결제수단 등록 (Pay-as-you-go). 월 20장 기준 약 **120원** 정도라 거의 무료에 가까움
4. 발급된 키 `sk-ant-...` 복사

## 2. Supabase CLI 설치 & 로그인

```bash
# Windows (scoop)
scoop install supabase
# 또는 npm
npm install -g supabase

supabase login
```

## 3. 프로젝트 링크

```bash
cd E:/shsk
supabase link --project-ref <YOUR_PROJECT_REF>
```

`<YOUR_PROJECT_REF>`는 Supabase Dashboard URL의
`https://supabase.com/dashboard/project/**여기**` 부분.

## 4. Secret 등록 (Anthropic 키)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## 5. 함수 배포

```bash
supabase functions deploy parse-receipt --no-verify-jwt
```

> `--no-verify-jwt` 를 빼면 클라이언트가 Supabase 익명 키를 Authorization 헤더로
> 보내야 호출이 가능합니다. `supabase.functions.invoke()` 는 자동으로 보내주므로
> 보안을 강화하려면 빼도 됩니다.

## 6. 동작 확인

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/parse-receipt \
  -H "Content-Type: application/json" \
  -H "apikey: <ANON_KEY>" \
  -d '{"image_base64":"<BASE64_JPEG>","mime":"image/jpeg"}'
```

응답 예시:
```json
{
  "ok": true,
  "result": {
    "total": 18500,
    "memo": "GS25 강남점 / 2026-04-10",
    "items": [
      { "name": "삼각김밥", "quantity": 2, "amount": 1500 },
      { "name": "도시락",   "quantity": 1, "amount": 5500 }
    ],
    "error": ""
  },
  "usage": { "input_tokens": 1834, "output_tokens": 142 }
}
```

---

## 비용 (참고)

| 모델 | 장당 | 월 20장 |
|---|---|---|
| Haiku 4.5 (현재) | ≈ ₩6 | ≈ ₩120 |
| Sonnet 4.5      | ≈ ₩18 | ≈ ₩365 |

모델을 바꾸려면 `index.ts` 상단의 `MODEL` 상수만 수정.
