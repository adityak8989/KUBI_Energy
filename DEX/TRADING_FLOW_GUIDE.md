# DEX - Decentralized Energy Exchange: Complete Trading Flow Guide

## Overview
This MVP implements a P2P energy trading marketplace using Multi-Purpose Tokens (MPTs) on the XRP Ledger. Energy is tokenized as NFTs with embedded metadata for compliance and verification.

## Key Improvements (Latest Update)

### 1. **Fixed NFT Acceptance Flow** ✅
**Problem:** NFTs were not being properly accepted/transferred to the Prosumer wallet, preventing token sales.

**Solution:** 
- Simplified the NFT transfer mechanism to use a two-step approach:
  1. **Direct Transfer (Primary):** Uses the `Destination` field on NFTokenMint to transfer directly to the recipient
  2. **Fallback Buy/Sell Offers:** If direct transfer fails, creates buy offer from recipient and issuer accepts it
- Added comprehensive error handling with detailed logging
- Automatic retry logic on failures

### 2. **Enhanced MPT State Management** ✅
MPT objects now track:
- `nftId`: NFT identifier on ledger
- `hash`: Legacy support for compatibility
- `amount`: Always 1 for discrete NFT representation
- `metadata`: Complete energy metadata (source, generation time, certificate ID, location)
- `flags`: NFT flags from ledger (transferability indicators)
- `transferable`: Boolean indicating if NFT can be sold
- `accepted`: Boolean indicating if NFT was successfully accepted

### 3. **Improved UI/UX** ✅

#### Dashboard Enhancements:
- **MPT Summary Card:** Shows total NFTs, ready to sell, and processing counts
- **NFT List Display:** Shows all owned MPTs with metadata (source, generation time, location)
- **Status Indicators:** Visual badges showing "Ready" (green) or "Processing" (yellow)
- **Direct Marketplace Link:** One-click access from dashboard to marketplace

#### Marketplace Enhancements:
- **Prosumer View:** Shows "Your MPT Energy Tokens" count and quick list
- **Enhanced NFT Marketplace:** 
  - Better visual cards with source type icons (☀️ for Solar, 💨 for Wind)
  - Shows generation timestamp and pricing in both drops and XRP
  - Better error handling and user feedback
- **Balance Warning:** Shows if prosumer has no tokens available to sell

#### Wallet Enhancements:
- **NFT Status Tracking:** Shows total, ready, and processing counts
- **Detailed NFT Cards:** Full metadata display (source, generation time, certificate ID, location)
- **State Badges:** Visual status indicators for each NFT
- **Improved Sell Modal:** Better UX with token details and price preview

#### TradeForm Enhancements:
- **Real-time Validation:** Checks available MPTs for prosumers, USD balance for consumers
- **Helpful Error Messages:** Clear feedback on why orders can't be placed
- **Loading States:** Visual feedback during order submission
- **Amount Unit Labels:** Shows "NFTs" for prosumers vs "ET" for consumers

## Complete Trading Flow

### Phase 1: Energy Generation (Prosumer)

**Step 1: Navigate to Dashboard**
- Login as Prosumer user (see credentials below)
- View the "Smart Meter Simulation" section

**Step 2: Simulate Energy Generation**
```
Input: 10 kWh
Action: Click "Mint Energy Tokens"
```

**What Happens:**
1. System creates metadata:
   - Source Type: Solar_PV
   - Generation Time: Current timestamp
   - Certificate ID: Auto-generated
   - Geo-Location: Grid_Zone_007

2. Backend performs:
   - Mints NFT on issuer account with URI containing metadata JSON (hex-encoded)
   - Creates buy offer from prosumer wallet (amount = 1 drop)
   - Issuer accepts the buy offer
   - NFT is transferred to prosumer wallet
   - Data is persisted to user's account

**Expected Result:**
- NFT appears in "Your Energy Tokens (MPTs)" section
- Status shows "✓ Ready" (green) once accepted
- MPT count increases in summary

---

### Phase 2: Create Sell Offer (Prosumer)

