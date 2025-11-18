
import React, { useState } from 'react';
import type { useDEX } from '../hooks/useDEX';
import Card from './shared/Card';
import { ET_Logo, USD_Logo, BoltIcon } from './IconComponents';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardProps {
  dex: ReturnType<typeof useDEX>;
  setCurrentView: (view: 'marketplace' | 'wallet') => void;
}

const mockChartData = [
  { name: 'Mon', generated: 25, consumed: 15 },
  { name: 'Tue', generated: 30, consumed: 20 },
  { name: 'Wed', generated: 22, consumed: 18 },
  { name: 'Thu', generated: 45, consumed: 25 },
  { name: 'Fri', generated: 50, consumed: 30 },
  { name: 'Sat', generated: 60, consumed: 40 },
  { name: 'Sun', generated: 55, consumed: 35 },
];

const Dashboard: React.FC<DashboardProps> = ({ dex, setCurrentView }) => {
  // FIX: Destructure `balances` instead of `wallets`. The `wallets` property no longer exists.
  const { currentUser, balances, simulateGeneration } = dex;
  const [generationAmount, setGenerationAmount] = useState('10');

  const handleSimulateGeneration = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(generationAmount);
    if (!isNaN(amount) && amount > 0) {
      // FIX: `simulateGeneration` now only takes the amount as an argument.
      simulateGeneration(amount);
    }
  };

  // FIX: The `balances` object is always present, so we don't need to check for a wallet.
  // The `wallet` variable and its check were removed.

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <h2 className="text-xl font-bold mb-4">Weekly Energy Flow (Simulated)</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis unit=" kWh" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="generated" name="Generated" stroke="#10B981" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="consumed" name="Consumed" stroke="#0A74DA" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {currentUser.role === 'PROSUMER' && (
          <Card>
            <h3 className="text-lg font-bold mb-4">Smart Meter Simulation</h3>
            <p className="text-sm text-dex-gray-600 mb-4">
              Manually simulate energy generation to mint new Energy Tokens (ET) to your wallet.
            </p>
            <form onSubmit={handleSimulateGeneration} className="flex items-center space-x-4">
              <input
                type="number"
                value={generationAmount}
                onChange={(e) => setGenerationAmount(e.target.value)}
                className="w-full px-4 py-2 border border-dex-gray-300 rounded-md focus:ring-dex-blue focus:border-dex-blue bg-dex-gray-50 text-dex-blue placeholder:text-dex-gray-600"
                placeholder="kWh Amount"
              />
              <button type="submit" className="flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-dex-green hover:bg-green-600">
                <BoltIcon className="h-5 w-5 mr-2"/>
                Mint Tokens
              </button>
            </form>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
            <h3 className="text-lg font-bold mb-4">Account Balance</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <ET_Logo className="h-8 w-8"/>
                        <div>
                            <p className="text-sm text-dex-gray-600">Energy Token</p>
                            {/* FIX: Use `balances.et` instead of `wallet.etBalance`. */}
                            <p className="text-xl font-bold text-dex-green">{balances.et.toFixed(2)} ET</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                     <div className="flex items-center space-x-3">
                        <USD_Logo className="h-8 w-8"/>
                        <div>
                            <p className="text-sm text-dex-gray-600">USD Balance</p>
                            {/* FIX: Use `balances.usd` instead of `wallet.usdBalance`. */}
                            <p className="text-xl font-bold text-dex-blue">${balances.usd.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
        <Card>
          <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => setCurrentView('marketplace')}
              className="w-full text-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-dex-blue hover:bg-blue-800"
            >
              {currentUser.role === 'PROSUMER' ? 'Create New Offer' : 'Create New Bid'}
            </button>
            <button
              onClick={() => setCurrentView('wallet')}
              className="w-full text-center px-4 py-3 border border-dex-gray-300 text-base font-medium rounded-md text-dex-gray-700 bg-white hover:bg-dex-gray-50"
            >
              View Transaction History
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;