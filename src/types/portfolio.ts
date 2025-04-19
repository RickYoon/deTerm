export interface Project {
  id: number;
  name: string;
  investDate: string;
  progress: number;
  endDate: string;
  remainDays: number;
  investment: {
    amount: number;
    currency: string;
  };
  return: {
    amount: number;
    currency: string;
  };
  note?: string;
  link?: string;
}

export interface PortfolioSummary {
  totalInvestment: number;
  totalReturn: number;
  currency: string;
} 