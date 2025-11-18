
import React from 'react';
import type { useDEX } from '../hooks/useDEX';
import TransactionHistory from './TransactionHistory';
import Card from './shared/Card';
import { ET_Logo, USD_Logo } from './IconComponents';

interface WalletProps {
  dex: ReturnType<typeof useDEX>;
}

const Wallet: React.FC<WalletProps> = ({ dex }) => {
  const { currentUser, wallets, transactions, users } = dex;
  const wallet = wallets.find(w => w.userId === currentUser.id);
  const userTransactions = transactions.filter(t => t.fromUserId === currentUser.id || t.toUserId === currentUser.id);

  if (!wallet) return <div>Loading wallet...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-full">
                    <ET_Logo className="h-8 w-8 text-dex-green"/>
                </div>
                <div>
                    <p className="text-sm font-medium text-dex-gray-500">Energy Token Balance</p>
                    <p className="text-3xl font-bold text-dex-gray-800">{wallet.etBalance.toFixed(2)} ET</p>
                </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                    <USD_Logo className="h-8 w-8 text-dex-blue"/>
                </div>
                <div>
                    <p className="text-sm font-medium text-dex-gray-500">Stablecoin Balance</p>
                    <p className="text-3xl font-bold text-dex-gray-800">${wallet.usdBalance.toFixed(2)}</p>
                </div>
            </div>
          </Card>
      </div>
      <TransactionHistory transactions={userTransactions} currentUserId={currentUser.id} users={users} />
    </div>
  );
};

export default Wallet;
