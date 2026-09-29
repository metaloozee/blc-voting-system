// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VotingSystem
 * @notice Simple decentralized election MVP for Blockchain lab.
 *         Owner creates an election with candidates; any address may vote once;
 *         owner ends the election; winner is readable after end.
 */
contract VotingSystem {
    address public owner;

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    string public electionTitle;
    bool public electionCreated;
    bool public electionEnded;
    uint256 public candidateCount;

    mapping(uint256 => Candidate) private _candidates;
    mapping(address => bool) public hasVoted;

    event ElectionCreated(string title, uint256 candidateCount);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event ElectionEnded(uint256 indexed winnerId, string winnerName, uint256 winnerVotes);

    error NotOwner();
    error ElectionAlreadyCreated();
    error ElectionNotCreated();
    error ElectionAlreadyEnded();
    error ElectionNotEnded();
    error AlreadyVoted();
    error InvalidCandidate();
    error EmptyTitle();
    error NeedCandidates();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Create a new election with a title and candidate names.
     * @param title Election title
     * @param names Array of candidate display names (at least 2)
     */
    function createElection(string calldata title, string[] calldata names)
        external
        onlyOwner
    {
        if (electionCreated) revert ElectionAlreadyCreated();
        if (bytes(title).length == 0) revert EmptyTitle();
        if (names.length < 2) revert NeedCandidates();

        electionTitle = title;
        electionCreated = true;
        electionEnded = false;

        for (uint256 i = 0; i < names.length; i++) {
            require(bytes(names[i]).length > 0, "Empty candidate name");
            candidateCount++;
            _candidates[candidateCount] = Candidate({
                id: candidateCount,
                name: names[i],
                voteCount: 0
            });
        }

        emit ElectionCreated(title, candidateCount);
    }

    /**
     * @notice Cast one vote for a candidate while the election is open.
     */
    function vote(uint256 candidateId) external {
        if (!electionCreated) revert ElectionNotCreated();
        if (electionEnded) revert ElectionAlreadyEnded();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (candidateId == 0 || candidateId > candidateCount) revert InvalidCandidate();

        hasVoted[msg.sender] = true;
        _candidates[candidateId].voteCount += 1;

        emit VoteCast(msg.sender, candidateId);
    }

    /**
     * @notice Owner ends the election and emits the current winner.
     */
    function endElection() external onlyOwner {
        if (!electionCreated) revert ElectionNotCreated();
        if (electionEnded) revert ElectionAlreadyEnded();

        electionEnded = true;

        (uint256 winnerId, string memory winnerName, uint256 winnerVotes) = _computeWinner();
        emit ElectionEnded(winnerId, winnerName, winnerVotes);
    }

    function getCandidate(uint256 candidateId)
        external
        view
        returns (uint256 id, string memory name, uint256 voteCount)
    {
        if (candidateId == 0 || candidateId > candidateCount) revert InvalidCandidate();
        Candidate storage c = _candidates[candidateId];
        return (c.id, c.name, c.voteCount);
    }

    function getAllCandidates()
        external
        view
        returns (Candidate[] memory)
    {
        Candidate[] memory list = new Candidate[](candidateCount);
        for (uint256 i = 1; i <= candidateCount; i++) {
            list[i - 1] = _candidates[i];
        }
        return list;
    }

    /**
     * @notice Returns the winning candidate after the election ends.
     *         Ties: lowest candidate id among tied leaders wins.
     */
    function getWinner()
        external
        view
        returns (uint256 winnerId, string memory winnerName, uint256 winnerVotes)
    {
        if (!electionCreated) revert ElectionNotCreated();
        if (!electionEnded) revert ElectionNotEnded();
        return _computeWinner();
    }

    function _computeWinner()
        private
        view
        returns (uint256 winnerId, string memory winnerName, uint256 winnerVotes)
    {
        uint256 bestVotes = 0;
        uint256 bestId = 0;
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (_candidates[i].voteCount > bestVotes) {
                bestVotes = _candidates[i].voteCount;
                bestId = i;
            }
        }
        if (bestId == 0 && candidateCount > 0) {
            // All zero votes — treat first candidate as winner
            bestId = 1;
            bestVotes = 0;
        }
        return (bestId, _candidates[bestId].name, bestVotes);
    }
}
