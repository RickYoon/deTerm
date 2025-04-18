'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { fetchCryptoData, fetchHistoricalData } from '../lib/api';
import { usePrivy, useLinkAccount, useWallets, useSignMessage } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';

// TradingView 위젯 타입 선언
declare global {
  interface Window {
    TradingView: any;
  }
}

interface NewsItem {
  date: string;
  headline: string;
  sentiment: 'POS' | 'NEUT' | 'NEG';
}

interface BlockchainStats {
  blockSize: number;
  difficulty: string;
  totalBitcoin: number;
  hashRate: string;
  transactionFees: number;
}

interface TechnicalIndicator {
  name: string;
  value: number | string;
  signal: 'BUY' | 'SELL' | 'N/A';
}

interface FundingRate {
  symbol: string;
  openInterest: string;
  backpack: {
    rate: string;
    volatility: string;
  };
  binance: {
    rate: string;
    volatility: string;
  };
  bybit: {
    rate: string;
    volatility: string;
  };
  okx: {
    rate: string;
    volatility: string;
  };
  hyperliquid: {
    rate: string;
    volatility: string;
  };
  fundingArb: string;
  arbStrategy: {
    long: string;
    short: string;
  };
}

// Position 인터페이스 추가
interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entry: number;
  liq: number;
  pnl: number;
  roe: number;
  exchange: string;
  fundingRate: number;
  nextFundingTime: string;
  liquidationRisk: number;
}

interface LinkedAccount {
  type: string;
  address?: string;
  chainType?: string;
  walletClientType?: string;
  connectorType?: string;
}

interface WalletWithMetadata {
  chainType: string;
  address: string;
  active?: boolean;
  walletClientType?: string;
  connectorType?: string;
}

