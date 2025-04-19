export type MenuType = 'TRADING' | 'PORTFOLIO';

export interface MenuItem {
  id: MenuType;
  label: string;
  icon?: string;
} 