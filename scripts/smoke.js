const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const addrPath = path.join(__dirname, "..", "frontend", "contract-address.json");
  if (!fs.existsSync(addrPath)) {
    throw new Error("contract-address.json missing — run deploy first");
  }
  const { address } = JSON.parse(fs.readFileSync(addrPath, "utf8"));
  if (!address) {
    throw new Error("contract address is null — run deploy first");
  }

  const voting = await hre.ethers.getContractAt("VotingSystem", address);
  const signers = await hre.ethers.getSigners();
  const voter = signers[1];
  const owner = signers[0];

  console.log("Election title:", await voting.electionTitle());
  console.log("Candidates:", (await voting.candidateCount()).toString());

  await (await voting.connect(voter).vote(2)).wait();
  console.log("Voter", voter.address, "voted for candidate 2");

  const c2 = await voting.getCandidate(2);
  console.log("Candidate 2 votes:", c2.voteCount.toString());

  await (await voting.connect(owner).endElection()).wait();
  console.log("Election ended by owner");

  const winner = await voting.getWinner();
  console.log(
    "Winner:",
    winner.winnerName,
    "| id:",
    winner.winnerId.toString(),
    "| votes:",
    winner.winnerVotes.toString()
  );

  if (winner.winnerId !== 2n) {
    throw new Error("SMOKE FAILED: expected candidate 2 to win");
  }
  console.log("SMOKE OK: vote + end + winner happy path succeeded");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
