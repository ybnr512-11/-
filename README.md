# 판교 대신 전해드립니다

판교 지역 사람들을 위한 자유 커뮤니티 웹사이트입니다.

## 기능

- **소식 타임라인** — 텍스트와 이미지를 올려 판교 소식을 공유
- **댓글** — 게시글마다 댓글 작성
- **실시간 대화** — Socket.io 기반 실시간 채팅
- **로그인 불필요** — 닉네임만 설정하면 바로 이용 (브라우저 localStorage 저장)

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 열어주세요.

## 기술 스택

- Next.js 14 (App Router)
- SQLite (better-sqlite3)
- Socket.io (실시간 채팅)
- TypeScript
