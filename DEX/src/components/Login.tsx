import React, { useState } from 'react';
import Card from './shared/Card';
import { LogoIcon, WalletIcon } from './IconComponents';

interface LoginProps {
  onLogin: (secret: string) => Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!secret) {
      setError('Please enter an account secret.');
      return;
    }
    setLoading(true);
    const success = await onLogin(secret);
    if (!success) {
      setError('Invalid account secret. Please try again.');
    }
    setLoading(false);
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
            <p className="mt-2 text-sm text-dex-gray-600">Enter your XRPL account secret to access the exchange.</p>
        </div>
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div>
            <label htmlFor="secret" className="sr-only">
              Account Secret
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <WalletIcon className="h-5 w-5 text-dex-gray-400" />
                </div>
                <input
                id="secret"
                name="secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-dex-gray-300 placeholder:text-dex-gray-600 text-dex-blue bg-dex-gray-50 focus:outline-none focus:ring-dex-blue focus:border-dex-blue sm:text-sm"
                placeholder="Enter Account Secret (s...)"
                />
            </div>
          </div>
          
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-dex-blue hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dex-blue disabled:bg-dex-gray-400"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        </form>
         <div className="mt-6 text-xs text-dex-gray-500 bg-dex-gray-100 p-3 rounded-md space-y-3">
            <div>
                <p className="font-semibold mb-2">For demo purposes, use one of these Testnet secrets:</p>
                <ul className="list-disc list-inside space-y-2 text-left">
                    <li>
                        <span className="font-bold">Prosumer (Seller):</span>
                        <code className="block break-all font-mono bg-dex-gray-200 px-1.5 py-0.5 rounded mt-1">sEd7e6gBkktLFwPdJJ5qMrNTNyaGG6s</code>
                    </li>
                    <li>
                        <span className="font-bold">Consumer (Buyer):</span>
                         <code className="block break-all font-mono bg-dex-gray-200 px-1.5 py-0.5 rounded mt-1">sEdV2dPUx6xs5wDCag6tXavWWMdqAQX</code>
                    </li>
                </ul>
            </div>
             <div className="!mt-4 pt-3 border-t border-dex-gray-300 text-red-700 bg-red-50 p-2 rounded-md">
                 <p className="font-bold">SECURITY WARNING:</p>
                 <p>Handling secret keys in the browser is highly insecure and is done here for demonstration purposes only. Never expose your secret keys in a real application.</p>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
