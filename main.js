(() => {
    const KEY = "mgc.app.state.v1";
    const SPHERAI_KERNEL_PATH = "../active/modules/spherai/spherai.kernel.html";
    const NAMES = ["Hex", "Ash", "Rook", "Nova", "Moss", "Zero", "Vex", "Ivy"];
    const BOUNTIES = [
        { title: "Convoy Break", cost: 8, reward: 20, tag: "field" },
        { title: "Archive Sweep", cost: 10, reward: 24, tag: "intel" },
        { title: "Relay Repair", cost: 6, reward: 16, tag: "systems" },
        { title: "Lantern Run", cost: 12, reward: 30, tag: "night" },
    ];
    const page = document.body.dataset.page || "home";
    const app = document.getElementById("app");

    const seed = () => ({
        players: [
            { id: 1, name: "Hex", bounty: 12, peer: 3, meme: 1 },
            { id: 2, name: "Ash", bounty: 8, peer: 6, meme: 2 },
            { id: 3, name: "Rook", bounty: 4, peer: 1, meme: 7 },
        ],
        bounties: [
            { id: 1, title: "Convoy Break", cost: 8, reward: 20, tag: "field", status: "open", signups: [1], bets: [] },
            { id: 2, title: "Relay Repair", cost: 6, reward: 16, tag: "systems", status: "open", signups: [2, 3], bets: [{ playerId: 1, verdict: "complete", stake: 4 }] },
        ],
        selectedPlayerId: 1,
        selectedBountyId: 1,
        focusToken: null,
        nextPlayerId: 4,
        nextBountyId: 3,
        spherai: {
            lastSyncAt: null,
            lastPacket: null,
        },
        message: "Dry ground engaged.",
    });

    const normalize = (s) => {
        const f = seed();
        const players = Array.isArray(s.players) && s.players.length ? s.players : f.players;
        const bounties = Array.isArray(s.bounties) && s.bounties.length ? s.bounties : f.bounties;
        return {
            players,
            bounties,
            selectedPlayerId: players.some((p) => p.id === s.selectedPlayerId) ? s.selectedPlayerId : players[0].id,
            selectedBountyId: bounties.some((b) => b.id === s.selectedBountyId) ? s.selectedBountyId : bounties[0].id,
            focusToken: s.focusToken || null,
            nextPlayerId: Number.isFinite(s.nextPlayerId) ? s.nextPlayerId : f.nextPlayerId,
            nextBountyId: Number.isFinite(s.nextBountyId) ? s.nextBountyId : f.nextBountyId,
            spherai: s.spherai && typeof s.spherai === "object" ? {
                lastSyncAt: s.spherai.lastSyncAt || null,
                lastPacket: s.spherai.lastPacket || null,
            } : f.spherai,
            message: s.message || f.message,
        };
    };

    const load = () => {
        try {
            return normalize(JSON.parse(localStorage.getItem(KEY) || "null") || seed());
        } catch {
            return seed();
        }
    };

    let state = load();
    const save = () => localStorage.setItem(KEY, JSON.stringify(state));
    const selectedPlayer = () => state.players.find((p) => p.id === state.selectedPlayerId) || state.players[0];
    const selectedBounty = () => state.bounties.find((b) => b.id === state.selectedBountyId) || state.bounties[0];
    const playerName = (id) => (state.players.find((p) => p.id === id) || {}).name || "Unknown";
    const playerTotal = (p) => p.bounty + p.peer + p.meme;
    const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    }[char]));
    const spend = (player, amount) => {
        let left = amount;
        for (const key of ["bounty", "peer", "meme"]) {
            const take = Math.min(player[key], left);
            player[key] -= take;
            left -= take;
            if (!left) break;
        }
        return left === 0;
    };
    const setMsg = (msg) => { state.message = msg; save(); render(); };
    const nav = [
        { label: "Home", href: "index.html", active: page === "home" },
        { label: "Deadpool", href: "deadpool.html", active: page === "deadpool" },
        { label: "Bounty Board", href: "bounty-board.html", active: page === "bounty-board" },
        { label: "SpherAI Link", href: "spherai.html", active: page === "spherai" },
    ];

    const boardMetrics = () => {
        const totalPoints = state.players.reduce((sum, p) => sum + playerTotal(p), 0);
        const signupCount = state.bounties.reduce((sum, b) => sum + b.signups.length, 0);
        const betCount = state.bounties.reduce((sum, b) => sum + b.bets.length, 0);
        const openBounties = state.bounties.filter((b) => b.status === "open").length;
        const resolvedBounties = state.bounties.length - openBounties;
        const bountyPressure = totalPoints + openBounties * 7 + resolvedBounties * 3 + signupCount * 4 + betCount * 5;
        return {
            playerCount: state.players.length,
            bountyCount: state.bounties.length,
            openBounties,
            resolvedBounties,
            totalPoints,
            averageScore: state.players.length ? totalPoints / state.players.length : 0,
            signupCount,
            betCount,
            bountyPressure,
        };
    };

    const signalState = (pressure) => {
        if (pressure < 42) return "blind";
        if (pressure < 86) return "sighted";
        if (pressure < 144) return "resonant";
        return "hatched";
    };

    const buildSpheraiPacket = (reason = "preview") => {
        const metrics = boardMetrics();
        const p = selectedPlayer();
        const b = selectedBounty();
        const pressure = Math.max(1, metrics.bountyPressure);
        return {
            type: "mgc-board-state",
            version: 1,
            reason,
            timestamp: new Date().toISOString(),
            title: "MGC Deadpool Board",
            signal: {
                state: signalState(pressure),
                pressure,
                strength: Math.min(2400, 360 + pressure * 10),
                radius: Math.min(260, 64 + metrics.openBounties * 18 + metrics.playerCount * 7),
                breath: Math.min(100, 24 + metrics.betCount * 8 + metrics.signupCount * 3),
            },
            metrics,
            selected: {
                operator: { id: p.id, name: p.name, total: playerTotal(p), bounty: p.bounty, peer: p.peer, meme: p.meme },
                bounty: { id: b.id, title: b.title, cost: b.cost, reward: b.reward, tag: b.tag, status: b.status },
            },
            operators: state.players.map((player) => ({
                id: player.id,
                name: player.name,
                total: playerTotal(player),
                bounty: player.bounty,
                peer: player.peer,
                meme: player.meme,
            })),
            bounties: state.bounties.map((bounty) => ({
                id: bounty.id,
                title: bounty.title,
                tag: bounty.tag,
                status: bounty.status,
                cost: bounty.cost,
                reward: bounty.reward,
                signups: bounty.signups.length,
                bets: bounty.bets.length,
            })),
        };
    };

    const lastSyncLabel = () => {
        if (!state.spherai.lastSyncAt) return "not synced";
        try {
            return new Date(state.spherai.lastSyncAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
        } catch {
            return "synced";
        }
    };

    const shell = (title, sub, body) => `
        <section class="shell">
            <header class="topbar">
                <div>
                    <div class="kicker">MGC.app</div>
                    <h1>${title}</h1>
                    <p>${sub}</p>
                </div>
                <nav class="nav-strip" aria-label="Primary">
                    ${nav.map((n) => `<button type="button" class="${n.active ? "is-active" : ""}" data-nav-item data-action="goto" data-href="${n.href}" data-token="nav:${n.href}">${n.label}</button>`).join("")}
                </nav>
            </header>
            ${body}
            <footer class="statusbar">
                <span><strong>Status:</strong> <span data-status-message>${state.message}</span></span>
                <span>
                    <span class="legend-key"><span class="legend-badge">D</span>Move</span>
                    <span class="legend-key"><span class="legend-badge">X</span>Confirm</span>
                    <span class="legend-key"><span class="legend-badge">O</span>Back</span>
                </span>
            </footer>
        </section>`;

    const home = () => shell(
        "Deadpool Board",
        "A PS2-first mockup. Big targets, simple actions, controller flow first.",
        `
            <section class="workspace home">
                <div class="hero-grid">
                    <article class="hero-card">
                        <h2>Small, dry ground</h2>
                        <p>This build keeps the loop simple: browse operators, inspect bounties, and move everything with a controller-like focus model.</p>
                        <div class="hero-cta" style="margin-top:14px;">
                            <button type="button" class="is-primary" data-nav-item data-action="goto" data-href="deadpool.html" data-token="nav:deadpool.html">Enter Deadpool</button>
                            <button type="button" data-nav-item data-action="goto" data-href="bounty-board.html" data-token="nav:bounty-board.html">Open Bounty Board</button>
                            <button type="button" data-nav-item data-action="reset-seed" data-token="action:reset">Reset Seed</button>
                        </div>
                        <div class="hero-tiles">
                            <div class="tile"><div class="title">${state.players.length} operators</div><div class="desc">Three score tracks per operator, kept simple and local.</div></div>
                            <div class="tile"><div class="title">${state.bounties.length} active bounties</div><div class="desc">A small mission board with signups, bets, and a simple open/resolved state.</div></div>
                        </div>
                    </article>
                    <article class="hero-card">
                        <h2>Current focus</h2>
                        <div class="summary-card" style="padding:14px;margin-top:10px;">
                            <div class="meta">Operator</div>
                            <div class="card-title">${selectedPlayer().name}</div>
                            <div class="card-meta">Bounty ${selectedPlayer().bounty} | Peer ${selectedPlayer().peer} | Meme ${selectedPlayer().meme}</div>
                        </div>
                        <div class="summary-card" style="padding:14px;margin-top:10px;">
                            <div class="meta">Bounty</div>
                            <div class="card-title">${selectedBounty().title}</div>
                            <div class="card-meta">Cost ${selectedBounty().cost} | Reward ${selectedBounty().reward} | ${selectedBounty().status}</div>
                        </div>
                    </article>
                </div>
            </section>
        `
    );

    const spheraiPage = () => {
        const preview = buildSpheraiPacket("preview");
        const packet = state.spherai.lastPacket || preview;
        const metrics = preview.metrics;
        const selected = selectedPlayer();
        const signal = preview.signal;
        return shell(
            "SpherAI Link",
            "Deadpool pressure, bounty motion, and operator totals folded into a live kernel packet.",
            `
                <section class="workspace spherai-grid">
                    <aside class="pane signal-pane">
                        <div class="pane-head"><h2>Board Signal</h2><span data-spherai-last>${lastSyncLabel()}</span></div>
                        <div class="signal-core" data-spherai-signal>
                            <div class="signal-state">${signal.state}</div>
                            <div class="signal-pressure">${signal.pressure}</div>
                        </div>
                        <div class="stat-grid compact">
                            <div class="stat"><div class="label">Operators</div><div class="value">${metrics.playerCount}</div></div>
                            <div class="stat"><div class="label">Bounties</div><div class="value">${metrics.openBounties}/${metrics.bountyCount}</div></div>
                            <div class="stat"><div class="label">Points</div><div class="value">${metrics.totalPoints}</div></div>
                        </div>
                        <div class="summary-card bridge-summary">
                            <div class="meta">Selected Operator</div>
                            <div class="card-title">${esc(selected.name)}</div>
                            <div class="card-meta">Total ${playerTotal(selected)} | Average ${metrics.averageScore.toFixed(1)} | Bets ${metrics.betCount}</div>
                        </div>
                        <div class="action-row bridge-actions">
                            <button type="button" class="is-primary" data-nav-item data-action="sync-spherai" data-token="action:sync-spherai">Sync Board</button>
                            <button type="button" data-nav-item data-action="seed-spherai" data-token="action:seed-spherai">Seed Field</button>
                            <button type="button" data-nav-item data-action="open-spherai" data-token="action:open-spherai">Open Kernel</button>
                        </div>
                        <div class="card-meta" data-spherai-ack>Kernel bridge standing by.</div>
                    </aside>
                    <section class="pane kernel-pane">
                        <div class="pane-head"><h2>Kernel View</h2><span>${esc(SPHERAI_KERNEL_PATH)}</span></div>
                        <iframe id="spheraiFrame" class="kernel-frame" src="${SPHERAI_KERNEL_PATH}" title="SpherAI kernel"></iframe>
                    </section>
                    <section class="pane packet-pane">
                        <div class="pane-head"><h2>Packet</h2><span>${esc(packet.reason)}</span></div>
                        <pre id="spheraiPacket">${esc(JSON.stringify(packet, null, 2))}</pre>
                    </section>
                </section>
            `
        );
    };

    const playerCard = (p) => `
        <button type="button" class="card-btn ${p.id === state.selectedPlayerId ? "is-active" : ""}" data-nav-item data-action="select-player" data-id="${p.id}" data-token="player:${p.id}">
            <div class="card-title">${p.name}</div>
            <div class="card-meta">Bounty ${p.bounty} | Peer ${p.peer} | Meme ${p.meme}</div>
        </button>`;

    const deadpool = () => {
        const p = selectedPlayer();
        const total = p.bounty + p.peer + p.meme;
        return shell(
            "Deadpool",
            "A compact operator board. Pick a player on the left, adjust their totals on the right.",
            `
                <section class="workspace split">
                    <aside class="pane">
                        <div class="pane-head"><h2>Operators</h2><span>${state.players.length} loaded</span></div>
                        <div class="card-list">${state.players.map(playerCard).join("")}</div>
                    </aside>
                    <section class="pane">
                        <div class="pane-head"><h2>Selected Operator</h2><span>Focus updates with arrows</span></div>
                        <div class="detail-stack">
                            <div class="detail-card">
                                <h3>${p.name}</h3>
                                <div class="card-meta">A living entry in the shared board.</div>
                                <div class="stat-grid">
                                    <div class="stat"><div class="label">Total</div><div class="value">${total}</div></div>
                                    <div class="stat"><div class="label">Bounty</div><div class="value">${p.bounty}</div></div>
                                    <div class="stat"><div class="label">Peer</div><div class="value">${p.peer}</div></div>
                                </div>
                                <div class="pill-row"><span class="pill">Meme ${p.meme}</span><span class="pill">Operator ID ${p.id}</span></div>
                            </div>
                            <div class="detail-card">
                                <div class="pane-head"><h2>Actions</h2><span>Controller friendly</span></div>
                                <div class="action-row">
                                    <button type="button" class="is-primary" data-nav-item data-action="spawn-player" data-token="action:spawn-player">Spawn Player</button>
                                    <button type="button" data-nav-item data-action="score" data-track="bounty" data-delta="1" data-token="action:bounty+">Bounty +</button>
                                    <button type="button" data-nav-item data-action="score" data-track="peer" data-delta="1" data-token="action:peer+">Peer +</button>
                                    <button type="button" data-nav-item data-action="score" data-track="meme" data-delta="1" data-token="action:meme+">Meme +</button>
                                    <button type="button" data-nav-item data-action="score" data-track="bounty" data-delta="-1" data-token="action:bounty-">Undo Bounty</button>
                                </div>
                            </div>
                        </div>
                    </section>
                </section>
            `
        );
    };

    const bountyCard = (b) => `
        <button type="button" class="card-btn ${b.id === state.selectedBountyId ? "is-active" : ""}" data-nav-item data-action="select-bounty" data-id="${b.id}" data-token="bounty:${b.id}">
            <div class="card-title">${b.title}</div>
            <div class="card-meta">Cost ${b.cost} | Reward ${b.reward} | ${b.status}</div>
            <div class="card-meta">${b.signups.length} signup${b.signups.length === 1 ? "" : "s"} | ${b.bets.length} bet${b.bets.length === 1 ? "" : "s"}</div>
        </button>`;

    const bountyBoard = () => {
        const b = selectedBounty();
        const p = selectedPlayer();
        return shell(
            "Bounty Board",
            "A focused mission board. Left side picks the target, right side shows the move you can make.",
            `
                <section class="workspace split">
                    <aside class="pane">
                        <div class="pane-head"><h2>Active Bounties</h2><span>${state.bounties.length} listed</span></div>
                        <div class="card-list">${state.bounties.map(bountyCard).join("")}</div>
                    </aside>
                    <section class="pane">
                        <div class="pane-head"><h2>Bounty Detail</h2><span>Operator: ${p.name}</span></div>
                        <div class="detail-stack">
                            <div class="detail-card">
                                <h3>${b.title}</h3>
                                <div class="card-meta">${b.tag} sector | ${b.status}</div>
                                <div class="stat-grid">
                                    <div class="stat"><div class="label">Cost</div><div class="value">${b.cost}</div></div>
                                    <div class="stat"><div class="label">Reward</div><div class="value">${b.reward}</div></div>
                                    <div class="stat"><div class="label">Operator</div><div class="value">${p.bounty + p.peer + p.meme}</div></div>
                                </div>
                                <div class="list-block">
                                    <div class="meta">Signups</div>
                                    <div class="card-meta">${b.signups.length ? b.signups.map(playerName).join(", ") : "No signups yet"}</div>
                                    <div class="meta">Bets</div>
                                    <div class="card-meta">${b.bets.length ? b.bets.map((bet) => `${playerName(bet.playerId)} (${bet.verdict}, ${bet.stake})`).join(", ") : "No bets yet"}</div>
                                </div>
                            </div>
                            <div class="detail-card">
                                <div class="pane-head"><h2>Actions</h2><span>Selected operator applies</span></div>
                                <div class="action-row">
                                    <button type="button" class="is-primary" data-nav-item data-action="new-bounty" data-token="action:new-bounty">Create Bounty</button>
                                    <button type="button" data-nav-item data-action="join-bounty" data-token="action:join-bounty">Join Bounty</button>
                                    <button type="button" data-nav-item data-action="bet-bounty" data-verdict="complete" data-token="action:bet-complete">Bet Complete</button>
                                    <button type="button" data-nav-item data-action="toggle-status" data-token="action:toggle-status">Toggle Status</button>
                                    <button type="button" data-nav-item data-action="cycle-operator" data-token="action:cycle-operator">Cycle Operator</button>
                                </div>
                            </div>
                        </div>
                    </section>
                </section>
            `
        );
    };

    const spawnPlayer = () => {
        const base = NAMES[(state.nextPlayerId - 1) % NAMES.length];
        const name = `${base}-${String(state.nextPlayerId).padStart(2, "0")}`;
        state.players.push({ id: state.nextPlayerId, name, bounty: 0, peer: 0, meme: 0 });
        state.selectedPlayerId = state.nextPlayerId;
        state.focusToken = `player:${state.nextPlayerId}`;
        state.nextPlayerId += 1;
        state.message = `Spawned ${name}.`;
        save(); render();
    };

    const scoreSelected = (track, delta) => {
        const p = selectedPlayer();
        p[track] = Math.max(0, p[track] + delta);
        state.focusToken = `player:${p.id}`;
        state.message = `${p.name} ${track} ${delta > 0 ? "increased" : "decreased"}.`;
        save(); render();
    };

    const createBounty = () => {
        const t = BOUNTIES[(state.nextBountyId - 1) % BOUNTIES.length];
        state.bounties.push({ id: state.nextBountyId, title: `${t.title} ${String(state.nextBountyId).padStart(2, "0")}`, cost: t.cost, reward: t.reward, tag: t.tag, status: "open", signups: [], bets: [] });
        state.selectedBountyId = state.nextBountyId;
        state.focusToken = `bounty:${state.nextBountyId}`;
        state.nextBountyId += 1;
        state.message = "New bounty added to the board.";
        save(); render();
    };

    const joinBounty = () => {
        const b = selectedBounty(), p = selectedPlayer();
        if (!spend(p, b.cost)) { setMsg(`${p.name} does not have enough points to join.`); return; }
        if (!b.signups.includes(p.id)) b.signups.push(p.id);
        state.message = `${p.name} signed up for ${b.title}.`;
        save(); render();
    };

    const betBounty = (verdict) => {
        const b = selectedBounty(), p = selectedPlayer(), stake = Math.max(1, Math.min(5, p.bounty + p.peer + p.meme || 2));
        if (!spend(p, stake)) { setMsg(`${p.name} does not have enough points to bet.`); return; }
        b.bets.push({ playerId: p.id, verdict, stake });
        state.message = `${p.name} bet ${verdict} on ${b.title}.`;
        save(); render();
    };

    const toggleStatus = () => {
        const b = selectedBounty();
        b.status = b.status === "open" ? "resolved" : "open";
        state.message = `${b.title} marked ${b.status}.`;
        save(); render();
    };

    const cycleOperator = () => {
        const idx = state.players.findIndex((p) => p.id === state.selectedPlayerId);
        selectPlayer(state.players[(idx + 1) % state.players.length].id);
    };

    const postSpheraiPacket = (packet) => {
        const frame = document.getElementById("spheraiFrame");
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type: "mgc:spherai:seed", source: "mgc.app", packet }, "*");
            return true;
        }
        return false;
    };

    const updateBridgeReadout = (packet) => {
        const status = app.querySelector("[data-status-message]");
        const last = app.querySelector("[data-spherai-last]");
        const signal = app.querySelector("[data-spherai-signal]");
        const packetEl = document.getElementById("spheraiPacket");
        if (status) status.textContent = state.message;
        if (last) last.textContent = lastSyncLabel();
        if (signal) {
            signal.querySelector(".signal-state").textContent = packet.signal.state;
            signal.querySelector(".signal-pressure").textContent = packet.signal.pressure;
        }
        if (packetEl) packetEl.textContent = JSON.stringify(packet, null, 2);
    };

    const syncSpherai = (reason) => {
        const packet = buildSpheraiPacket(reason);
        state.spherai = { lastSyncAt: packet.timestamp, lastPacket: packet };
        state.message = reason === "seed" ? `SpherAI field seeded from ${packet.metrics.playerCount} operators.` : "SpherAI link synced.";
        save();
        postSpheraiPacket(packet);
        updateBridgeReadout(packet);
    };

    const setupSpheraiBridge = () => {
        const frame = document.getElementById("spheraiFrame");
        if (!frame) return;
        const packet = state.spherai.lastPacket || buildSpheraiPacket("preview");
        const send = () => postSpheraiPacket(packet);
        frame.addEventListener("load", send, { once: true });
        window.setTimeout(send, 250);
    };

    const resetSeed = () => { state = seed(); save(); render(); };
    const selectPlayer = (id) => { state.selectedPlayerId = id; state.focusToken = `player:${id}`; state.message = `Operator set to ${playerName(id)}.`; save(); render(); };
    const selectBounty = (id) => { state.selectedBountyId = id; state.focusToken = `bounty:${id}`; state.message = `Bounty selected: ${selectedBounty().title}.`; save(); render(); };

    function handle(button) {
        state.focusToken = button.dataset.token || state.focusToken;
        save();
        const action = button.dataset.action;
        if (action === "goto") return (window.location.href = button.dataset.href);
        if (action === "select-player") return selectPlayer(Number(button.dataset.id));
        if (action === "select-bounty") return selectBounty(Number(button.dataset.id));
        if (action === "spawn-player") return spawnPlayer();
        if (action === "score") return scoreSelected(button.dataset.track, Number(button.dataset.delta));
        if (action === "new-bounty") return createBounty();
        if (action === "join-bounty") return joinBounty();
        if (action === "bet-bounty") return betBounty(button.dataset.verdict);
        if (action === "toggle-status") return toggleStatus();
        if (action === "cycle-operator") return cycleOperator();
        if (action === "reset-seed") return resetSeed();
        if (action === "sync-spherai") return syncSpherai("sync");
        if (action === "seed-spherai") return syncSpherai("seed");
        if (action === "open-spherai") return window.open(SPHERAI_KERNEL_PATH, "_blank", "noopener");
    }

    function render() {
        app.innerHTML = page === "deadpool" ? deadpool() : page === "bounty-board" ? bountyBoard() : page === "spherai" ? spheraiPage() : home();
        const nodes = [...app.querySelectorAll("[data-nav-item]")];
        const focus = (state.focusToken && nodes.find((n) => n.dataset.token === state.focusToken)) || nodes[0];
        if (focus) {
            nodes.forEach((n) => n.classList.toggle("is-focused", n === focus));
            focus.focus({ preventScroll: true });
            state.focusToken = focus.dataset.token;
            save();
        }
        if (page === "spherai") setupSpheraiBridge();
    }

    window.addEventListener("message", (event) => {
        const data = event.data || {};
        if (data.type !== "spherai:mgc:ack") return;
        state.message = `SpherAI accepted ${data.operators} field operators.`;
        save();
        const ack = app.querySelector("[data-spherai-ack]");
        const status = app.querySelector("[data-status-message]");
        if (ack) ack.textContent = `Kernel accepted ${data.operators} operators.`;
        if (status) status.textContent = state.message;
    });

    document.addEventListener("click", (e) => {
        const button = e.target.closest("[data-action]");
        if (button) handle(button);
    });

    document.addEventListener("keydown", (e) => {
        const nodes = [...app.querySelectorAll("[data-nav-item]")];
        if (!nodes.length) return;
        const active = document.activeElement && nodes.includes(document.activeElement) ? document.activeElement : nodes[0];
        const i = nodes.indexOf(active);
        const move = (n) => { const next = nodes[(n + nodes.length) % nodes.length]; next.focus({ preventScroll: true }); state.focusToken = next.dataset.token; save(); };
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); move(i + 1); }
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); move(i - 1); }
        else if (e.key === "Home") { e.preventDefault(); move(0); }
        else if (e.key === "End") { e.preventDefault(); move(nodes.length - 1); }
        else if (e.key === "Enter" || e.key === " ") {
            if (document.activeElement && nodes.includes(document.activeElement)) { e.preventDefault(); document.activeElement.click(); }
        } else if (e.key === "Escape") {
            e.preventDefault();
            if (page === "home") move(0); else window.location.href = "index.html";
        }
    });

    render();
})();
