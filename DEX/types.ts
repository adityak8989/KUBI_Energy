
export type UserRole = 'PROSUMER' | 'CONSUMER';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  kycVerified: boolean;
}

export interface Wallet {
  userId: string;
  etBalance: number;
  usdBalance: number;
}

export type SourceType = 'Solar_PV' | 'Wind_Farm';

export interface MPTMetadata {
  sourceType: SourceType;
  generationTime: string;
  certificateId: string;
  geoLocation: string;
}

export type OrderType = 'BID' | 'OFFER';

export interface Order {
  id: string;
  userId: string;
  type: OrderType;
  amount: number;
  price: number;
  metadata: MPTMetadata;
  timestamp: string;
}

export interface Transaction {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  price: number;
  total: number;
  timestamp: string;
  orderId: string;
}
