export type UserRole = 'PROSUMER' | 'CONSUMER';

export interface User {
  id: string; // XRPL Address
  name: string;
  role: UserRole;
  kycVerified: boolean;
  secret: string; // WARNING: For demo purposes only. NEVER store secrets like this in a real app.
}

export interface Balances {
  et: number;
  usd: number;
}

// Keep Order and Transaction loose (any) to avoid depending on xrpl.js internal typings
export type Order = any & { id: string };

export type Transaction = any & {
  hash: string;
  date?: number;
};

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


