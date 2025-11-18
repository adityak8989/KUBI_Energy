
import React, { useState } from 'react';
import Card from './shared/Card';
import { LogoIcon, WalletIcon } from './IconComponents';

interface LoginProps {
  onLogin: (walletId: string) => boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [walletId, setWalletId] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!walletId) {
      setError('Please enter a wallet ID.');
      return;
    }
    const success = onLogin(walletId);
    if (!success) {
      setError('Invalid wallet ID. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-dex-gray-100 flex flex-col justify-center items-center p-4">
       <div className="flex-shrink-0 flex items-center space-x-3 text-dex-blue mb-8">
            <LogoIcon className="h-12 w-auto" />
            <span className="text-4xl font-bold">DEX</span>
        </div>

      <Card className="w-full max-w-md">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-dex-gray-900">Connect your Wallet</h2>
            <p className="mt-2 text-sm text-dex-gray-600">Enter your wallet ID to access the exchange.</p>
        </div>
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div>
            <label htmlFor="walletId" className="sr-only">
              Wallet ID
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <WalletIcon className="h-5 w-5 text-dex-gray-400" />
                </div>
                <input
                id="walletId"
                name="walletId"
                type="text"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-dex-gray-300 placeholder:text-dex-gray-600 text-dex-blue bg-dex-gray-50 focus:outline-none focus:ring-dex-blue focus:border-dex-blue sm:text-sm"
                placeholder="Enter Wallet ID"
                />
            </div>
          </div>
          
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-dex-blue hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dex-blue"
            >
              Connect Wallet
            </button>
          </div>
        </form>
         <div className="mt-6 text-xs text-dex-gray-500 bg-dex-gray-100 p-3 rounded-md">
            <p className="font-semibold mb-2">For demo purposes, use one of these IDs:</p>
            <ul className="list-disc list-inside space-y-1">
                <li><code className="font-mono bg-dex-gray-200 px-1.5 py-0.5 rounded">user-prosumer-01</code> (Seller)</li>
                <li><code className="font-mono bg-dex-gray-200 px-1.5 py-0.5 rounded">user-consumer-01</code> (Buyer)</li>
            </ul>
        </div>
      </Card>
    </div>
  );
};

export default Login;