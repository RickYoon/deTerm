'use client';

import React from 'react';

interface PriceChartProps {
  data: number[];
  height: number;
  width: number;
}

export function PriceChart({ data, height, width }: PriceChartProps) {
  // 데이터 정규화 및 반전 (위가 높은 값이 되도록)
  const normalizedData = data.map((value, i, arr) => {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    return height - 1 - Math.floor(((value - min) / (max - min)) * (height - 1));
  });

  const chart: string[][] = Array(height).fill(0).map(() => Array(width).fill(' '));

  // Y축 값 계산 (위아래 반전)
  const min = Math.min(...data);
  const max = Math.max(...data);
  const yAxisValues = Array(5).fill(0).map((_, i) => 
    Math.round(max - (max - min) * (i / 4))
  );

  // 차트 그리기
  for (let i = 0; i < Math.min(normalizedData.length, width); i++) {
    const y = normalizedData[i];
    for (let j = height - 1; j > y; j--) {
      chart[j][i] = '░';
    }
    chart[y][i] = '▓';
  }

  // Y축 레이블 추가
  const yAxisWidth = Math.max(...yAxisValues.map(v => v.toString().length));

  return (
    <div className="flex text-xs">
      {/* Y축 */}
      <div className="flex flex-col justify-between text-white text-right mr-2">
        {yAxisValues.map((value, i) => (
          <div key={i} style={{ minWidth: `${yAxisWidth}ch` }}>
            {value.toLocaleString()}
          </div>
        ))}
      </div>
      {/* 차트 */}
      <pre className="text-terminal-text leading-none">
        {chart.map((row, i) => (
          <div key={i} className="flex">
            <span className="text-terminal-border mr-1">│</span>
            {row.map((cell, j) => (
              <span key={j} className={cell !== ' ' ? 'text-terminal-text' : ''}>
                {cell}
              </span>
            ))}
          </div>
        ))}
        <div className="flex text-terminal-border">
          ├{'─'.repeat(width)}
        </div>
      </pre>
    </div>
  );
} 