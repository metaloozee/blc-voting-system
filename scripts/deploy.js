const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
  const voting = await VotingSystem.deploy();
  await voting.waitForDeployment();
  const address = await voting.getAddress();
  console.log("VotingSystem deployed to:", address);

  const title = "Student Council Election 2026";
  const candidates = ["Alice Sharma", "Bob Patil", "Carol Desai"];
  await (await voting.createElection(title, candidates)).wait();
  console.log("Seeded election:", title);
  console.log("Candidates:", candidates.join(", "));
  console.log("candidateCount:", (await voting.candidateCount()).toString());

  const artifact = await hre.artifacts.readArtifact("VotingSystem");
  const frontendDir = path.join(__dirname, "..", "frontend");
  fs.mkdirSync(frontendDir, { recursive: true });

  fs.writeFileSync(
    path.join(frontendDir, "contract-address.json"),
    JSON.stringify({ address, network: "localhost", chainId: 31337 }, null, 2)
  );
  fs.writeFileSync(
    path.join(frontendDir, "abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );
  console.log("Wrote frontend/contract-address.json and frontend/abi.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
