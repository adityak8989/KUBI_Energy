import React, { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Marketplace from './components/Marketplace';
import Wallet from './components/Wallet';
import Login from './components/Login';
import { useDEX } from './hooks/useDEX';
import { LogoIcon } from './components/IconComponents';

type View = 'dashboard' | 'marketplace' | 'wallet';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('marketplace');
  const dex = useDEX();
  const { currentUser, login, logout, isLoading } = dex;

  if (isLoading) {
    return (
        <div className="min-h-screen bg-dex-gray-100 flex flex-col justify-center items-center p-4">
            <div className="flex items-center space-x-3 text-dex-blue mb-4">
                <LogoIcon className="h-10 w-auto animate-pulse" />
                <span className="text-3xl font-bold">DEX</span>
            </div>
            <p className="text-dex-gray-600">Connecting to the XRP Ledger...</p>
        </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={login} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard dex={dex} setCurrentView={setCurrentView} />;
      case 'marketplace':
        return <Marketplace dex={dex} />;
      case 'wallet':
        return <Wallet dex={dex} />;
      default:
        return <Marketplace dex={dex} />;
    }
  };

  return (
    <div className="min-h-screen bg-dex-gray-100 text-dex-gray-800 font-sans">
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        onLogout={logout}
        // FIX: Pass the `balances` object directly to the Header component instead of the deprecated `wallet` prop.
        balances={dex.balances}
        mptCount={dex.mpts?.length || 0}
        isConnected={dex.isConnected}
        onReconnect={dex.reconnect}
      />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default App;