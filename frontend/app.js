let provider, signer, contract, account;
let contractAddress = null;
let abi = null;
let ownerAddress = null;

const $ = (id) => document.getElementById(id);

async function loadConfig() {
  const [addrRes, abiRes] = await Promise.all([
    fetch("./contract-address.json"),
    fetch("./abi.json"),
  ]);
  if (!addrRes.ok) {
    throw new Error("contract-address.json not found — run deploy first");
  }
  const addrJson = await addrRes.json();
  contractAddress = addrJson.address;
  abi = await abiRes.json();
}

function short(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function setStatus(id, msg, isErr = false) {
  const el = $(id);
  el.textContent = msg;
  el.className = "status " + (isErr ? "err" : "ok");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function connect() {
  try {
    if (!window.ethereum) {
      setStatus("voteStatus", "Install MetaMask or use a Web3 wallet.", true);
      return;
    }
    await loadConfig();
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = await signer.getAddress();
    contract = new ethers.Contract(contractAddress, abi, signer);
    ownerAddress = await contract.owner();
    $("accountLabel").textContent = `${short(account)} @ ${contractAddress.slice(0, 10)}…`;
    $("connectBtn").textContent = "Connected";
    await refresh();
  } catch (e) {
    console.error(e);
    setStatus("voteStatus", e.message || String(e), true);
  }
}

async function refresh() {
  if (!contract) return;
  const container = $("candidates");
  container.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    const created = await contract.electionCreated();
    if (!created) {
      $("electionTitle").textContent = "No election yet";
      $("electionMeta").textContent = "Owner must create an election first.";
      container.innerHTML = "";
      $("endBtn").disabled = true;
      return;
    }

    const title = await contract.electionTitle();
    const ended = await contract.electionEnded();
    const count = Number(await contract.candidateCount());
    if (!ownerAddress) ownerAddress = await contract.owner();

    $("electionTitle").textContent = title;
    const statusBadge = ended
      ? '<span class="badge closed">Ended</span>'
      : '<span class="badge open">Open</span>';
    $("electionMeta").innerHTML = `${statusBadge} ${count} candidates · Owner ${short(ownerAddress)}`;

    const isOwner =
      account && ownerAddress && account.toLowerCase() === ownerAddress.toLowerCase();
    $("endBtn").disabled = !isOwner || ended;

    let alreadyVoted = false;
    if (account) {
      alreadyVoted = await contract.hasVoted(account);
    }

    const cards = [];
    for (let id = 1; id <= count; id++) {
      const c = await contract.getCandidate(id);
      const canVote = account && !ended && !alreadyVoted;
      cards.push(`
        <article class="candidate">
          <div>
            <h3>#${c.id} — ${escapeHtml(c.name)}</h3>
            <div class="meta">
              <span class="badge">${c.voteCount.toString()} vote(s)</span>
              ${alreadyVoted ? '<span class="badge voted">You already voted</span>' : ""}
            </div>
          </div>
          ${
            canVote
              ? `<button class="vote" data-id="${c.id}">Vote</button>`
              : ended
              ? `<span class="muted">Voting closed</span>`
              : !account
              ? `<span class="muted">Connect to vote</span>`
              : `<span class="muted">—</span>`
          }
        </article>
      `);
    }
    container.innerHTML = cards.join("");
    container.querySelectorAll("button.vote").forEach((btn) => {
      btn.addEventListener("click", () => castVote(btn.dataset.id));
    });

    if (ended) {
      try {
        const w = await contract.getWinner();
        $("winnerBox").classList.remove("hidden");
        $("winnerBox").innerHTML = `
          <h3>Winner</h3>
          <p><strong>${escapeHtml(w.winnerName)}</strong> (candidate #${w.winnerId.toString()})
          with <strong>${w.winnerVotes.toString()}</strong> vote(s).</p>
        `;
      } catch (e) {
        console.error(e);
      }
    } else {
      $("winnerBox").classList.add("hidden");
    }
  } catch (e) {
    console.error(e);
    container.innerHTML = `<p class="status err">${escapeHtml(e.message || String(e))}</p>`;
  }
}

async function castVote(candidateId) {
  if (!contract || !signer) {
    setStatus("voteStatus", "Connect wallet first.", true);
    return;
  }
  try {
    setStatus("voteStatus", `Submitting vote for candidate #${candidateId}…`);
    const tx = await contract.vote(candidateId);
    await tx.wait();
    setStatus("voteStatus", `Vote recorded for candidate #${candidateId}.`);
    await refresh();
  } catch (err) {
    console.error(err);
    setStatus("voteStatus", err.reason || err.shortMessage || err.message || String(err), true);
  }
}

async function endElection() {
  if (!contract || !signer) {
    setStatus("ownerStatus", "Connect wallet first.", true);
    return;
  }
  try {
    setStatus("ownerStatus", "Ending election…");
    const tx = await contract.endElection();
    await tx.wait();
    setStatus("ownerStatus", "Election ended.");
    await refresh();
  } catch (err) {
    console.error(err);
    setStatus("ownerStatus", err.reason || err.shortMessage || err.message || String(err), true);
  }
}

$("connectBtn").addEventListener("click", connect);
$("refreshBtn").addEventListener("click", refresh);
$("endBtn").addEventListener("click", endElection);

async function browseReadonly() {
  await loadConfig();
  if (!contractAddress) throw new Error("Contract not deployed");
  provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  contract = new ethers.Contract(contractAddress, abi, provider);
  account = null;
  ownerAddress = await contract.owner();
  $("accountLabel").textContent = `Read-only @ ${short(contractAddress)} — connect wallet to vote`;
  await refresh();
}

loadConfig()
  .then(() => browseReadonly())
  .catch((e) => {
    $("accountLabel").textContent = "Deploy contract first (see README)";
    $("electionMeta").textContent = e.message || String(e);
    console.error(e);
  });
