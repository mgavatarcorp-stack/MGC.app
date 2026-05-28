# MGC.app

MGC.app is a lightweight static prototype for a deadpool and bounty-board flow.
It is plain HTML, CSS, and JavaScript with `localStorage` for persistence. It is not a React app, and it is not a Truffle/Web3 project.

## Run Locally

The simplest way to run it is as a static site:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/index.html
```

You can also go directly to:

- `index.html`
- `deadpool.html`
- `bounty-board.html`
- `spherai.html`
- `login.html`
- `signup.html`

The SpherAI bridge embeds `../active/modules/spherai/spherai.kernel.html`, so run the server from the workspace root when you want the iframe integration:

```powershell
cd ..
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/_tmp_MGC_app/spherai.html
```

## What Is In The Repo

- `index.html` is the landing page.
- `deadpool.html` is the main scoreboard-style view.
- `app.html` is a compatibility redirect to `deadpool.html`.
- `bounty-board.html` is the bounty management screen.
- `spherai.html` is the SpherAI bridge and packet inspector.
- `login.html` and `signup.html` are simple auth screens.
- `styles.css` holds the shared presentation.
- `app.js`, `deadpool.js`, `bounty.js`, and `users.js` hold the page logic.
- `Package.json` is now just lightweight project metadata.

## Current Shape

The current app is deliberately simple:

- user accounts and points live in `localStorage`
- bounties and signups are stored locally
- the scoreboard is a browser-rendered list
- the SpherAI link exports the current board as a `postMessage` packet
- the code is intentionally static so it is easy to prototype and easy to port

## How This Maps To PS2 / Free McBoot

This prototype is useful because it lets us work out the structure before we commit to a PS2 runtime.

The later port path should keep the same design constraints:

- controller-first navigation
- fixed screens and simple focus states
- no dependency on typing as the main interaction
- local state that can be serialized to a save format later
- a menu/runtime loop that can be rewritten as a PS2 `.ELF`

So the HTML version is the design sandbox, and the PS2/FMCB version becomes the controller-driven runtime.

## Notes

- The cleanest local workflow is to edit the HTML prototype in a browser and use the JS files as the behavior layer.
- `app.js` is only a legacy compatibility stub now; the useful logic lives in the page-specific scripts.