interface PrivyLinkSuccess {
  linkedAccount: {
    type: string;
    address?: string;
    walletClientType?: string;
  };
}

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const widgetRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentSymbol, setCurrentSymbol] = useState('BINANCE:BTCUSDT');
  const [timeframe, setTimeframe] = useState('1');
  const [chartKey, setChartKey] = useState(0); // 차트 강제 리렌더링을 위한 키
  const [priceData, setPriceData] = useState<number[]>([]);
  const [cryptoInfo, setCryptoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fundingRates, setFundingRates] = useState<FundingRate[]>([]);
  const { user, login, authenticated, logout, linkWallet, unlinkWallet } = usePrivy();
  const { wallets, ready } = useWallets();
  const [showCommandOutput, setShowCommandOutput] = useState(false);
  const [commandOutput, setCommandOutput] = useState('');
  const { 
    linkEmail, 
    linkGoogle, 
    linkDiscord, 
    linkTwitter 
  } = useLinkAccount({
    onSuccess: (data: any) => {
      console.log('Successfully linked account:', data);
    },
    onError: (error) => {
      console.error('Failed to link account:', error);
    }
  });
  const [linkedWallets, setLinkedWallets] = useState<WalletWithMetadata[]>([]);
  const [activeWalletAddress, setActiveWalletAddress] = useState<string>('');
  const { signMessage } = useSignMessage();
  const { wallets: solanaWallets } = useSolanaWallets();
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [signingMessage, setSigningMessage] = useState('');
  const [showAnnualRate, setShowAnnualRate] = useState(false);

  // 포지션 상태 추가
  const [positions, setPositions] = useState<Position[]>([
    {
      symbol: 'BTCUSDT',
      side: 'LONG',
      size: 0.5,
      entry: 42150.5,
      liq: 38000,
      pnl: 325.5,
      roe: 15.4,
      exchange: 'Backpack',
      fundingRate: 0.01,
      nextFundingTime: '2024-04-01T12:00:00',
      liquidationRisk: 25
    },
    {
      symbol: 'ETHUSDT',
      side: 'SHORT',
      size: 2.5,
      entry: 2250.8,
      liq: 2450,
      pnl: -125.3,
      roe: -5.5,
      exchange: 'Hyperliquid',
      fundingRate: -0.02,
      nextFundingTime: '2024-04-01T12:00:00',
      liquidationRisk: 65
    }
  ]);

  const news: NewsItem[] = [
    { date: '12-31', headline: "CoinDesk's Most Influential in Crypto...", sentiment: 'POS' },
    { date: '01-04', headline: "Rethinking Crypto as an Asset Class...", sentiment: 'NEUT' },
    { date: '01-04', headline: "Falling Crypto Prices Aren't Stoppi...", sentiment: 'NEUT' },
    { date: '01-04', headline: "Stablecoin Issuers May Need License...", sentiment: 'POS' },
    { date: '01-04', headline: "Overstock Makes Key Executive Chang...", sentiment: 'NEUT' },
  ];

  const technicalIndicators: TechnicalIndicator[] = [
    { name: 'OBV', value: -2621705145.22, signal: 'N/A' },
    { name: 'WILLR', value: -62.35, signal: 'SELL' },
    { name: 'MOM (1)', value: 0.89, signal: 'BUY' },
    { name: 'RSI (4)', value: 51.94, signal: 'SELL' },
    { name: 'EMA (6)', value: 3811.86, signal: 'N/A' },
  ];

  // 사용 가능한 명령어 목록
  const commands = {
    'HELP': '도움말 표시',
    'SYMB': '차트 심볼 변경 (예: SYMB BTCUSDT)',
    'TIME': '차트 타임프레임 변경 (예: TIME 5)',
    'FUND': '펀딩레이트 정보 표시',
    'CONN': '지갑 연결',
    'DISC': '지갑 연결 해제',
    'EXEC': '선택된 거래 실행',
    'QUIT': '터미널 종료'
  };

  // 명령어 자동완성 필터링
  const filterCommands = (input: string) => {
    const upperInput = input.toUpperCase();
    return Object.entries(commands)
      .filter(([cmd]) => cmd.startsWith(upperInput))
      .map(([cmd, desc]) => `${cmd.padEnd(6)} - ${desc}`);
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    let term: XTerm | null = null;

    requestAnimationFrame(() => {
      term = new XTerm({
        theme: {
          background: '#000000',
          foreground: '#ffb300',
          cursor: '#ffb300',
          green: '#00ff00',
          cyan: '#ffffff',
          red: '#ff0000',
          yellow: '#ffb300',
        },
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        allowProposedApi: true,
        rows: 10, // 터미널 높이를 10줄로 증가
        cols: 80,
        convertEol: false,
        scrollback: 1000, // 스크롤백 버퍼 크기 증가
        windowsMode: false,
        cursorStyle: 'block'
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      const writePrompt = () => {
        if (!term) return;
        term.write('\r\n\x1b[1;33mCOMMAND>\x1b[0m ');
      };

      try {
        if (!term || !terminalRef.current) return;
        
        terminalRef.current.style.overflow = 'hidden';
        
        term.open(terminalRef.current);
        term.write('\x1b[2J');
        term.write('Welcome to deTerminal v1.0\r\n');
        term.write('Type HELP for available commands\r\n');
        
        term.options.windowsMode = false;
        term.options.scrollback = 1000;
        
        fitAddon.fit();
        writePrompt();

        let currentLine = '';
        let cursorPosition = 0;

        const handleKey = ({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
          if (!term) return;
          
          const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

          if (domEvent.keyCode === 13) { // Enter
            const command = currentLine.trim().toUpperCase();
            if (command) {
              setInputHistory(prev => [...prev, command]);
              const response = handleCommand(command);
              term.write('\r\n' + response);
            }
            currentLine = '';
            cursorPosition = 0;
            writePrompt();
          } else if (domEvent.keyCode === 8) { // Backspace
            if (cursorPosition > 0) {
              currentLine = currentLine.slice(0, -1);
              cursorPosition--;
              term.write('\b \b');
            }
          } else if (printable) {
            currentLine += key;
            cursorPosition++;
            term.write(key);
          }

          // 현재 입력 상태 저장
          setCurrentInput(currentLine);
        };

        term.onKey(handleKey);

        const handleResize = () => {
          try {
            fitAddon.fit();
          } catch (e) {
            console.error('Error resizing terminal:', e);
          }
        };

        window.addEventListener('resize', handleResize);
        xtermRef.current = term;

        return () => {
          window.removeEventListener('resize', handleResize);
          term?.dispose();
          xtermRef.current = null;
        };
      } catch (error) {
        console.error('Error initializing terminal:', error);
      }
    });

    return () => {
      term?.dispose();
      xtermRef.current = null;
    };
  }, [suggestions, currentInput]); // 의존성 추가

  // TradingView 스크립트 로드
  useEffect(() => {
    if (window.TradingView) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // 차트 위젯 생성 및 관리
  useEffect(() => {
    const initWidget = () => {
      if (!window.TradingView || !containerRef.current) return;

      // 이전 위젯 정리
      if (widgetRef.current) {
        try {
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
        } catch (e) {
          console.error('Error cleaning up widget:', e);
        }
      }

      try {
        widgetRef.current = new window.TradingView.widget({
          width: '100%',
          height: '100%',
          autosize: true,
          symbol: currentSymbol,
          interval: timeframe,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'kr',
          toolbar_bg: '#000000',
          enable_publishing: false,
          hide_top_toolbar: true,
          hide_legend: true,
          save_image: false,
          container_id: 'tradingview_widget',
          backgroundColor: '#000000',
          gridColor: '#1c1c1c',
          hide_volume: true,
          allow_symbol_change: true,
          studies: [],
          drawings_access: { type: 'black', tools: [] },
          enabled_features: [],
          disabled_features: [
            "header_compare",
            "header_symbol_search",
            "timeframes_toolbar",
            "left_toolbar",
            "volume_force_overlay",
            "show_interval_dialog_on_key_press",
            "chart_property_page_trading",
            "chart_property_page_scales",
            "chart_property_page_style",
            "chart_property_page_studies",
            "legend_widget",
            "order_panel",
            "create_volume_indicator_by_default"
          ],
          overrides: {
            "mainSeriesProperties.candleStyle.upColor": "#00ff00",
            "mainSeriesProperties.candleStyle.downColor": "#ff0000",
            "mainSeriesProperties.candleStyle.borderUpColor": "#00ff00",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ff0000",
            "mainSeriesProperties.candleStyle.wickUpColor": "#00ff00",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ff0000",
          }
        });
      } catch (e) {
        console.error('Error creating widget:', e);
      }
    };

    // TradingView 스크립트가 로드되었는지 확인
    const checkAndInitWidget = () => {
      if (window.TradingView) {
        initWidget();
      } else {
        setTimeout(checkAndInitWidget, 100);
      }
    };

    checkAndInitWidget();

    return () => {
      if (widgetRef.current) {
        try {
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
          widgetRef.current = null;
        } catch (e) {
          console.error('Error in cleanup:', e);
        }
      }
    };
  }, [currentSymbol, timeframe]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [crypto, history] = await Promise.all([
          fetchCryptoData(),
          fetchHistoricalData('bitcoin', 1)
        ]);
        setCryptoInfo(crypto);
        setPriceData(history);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, []);

  // 펀딩비 데이터 가져오기
  useEffect(() => {
    const fetchFundingRates = async () => {
      try {
        const response = await fetch('/api/funding');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setFundingRates(data.topTen); // 상위 10개만 기본적으로 표시
      } catch (error) {
        console.error('Error fetching funding rates:', error);
      }
    };

    fetchFundingRates();
    const interval = setInterval(fetchFundingRates, 30000); // 30초마다 업데이트

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.linkedAccounts) {
      console.log('전체 linkedAccounts:', user.linkedAccounts);
      
      const wallets = (user.linkedAccounts as LinkedAccount[])
        .filter(account => account.type === 'wallet')
        .map(account => {
          console.log('각 지갑 정보:', account.chainType);
          
          // chainType이 ethereum인 경우 EVM으로 변경
          const chainType = account.chainType === 'ethereum' ? 'EVM' : account.chainType;
          // chainType이 ethereum인 경우 EVM으로 변경
          const clientType = account.walletClientType === 'privy' ? 'Privy' : account.walletClientType;
          const connectorType = account.connectorType === 'embedded' ? 'embedded' : "external";
          
          return {
            chainType: chainType || '',
            address: account.address || '',
            active: account.address === activeWalletAddress,
            walletClientType: clientType || 'External',
            connectorType: connectorType || 'external'
          };
        });
      
      console.log('변환된 wallets:', wallets);
      setLinkedWallets(wallets);
      
      // Set first wallet as active by default if none is active
      if (!activeWalletAddress && wallets.length > 0) {
        setActiveWalletAddress(wallets[0].address);
      }
    }
  }, [user?.linkedAccounts, activeWalletAddress]);

  // 숫자 포맷팅 함수
  const formatRate = (rate: number) => {
    return (rate * 100).toFixed(4) + '%';
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  // 주소 포맷팅 함수
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 시간 포맷팅 함수 추가
  const formatTimeUntilFunding = (nextFundingTime: string) => {
    const next = new Date(nextFundingTime).getTime();
    const now = Date.now();
    const diff = next - now;
    const minutes = Math.floor(diff / 1000 / 60);
    return `${minutes}m`;
  };

  // 터미널 명령어 처리 함수 수정
  const handleCommand = (command: string) => {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    let response = '';

    switch (cmd) {
      case 'HELP':
        response = Object.entries(commands)
          .map(([cmd, desc]) => `${cmd.padEnd(6)} - ${desc}`)
          .join('\r\n');
        setCommandOutput(response);
        setShowCommandOutput(true);
        return '';
      
      case 'SYMB':
        if (args[0]) {
          const symbol = args[0].toUpperCase();
          setCurrentSymbol(`BINANCE:${symbol}`);
          setChartKey(prev => prev + 1);
          return `Changed symbol to ${symbol}`;
        }
        return 'Usage: SYMB [SYMBOL] (e.g., SYMB BTCUSDT)';
      
      case 'TIME':
        if (args[0]) {
          setTimeframe(args[0]);
          setChartKey(prev => prev + 1);
          return `Changed timeframe to ${args[0]}`;
        }
        return 'Usage: TIME [INTERVAL] (e.g., TIME 5, TIME 60, TIME D)';
      
      case 'CONN':
        login();
        return 'Connecting wallet...';
      
      case 'DISC':
        logout();
        return 'Disconnecting wallet...';
      
      case 'QUIT':
        window.close();
        return 'Closing terminal...';
      
      default:
        return `Unknown command: ${cmd}. Type HELP for available commands.`;
    }
  };

  // WalletSection 컴포넌트 업데이트
  const WalletSection = () => {
    if (!authenticated || !user) {
      return (
        <div className="text-xs text-terminal-text">
          Please connect your wallet to continue.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#666]">Status:</span>
          <span className="text-xs text-green-500">Connected</span>
        </div>
        
        {/* 연결된 지갑 목록 */}
        <div className="space-y-2">
          {linkedWallets.map((wallet, index) => {
            const connectedWallet = wallets.find(w => w.address === wallet.address);
            const isConnected = !!connectedWallet;

            return (
              <div 
                key={index} 
                className="flex justify-between items-center p-2 bg-[#111] rounded group relative hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="space-y-1">
                  <div className="text-xs text-[#ffb300]">
                    {wallet.chainType === 'solana' ? 'Solana' : 'EVM'}
                    {wallet.connectorType === 'embedded' ? ' (Embedded)' : ` (${wallet.walletClientType || 'External'})`}
                  </div>
                  <div className="text-xs text-terminal-text">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </div>
                </div>
                {wallet.address === activeWalletAddress ? (
                  <div className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                    Active
                  </div>
                ) : (
                  <button 
                    onClick={async () => {
                      try {
                        setActiveWalletAddress(wallet.address);
                      } catch (error) {
                        console.error("지갑 활성화 실패:", error);
                        alert("지갑 활성화 실패: " + (error as Error).message);
                      }
                    }}
                    className="hidden group-hover:block text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  >
                    {isConnected ? 'Set Active' : 'Connect'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 계정 링크 옵션 */}
        <div className="space-y-2 pt-4">
          <div className="text-xs text-[#666] mb-2">Wallet Actions:</div>
          <button
            onClick={linkWallet}
            className="w-full text-xs text-left p-2 hover:bg-[#111] rounded flex items-center space-x-2"
          >
            <span className="text-[#ffb300]">+ Link New Wallet</span>
          </button>
          <button
            onClick={async () => {
              try {
                console.log("activeWalletAddress", activeWalletAddress);
                console.log("ready", ready);
                console.log("user wallet status:", user?.wallet);
                
                // 지갑 준비 상태 체크
                if (!ready) {
                  alert("지갑 연결 상태를 확인 중입니다. 잠시만 기다려주세요.");
                  return;
                }

                // 연결된 지갑이 없는 경우 처리
                if (!activeWalletAddress) {
                  const connectWallet = window.confirm(
                    "연결된 지갑이 없습니다. 지갑을 연결하시겠습니까?"
                  );
                  if (connectWallet) {
                    await login();
                    return;
                  } else {
                    throw new Error("서명을 위해서는 지갑 연결이 필요합니다.");
                  }
                }

                let signature;
                const message = `${activeWalletAddress} is voting for ${currentSymbol} project`;
                
                // 현재 활성화된 지갑 찾기
                const activeWallet = linkedWallets.find(w => w.address === activeWalletAddress);
                
                if (!activeWallet) {
                  throw new Error("활성화된 지갑을 찾을 수 없습니다.");
                }

                // 임베디드 지갑인 경우
                if (activeWallet.connectorType === 'embedded') {
                  // Solana 임베디드 지갑
                  if (activeWallet.chainType === 'solana') {
                    setSigningMessage(message);
                    setShowSigningModal(true);
                    return;
                  } 
                  // EVM 임베디드 지갑
                  else {
                    const { signature: embeddedSignature } = await signMessage(
                      { message },
                      { 
                        uiOptions: {
                          title: 'You are voting for foobar project'
                        },
                        address: activeWalletAddress
                      }
                    );
                    signature = embeddedSignature;
                  }
                }
                // 외부 지갑인 경우
                else {
                  if (activeWallet.chainType === 'solana') {
                    // Solana 외부 지갑 서명
                    const solanaWallet = solanaWallets.find(w => w.address === activeWalletAddress);
                    if (!solanaWallet) {
                      throw new Error("연결된 Solana 지갑을 찾을 수 없습니다.");
                    }
                    signature = await solanaWallet.signMessage(
                      new TextEncoder().encode(message)
                    );
                  } else {
                    // EVM 외부 지갑 서명
                    const externalWallet = wallets.find(w => w.address === activeWalletAddress);
                    if (!externalWallet) {
                      throw new Error("연결된 EVM 지갑을 찾을 수 없습니다.");
                    }
                    const provider = await externalWallet.getEthereumProvider();
                    signature = await provider.request({
                      method: 'personal_sign',
                      params: [message, activeWalletAddress]
                    });
                  }
                }

                console.log("Signature:", signature);
                alert("서명 성공!");
              } catch (error) {
                console.error("서명 실패:", error);
                alert("서명 실패: " + (error as Error).message);
              }
            }}
            className="w-full text-xs text-left p-2 hover:bg-[#111] rounded flex items-center space-x-2"
          >
            <span className="text-[#ffb300]">🖋 Sign Message (Test Connection)</span>
          </button>
          <button
            onClick={logout}
            className="w-full text-xs text-left p-2 hover:bg-[#111] rounded flex items-center space-x-2 text-red-500"
          >
            <span>Disconnect All</span>
          </button>
        </div>
      </div>
    );
  };

  // 포지션 섹션 컴포넌트
  const PositionSection = () => (
    <div className="space-y-2">
      {positions.map((pos, index) => (
        <div key={index} className="text-xs font-mono border-b border-terminal-border pb-2 last:border-0">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[#ffb300]">{pos.symbol}</span>
              <span className={pos.side === 'LONG' ? 'text-green-500' : 'text-red-500'}>
                {pos.side} {pos.size}x
              </span>
            </div>
            <span className={`px-1 rounded ${pos.liquidationRisk > 60 ? 'bg-red-500/20 text-red-500' : 'text-[#666]'}`}>
              Risk {pos.liquidationRisk}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex justify-between">
              <span className="text-[#666]">{pos.exchange}</span>
              <span className="text-white">${pos.entry.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Liq</span>
              <span className="text-red-500">${pos.liq}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">PnL</span>
              <span className={pos.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                ${Math.abs(pos.pnl).toFixed(1)} ({pos.roe}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Funding</span>
              <span className={pos.fundingRate >= 0 ? 'text-green-500' : 'text-red-500'}>
                {(pos.fundingRate * 100).toFixed(4)}% ({formatTimeUntilFunding(pos.nextFundingTime)})
              </span>
            </div>
          </div>
        </div>
      ))}
      {positions.length === 0 && (
        <div className="text-[#666] text-xs text-center py-4">
          No active positions
        </div>
      )}
    </div>
  );

  // SigningModal 컴포넌트 추가
  const SigningModal = () => {
    if (!showSigningModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] border border-terminal-border rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-[#ffb300]">You are voting for foobar project</h3>
            <button 
              onClick={() => setShowSigningModal(false)}
              className="text-[#666] hover:text-[#ffb300]"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <div className="text-sm text-terminal-text">
              Signing this message will not cost you any fees.
            </div>
            <div className="bg-[#111] p-3 rounded text-xs font-mono break-all">
              {signingMessage}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSigningModal(false)}
                className="px-4 py-2 text-sm text-[#666] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const solanaWallet = solanaWallets.find(w => w.address === activeWalletAddress);
                    if (!solanaWallet) {
                      throw new Error("연결된 Solana 지갑을 찾을 수 없습니다.");
                    }
                    const signature = await solanaWallet.signMessage(
                      new TextEncoder().encode(signingMessage)
                    );

                    console.log("Signature:", signature);
                    alert("서명 성공!");
                    setShowSigningModal(false);
                  } catch (error) {
                    console.error("서명 실패:", error);
                    alert("서명 실패: " + (error as Error).message);
                  }
                }}
                className="px-4 py-2 text-sm bg-[#ffb300] text-black rounded hover:bg-[#ffa200] transition-colors"
              >
                Sign and continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full min-h-screen bg-terminal-bg text-terminal-text p-4">
      <SigningModal />
      <div className="border border-terminal-border rounded p-2">
        {/* 터미널 입력 섹션을 상단으로 이동 */}
        <div className="mb-2 border border-terminal-border rounded bg-terminal-bg">
          <div ref={terminalRef} className="w-full h-[3em]" />
        </div>

        {/* 명령어 결과 오버레이 */}
        {showCommandOutput && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-[#000000] border border-terminal-border rounded p-4 shadow-lg min-w-[400px]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#ffb300] text-xs font-bold">Command Output</span>
              <button 
                onClick={() => setShowCommandOutput(false)}
                className="text-[#666] hover:text-[#ffb300] text-xs"
              >
                [X]
              </button>
            </div>
            <pre className="text-white text-xs font-mono whitespace-pre-wrap">
              {commandOutput}
            </pre>
          </div>
        )}

        <div className="grid grid-cols-12 gap-2 h-[calc(100vh-8rem)]">
          {/* 지갑 정보 섹션 */}
          <div className="col-span-4 border border-terminal-border rounded p-2 h-[calc(50vh)]">
            <div className="bg-[#111] text-xs font-bold p-1 mb-2">CONNECTED WALLETS</div>
            <WalletSection />
          </div>

          {/* 차트 섹션 */}
          <div className="col-span-5 border border-terminal-border rounded p-2 h-[calc(50vh)]">
            <div className="bg-[#111] text-xs font-bold p-1 mb-2 flex justify-between items-center">
              <span>{currentSymbol.replace('BINANCE:', '')} PRICE CHART</span>
              <span className="text-terminal-text">{timeframe}</span>
            </div>
            <div className="h-[calc(50vh-4rem)] overflow-hidden">
              <div
                ref={containerRef}
                id="tradingview_widget"
                className="w-full h-full"
                style={{ maxHeight: 'calc(50vh - 4rem)' }}
              />
            </div>
          </div>

          {/* 포지션 섹션으로 변경 */}
          <div className="col-span-3 border border-terminal-border rounded p-2 h-[calc(50vh)]">
            <div className="bg-[#111] text-xs font-bold p-1 mb-2 flex justify-between items-center">
              <span>POSITIONS</span>
              <span className="text-[#666]">{positions.length} Active</span>
            </div>
            <div className="h-[calc(50vh-4rem)] overflow-y-auto">
              <PositionSection />
            </div>
          </div>

          {/* 펀딩비 섹션 */}
          <div className="col-span-12 border border-terminal-border rounded p-2">
            <div className="bg-[#111] text-xs font-bold p-1 mb-2 flex justify-between items-center">
              <span>FUNDING COMPARISON (8h Rate)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAnnualRate(!showAnnualRate)}
                  className="bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ffb300] px-2 py-1 rounded text-xs"
                >
                  {showAnnualRate ? '8h Rate' : 'Annual Rate'}
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-50vh-8rem)]">
              <table className="w-full text-xs font-mono">
                <thead className="sticky top-0 bg-[#000000]">
                  <tr className="text-[#ffb300]">
                    <th className="text-left p-1">Rank</th>
                    <th className="text-left p-1">Name</th>
                    <th className="text-right p-1">Open Interest</th>
                    <th className="text-right p-1">Backpack</th>
                    <th className="text-right p-1">Hyperliquid</th>
                    <th className="text-right p-1">Arb Profit</th>
                    <th className="text-center p-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fundingRates.map((rate, index) => (
                    <tr key={rate.symbol} className="border-t border-terminal-border hover:bg-[#111]">
                      <td className="text-left p-1 text-[#666]">{index + 1}</td>
                      <td className="text-left p-1 text-[#ffb300]">{rate.symbol}</td>
                      <td className="text-right p-1 text-white">${formatNumber(parseFloat(rate.openInterest))}</td>
                      <td className={`text-right p-1 ${parseFloat(rate.backpack.rate) > 0 ? 'text-green-500' : parseFloat(rate.backpack.rate) < 0 ? 'text-red-500' : 'text-white'}`}>
                        {showAnnualRate ? `${(parseFloat(rate.backpack.rate) * 1095).toFixed(2)}` : rate.backpack.rate}%
                      </td>
                      <td className={`text-right p-1 ${parseFloat(rate.hyperliquid.rate) > 0 ? 'text-green-500' : parseFloat(rate.hyperliquid.rate) < 0 ? 'text-red-500' : 'text-white'}`}>
                        {showAnnualRate ? `${(parseFloat(rate.hyperliquid.rate) * 1095).toFixed(2)}` : rate.hyperliquid.rate}%
                      </td>
                      <td className="text-right p-1 text-yellow-500">
                        {showAnnualRate ? `${(parseFloat(rate.fundingArb) * 1095).toFixed(2)}` : rate.fundingArb}%
                      </td>
                      <td className="text-center p-1">
                        <button
                          onClick={() => {
                            if (!authenticated) {
                              login();
                              return;
                            }
                            // TODO: 실제 거래 실행 로직 구현
                            const strategy = rate.arbStrategy;
                            console.log(`Executing arb strategy for ${rate.symbol}:`, strategy);
                          }}
                          className="bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ffb300] px-2 py-1 rounded text-xs"
                        >
                          {authenticated ? (
                            <>
                              {rate.arbStrategy.long === 'BACKPACK' ? (
                                <>Long BP / Short HL</>
                              ) : (
                                <>Long HL / Short BP</>
                              )}
                            </>
                          ) : (
                            'Connect Wallet'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 