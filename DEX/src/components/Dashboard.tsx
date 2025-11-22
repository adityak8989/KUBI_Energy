
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
  { name: 'Mon', generated: 125, consumed: 75 },
  { name: 'Tue', generated: 150, consumed: 100 },
  { name: 'Wed', generated: 110, consumed: 90 },
  { name: 'Thu', generated: 225, consumed: 125 },
  { name: 'Fri', generated: 250, consumed: 150 },
  { name: 'Sat', generated: 300, consumed: 200 },
  { name: 'Sun', generated: 275, consumed: 175 },
];

const Dashboard: React.FC<DashboardProps> = ({ dex, setCurrentView }) => {
  const { currentUser, balances, simulateGeneration, mpts, isLoading, users, transferNFT, mintAndTransferNFTs } = dex;
  const [generationAmount, setGenerationAmount] = useState('50');
  const [isMinting, setIsMinting] = useState(false);
  const [transferMode, setTransferMode] = useState<'none' | 'to-prosumer' | 'to-consumer'>('none');
  const [transferCount, setTransferCount] = useState('1');
  const [isTransferring, setIsTransferring] = useState(false);

  const acceptedMpts = mpts.filter(m => m.accepted && m.transferable).length;

  const handleSimulateGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(generationAmount);
    if (!isNaN(amount) && amount > 0) {
      setIsMinting(true);
      try {
        const metadata = {
          sourceType: 'Solar_PV' as const,
          generationTime: new Date().toISOString(),
          certificateId: `CERT-${Date.now()}`,
          geoLocation: 'Grid_Zone_007',
        };
        await simulateGeneration(amount, metadata);
        setGenerationAmount('10');
      } finally {
        setIsMinting(false);
      }
    } else {
      alert('Please enter a valid amount.');
    }
  };

  const handleBatchTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If no mode selected, mint and transfer to current user
    let targetUser = currentUser;
    
    if (transferMode !== 'none') {
      // If a specific destination is selected, use that instead
      targetUser = transferMode === 'to-prosumer'
        ? users.find(u => u.role === 'PROSUMER')
        : users.find(u => u.role === 'CONSUMER');

      if (!targetUser) {
        alert(`No ${transferMode === 'to-prosumer' ? 'Prosumer' : 'Consumer'} user found.`);
        return;
      }
    }

    const count = parseInt(transferCount, 10);
    if (isNaN(count) || count <= 0 || count > 10) {
      alert('Please enter a valid count (1-10).');
      return;
    }

    setIsTransferring(true);
    try {
      const metadata = {
        sourceType: 'Solar_PV' as const,
        generationTime: new Date().toISOString(),
        certificateId: `CERT-${Date.now()}`,
        geoLocation: 'Grid_Zone_007',
      };

      console.log(`Starting batch transfer: ${count} NFTs to ${targetUser.name} (${targetUser.id})`);
      const result = await mintAndTransferNFTs(count, targetUser, metadata);
      
      if ((result as any).error) {
        alert(`Transfer failed: ${(result as any).error}`);
      } else {
        const completed = (result as any).completed || 0;
        alert(`Successfully transferred ${completed}/${count} NFTs to ${targetUser.name}`);
        setTransferMode('none');
        setTransferCount('1');
      }
    } catch (error) {
      console.error('Batch transfer error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTransferring(false);
    }
  };

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
          <>
            {/* MPT Minting Status */}
            <Card>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-dex-gray-800 flex items-center">
                  <span className="mr-2">⚡</span> Your Energy Tokens (MPTs)
                </h3>
                <p className="text-sm text-dex-gray-600 mt-1">
                  {acceptedMpts > 0 
                    ? `You have ${acceptedMpts} Energy Token${acceptedMpts !== 1 ? 's' : ''} ready to sell on the marketplace.` 
                    : 'Mint Energy Tokens below to start trading.'}
                </p>
              </div>
              
              {acceptedMpts > 0 && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800">✓ Ready to Trade</p>
                  <p className="text-xs text-green-700 mt-1">
                    Visit the <button onClick={() => setCurrentView('marketplace')} className="underline font-semibold hover:text-green-900">Marketplace</button> to create sell offers.
                  </p>
                </div>
              )}

              {mpts.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-dex-gray-700 mb-3">Your NFT Energy Tokens</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {mpts.map((mpt) => (
                      <div key={mpt.nftId} className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-dex-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-dex-gray-800">
                              {mpt.metadata?.sourceType === 'Solar_PV' ? '☀️' : '💨'} {mpt.metadata?.sourceType || 'Energy Token'}
                            </p>
                            <p className="text-xs text-dex-gray-600 mt-1 font-mono truncate">
                              ID: {mpt.nftId.slice(0, 16)}...
                            </p>
                            <p className="text-xs text-dex-gray-600">
                              Generated: {new Date(mpt.metadata?.generationTime || '').toLocaleString()}
                            </p>
                            {mpt.metadata?.geoLocation && (
                              <p className="text-xs text-dex-gray-600">
                                Location: {mpt.metadata.geoLocation}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-2">
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                              mpt.transferable && mpt.accepted
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {mpt.transferable && mpt.accepted ? '✓ Ready' : 'Processing'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Minting Form */}
            <Card>
              <h3 className="text-lg font-bold mb-4 text-dex-gray-800">Smart Meter Simulation</h3>
              <p className="text-sm text-dex-gray-600 mb-4">
                Manually simulate energy generation to mint new Energy Tokens (MPT NFTs) to your wallet.
              </p>
              <form onSubmit={handleSimulateGeneration} className="space-y-4">
                <div>
                  <label htmlFor="generation" className="block text-sm font-medium text-dex-gray-700 mb-1">
                    Amount to Mint (kWh)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="generation"
                      type="number"
                      value={generationAmount}
                      onChange={(e) => setGenerationAmount(e.target.value)}
                      disabled={isMinting || isLoading}
                      className="flex-1 px-4 py-2 border border-dex-gray-300 rounded-md focus:ring-dex-blue focus:border-dex-blue bg-dex-gray-50 text-dex-blue placeholder:text-dex-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="10"
                      min="1"
                      step="1"
                    />
                    <span className="text-dex-gray-600 font-medium">kWh</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isMinting || isLoading || !generationAmount || parseFloat(generationAmount) <= 0}
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-dex-green hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
                >
                  <BoltIcon className="h-5 w-5 mr-2"/>
                  {isMinting || isLoading ? 'Minting...' : 'Mint Energy Tokens'}
                </button>
              </form>
              
              <p className="text-xs text-dex-gray-500 mt-4 p-3 bg-dex-gray-50 rounded">
                💡 Each NFT represents 1 kWh of certified renewable energy with metadata including source, generation time, and location.
              </p>
            </Card>

            {/* NFT Batch Transfer Section */}
            <Card>
              <h3 className="text-lg font-bold mb-4 text-dex-gray-800">🚀 Batch Mint & Transfer NFTs</h3>
              <p className="text-sm text-dex-gray-600 mb-6">
                Quickly mint multiple Energy Tokens and transfer them to another wallet. Perfect for testing the energy trading flow.
              </p>
              
              <form onSubmit={handleBatchTransfer} className="space-y-4">
                <div>
                  <label htmlFor="transfer-destination" className="block text-sm font-medium text-dex-gray-700 mb-1">
                    Transfer To
                  </label>
                  <select
                    id="transfer-destination"
                    value={transferMode}
                    onChange={(e) => setTransferMode(e.target.value as any)}
                    disabled={isTransferring || isLoading}
                    className="w-full px-4 py-2 border border-dex-gray-300 rounded-md focus:ring-dex-blue focus:border-dex-blue bg-dex-gray-50 text-dex-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="none">-- Select Destination --</option>
                    <option value="to-prosumer">Prosumer Wallet</option>
                    <option value="to-consumer">Consumer Wallet</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="transfer-count" className="block text-sm font-medium text-dex-gray-700 mb-1">
                    Number of NFTs to Create & Transfer
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="transfer-count"
                      type="number"
                      value={transferCount}
                      onChange={(e) => setTransferCount(e.target.value)}
                      disabled={isTransferring || isLoading}
                      min="1"
                      max="10"
                      step="1"
                      className="flex-1 px-4 py-2 border border-dex-gray-300 rounded-md focus:ring-dex-blue focus:border-dex-blue bg-dex-gray-50 text-dex-blue placeholder:text-dex-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="1"
                    />
                    <span className="text-dex-gray-600 font-medium">NFTs</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isTransferring || isLoading || transferMode === 'none' || !transferCount || parseInt(transferCount, 10) <= 0}
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-dex-blue hover:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isTransferring || isLoading ? 'Transferring...' : '🔄 Mint & Transfer'}
                </button>
              </form>

              <p className="text-xs text-dex-gray-500 mt-4 p-3 bg-blue-50 rounded border border-blue-100">
                ✨ This creates new Energy Tokens directly to the selected wallet. Each transfer includes full metadata (source type, generation time, location).
              </p>
            </Card>
          </>
        )}
      </div>

      <div className="space-y-6">
        <Card>
            <h3 className="text-lg font-bold mb-4 text-dex-gray-800">Account Balance</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-center space-x-3">
                        <ET_Logo className="h-8 w-8"/>
                        <div>
                            <p className="text-sm text-dex-gray-600">Energy Token</p>
                            <p className="text-xl font-bold text-dex-green">{balances.et.toFixed(2)} ET</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                     <div className="flex items-center space-x-3">
                        <USD_Logo className="h-8 w-8"/>
                        <div>
                            <p className="text-sm text-dex-gray-600">USD Balance</p>
                            <p className="text-xl font-bold text-dex-blue">${balances.usd.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>

        {currentUser.role === 'PROSUMER' && (
          <Card>
            <h3 className="text-lg font-bold mb-4 text-dex-gray-800">MPT Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-dex-gray-600">Total NFTs:</span>
                <span className="text-sm font-semibold text-dex-gray-800">{mpts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-dex-gray-600">Ready to Sell:</span>
                <span className="text-sm font-semibold text-dex-green">{acceptedMpts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-dex-gray-600">Processing:</span>
                <span className="text-sm font-semibold text-yellow-600">{mpts.length - acceptedMpts}</span>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <h3 className="text-lg font-bold mb-4 text-dex-gray-800">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => setCurrentView('marketplace')}
              className="w-full text-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-dex-blue hover:bg-blue-800 transition-colors"
            >
              {currentUser.role === 'PROSUMER' ? '📊 View Marketplace' : '🛒 Browse Energy'}
            </button>
            <button
              onClick={() => setCurrentView('wallet')}
              className="w-full text-center px-4 py-3 border border-dex-gray-300 text-base font-medium rounded-md text-dex-gray-700 bg-white hover:bg-dex-gray-50 transition-colors"
            >
              📜 View Transactions
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;