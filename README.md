# Decentralized Voting System

Blockchain Mini Project (Semester VII) — owner creates an on-chain election; any wallet votes once; owner ends the election and the winner is published transparently.

**Team:** Riya Jha (47), Rugved Khandake (60), Gaurav Lad (61)  
**College:** Shree L. R. Tiwari College Of Engineering · **Guide:** Asst. Prof. Manasi Churi

## Prerequisites

- Node.js 18+
- MetaMask (for the UI demo)

## Setup

```bash
npm install
npx hardhat compile
npx hardhat test
```

## Demo (~5 steps)

1. Terminal 1: `npx hardhat node`
2. Terminal 2: `npx hardhat run scripts/deploy.js --network localhost`  
   (writes `frontend/contract-address.json` + `frontend/abi.json`, seeds election with 3 candidates)
3. Optional: `npx hardhat run scripts/smoke.js --network localhost`
4. Terminal 3: `npx --yes serve frontend -p 3000` → http://localhost:3000  
   (prefer a static server; `file://` may block JSON fetch)
5. MetaMask: RPC `http://127.0.0.1:8545`, chainId `31337`, import a Hardhat key from the node output → Connect → Vote  
   Use Account #0 (owner) to **End Election** and view the winner.

## Layout

```
contracts/VotingSystem.sol
scripts/deploy.js | smoke.js
test/VotingSystem.js
frontend/          # vanilla HTML/CSS/JS + ethers v6 CDN
report/            # lab report (DOCX + PDF)
```

Local Hardhat only — no public-chain deploy.
