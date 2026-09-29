const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingSystem", function () {
  let voting, owner, voter1, voter2, voter3;

  const TITLE = "Student Council 2026";
  const NAMES = ["Alice", "Bob", "Carol"];

  beforeEach(async function () {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("VotingSystem");
    voting = await Factory.deploy();
    await voting.waitForDeployment();
  });

  async function createElection(contract = voting) {
    await (await contract.createElection(TITLE, NAMES)).wait();
  }

  it("creates an election with title and candidates", async function () {
    await createElection();
    expect(await voting.electionCreated()).to.equal(true);
    expect(await voting.electionTitle()).to.equal(TITLE);
    expect(await voting.candidateCount()).to.equal(3);

    const c1 = await voting.getCandidate(1);
    expect(c1.name).to.equal("Alice");
    expect(c1.voteCount).to.equal(0n);

    const all = await voting.getAllCandidates();
    expect(all.length).to.equal(3);
    expect(all[1].name).to.equal("Bob");
  });

  it("allows an address to vote once for a candidate", async function () {
    await createElection();
    await expect(voting.connect(voter1).vote(2))
      .to.emit(voting, "VoteCast")
      .withArgs(voter1.address, 2);

    expect(await voting.hasVoted(voter1.address)).to.equal(true);
    const c2 = await voting.getCandidate(2);
    expect(c2.voteCount).to.equal(1n);
  });

  it("reverts on double vote from the same address", async function () {
    await createElection();
    await voting.connect(voter1).vote(1);
    await expect(voting.connect(voter1).vote(2)).to.be.revertedWithCustomError(
      voting,
      "AlreadyVoted"
    );
  });

  it("allows owner to end the election", async function () {
    await createElection();
    await voting.connect(voter1).vote(1);
    await voting.connect(voter2).vote(1);

    await expect(voting.connect(owner).endElection())
      .to.emit(voting, "ElectionEnded");

    expect(await voting.electionEnded()).to.equal(true);
  });

  it("returns the correct winner after election ends", async function () {
    await createElection();
    await voting.connect(voter1).vote(3); // Carol
    await voting.connect(voter2).vote(3); // Carol
    await voting.connect(voter3).vote(1); // Alice
    await voting.connect(owner).endElection();

    const winner = await voting.getWinner();
    expect(winner.winnerId).to.equal(3n);
    expect(winner.winnerName).to.equal("Carol");
    expect(winner.winnerVotes).to.equal(2n);
  });

  it("reverts vote after election has ended", async function () {
    await createElection();
    await voting.connect(owner).endElection();
    await expect(voting.connect(voter1).vote(1)).to.be.revertedWithCustomError(
      voting,
      "ElectionAlreadyEnded"
    );
  });

  it("reverts createElection from non-owner", async function () {
    await expect(
      voting.connect(voter1).createElection(TITLE, NAMES)
    ).to.be.revertedWithCustomError(voting, "NotOwner");
  });

  it("reverts getWinner before election ends", async function () {
    await createElection();
    await expect(voting.getWinner()).to.be.revertedWithCustomError(
      voting,
      "ElectionNotEnded"
    );
  });
});
