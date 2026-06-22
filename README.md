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

## Vercel 배포 & API Key 설정

1. [Vercel](https://vercel.com)에 프로젝트 연결
2. **Project Settings → Environment Variables** 이동
3. `GEMINI_API_KEY` 추가 (Google AI Studio에서 발급)
4. Redeploy

> **참고:** 실시간 채팅(Socket.io)은 커스텀 서버(`server.js`)가 필요합니다. Vercel Serverless에서는 Socket.io가 제한될 수 있어, AI 기능(API Routes) 위주로 Vercel 배포를 권장합니다.

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
