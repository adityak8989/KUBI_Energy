
import { useState, useCallback } from 'react';
import type { User, Wallet, Order, Transaction, OrderType, MPTMetadata, SourceType } from '../shared/types';

const initialUsers: User[] = [
  { id: 'user-prosumer-01', name: 'Solar Farm Alpha', role: 'PROSUMER', kycVerified: true },
  { id: 'user-consumer-01', name: 'Eco Conscious Home', role: 'CONSUMER', kycVerified: true },
];

const initialWallets: Wallet[] = [
  { userId: 'user-prosumer-01', etBalance: 150, usdBalance: 500 },
  { userId: 'user-consumer-01', etBalance: 20, usdBalance: 1000 },
];

const generateMetadata = (sourceType: SourceType): MPTMetadata => ({
  sourceType,
  generationTime: new Date().toISOString(),
  certificateId: `http://cert.gov/${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
  geoLocation: `Grid_Zone_${Math.floor(Math.random() * 10) + 1}`,
});

const initialOrders: Order[] = [
  { id: `offer-${Date.now()}-1`, userId: 'user-prosumer-01', type: 'OFFER', amount: 25, price: 0.15, metadata: generateMetadata('Solar_PV'), timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: `offer-${Date.now()}-2`, userId: 'user-prosumer-01', type: 'OFFER', amount: 50, price: 0.16, metadata: generateMetadata('Solar_PV'), timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: `bid-${Date.now()}-3`, userId: 'user-consumer-01', type: 'BID', amount: 10, price: 0.14, metadata: generateMetadata('Solar_PV'), timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: `bid-${Date.now()}-4`, userId: 'user-consumer-01', type: 'BID', amount: 30, price: 0.13, metadata: generateMetadata('Wind_Farm'), timestamp: new Date(Date.now() - 5400000).toISOString() },
];


export const useDEX = () => {
  const [users] = useState<User[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>(initialWallets);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const login = useCallback((walletId: string): boolean => {
    const user = users.find(u => u.id === walletId);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const createOrder = useCallback((userId: string, type: OrderType, amount: number, price: number, sourceType: SourceType) => {
    const newOrder: Order = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      userId,
      type,
      amount,
      price,
      metadata: generateMetadata(sourceType),
      timestamp: new Date().toISOString(),
    };
    setOrders(prev => [...prev, newOrder]);
    
    // Simulate locking assets - for simplicity, we do this on trade execution in this MVP
    // In a real system, funds would be escrowed here.
    alert(`${type} created successfully!`);
  }, []);

  const executeTrade = useCallback((buyerId: string, sellerId: string, orderToExecute: Order) => {
    setWallets(prevWallets => {
      const buyerWallet = prevWallets.find(w => w.userId === buyerId);
      const sellerWallet = prevWallets.find(w => w.userId === sellerId);
      
      if (!buyerWallet || !sellerWallet) return prevWallets;

      const totalCost = orderToExecute.amount * orderToExecute.price;

      if (buyerWallet.usdBalance < totalCost || sellerWallet.etBalance < orderToExecute.amount) {
          alert('Insufficient funds for trade.');
          return prevWallets;
      }
      
      const newWallets = prevWallets.map(w => {
        if (w.userId === buyerId) {
          return { ...w, etBalance: w.etBalance + orderToExecute.amount, usdBalance: w.usdBalance - totalCost };
        }
        if (w.userId === sellerId) {
          return { ...w, etBalance: w.etBalance - orderToExecute.amount, usdBalance: w.usdBalance + totalCost };
        }
        return w;
      });

      const newTransaction: Transaction = {
          id: `txn-${Date.now()}`,
          fromUserId: sellerId,
          toUserId: buyerId,
          amount: orderToExecute.amount,
          price: orderToExecute.price,
          total: totalCost,
          timestamp: new Date().toISOString(),
          orderId: orderToExecute.id
      };
      setTransactions(prev => [newTransaction, ...prev]);

      setOrders(prevOrders => prevOrders.filter(o => o.id !== orderToExecute.id));

      return newWallets;
    });

  }, []);
  
  const simulateGeneration = useCallback((prosumerId: string, amount: number) => {
      setWallets(prev => prev.map(w => {
          if (w.userId === prosumerId) {
              return { ...w, etBalance: w.etBalance + amount };
          }
          return w;
      }));
      alert(`${amount} ET minted successfully!`);
  }, []);


  return {
    users,
    currentUser,
    login,
    logout,
    wallets,
    orders,
    transactions,
    createOrder,
    executeTrade,
    simulateGeneration
  };
};