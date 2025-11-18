
import React from 'react';
import type { Transaction, User } from '../shared/types';
import Card from './shared/Card';
import { ArrowUpIcon, ArrowDownIcon, ExternalLinkIcon } from './IconComponents';
import { format } from 'date-fns';

interface TransactionHistoryProps {
  transactions: Transaction[];
  currentUserId: string;
  users: User[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, currentUserId, users }) => {
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown User';

  return (
    <Card>
      <h2 className="text-xl font-bold text-dex-gray-800 mb-4">Transaction History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dex-gray-200">
          <thead className="bg-dex-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Amount (kWh)</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Price ($/kWh)</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Total ($)</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider hidden md:table-cell">Counterparty</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider hidden sm:table-cell">Tx ID (Simulated XRPL)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-dex-gray-200">
            {transactions.length > 0 ? transactions.map((tx) => {
              const isSender = tx.fromUserId === currentUserId;
              const counterpartyId = isSender ? tx.toUserId : tx.fromUserId;

              return (
              <tr key={tx.id} className="hover:bg-dex-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  {isSender ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <ArrowUpIcon className="-ml-0.5 mr-1.5 h-4 w-4 text-red-500" />
                      Sell
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <ArrowDownIcon className="-ml-0.5 mr-1.5 h-4 w-4 text-green-500" />
                      Buy
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-600">{format(new Date(tx.timestamp), 'PPp')}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-dex-gray-800">{tx.amount.toFixed(2)}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-600">${tx.price.toFixed(2)}</td>
                <td className={`px-4 py-4 whitespace-nowrap text-sm font-bold ${isSender ? 'text-dex-green' : 'text-red-600'}`}>
                    {isSender ? `+ $${tx.total.toFixed(2)}` : `- $${tx.total.toFixed(2)}`}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-600 hidden md:table-cell">{getUserName(counterpartyId)}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-500 font-mono hidden sm:table-cell">
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    title="View on simulated XRPL explorer"
                    className="inline-flex items-center text-dex-blue hover:underline"
                  >
                    {tx.id.substring(4, 12)}...
                    <ExternalLinkIcon className="h-4 w-4 ml-1.5" />
                  </a>
                </td>
              </tr>
            )}) : (
               <tr>
                  <td colSpan={7} className="text-center py-8 text-dex-gray-500">No transactions yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TransactionHistory;