
import React from 'react';
import type { User, Wallet } from '../shared/types';
import { LogoIcon, DashboardIcon, MarketplaceIcon, WalletIcon } from './IconComponents';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: 'dashboard' | 'marketplace' | 'wallet') => void;
  currentUser: User;
  onLogout: () => void;
  wallet: Wallet;
}

const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, currentUser, onLogout, wallet }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'marketplace', label: 'Marketplace', icon: MarketplaceIcon },
    { id: 'wallet', label: 'Wallet', icon: WalletIcon },
  ];

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0 flex items-center space-x-2 text-dex-blue">
              <LogoIcon className="h-8 w-auto" />
              <span className="text-2xl font-bold">DEX</span>
            </div>
            <nav className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as any)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                    currentView === item.id
                      ? 'bg-dex-blue text-white'
                      : 'text-dex-gray-600 hover:bg-dex-gray-100 hover:text-dex-gray-900'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
             <div className="hidden sm:flex items-center space-x-4">
               <div className="text-right">
                  <p className="text-sm font-medium text-dex-gray-800">{currentUser.name}</p>
                  <p className="text-xs text-dex-gray-500">{currentUser.role}</p>
              </div>
              <div className="text-right">
                 <p className="text-sm font-semibold text-dex-green">{wallet.etBalance.toFixed(2)} ET</p>
                 <p className="text-sm font-semibold text-dex-blue">${wallet.usdBalance.toFixed(2)}</p>
              </div>
            </div>
             <div className="border-l pl-4 border-dex-gray-200">
                <button
                    onClick={onLogout}
                    className="px-4 py-2 text-sm font-semibold rounded-md border border-dex-gray-300 text-dex-gray-700 bg-white hover:bg-dex-gray-50 transition-colors duration-200"
                >
                    Logout
                </button>
             </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;