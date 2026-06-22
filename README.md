# 판교 대신 전해드립니다

판교 지역 사람들을 위한 자유 커뮤니티 웹사이트입니다.

## 기능

- **소식 타임라인** — 텍스트와 이미지를 올려 판교 소식을 공유
- **댓글** — 이미지·지도 URL·현재 위치 공유
- **실시간 대화** — Socket.io 기반 실시간 채팅
- **AI 키워드 추천** — 게시글 키워드(맛집, 카페 등)에 따라 Gemini가 네이버 검색 기반 추천
- **AI 도우미 챗봇** — Gemini 2.5 Flash 기반 판교 생활 정보 Q&A
- **로그인 불필요** — 닉네임만 설정하면 바로 이용

## 실행 방법

```bash
npm install
cp .env.example .env.local
# .env.local에 GEMINI_API_KEY 입력
npm run dev
```

브라우저에서 http://localhost:3000 을 열어주세요.

## Vercel 배포 순서

**맞습니다. API Key는 배포 후 Vercel 대시보드에서 넣습니다.**

### 1단계 — Vercel에 배포

1. https://vercel.com 접속 후 GitHub 계정 연결
2. **Add New Project** → `ybnr512-11/-` 저장소 Import
3. Framework: **Next.js** (자동 감지)
4. **Deploy** 클릭 → 첫 배포 완료 (아직 AI는 동작 안 함)

### 2단계 — API Key 등록

1. Vercel 프로젝트 → **Settings → Environment Variables**
2. Name: `GEMINI_API_KEY` / Value: [Google AI Studio](https://aistudio.google.com/apikey)에서 발급한 키
3. Environment: **Production**, **Preview**, **Development** 모두 체크
4. Save

### 3단계 — 재배포

1. **Deployments** 탭 → 최신 배포 → **Redeploy**
2. 배포 완료 후 사이트에서 **🤖 AI 도우미** 탭 테스트

> **참고:** Vercel Serverless에서는 실시간 채팅(Socket.io)과 DB·이미지가 인스턴스마다 초기화될 수 있습니다. AI 기능(API Routes)은 `GEMINI_API_KEY` 설정 후 정상 동작합니다.

## AI 기능

| 기능 | 설명 |
|------|------|
| 게시글 AI 추천 | 맛집·카페·교통 등 키워드 감지 → Gemini + Google 검색으로 추천 + 네이버 링크 |
| AI 도우미 | 판교 맛집/카페/주차/생활 정보 자유 질문 |

모델: `gemini-2.5-flash`

## 기술 스택

- Next.js 14 (App Router)
- SQLite (better-sqlite3)
- Socket.io (실시간 채팅)
- Google Gemini API
- TypeScript
