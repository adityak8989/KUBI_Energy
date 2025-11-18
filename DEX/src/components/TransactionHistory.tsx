import React from 'react';
import type { Transaction } from '../shared/types';
import Card from './shared/Card';
import { ArrowUpIcon, ArrowDownIcon, ExternalLinkIcon, BoltIcon, WalletIcon } from './IconComponents';
import { format } from 'date-fns';
import * as xrpl from 'xrpl';

interface TransactionHistoryProps {
  transactions: Transaction[];
  currentUserId: string;
}

const TransactionRow: React.FC<{ tx: Transaction, currentUserId: string }> = ({ tx, currentUserId }) => {
    const isSender = tx.Account === currentUserId;
    
    let type, details, amount, total;

    switch(tx.TransactionType) {
        case 'Payment':
            const isET = typeof tx.Amount === 'object' && tx.Amount.currency === 'ETK';
            const isUSD = typeof tx.Amount === 'object' && tx.Amount.currency === 'USD';
            const value = typeof tx.Amount === 'object' ? tx.Amount.value : xrpl.dropsToXrp(tx.Amount);

            type = <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isSender ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {isSender ? <ArrowUpIcon className="-ml-0.5 mr-1.5 h-4 w-4" /> : <ArrowDownIcon className="-ml-0.5 mr-1.5 h-4 w-4" />}
                {isSender ? 'Send' : 'Receive'}
            </span>;
            details = isET ? `${value} ET` : (isUSD ? `$${value}` : `${value} XRP`);
            amount = `${isET ? value : ''}`;
            total = <span className={isSender ? 'text-red-600' : 'text-dex-green'}>
                {isSender ? '-' : '+'} {isUSD ? `$${value}` : ''}
            </span>;
            break;
        case 'OfferCreate':
            type = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <BoltIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                Trade
            </span>;
            const gets = typeof tx.TakerGets === 'object' ? `${tx.TakerGets.value} ${tx.TakerGets.currency}` : `${xrpl.dropsToXrp(tx.TakerGets)} XRP`;
            const pays = typeof tx.TakerPays === 'object' ? `${tx.TakerPays.value} ${tx.TakerPays.currency}` : `${xrpl.dropsToXrp(tx.TakerPays)} XRP`;
            details = `Create order: Get ${gets} for ${pays}`;
            break;
        default:
            type = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-dex-gray-100 text-dex-gray-800">
                <WalletIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                {tx.TransactionType}
            </span>
            details = `Sequence: ${tx.Sequence}`;
    }

    return (
        <tr className="hover:bg-dex-gray-50">
            <td className="px-4 py-4 whitespace-nowrap">{type}</td>
            <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-600">{tx.date ? format(xrpl.rippleTimeToDate(tx.date), 'Pp') : '-'}</td>
            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-dex-gray-800">{details}</td>
            <td className="px-4 py-4 whitespace-nowrap text-sm font-bold">{total}</td>
            <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-500 font-mono hidden sm:table-cell">
                <a
                    href={`https://testnet.xrpl.org/transactions/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on XRPL Testnet explorer"
                    className="inline-flex items-center text-dex-blue hover:underline"
                >
                    {tx.hash.substring(0, 12)}...
                    <ExternalLinkIcon className="h-4 w-4 ml-1.5" />
                </a>
            </td>
        </tr>
    );
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, currentUserId }) => {
  return (
    <Card>
      <h2 className="text-xl font-bold text-dex-gray-800 mb-4">Transaction History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dex-gray-200">
          <thead className="bg-dex-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Details</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Total</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider hidden sm:table-cell">Tx Hash</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-dex-gray-200">
            {transactions.length > 0 ? transactions.map((tx) => (
              <TransactionRow key={tx.hash} tx={tx} currentUserId={currentUserId} />
            )) : (
               <tr>
                  <td colSpan={5} className="text-center py-8 text-dex-gray-500">No transactions yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TransactionHistory;
