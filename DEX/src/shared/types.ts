import type * as xrpl from 'xrpl';

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

// Using parsed format from xrpl.js for convenience
export type Order = xrpl.Offer & { id: string };

// Using the base Transaction type from xrpl.js and extending it
export type Transaction = xrpl.Transaction & {
    hash: string;
    date: number;
};