**Step 1: View Marketplace**
- From Dashboard, click "View Marketplace"
- See "Your MPT Energy Tokens" showing available tokens

**Step 2: Create Sell Offer**
```
Amount: 1 (NFT)
Price: $0.15 (per ET/NFT)
```
- Click "Place Sell Offer"

**What Happens:**
1. System validates:
   - Prosumer owns at least 1 transferable MPT ✓
   - MPT is in "accepted" state ✓
   - MPT has transferable flag set ✓

2. Backend creates NFT sell offer:
   - Creates NFTokenCreateOffer (type = Sell)
   - Sets price in XRP drops (USD converted: $0.15 ≈ 300,000 drops)
   - Offer appears on ledger

3. Offer becomes visible on marketplace

**Expected Result:**
- Offer appears in "Market Buy Bids" section for other users
- Offer appears in "My Active Sell Offers" for prosumer
- Order status: "Active"

---

### Phase 3: Purchase Offer (Consumer)

**Step 1: Login as Consumer**
- Use consumer credentials (see below)
- Navigate to Marketplace

**Step 2: View Available Offers**
- See "Market Sell Offers" section
- View NFT marketplace with all active offers
- Shows: Source Type, Generation Time, Price in XRP and USD

**Step 3: Execute Purchase**
```
Find prosumer's offer
Click "Buy NFT"
Confirm: "Purchase this energy NFT for X.XX XRP?"
```

**What Happens:**
1. System validates:
   - Consumer has enough XRP balance ✓
   - NFT sell offer still exists ✓

2. Backend processes:
   - Submits NFTokenAcceptOffer transaction
   - Uses sell offer index from prosumer
   - Transfers NFT to consumer wallet
   - XRP payment transferred to prosumer

3. Transaction is recorded on ledger

**Expected Result:**
- NFT appears in consumer's wallet
- Consumer sees energy token in "My Energy Tokens"
- Prosumer receives XRP payment
- Marketplace refreshes to remove completed offer

---

### Phase 4: View Transaction History

**Navigate to Wallet Section**
- View all owned MPTs with full details
- See transaction history
- Track all buy/sell activity

**Per MPT, you can see:**
- Source Type (Solar_PV, Wind_Farm)
- Generation Timestamp
- Certificate ID (verifiable)
- Geo-Location (for hyper-local trading)
- Status (Ready/Processing)

---

## Test Accounts

### Prosumer Account (Solar Farm Alpha)
```
Address: rDfNEueAZPPLhaC6HXjvTAmM9JzeEV5NrR
Secret:  sEd7e6gBkktLFwPdJJ5qMrNTNyaGG6s
Role:    PROSUMER
```

### Consumer Account (Eco Conscious Home)
```
Address: r3U1baLKb8PRnaELDvZMMWKtTWTBTpPB7w
Secret:  sEdV2dPUx6xs5wDCag6tXavWWMdqAQX
Role:    CONSUMER
```

### Issuer Account (Central Authority)
```
Address: r416gWnjV4qmivUQ3bx8fJPjW6323XsANP
Secret:  sEdVq6J2vqRXGXiuqU2C4RxbF9VE2c3
Role:    ISSUER (used internally)
```

---

## Testing Checklist

### ✅ NFT Minting
- [ ] Login as Prosumer
- [ ] Go to Dashboard
- [ ] Enter amount: 10 kWh
- [ ] Click "Mint Energy Tokens"
- [ ] Wait for "Minting..." message to complete
- [ ] See "✓ Ready" status badge on NFT
- [ ] NFT count increases

### ✅ NFT Transfer Verification
- [ ] Check MPT appears in Wallet section with full metadata
- [ ] See source type (Solar_PV), generation timestamp, certificate ID
- [ ] Status shows "✓ Ready" (not "Processing")
- [ ] "Sell" button is enabled

### ✅ Create Sell Offer
- [ ] Go to Marketplace as Prosumer
- [ ] Verify "Your MPT Energy Tokens" shows count
- [ ] Enter sell offer: Amount=1, Price=$0.15
- [ ] Click "Place Sell Offer"
- [ ] See confirmation message
- [ ] Offer appears in "My Active Sell Offers"

