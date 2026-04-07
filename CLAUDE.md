# 밥상기록 — Claude Code 인수인계 문서

## 프로젝트 개요

가족/커플이 함께 쓰는 식비 가계부 앱.
구글 로그인 + 초대 코드 방식으로 그룹을 공유하며, 누가 입력했는지는 구분하지 않는다.

---

## 기술 스택

| 역할 | 기술 |
|------|------|
| 프론트엔드 | React 18 + Vite |
| 스타일링 | Tailwind CSS v3 |
| 백엔드/DB | Supabase (PostgreSQL + Auth + Storage) |
| 인증 | Supabase Auth — Google OAuth |
| 상태관리 | Zustand |
| 차트 | Recharts |
| 날짜 | dayjs |
| 알림 | react-hot-toast |
| 배포 | Vercel |

---

## 폴더 구조

```
src/
├── lib/
│   └── supabase.js          # Supabase client 초기화
├── stores/
│   └── authStore.js         # 인증 + household 전역 상태 (Zustand)
├── hooks/
│   ├── useExpenses.js       # 지출 CRUD + 필터
│   └── useCategories.js     # 카테고리 조회
├── pages/
│   ├── LoginPage.jsx        # 구글 로그인
│   ├── AuthCallback.jsx     # OAuth 콜백 처리
│   ├── OnboardingPage.jsx   # 그룹 생성 또는 초대코드 참여
│   ├── DashboardPage.jsx    # 홈 — 이번 달 요약
│   ├── AddExpensePage.jsx   # 지출 입력
│   ├── HistoryPage.jsx      # 전체 내역 + 필터
│   ├── StatsPage.jsx        # 카테고리/월별 차트
│   └── SettingsPage.jsx     # 프로필 + 초대코드 공유 + 로그아웃
└── components/
    └── layout/
        └── AppLayout.jsx    # 하단 탭 네비게이션
```

---

## 환경변수

`.env` 파일을 루트에 생성하고 아래 값을 채운다:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`.env.example` 파일 참고.

---

## Supabase 설정 순서

### 1. 프로젝트 생성
- https://supabase.com → New Project

### 2. Google OAuth 설정
- Supabase Dashboard → Authentication → Providers → Google → Enable
- Google Cloud Console에서 OAuth 앱 생성 후 Client ID / Secret 입력
- Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 3. DB 스키마 실행
- `supabase_schema.sql` 전체를 SQL Editor에 붙여넣고 실행

### 4. Storage 버킷
- `supabase_schema.sql` 하단 Storage 섹션도 함께 실행됨
- Dashboard → Storage → `receipts` 버킷이 생성되어 있으면 OK

---

## DB 스키마 요약

```
households   : id, name, invite_code, created_at
memberships  : id, household_id, user_id, role(owner|member), joined_at
categories   : id, household_id, name, icon, color, created_at
expenses     : id, household_id, category_id, amount, memo, photo_url, date, created_at
```

### RLS 정책 요약
- 모든 테이블은 `is_member(household_id)` 헬퍼 함수로 접근 제어
- 로그인한 유저가 해당 household 멤버인 경우에만 CRUD 허용

---

## 앱 흐름

```
구글 로그인
  └→ /auth/callback
       ├→ membership 없음 → /onboarding (그룹 생성 or 초대코드 입력)
       └→ membership 있음 → / (대시보드)
```

### 그룹 생성 시
1. `households` 에 새 row 생성 (invite_code 자동 생성)
2. `memberships` 에 owner로 등록
3. 기본 카테고리 5개 seed 삽입

### 초대코드 참여 시
1. `households` 에서 invite_code로 검색
2. `memberships` 에 member로 등록

---

## 현재 구현 완료 기능

- [x] 구글 OAuth 로그인
- [x] 그룹 생성 / 초대코드 참여
- [x] 지출 입력 (금액, 카테고리, 날짜, 메모, 사진)
- [x] 지출 내역 리스트 (날짜 그룹, 카테고리/기간 필터, 삭제)
- [x] 대시보드 (이번 달 합계, 카테고리별 요약, 최근 5건)
- [x] 통계 (파이 차트, 월별 바 차트, 기간 선택)
- [x] 설정 (프로필, 초대코드 복사, 로그아웃)
- [x] Supabase Storage 영수증 사진 업로드

---

## 남은 작업 (TODO)

- [ ] 지출 수정 기능 (현재 삭제만 가능)
- [ ] 카테고리 추가/편집 UI (현재 seed 고정)
- [ ] PWA 설정 (모바일 홈화면 추가)
- [ ] 영수증 AI 인식 (Google Vision OCR 연동 옵션)
- [ ] 반응형 데스크톱 레이아웃
- [ ] 지출 입력 시 중복 제출 방지 (debounce)

---

## 로컬 실행

```bash
npm install
cp .env.example .env   # 환경변수 채우기
npm run dev
```

## 배포 (Vercel)

```bash
npm run build
# Vercel Dashboard 또는 vercel CLI로 배포
# 환경변수 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 설정 필수
```

---

## 주요 컨벤션

- 금액은 항상 정수(원 단위), `formatKRW()` 유틸로 표시
- 날짜는 `YYYY-MM-DD` 문자열로 저장, dayjs로 포맷
- 카테고리 color는 hex 문자열
- 에러는 `react-hot-toast`로 표시, 성공도 동일
- Supabase 쿼리는 hook 내부에서만 호출, 페이지 컴포넌트에서 직접 호출 금지
