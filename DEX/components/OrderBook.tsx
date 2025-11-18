import React, { useState } from 'react';
import type { Order, OrderType } from '../types';
import Card from './shared/Card';
import { BoltIcon, ChevronUpIcon, ChevronDownIcon } from './IconComponents';
import { formatDistanceToNow } from 'date-fns';

interface OrderBookProps {
  title: string;
  orders: Order[];
  type: OrderType;
  onExecute: (order: Order) => void;
  currentUserId: string;
  defaultOpen?: boolean;
}

const OrderBook: React.FC<OrderBookProps> = ({ title, orders, type, onExecute, currentUserId, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isOfferBook = type === 'OFFER';

  return (
    <Card>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none"
        aria-expanded={isOpen}
      >
        <h2 className="text-xl font-bold text-dex-gray-800">{title}</h2>
        {isOpen ? (
          <ChevronUpIcon className="h-6 w-6 text-dex-gray-500" />
        ) : (
          <ChevronDownIcon className="h-6 w-6 text-dex-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-dex-gray-200">
            <thead className="bg-dex-gray-50">
              <tr>
                <th scope="col" className={`px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider ${isOfferBook ? 'text-red-600' : 'text-green-600'}`}>Price ($/kWh)</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Amount (kWh)</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Total ($)</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Source</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider hidden sm:table-cell">Time</th>
                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Execute</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-dex-gray-200">
              {orders.length > 0 ? orders.map((order) => (
                <tr key={order.id} className="hover:bg-dex-gray-50">
                  <td className={`px-4 py-4 whitespace-nowrap text-sm font-semibold ${isOfferBook ? 'text-red-600' : 'text-green-600'}`}>${order.price.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-700">{order.amount.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-500">${(order.amount * order.price).toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-500">{order.metadata.sourceType.replace('_', ' ')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-500 hidden sm:table-cell">{formatDistanceToNow(new Date(order.timestamp), { addSuffix: true })}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {order.userId !== currentUserId && (
                      <button
                        onClick={() => onExecute(order)}
                        className={`flex items-center text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-opacity hover:opacity-80 ${isOfferBook ? 'bg-dex-green' : 'bg-red-500'}`}
                      >
                        <BoltIcon className="h-4 w-4 mr-1"/>
                        {isOfferBook ? 'Buy' : 'Sell'}
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={6} className="text-center py-8 text-dex-gray-500">No open {isOfferBook ? 'offers' : 'bids'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default OrderBook;