### ✅ Marketplace Discovery
- [ ] Go to Marketplace as Consumer
- [ ] Verify offer appears in "NFT Marketplace" or "Market Sell Offers"
- [ ] See correct price and source type
- [ ] Metadata is displayed correctly

### ✅ Purchase and Settlement
- [ ] Click "Buy NFT" on prosumer's offer
- [ ] Confirm purchase in dialog
- [ ] See success message
- [ ] NFT appears in consumer's wallet
- [ ] See energy token with full metadata

### ✅ Balance Updates
- [ ] Check prosumer received XRP payment (Wallet → Balance)
- [ ] Check consumer has energy token (Wallet → My MPTs)
- [ ] Both can see transaction in Transaction History

### ✅ State Persistence
- [ ] Refresh browser
- [ ] Log out and log back in
- [ ] All MPTs, offers, and transactions persist
- [ ] Balances are correct

---

## Architecture Highlights

### NFT Metadata Structure (Embedded in URI)
```json
{
  "sourceType": "Solar_PV",
  "generationTime": "2025-11-21T10:30:00Z",
  "certificateId": "CERT-1732188600000",
  "geoLocation": "Grid_Zone_007"
}
```

### Key Ledger Transactions
1. **NFTokenMint** - Creates energy token with metadata
2. **NFTokenCreateOffer** - Creates buy/sell offer
3. **NFTokenAcceptOffer** - Accepts and settles offer
4. **OfferCreate** - Creates market orders (bids/asks)

### State Management
- React Hooks (`useState`) for local component state
- Custom `useDEX` hook manages:
  - User authentication (XRP Ledger wallet)
  - Balance tracking (ET, USD)
  - MPT inventory (NFTs with metadata)
  - Order management (market orders, personal orders)
  - Transaction history
  - Real-time marketplace data

---

## Troubleshooting

### "NFT not appearing after mint"
**Cause:** Direct transfer variant not supported on testnet
**Solution:** System falls back to buy/sell offer mechanism automatically
**Resolution Time:** ~10-30 seconds with polling

### "Insufficient tokens to sell"
**Cause:** MPT still in "Processing" state or not marked as transferable
**Solution:** Wait for status to change to "✓ Ready"
**Check:** Dashboard → Your MPT Energy Tokens section

### "Can't create sell offer with price"
**Cause:** Price input or balance issue
**Solution:** 
- Verify you have at least 1 ready MPT
- Check TradeForm shows error message
- Verify prosumer role selected

### "NFT purchase failed"
**Cause:** Insufficient XRP balance or offer expired
**Solution:** 
- Check balance in Wallet
- Ensure offer still exists on marketplace
- Try again with smaller amount

---

## Performance Notes

- **MPT Polling:** Waits up to 60 seconds for blockchain confirmation
- **Market Refresh:** Scans issuer + all user accounts for offers (can be slow with many NFTs)
- **Balance Updates:** Real-time fetch from XRP Ledger per transaction
- **Metadata Parsing:** Hex-decode + JSON parse of URI field

---

## Future Enhancements

1. **Real Smart Meter Integration:** Connect to actual IoT devices instead of simulation
2. **Dynamic Pricing:** Implement Time-of-Use (TOU) pricing based on generation time
3. **Automated Matching:** Add order matching engine for better UX
4. **Bulk Operations:** Sell multiple MPTs in single transaction
5. **Analytics Dashboard:** Show energy trading analytics and trends
6. **Reputation System:** Track reliable prosumers and consumers
7. **Payment Splitting:** Split payments across multiple prosumers for aggregate orders
8. **Composability:** Allow combining multiple energy tokens into larger offerings

---

## References

- **XRP Ledger NFT Documentation:** https://xrpl.org/nft.html
- **MPT Concept Paper:** Multi-Purpose Tokens for Real-World Assets
- **XRPL.js Library:** https://github.com/XRPLF/xrpl.js
