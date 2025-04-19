# deTerminal

A Multi-chain Wallet Manager with Terminal Interface

## Features

- Multi-chain Wallet Management (EVM, Solana)
  - Create/Manage Embedded Wallets
  - Connect/Manage External Wallets
  - Message Signing
- Real-time Charts (TradingView Integration)
- Terminal-style Interface
- Funding Rate Monitor

## Tech Stack

- Next.js
- TypeScript
- Privy (Wallet Integration)
- TradingView Widget
- Xterm.js
- Tailwind CSS

## Getting Started

1. Set Environment Variables

```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

2. Install Dependencies

```bash
npm install
```

3. Run Development Server

```bash
npm run dev
```

## License

MIT License

1단계: 수동 펀딩 아비트라지 기회 포착
[x] Backpack과 Hyperliquid의 펀딩률 실시간 비교
[x] 수익성 있는 차이 계산 및 표시
[ ] 각 거래소의 포지션 현황 분리해서 보기 쉽게 표시
[ ] 수동 새로고침으로 최신 데이터 확인
2단계: 실행 편의성 개선
[ ] "Execute" 버튼 클릭 시 구체적인 거래 정보 표시
예: "BTC에서 2.3%의 차이 발생, Backpack Long / HL Short 추천"
[ ] 최소 수익률 필터 설정 기능
[ ] 거래 수수료를 고려한 실제 수익 계산
3단계: 자동화 준비
[ ] 자동 거래 실행 전 안전장치 설계
[ ] 위험 관리 파라미터 설정
최대 포지션 크기
최대 레버리지
청산가격 안전마진
[ ] 거래 실행 전 더블체크 기능
4단계: 자동화 구현
[ ] 자동 모니터링 시스템
[ ] 자동 거래 실행
[ ] 포지션 관리 자동화
[ ] 알림 시스템

### 추후 개발 백로그

1. 거래소 간 차익거래 실행 최적화

   - 코인 가격 차이 모니터링
   - 거래소별 매물량(Orderbook) 분석
   - 슬리피지 계산 및 표시
   - 거래소별 수수료 구조 반영

2. 수익성 계산 고도화
   - 진입/청산 슬리피지 예측
   - 거래 수수료 포함 순수익 계산
   - 유동성 기반 최적 거래 사이즈 추천
   - 실시간 위험 경고 시스템
