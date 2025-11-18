import React, { useState } from 'react';
import type { Order } from '../shared/types';
import Card from './shared/Card';
import { BoltIcon, ChevronUpIcon, ChevronDownIcon } from './IconComponents';
import { formatDistanceToNow } from 'date-fns';
import * as xrpl from 'xrpl';

interface OrderBookProps {
  title: string;
  orders: Order[];
  type: 'BID' | 'OFFER';
  onExecute: (order: Order) => void;
  currentUserId: string;
  defaultOpen?: boolean;
}

const OrderBook: React.FC<OrderBookProps> = ({ title, orders, type, onExecute, currentUserId, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isOfferBook = type === 'OFFER';

  const formatAmount = (amount: xrpl.Amount) => {
    if (typeof amount === 'string') {
        return xrpl.dropsToXrp(amount);
    }
    return parseFloat(amount.value).toFixed(2);
  }

  const getPrice = (order: Order) => {
      const quality = parseFloat(order.quality);
      // For offers (sell ET for USD), price is quality
      // For bids (buy ET with USD), price is 1 / quality
      return isOfferBook ? quality : 1 / quality;
  }
  
  const getTotal = (order: Order) => {
      const amount = typeof order.pays === 'object' ? parseFloat(order.pays.value) : 0;
      return (amount * getPrice(order)).toFixed(2);
  }

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
                <th scope="col" className={`px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider ${isOfferBook ? 'text-red-600' : 'text-green-600'}`}>Price ($/ET)</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Amount (ET)</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider">Total ($)</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-dex-gray-500 uppercase tracking-wider hidden sm:table-cell">Time</th>
                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Execute</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-dex-gray-200">
              {orders.length > 0 ? orders.map((order) => {
                  const price = getPrice(order);
                  const amountToTrade = isOfferBook ? formatAmount(order.pays) : formatAmount(order.gets);
                  const total = (parseFloat(amountToTrade) * price).toFixed(2);
                  
                  return (
                    <tr key={order.id} className="hover:bg-dex-gray-50">
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-semibold ${isOfferBook ? 'text-red-600' : 'text-green-600'}`}>${price.toFixed(4)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-700">{amountToTrade}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-500">${total}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-dex-gray-500 hidden sm:table-cell">{order.created ? formatDistanceToNow(xrpl.rippleTimeToDate(order.created), { addSuffix: true }) : '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {order.owner !== currentUserId && (
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
                  )
              }) : (
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
