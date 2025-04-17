# deTerminal

터미널 스타일의 Web3 인터페이스를 제공하는 dApp입니다.

## 주요 기능

- 🔐 멀티체인 지갑 연결 (EVM, Solana)
- 💼 임베디드 월렛 지원
- 📝 메시지 서명
- 💻 터미널 스타일 UI/UX

## 기술 스택

- Next.js 14
- TypeScript
- Tailwind CSS
- Privy (월렛 연결)
- WalletConnect

## 시작하기

1. 저장소 클론

```bash
git clone https://github.com/RickYoon/deTerm.git
cd deTerm
```

2. 의존성 설치

```bash
npm install
```

3. 환경 변수 설정
   `.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

4. 개발 서버 실행

```bash
npm run dev
```

## 라이선스

MIT
