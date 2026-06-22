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

브라우저에서 http://localhost:3000 을 열어주세요. (본인 PC 개발용)

## 공개 접속 주소 (외부 PC·휴대폰)

**https://pangdaejun.vercel.app**

> `localhost:3000` 은 내 컴퓨터에서만 열립니다. 다른 사람에게 공유할 때는 위 주소를 사용하세요.
> 개인 GitHub 아이디가 URL에 노출되지 않도록 Vercel **프로젝트 이름**을 `pangdaejun`으로 변경하세요.

## Vercel 배포 순서

**맞습니다. API Key는 배포 후 Vercel 대시보드에서 넣습니다.**

### 1단계 — Vercel에 배포

1. https://vercel.com 접속 후 GitHub 계정 연결
2. **Add New Project** → 저장소 Import
3. **Project Name**을 `pangdaejun`으로 설정 (개인정보 노출 방지)
4. **Deploy** 클릭

### 2단계 — API Key 등록

1. Vercel 프로젝트 → **Settings → Environment Variables**
2. Name: `GEMINI_API_KEY` / Value: [Google AI Studio](https://aistudio.google.com/apikey)에서 발급한 키
3. (권장) `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` — [네이버 개발자센터](https://developers.naver.com/) 검색 API
4. Environment: **Production**, **Preview**, **Development** 모두 체크
5. Save

### 3단계 — 재배포

1. **Deployments** 탭 → 최신 배포 → **Redeploy**
2. 배포 완료 후 사이트에서 **🤖 AI 도우미** 탭 테스트

> **참고:** Vercel Serverless에서는 실시간 채팅(Socket.io)과 DB·이미지가 인스턴스마다 초기화될 수 있습니다. AI 기능(API Routes)은 `GEMINI_API_KEY` 설정 후 정상 동작합니다.

## AI 기능 (팩트 기반)

| 기능 | 데이터 출처 |
|------|------------|
| 게시글 AI 추천 | **네이버 지역 검색 API**(설정 시, 리뷰순) → 없으면 **Google 검색** |
| AI 도우미 | **네이버 지역 검색** + **Google 검색** (Gemini 검색 도구) |

> 이전에는 AI 학습 데이터만으로 답변했습니다. 현재는 실제 검색 결과만 사용하도록 변경했습니다.
> 네이버 API 키를 Vercel에 추가하면 한국 맛집·카페 추천 정확도가 크게 올라갑니다.

모델: `gemini-2.5-flash` + Google Search Grounding

## 기술 스택

- Next.js 14 (App Router)
- SQLite (better-sqlite3)
- Socket.io (실시간 채팅)
- Google Gemini API
- TypeScript
