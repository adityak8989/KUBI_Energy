
import React from 'react';
// FIX: Use Balances type instead of Wallet, which is no longer exported.
import type { User, Balances } from '../shared/types';
import { LogoIcon, DashboardIcon, MarketplaceIcon, WalletIcon } from './IconComponents';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: 'dashboard' | 'marketplace' | 'wallet') => void;
  currentUser: User;
  onLogout: () => void;
  // FIX: Prop renamed to `balances` and type changed to `Balances` to match the `useDEX` hook.
  balances: Balances;
  mptCount?: number;
  isConnected?: boolean;
  onReconnect?: () => void;
}

// FIX: Destructure `balances` prop instead of `wallet`.
const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, currentUser, onLogout, balances, mptCount, isConnected, onReconnect }) => {
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
              {/* Connection status */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-block h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`}
                    aria-hidden={true}
                  />
                  <span className="text-xs text-dex-gray-600">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                {/* Reconnect button appears when disconnected and handler provided */}
                {!isConnected && onReconnect && (
                  <button
                    onClick={onReconnect}
                    className="px-2 py-1 text-xs font-medium rounded-md border border-dex-gray-300 text-dex-gray-700 bg-white hover:bg-dex-gray-50 transition-colors duration-150"
                  >
                    Reconnect
                  </button>
                )}
              </div>
              <div className="text-right">
                 {/* FIX: Use `balances.et` and `balances.usd` for consistency with the `useDEX` hook. */}
                 <p className="text-sm font-semibold text-dex-green">{balances.et.toFixed(2)} ET</p>
                 <p className="text-sm font-semibold text-dex-blue">${balances.usd.toFixed(2)}</p>
                {typeof mptCount === 'number' && (
                  <p className="text-xs text-dex-gray-500">MPTs: {mptCount}</p>
                )}
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