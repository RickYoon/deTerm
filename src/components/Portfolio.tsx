'use client';

import React, { useState } from 'react';
import { Project, PortfolioSummary } from '@/types/portfolio';

const initialProjects: Project[] = [
  {
    id: 1,
    name: 'Falcon',
    investDate: '25.03.06',
    progress: 43,
    endDate: '25.09.02',
    remainDays: 137,
    investment: { amount: 150000, currency: 'USDC' },
    return: { amount: 21750, currency: 'USDC' },
    note: '10만 (6개월 차) / 5만 (락 없음) | 월 $40만원 수익 보증 (30%)',
    link: '#'
  },
  {
    id: 2,
    name: 'Fragmetric + RateX',
    investDate: '25.03.25',
    progress: 24,
    endDate: '25.06.30',
    remainDays: 73,
    investment: { amount: 65000, currency: 'USDC' },
    return: { amount: 9425, currency: 'USDC' },
    note: '6월 TGE 예정',
    link: '#'
  },
  // ... 나머지 프로젝트들도 추가
];

export default function Portfolio() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  
  const summary: PortfolioSummary = projects.reduce((acc, project) => ({
    totalInvestment: acc.totalInvestment + project.investment.amount,
    totalReturn: acc.totalReturn + project.return.amount,
    currency: 'USDC'
  }), { totalInvestment: 0, totalReturn: 0, currency: 'USDC' });

  return (
    <div className="w-full">
      <div className="mb-4 p-2 bg-[#111] rounded">
        <h2 className="text-[#ffb300] text-xs font-bold mb-2">디파이 포지션 현황</h2>
        <div className="text-xs text-white">
          - 메인지갑 예치 | $500K
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#111]">
            <tr className="text-[#ffb300]">
              <th className="p-2 text-left">No.</th>
              <th className="p-2 text-left">프로젝트</th>
              <th className="p-2 text-right">투입</th>
              <th className="p-2 text-right">투입이후</th>
              <th className="p-2 text-right">종료</th>
              <th className="p-2 text-right">종료까지</th>
              <th className="p-2 text-right">비율</th>
              <th className="p-2 text-right">리턴</th>
              <th className="p-2 text-right">원화</th>
              <th className="p-2">비고</th>
              <th className="p-2">링크</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-terminal-border hover:bg-[#111]">
                <td className="p-2 text-[#666]">{project.id}</td>
                <td className="p-2 text-[#ffb300]">{project.name}</td>
                <td className="p-2 text-right">{project.investDate}</td>
                <td className="p-2 text-right">{project.progress}%</td>
                <td className="p-2 text-right">{project.endDate}</td>
                <td className="p-2 text-right">{project.remainDays}</td>
                <td className="p-2 text-right text-white">
                  ${project.investment.amount.toLocaleString()}
                </td>
                <td className="p-2 text-right text-green-500">
                  ${project.return.amount.toLocaleString()}
                </td>
                <td className="p-2 text-right text-white">
                  ₩{(project.return.amount * 1300).toLocaleString()}
                </td>
                <td className="p-2 text-[#666]">{project.note}</td>
                <td className="p-2">
                  {project.link && (
                    <a href={project.link} className="text-[#ffb300] hover:underline">
                      링크
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[#111]">
            <tr>
              <td colSpan={6} className="p-2 text-right text-[#666]">Total:</td>
              <td className="p-2 text-right text-white">
                ${summary.totalInvestment.toLocaleString()}
              </td>
              <td className="p-2 text-right text-green-500">
                ${summary.totalReturn.toLocaleString()}
              </td>
              <td className="p-2 text-right text-white">
                ₩{(summary.totalReturn * 1300).toLocaleString()}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
} 