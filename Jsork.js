ChatGPT



We are building an Amtgard ORK dashboard system using:

- Google Sheets + Apps Script backend
- GitHub Pages frontend (HTML/JS)
- JSONP data loading from Apps Script
- Large dataset (100–500+ players)

Current features:
- Player grid (square cards)
- Single player detail panel
- Awards, Masterhoods, Paragons parsing
- Filters (park, awards, masterhoods, paragons)
- Ebonmarch themed UI

Current issues:
- Page freezing on load and filtering
- Large data payload
- Full re-render on every filter

Goal:
- Optimize performance
- Convert fully to GitHub Pages architecture
- Improve UX responsiveness

Start by helping me:
1) Reduce payload size
2) Add pagination or lazy loading
3) Optimize rendering (do NOT re-render entire grid)
4) Keep current visual design intact

I’ll treat the current site as a GitHub Pages front end that only reads JSONP from Apps Script. I’ll focus on shrinking what gets sent first, then making the browser render only what is visible instead of rebuilding the full grid.

Thought for 12s
Yes. Start with this architecture:

Apps Script should send two payloads, not one.

Index payload

{
  updatedAt,
  players: [
    { id, name, park, hasAwards, hasMasterhoods, hasParagons }
  ],
  parks,
  awardTypes,
  masterhoodTypes,
  paragonTypes
}
Detail payload

{
  id,
  name,
  park,
  lastSignIn,
  awards: [],
  masterhoods: [],
  paragons: []
}
That means GitHub Pages loads only the lightweight player list first, then fetches full details only when a card is clicked.

For rendering, do not rebuild all cards. Use:

const PAGE_SIZE = 60;
let filteredPlayers = [];
let visibleCount = PAGE_SIZE;

function renderGrid(reset = false) {
  if (reset) {
    grid.innerHTML = "";
    visibleCount = PAGE_SIZE;
  }

  const slice = filteredPlayers.slice(grid.children.length, visibleCount);

  const frag = document.createDocumentFragment();

  slice.forEach(player => {
    const card = document.createElement("button");
    card.className = "player-card";
    card.dataset.id = player.id;
    card.textContent = player.name;
    frag.appendChild(card);
  });

  grid.appendChild(frag);
}
Then add lazy loading:

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    visibleCount += PAGE_SIZE;
    renderGrid(false);
  }
});
Filtering should only update filteredPlayers, then render the first page:

function applyFilters() {
  const park = parkFilter.value;
  const award = awardFilter.value;
  const masterhood = masterhoodFilter.value;
  const paragon = paragonFilter.value;

  filteredPlayers = allPlayers.filter(p => {
    if (park && p.park !== park) return false;
    if (award && !p.awardKeys?.includes(award)) return false;
    if (masterhood && !p.masterhoodKeys?.includes(masterhood)) return false;
    if (paragon && !p.paragonKeys?.includes(paragon)) return false;
    return true;
  });

  renderGrid(true);
}
Click handling should use one event listener, not one per card:

grid.addEventListener("click", e => {
  const card = e.target.closest(".player-card");
  if (!card) return;

  document.querySelector(".player-card.selected")?.classList.remove("selected");
  card.classList.add("selected");

  loadPlayerDetail(card.dataset.id);
});
Detail loading:

const detailCache = new Map();

function loadPlayerDetail(id) {
  if (detailCache.has(id)) {
    showPlayerDetail(detailCache.get(id));
    return;
  }

  const callbackName = "orkDetail_" + id;

  window[callbackName] = data => {
    detailCache.set(id, data);
    showPlayerDetail(data);
    delete window[callbackName];
  };

  const script = document.createElement("script");
  script.src = `${API_URL}?action=detail&id=${encodeURIComponent(id)}&callback=${callbackName}`;
  document.body.appendChild(script);
}
Apps Script routing:

function doGet(e) {
  const action = e.parameter.action || "index";
  const callback = e.parameter.callback || "callback";

  let data;

  if (action === "detail") {
    data = getPlayerDetail_(e.parameter.id);
  } else {
    data = getPlayerIndex_();
  }

  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(data)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
Main fix order:

Split index and detail payloads.

Render only 50–60 cards at a time.

Use DocumentFragment.

Use one grid click listener.

Cache detail requests.

Debounce filters.

Never rebuild detail data until a player is clicked.

Your uploaded ORK reference file only contains the ORK base route, so I’m using that as the existing endpoint context rather than a full current code review. 



So will need to be walked through how to use git hub setting up a page

We’ll set this up in the simplest path: one GitHub repository, one index.html, and GitHub Pages turned on from the repository settings. I’ll keep it focused on what you click and what files go where.

Thought for a few seconds
Yes. Here is the clean setup path.

1. Create the GitHub repository
Go to GitHub

Click New repository

Name it something like:

ebonmarch-ork-dashboard
Set it to Public

Check Add a README

Click Create repository

GitHub Pages can publish a static site from an index.html file in the repository. 

2. Add your website files
Inside the repository, create these files:

index.html
style.css
script.js
For now:

index.html = page structure

style.css = Ebonmarch visual design

script.js = JSONP loading, filtering, player cards, detail panel

3. Turn on GitHub Pages
Go to the repository

Click Settings

Left side, click Pages

Under Build and deployment

Set Source to:

Deploy from a branch
Branch:

main
Folder:

/root
Click Save

GitHub confirms this is the standard setup for publishing Pages from a branch and root folder. 

4. Your site link will be
Usually:

https://YOUR-GITHUB-NAME.github.io/ebonmarch-ork-dashboard/
5. Important
GitHub Pages is only the front end. Your Apps Script web app stays as the data source:

const API_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
Next step should be building your starter GitHub Pages file set:

index.html
style.css
script.js
with the optimized lazy-loading dashboard structure.


okay let us build the html

I’ll build this as a GitHub Pages-ready static front end: one index.html that can be uploaded directly, with CSS and JS included so you can test it immediately before splitting files later.

Thought for 7s
Built the first GitHub Pages-ready index.html in the canvas.

It includes:

Ebonmarch-style UI

JSONP loading from your Apps Script URL

Player grid

Single selected player panel

Filters

Pagination / lazy loading

Detail caching

No full grid re-render except when filters change

Next we need to make sure your Apps Script returns:

?action=index
and

?action=detail&id=PLAYER_ID

okay

Good. Now we make sure your Apps Script backend matches this HTML, otherwise the page will load but won’t show data.

I’ll walk you through exactly what to build on the Google side.

Step 1 — Open your Apps Script
Go to your script project (the one already deployed as a web app).

You should have a Code.gs

Step 2 — Replace your doGet with this
This is what connects GitHub Pages → your data.

function doGet(e) {
  const action = e.parameter.action || "index";
  const callback = e.parameter.callback || "callback";

  let data;

  if (action === "detail") {
    data = getPlayerDetail_(e.parameter.id);
  } else {
    data = getPlayerIndex_();
  }

  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(data)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
Step 3 — Build the LIGHTWEIGHT index
⚠️ This is the most important performance fix

We only send minimal data here.

function getPlayerIndex_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Players");
  const values = sheet.getDataRange().getValues();

  const headers = values.shift();

  const idx = {
    id: headers.indexOf("PlayerId"),
    name: headers.indexOf("Persona"),
    park: headers.indexOf("Park"),
    awards: headers.indexOf("Awards"),
    masterhoods: headers.indexOf("Masterhoods"),
    paragons: headers.indexOf("Paragons")
  };

  const players = values.map(row => ({
    id: row[idx.id],
    name: row[idx.name],
    park: row[idx.park],

    // lightweight flags only
    awardKeys: splitList_(row[idx.awards]),
    masterhoodKeys: splitList_(row[idx.masterhoods]),
    paragonKeys: splitList_(row[idx.paragons])
  }));

  return {
    updatedAt: new Date().toISOString(),
    players: players
  };
}
Step 4 — Build the DETAIL endpoint
This loads ONLY when a player is clicked.

function getPlayerDetail_(id) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Players");
  const values = sheet.getDataRange().getValues();

  const headers = values.shift();

  const idx = {
    id: headers.indexOf("PlayerId"),
    name: headers.indexOf("Persona"),
    park: headers.indexOf("Park"),
    awards: headers.indexOf("Awards"),
    masterhoods: headers.indexOf("Masterhoods"),
    paragons: headers.indexOf("Paragons")
  };

  const row = values.find(r => String(r[idx.id]) === String(id));
  if (!row) return {};

  return {
    id: row[idx.id],
    name: row[idx.name],
    park: row[idx.park],

    awards: splitList_(row[idx.awards]),
    masterhoods: splitList_(row[idx.masterhoods]),
    paragons: splitList_(row[idx.paragons])
  };
}
Step 5 — helper function
function splitList_(value) {
  if (!value) return [];
  return String(value)
    .split(/[,|;]/)
    .map(s => s.trim())
    .filter(Boolean);
}
Step 6 — Deploy correctly
Click Deploy → Manage deployments

Edit your Web App

Set:

Execute as: Me
Who has access: Anyone
Deploy

Copy the URL

Step 7 — Test directly in browser
Paste this in your browser:

Index test
YOUR_URL?action=index&callback=test
You should see:

test({...data...})
Detail test
YOUR_URL?action=detail&id=12345&callback=test
Step 8 — Plug into your HTML
Your HTML already has:

const API_URL = "YOUR_SCRIPT_URL";
Replace with your real one.

What you just fixed (important)
You have now:

✅ Removed massive payload load
✅ Stopped freezing on page load
✅ Stopped re-rendering everything
✅ Enabled lazy loading
✅ Enabled per-player detail loading

Next step (very important)
After this works, we should:

👉 Compress data further (reduce award strings)
👉 Add caching in Apps Script
👉 Add virtual scrolling (next level performance)

When you’re ready, tell me:

“optimize further”

and I’ll push this into fast at 500+ players with zero lag.


okay right now let us see if this works what is the next steps?

Next steps:

1. Add the Apps Script code
In Code.gs, add:

doGet(e)

getPlayerIndex_()

getPlayerDetail_(id)

splitList_(value)

Save the script.

2. Deploy the web app
Go to:

Deploy → Manage deployments → Edit

Set:

Execute as: Me
Who has access: Anyone
Then click Deploy.

3. Test the data URL
In your browser, test:

YOUR_SCRIPT_URL?action=index&callback=test
You should see something like:

test({"updatedAt":"...","players":[...]})
Then test one player:

YOUR_SCRIPT_URL?action=detail&id=PLAYER_ID&callback=test
4. Add the HTML to GitHub
In your GitHub repo:

Click Add file

Click Create new file

Name it:

index.html
Paste the HTML from the canvas

Click Commit changes

5. Turn on GitHub Pages
Go to:

Settings → Pages

Use:

Source: Deploy from a branch
Branch: main
Folder: /root
Save.

6. Open your site
It should be:

https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/
If the page says Ready and shows cards, the connection works.


what about the script and style?

Right now they are inside the HTML, so you only need:

index.html
The <style> section is the CSS.

The <script> section is the JavaScript.

That is the easiest first test.

Later, after it works, we can split it into:

index.html
style.css
script.js
For now, GitHub repo should look like:

README.md
index.html
That’s enough to test the page.



This screen is the problem — your repo is private, and GitHub Pages won’t work unless one of these is true:

Your options
✅ Option 1 (Recommended): Make repo public
This is the simplest and what you want.

Do this:

Go to Settings → General

Scroll all the way down to Danger Zone

Click Change repository visibility

Select:

Public
Confirm

Then go back to Pages, and you’ll now see the normal setup:

Source: Deploy from a branch
Branch: main
Folder: /root
❌ Option 2: Upgrade (NOT needed)
That “Upgrade / GitHub Enterprise” option is only if you want:

private websites

internal company hosting

You don’t need this.

After you switch to public
Come back to:

Settings → Pages

Set:

Deploy from a branch
main / root
Then GitHub will give you a link like:

https://yourname.github.io/repo-name/
Quick checklist after that
 repo is public

 index.html exists

 Pages enabled

 Apps Script deployed as "Anyone"

 API URL pasted into HTML

Once you flip it to public, tell me:

👉 “pages enabled”

and I’ll help you verify the data connection (this is where most people hit the next issue).



Thought for a couple of seconds
The GitHub page itself is working. The failure is the Apps Script data connection.

Check these in order:

1. Test the Apps Script URL directly
Open this in your browser:

https://script.google.com/macros/s/AKfycbyDBfJzYZwHVZl3INXGX1Lb_SZZXnhADwiEnjZ8XGpzhzQ_KfFSzF8Ked1_0GDMEghH/exec?action=index&callback=test
You should see something like:

test({"updatedAt":"...","players":[...]})
If you see an error, login page, permission message, or plain HTML, the issue is Apps Script.

2. Confirm deployment settings
In Apps Script:

Deploy → Manage deployments → Edit

Set:

Execute as: Me
Who has access: Anyone
Then click Deploy.

Important: after editing code, you must redeploy. Saving is not enough.

3. Your doGet must return JSONP
Your doGet should look like this:

function doGet(e) {
  const action = e.parameter.action || "index";
  const callback = e.parameter.callback || "callback";

  let data;

  if (action === "detail") {
    data = getPlayerDetail_(e.parameter.id);
  } else {
    data = getPlayerIndex_();
  }

  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(data)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
4. Most likely issue
Your Apps Script probably still returns the old dashboard HTML instead of JSONP data.

The GitHub page is asking for:

?action=index&callback=...
But your backend needs to understand that and return:

callbackName({...})
not HTML.

5. Quick next test
Send me what appears when you open:

YOUR_SCRIPT_URL?action=index&callback=test
That will tell us exactly what part is broken.


That link loaded the Kingmakers, we are doing a different page.  

https://script.google.com/macros/s/AKfycbxO5_gSiFx6aj9nMDrfNvhlbev_CZh383ARjk0pZO-BxhwAbtIVxaO0gKp2cImHPJPK/exec

Thought for a couple of seconds
Updated the HTML in the canvas with the correct Apps Script URL.

Now test this direct link:

https://script.google.com/macros/s/AKfycbxO5_gSiFx6aj9nMDrfNvhlbev_CZh383ARjk0pZO-BxhwAbtIVxaO0gKp2cImHPJPK/exec?action=index&callback=test
If that shows test({...}), upload the updated index.html to GitHub.


for the appscript because I think that is the issue right now can you rewrite the index/html for that

Thought for a couple of seconds
Yes. For Apps Script, the file should be named:

Index.html
And your Code.gs should serve it.

Code.gs
function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile("Index")
    .setTitle("Ebonmarch ORK Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
Then create a new Apps Script HTML file named:

Index
Paste this into it:

<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body {
      margin: 0;
      background: #120d0b;
      color: #f4efe6;
      font-family: Georgia, serif;
    }

    .wrap {
      padding: 24px;
    }

    .hero {
      background: linear-gradient(135deg, #6f1d1d, #241714);
      border: 1px solid #d6a94a;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 18px;
    }

    h1 {
      margin: 0;
      color: #f0c96a;
      font-size: 42px;
    }

    .panel {
      border: 1px solid #d6a94a;
      border-radius: 16px;
      background: #1e1b18;
      padding: 16px;
    }

    .filters {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }

    input, select {
      padding: 10px;
      background: #15120f;
      color: #f4efe6;
      border: 1px solid #d6a94a;
      border-radius: 8px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
    }

    .card {
      min-height: 110px;
      background: #27231f;
      color: #f4efe6;
      border: 1px solid rgba(214,169,74,.4);
      border-radius: 12px;
      cursor: pointer;
      padding: 10px;
      text-align: center;
    }

    .card:hover, .card.selected {
      border-color: #f0c96a;
      background: #7f1d1d;
    }

    .detail {
      margin-top: 18px;
      border: 1px solid #d6a94a;
      border-radius: 16px;
      background: #1e1b18;
      padding: 16px;
    }
  </style>
</head>

<body>
  <div class="wrap">
    <div class="hero">
      <h1>Ebonmarch ORK Dashboard</h1>
      <p id="status">Loading players...</p>
    </div>

    <div class="panel">
      <div class="filters">
        <input id="search" placeholder="Search player">
        <select id="park"><option value="">Any Park</option></select>
        <select id="award"><option value="">Any Award</option></select>
        <select id="masterhood"><option value="">Any Masterhood</option></select>
        <select id="paragon"><option value="">Any Paragon</option></select>
      </div>

      <p>
        Showing <strong id="showing">0</strong> of
        <strong id="total">0</strong> players
      </p>

      <div id="grid" class="grid"></div>
    </div>

    <div id="detail" class="detail">
      Select a player to view details.
    </div>
  </div>

<script>
let allPlayers = [];
let filteredPlayers = [];
let visibleCount = 60;
let selectedId = null;

const grid = document.getElementById("grid");

google.script.run
  .withSuccessHandler(loadPlayers)
  .withFailureHandler(err => {
    document.getElementById("status").textContent = "Load failed: " + err.message;
  })
  .getPlayerIndex_();

function loadPlayers(data) {
  allPlayers = data.players || [];
  filteredPlayers = allPlayers.slice();

  fillSelect("park", data.parks || unique(allPlayers.map(p => p.park)));
  fillSelect("award", data.awardTypes || unique(allPlayers.flatMap(p => p.awardKeys || [])));
  fillSelect("masterhood", data.masterhoodTypes || unique(allPlayers.flatMap(p => p.masterhoodKeys || [])));
  fillSelect("paragon", data.paragonTypes || unique(allPlayers.flatMap(p => p.paragonKeys || [])));

  document.getElementById("status").textContent = "Ready";
  renderGrid(true);
}

function renderGrid(reset) {
  if (reset) {
    grid.innerHTML = "";
    visibleCount = 60;
  }

  const frag = document.createDocumentFragment();
  const start = grid.children.length;
  const next = filteredPlayers.slice(start, visibleCount);

  next.forEach(p => {
    const card = document.createElement("button");
    card.className = "card";
    card.dataset.id = p.id;
    card.innerHTML = `<strong>${escapeHtml(p.name)}</strong><br><small>${escapeHtml(p.park || "")}</small>`;
    frag.appendChild(card);
  });

  grid.appendChild(frag);

  document.getElementById("showing").textContent = Math.min(visibleCount, filteredPlayers.length);
  document.getElementById("total").textContent = filteredPlayers.length;
}

function applyFilters() {
  const search = document.getElementById("search").value.toLowerCase();
  const park = document.getElementById("park").value;
  const award = document.getElementById("award").value;
  const masterhood = document.getElementById("masterhood").value;
  const paragon = document.getElementById("paragon").value;

  filteredPlayers = allPlayers.filter(p => {
    if (search && !String(p.name).toLowerCase().includes(search)) return false;
    if (park && p.park !== park) return false;
    if (award && !(p.awardKeys || []).includes(award)) return false;
    if (masterhood && !(p.masterhoodKeys || []).includes(masterhood)) return false;
    if (paragon && !(p.paragonKeys || []).includes(paragon)) return false;
    return true;
  });

  renderGrid(true);
}

document.querySelectorAll("input, select").forEach(el => {
  el.addEventListener("input", applyFilters);
  el.addEventListener("change", applyFilters);
});

grid.addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (!card) return;

  selectedId = card.dataset.id;

  document.querySelectorAll(".card.selected").forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");

  document.getElementById("detail").innerHTML = "Loading player details...";

  google.script.run
    .withSuccessHandler(showDetail)
    .withFailureHandler(err => {
      document.getElementById("detail").innerHTML = "Detail load failed: " + err.message;
    })
    .getPlayerDetail_(selectedId);
});

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    if (visibleCount < filteredPlayers.length) {
      visibleCount += 60;
      renderGrid(false);
    }
  }
});

function showDetail(p) {
  document.getElementById("detail").innerHTML = `
    <h2>${escapeHtml(p.name || "Unknown")}</h2>
    <p>${escapeHtml(p.park || "")}</p>

    <h3>Awards</h3>
    <p>${renderList(p.awards)}</p>

    <h3>Masterhoods</h3>
    <p>${renderList(p.masterhoods)}</p>

    <h3>Paragons</h3>
    <p>${renderList(p.paragons)}</p>
  `;
}

function renderList(arr) {
  if (!arr || !arr.length) return "None listed.";
  return arr.map(escapeHtml).join("<br>");
}

function fillSelect(id, values) {
  const el = document.getElementById(id);
  values.filter(Boolean).sort().forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  });
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
</script>
</body>
</html>
Important: this version is for Apps Script web app testing, not GitHub Pages.

For GitHub Pages, we use JSONP.

For Apps Script, we use:

google.script.run
So this should help confirm whether your backend functions are working before we reconnect it to GitHub.


okay for the github what should the index be?

Good, now we separate the two worlds clearly:

Apps Script version = uses google.script.run

GitHub Pages version = uses JSONP (what you already built earlier)

👉 For GitHub, you DO NOT use the Apps Script HTML you just made

You use the original HTML from the canvas, with JSONP.

✅ Your GitHub index.html should be:
Use the version already in your canvas (the large file I built earlier)

It already has:

JSONP loader

Filters

Lazy loading

Detail loading

Ebonmarch styling

🔴 The ONLY thing that matters right now
Make sure this line is correct in that file:

const API_URL = "https://script.google.com/macros/s/AKfycbxO5_gSiFx6aj9nMDrfNvhlbev_CZh383ARjk0pZO-BxhwAbtIVxaO0gKp2cImHPJPK/exec";
🚨 Why your page failed earlier
You accidentally mixed:

System	Uses
Apps Script HTML	google.script.run
GitHub Pages	JSONP
These are not compatible

✅ What GitHub expects
Your Apps Script MUST return:

callbackName({...})
NOT HTML
NOT google.script.run

🔧 So your setup should be:
GitHub
index.html  ✅ (canvas version)
Apps Script
Code.gs with:
- doGet(e)
- getPlayerIndex_()
- getPlayerDetail_()
🧪 Test this RIGHT NOW
Open in browser:

https://script.google.com/macros/s/AKfycbxO5_gSiFx6aj9nMDrfNvhlbev_CZh383ARjk0pZO-BxhwAbtIVxaO0gKp2cImHPJPK/exec?action=index&callback=test
👉 Tell me what you see:
Case A
test({...})
→ GOOD → GitHub will work

Case B
HTML page / error / login
→ ❌ Apps Script not set up correctly

⚡ Most likely fix
If it fails, your Apps Script still has:

return HtmlService.createHtmlOutput(...)
👉 That must be replaced with JSONP doGet

Next step
Send me what that test link returns and I’ll fix the exact issue in one move.


okay what I am asking is for the app script for git hub to use

Use this in Apps Script Code.gs for GitHub Pages to call.

function doGet(e) {
  const action = e.parameter.action || "index";
  const callback = e.parameter.callback || "callback";

  let data;

  if (action === "detail") {
    data = getPlayerDetail_(e.parameter.id);
  } else {
    data = getPlayerIndex_();
  }

  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(data) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
That is the GitHub connector.

Your Apps Script should not use this for GitHub:

HtmlService.createHtmlOutputFromFile("Index")
GitHub needs the Apps Script to act like a data API, not a webpage.

So Apps Script should have:

Code.gs
with:

doGet(e)
getPlayerIndex_()
getPlayerDetail_(id)
splitList_(value)
And GitHub should have:

index.html
with your dashboard page.

The next thing to paste into Apps Script is the full Code.gs backend.


function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index_Ebonmarch")
    .setTitle("Ebonmarch Awards Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getEbonmarchDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EBONMARCH.SHEETS.DASHBOARD);

  if (!sheet) {
    throw new Error("Missing sheet: " + EBONMARCH.SHEETS.DASHBOARD);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const h = headerMap_(values[0]);
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const player = String(row[h["Player"]] || "").trim();
    if (!player) continue;

    rows.push({
      playerId: String(row[h["Player ID"]] || "").trim(),
      player: decodeHtml_(player),
      park: decodeHtml_(String(row[h["Park"]] || "").trim()),
      kingdom: decodeHtml_(String(row[h["Kingdom"]] || "").trim()),

      lastSignIn: formatDateForDashboard_(row[h["Last Sign-In"]]),
      signIns: Number(row[h["Sign-Ins Past 12 Months"]] || 0),

      totalAwards: Number(row[h["Total Awards"]] || 0),
      battle: Number(row[h["Battle"]] || 0),
      warrior: Number(row[h["Warrior"]] || 0),
      crown: Number(row[h["Crown"]] || 0),
      dragon: Number(row[h["Dragon"]] || 0),
      garber: Number(row[h["Garber"]] || 0),
      owl: Number(row[h["Owl"]] || 0),
      rose: Number(row[h["Rose"]] || 0),
      smith: Number(row[h["Smith"]] || 0),
      lion: Number(row[h["Lion"]] || 0),
      gryphon: Number(row[h["Gryphon"]] || 0),
      jovius: Number(row[h["Jovius"]] || 0),
      mask: Number(row[h["Mask"]] || 0),

      paragons: String(row[h["Paragons"]] || "").trim(),
      masterhoods: String(row[h["Masterhoods"]] || "").trim(),
      ork: String(row[h["ORK URL"]] || "").trim()
    });
  }

  return rows;
}

function getEbonmarchDashboardMeta() {
  return {
    title: "Grand Duchy of Ebonmarch Dashboard",
    awardOptions: [
      "battle",
      "warrior",
      "crown",
      "dragon",
      "garber",
      "owl",
      "rose",
      "smith",
      "lion",
      "gryphon",
      "jovius",
      "mask",
      "totalAwards"
    ],
    masterhoodTypes: [
      "Battle",
      "Warrior",
      "Crown",
      "Dragon",
      "Garber",
      "Owl",
      "Rose",
      "Smith",
      "Lion",
      "Gryphon",
      "Jovius",
      "Mask"
    ],
    paragonClasses: [
      "Anti-Paladin",
      "Archer",
      "Assassin",
      "Barbarian",
      "Bard",
      "Druid",
      "Healer",
      "Monk",
      "Paladin",
      "Scout",
      "Warrior",
      "Wizard"
    ]
  };
}

function formatDateForDashboard_(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }

  return String(value).trim();
}

Yes, this shows the issue clearly: your current doGet() serves an Apps Script webpage. For GitHub Pages, that same URL needs to return JSONP data instead.

Thought for a few seconds
Replace your current doGet() with this GitHub-ready version:

function doGet(e) {
  const action = e.parameter.action || "index";
  const callback = e.parameter.callback || "callback";

  let data;

  if (action === "meta") {
    data = getEbonmarchDashboardMeta();
  } else if (action === "detail") {
    data = getEbonmarchPlayerDetail_(e.parameter.id);
  } else {
    data = getEbonmarchPlayerIndex_();
  }

  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(data) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
Then add these two functions below your current code:

function getEbonmarchPlayerIndex_() {
  const rows = getEbonmarchDashboardData();
  const meta = getEbonmarchDashboardMeta();

  return {
    updatedAt: new Date().toISOString(),
    parks: [...new Set(rows.map(r => r.park).filter(Boolean))].sort(),
    awardTypes: meta.awardOptions,
    masterhoodTypes: meta.masterhoodTypes,
    paragonTypes: meta.paragonClasses,

    players: rows.map(r => ({
      id: r.playerId || r.player,
      name: r.player,
      park: r.park,
      kingdom: r.kingdom,
      lastSignIn: r.lastSignIn,
      signIns: r.signIns,
      totalAwards: r.totalAwards,

      awardKeys: meta.awardOptions.filter(key => Number(r[key] || 0) > 0),
      masterhoodKeys: splitDashboardList_(r.masterhoods),
      paragonKeys: splitDashboardList_(r.paragons),

      hasAwards: Number(r.totalAwards || 0) > 0,
      hasMasterhoods: Boolean(r.masterhoods),
      hasParagons: Boolean(r.paragons)
    }))
  };
}
function getEbonmarchPlayerDetail_(id) {
  const rows = getEbonmarchDashboardData();
  const meta = getEbonmarchDashboardMeta();

  const player = rows.find(r =>
    String(r.playerId || r.player) === String(id)
  );

  if (!player) {
    return {};
  }

  return {
    id: player.playerId || player.player,
    name: player.player,
    park: player.park,
    kingdom: player.kingdom,
    lastSignIn: player.lastSignIn,
    signIns: player.signIns,
    totalAwards: player.totalAwards,
    ork: player.ork,

    awards: meta.awardOptions
      .filter(key => Number(player[key] || 0) > 0)
      .map(key => ({
        name: key,
        count: Number(player[key] || 0)
      })),

    masterhoods: splitDashboardList_(player.masterhoods),
    paragons: splitDashboardList_(player.paragons)
  };
}
function splitDashboardList_(value) {
  if (!value) return [];

  return String(value)
    .split(/[,|;]/)
    .map(s => s.trim())
    .filter(Boolean);
}
Keep these existing functions:

getEbonmarchDashboardData()
getEbonmarchDashboardMeta()
formatDateForDashboard_()
Remove or replace this part:

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index_Ebonmarch")
    .setTitle("Ebonmarch Awards Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
After saving, redeploy the web app.

Then test:

https://script.google.com/macros/s/AKfycbxO5_gSiFx6aj9nMDrfNvhlbev_CZh383ARjk0pZO-BxhwAbtIVxaO0gKp2cImHPJPK/exec?action=index&callback=test
You want to see:

test({...})

okay I recieved an error can you provide the whole thing I need to do?

I’ll give you a full Code.gs replacement that keeps your existing dashboard sheet structure, but changes the output so GitHub Pages can read it with JSONP. This version assumes your current EBONMARCH.SHEETS.DASHBOARD, headerMap_, and decodeHtml_ may already exist, but I’ll include safe fallback versions too.

Thought for 4s
Replace your current Code.gs with this full version:

/************************************************************
 * EBONMARCH ORK DASHBOARD API FOR GITHUB PAGES
 ************************************************************/

const EBONMARCH = {
  SHEETS: {
    DASHBOARD: "Ebonmarch Dashboard" // change this if your sheet tab name is different
  }
};

/************************************************************
 * GITHUB PAGES JSONP ENDPOINT
 ************************************************************/
function doGet(e) {
  e = e || { parameter: {} };

  const action = e.parameter.action || "index";
  const callback = e.parameter.callback || "callback";

  let data;

  try {
    if (action === "meta") {
      data = getEbonmarchDashboardMeta();
    } else if (action === "detail") {
      data = getEbonmarchPlayerDetail_(e.parameter.id);
    } else {
      data = getEbonmarchPlayerIndex_();
    }
  } catch (err) {
    data = {
      error: true,
      message: err.message,
      stack: err.stack
    };
  }

  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(data) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/************************************************************
 * LIGHTWEIGHT INDEX FOR GITHUB
 ************************************************************/
function getEbonmarchPlayerIndex_() {
  const rows = getEbonmarchDashboardData();
  const meta = getEbonmarchDashboardMeta();

  return {
    updatedAt: new Date().toISOString(),

    parks: [...new Set(rows.map(r => r.park).filter(Boolean))].sort(),

    awardTypes: meta.awardOptions,
    masterhoodTypes: meta.masterhoodTypes,
    paragonTypes: meta.paragonClasses,

    players: rows.map(r => ({
      id: r.playerId || r.player,
      name: r.player,
      park: r.park,
      kingdom: r.kingdom,
      lastSignIn: r.lastSignIn,
      signIns: r.signIns,
      totalAwards: r.totalAwards,

      awardKeys: meta.awardOptions.filter(key => Number(r[key] || 0) > 0),
      masterhoodKeys: splitDashboardList_(r.masterhoods),
      paragonKeys: splitDashboardList_(r.paragons),

      hasAwards: Number(r.totalAwards || 0) > 0,
      hasMasterhoods: Boolean(r.masterhoods),
      hasParagons: Boolean(r.paragons)
    }))
  };
}

/************************************************************
 * DETAIL LOAD WHEN PLAYER IS CLICKED
 ************************************************************/
function getEbonmarchPlayerDetail_(id) {
  const rows = getEbonmarchDashboardData();
  const meta = getEbonmarchDashboardMeta();

  const player = rows.find(r =>
    String(r.playerId || r.player) === String(id)
  );

  if (!player) {
    return {
      error: true,
      message: "Player not found: " + id
    };
  }

  return {
    id: player.playerId || player.player,
    name: player.player,
    park: player.park,
    kingdom: player.kingdom,
    lastSignIn: player.lastSignIn,
    signIns: player.signIns,
    totalAwards: player.totalAwards,
    ork: player.ork,

    awards: meta.awardOptions
      .filter(key => Number(player[key] || 0) > 0)
      .map(key => ({
        name: labelAward_(key),
        count: Number(player[key] || 0)
      })),

    masterhoods: splitDashboardList_(player.masterhoods),
    paragons: splitDashboardList_(player.paragons)
  };
}

/************************************************************
 * READ DASHBOARD SHEET
 ************************************************************/
function getEbonmarchDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EBONMARCH.SHEETS.DASHBOARD);

  if (!sheet) {
    throw new Error("Missing sheet: " + EBONMARCH.SHEETS.DASHBOARD);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const h = headerMap_(values[0]);
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const player = String(row[h["Player"]] || "").trim();
    if (!player) continue;

    rows.push({
      playerId: String(row[h["Player ID"]] || "").trim(),
      player: decodeHtml_(player),
      park: decodeHtml_(String(row[h["Park"]] || "").trim()),
      kingdom: decodeHtml_(String(row[h["Kingdom"]] || "").trim()),

      lastSignIn: formatDateForDashboard_(row[h["Last Sign-In"]]),
      signIns: Number(row[h["Sign-Ins Past 12 Months"]] || 0),

      totalAwards: Number(row[h["Total Awards"]] || 0),
      battle: Number(row[h["Battle"]] || 0),
      warrior: Number(row[h["Warrior"]] || 0),
      crown: Number(row[h["Crown"]] || 0),
      dragon: Number(row[h["Dragon"]] || 0),
      garber: Number(row[h["Garber"]] || 0),
      owl: Number(row[h["Owl"]] || 0),
      rose: Number(row[h["Rose"]] || 0),
      smith: Number(row[h["Smith"]] || 0),
      lion: Number(row[h["Lion"]] || 0),
      gryphon: Number(row[h["Gryphon"]] || 0),
      jovius: Number(row[h["Jovius"]] || 0),
      mask: Number(row[h["Mask"]] || 0),

      paragons: String(row[h["Paragons"]] || "").trim(),
      masterhoods: String(row[h["Masterhoods"]] || "").trim(),
      ork: String(row[h["ORK URL"]] || "").trim()
    });
  }

  return rows;
}

/************************************************************
 * META OPTIONS
 ************************************************************/
function getEbonmarchDashboardMeta() {
  return {
    title: "Grand Duchy of Ebonmarch Dashboard",

    awardOptions: [
      "battle",
      "warrior",
      "crown",
      "dragon",
      "garber",
      "owl",
      "rose",
      "smith",
      "lion",
      "gryphon",
      "jovius",
      "mask",
      "totalAwards"
    ],

    masterhoodTypes: [
      "Battle",
      "Warrior",
      "Crown",
      "Dragon",
      "Garber",
      "Owl",
      "Rose",
      "Smith",
      "Lion",
      "Gryphon",
      "Jovius",
      "Mask"
    ],

    paragonClasses: [
      "Anti-Paladin",
      "Archer",
      "Assassin",
      "Barbarian",
      "Bard",
      "Druid",
      "Healer",
      "Monk",
      "Paladin",
      "Scout",
      "Warrior",
      "Wizard"
    ]
  };
}

/************************************************************
 * HELPERS
 ************************************************************/
function splitDashboardList_(value) {
  if (!value) return [];

  return String(value)
    .split(/[,|;]/)
    .map(s => s.trim())
    .filter(Boolean);
}

function labelAward_(key) {
  const labels = {
    battle: "Battle",
    warrior: "Warrior",
    crown: "Crown",
    dragon: "Dragon",
    garber: "Garber",
    owl: "Owl",
    rose: "Rose",
    smith: "Smith",
    lion: "Lion",
    gryphon: "Gryphon",
    jovius: "Jovius",
    mask: "Mask",
    totalAwards: "Total Awards"
  };

  return labels[key] || key;
}

function formatDateForDashboard_(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }

  return String(value).trim();
}

function headerMap_(headers) {
  const map = {};

  headers.forEach((header, index) => {
    map[String(header).trim()] = index;
  });

  return map;
}

function decodeHtml_(value) {
  if (!value) return "";

  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}
Then do this:

Save.

Deploy → Manage deployments.

Edit current deployment.

Set:

Execute as: Me
Who has access: Anyone
Deploy.

Then test:

https://script.google.com/macros/s/AKfycbxO5_gSiFx6aj9nMDrfNvhlbev_CZh383ARjk0pZO-BxhwAbtIVxaO0gKp2cImHPJPK/exec?action=index&callback=test
You should see:

test({...})
If your sheet tab is not named exactly:

Ebonmarch Dashboard
change this line:

DASHBOARD: "Ebonmarch Dashboard"
to the exact tab name.


I do not have a code.gs

That’s okay. In your project, WebApp_Ebonmarch.gs is your Code.gs equivalent.

Do this:

Click WebApp_Ebonmarch.gs

Find the current:

function doGet() {
Replace only that doGet() with the JSONP version:

function doGet(e) {
  e = e || { parameter: {} };

  const action = e.parameter.action || "index";
  const callback = e.parameter.callback || "callback";

  let data;

  try {
    if (action === "meta") {
      data = getEbonmarchDashboardMeta();
    } else if (action === "detail") {
      data = getEbonmarchPlayerDetail_(e.parameter.id);
    } else {
      data = getEbonmarchPlayerIndex_();
    }
  } catch (err) {
    data = {
      error: true,
      message: err.message,
      stack: err.stack
    };
  }

  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(data) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
Then paste the helper functions I gave you under the existing functions in WebApp_Ebonmarch.gs.

You do not need a file named Code.gs.

The important thing is:

Keep your existing backend files

Change WebApp_Ebonmarch.gs from serving Index_Ebonmarch.html

Make it return JSONP data for GitHub

After that, save and redeploy.



Thought for a couple of seconds
That error means this line was pasted twice somewhere:

const EBONMARCH = {
You already have EBONMARCH in 10_Setup.gs, so do not add it again in WebApp_Ebonmarch.gs.

Fix
In WebApp_Ebonmarch.gs, remove this whole block if you pasted it:

const EBONMARCH = {
  SHEETS: {
    DASHBOARD: "Ebonmarch Dashboard"
  }
};
Keep your original EBONMARCH setup in 10_Setup.gs.

What to replace
Only replace your old doGet() in WebApp_Ebonmarch.gs with this:

function doGet(e) {
  e = e || { parameter: {} };

  const action = e.parameter.action || "index";
  const callback = e.parameter.callback || "callback";

  let data;

  try {
    if (action === "meta") {
      data = getEbonmarchDashboardMeta();
    } else if (action === "detail") {
      data = getEbonmarchPlayerDetail_(e.parameter.id);
    } else {
      data = getEbonmarchPlayerIndex_();
    }
  } catch (err) {
    data = {
      error: true,
      message: err.message,
      stack: err.stack
    };
  }

  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(data) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
Then add only these new functions below your existing code:

function getEbonmarchPlayerIndex_() {
  const rows = getEbonmarchDashboardData();
  const meta = getEbonmarchDashboardMeta();

  return {
    updatedAt: new Date().toISOString(),
    parks: [...new Set(rows.map(r => r.park).filter(Boolean))].sort(),
    awardTypes: meta.awardOptions,
    masterhoodTypes: meta.masterhoodTypes,
    paragonTypes: meta.paragonClasses,

    players: rows.map(r => ({
      id: r.playerId || r.player,
      name: r.player,
      park: r.park,
      kingdom: r.kingdom,
      lastSignIn: r.lastSignIn,
      signIns: r.signIns,
      totalAwards: r.totalAwards,
      awardKeys: meta.awardOptions.filter(key => Number(r[key] || 0) > 0),
      masterhoodKeys: splitDashboardList_(r.masterhoods),
      paragonKeys: splitDashboardList_(r.paragons),
      hasAwards: Number(r.totalAwards || 0) > 0,
      hasMasterhoods: Boolean(r.masterhoods),
      hasParagons: Boolean(r.paragons)
    }))
  };
}

function getEbonmarchPlayerDetail_(id) {
  const rows = getEbonmarchDashboardData();
  const meta = getEbonmarchDashboardMeta();

  const player = rows.find(r =>
    String(r.playerId || r.player) === String(id)
  );

  if (!player) {
    return {
      error: true,
      message: "Player not found: " + id
    };
  }

  return {
    id: player.playerId || player.player,
    name: player.player,
    park: player.park,
    kingdom: player.kingdom,
    lastSignIn: player.lastSignIn,
    signIns: player.signIns,
    totalAwards: player.totalAwards,
    ork: player.ork,

    awards: meta.awardOptions
      .filter(key => Number(player[key] || 0) > 0)
      .map(key => ({
        name: labelAward_(key),
        count: Number(player[key] || 0)
      })),

    masterhoods: splitDashboardList_(player.masterhoods),
    paragons: splitDashboardList_(player.paragons)
  };
}

function splitDashboardList_(value) {
  if (!value) return [];
  return String(value)
    .split(/[,|;]/)
    .map(s => s.trim())
    .filter(Boolean);
}

function labelAward_(key) {
  const labels = {
    battle: "Battle",
    warrior: "Warrior",
    crown: "Crown",
    dragon: "Dragon",
    garber: "Garber",
    owl: "Owl",
    rose: "Rose",
    smith: "Smith",
    lion: "Lion",
    gryphon: "Gryphon",
    jovius: "Jovius",
    mask: "Mask",
    totalAwards: "Total Awards"
  };

  return labels[key] || key;
}
Do not add another headerMap_() or decodeHtml_() because your screenshot shows those already exist.

Then save, redeploy, and test:

https://script.google.com/macros/s/AKfycbxO5_gSiFx6aj9nMDrfNvhlbev_CZh383ARjk0pZO-BxhwAbtIVxaO0gKp2cImHPJPK/exec?action=index&callback=test

okay I like the layout but it does not allow the scroll down.  Let us optomize the page a bit more.  In this situation, what would be the best looking and easiest way to look through it with the number of people.  As well as changing the colors to the ebonmarch colors.  

The best layout for 100–500+ people is a fixed dashboard view: filters at the top, details on the right, and the player list scrolls inside its own panel. That keeps the page from feeling endless, keeps the selected player visible, and avoids the “can’t scroll down” issue.

Thought for 4s
Updated the GitHub index.html layout in the canvas.

What changed:

Player grid now scrolls inside its own panel

Detail panel stays visible on the right

Filters stay compact at the top

Colors shifted harder into Ebonmarch red, black, and gold

Lazy loading now triggers from the grid scroll, not the whole page

Cards are slightly smaller so more players fit on screen

This should feel much better for 100–500+ players.


That is where I was talking not everything is viewable.  The righthand side where all the infromation is shown if there are a lot of Master Hoods/Paragons etc... not everything is viewable

That makes sense. The right detail panel needs its own internal scroll area, separate from the player grid. I’ll adjust it so the selected player header stays visible, while Awards, Masterhoods, and Paragons scroll inside the panel.

Thought for a few seconds
Fixed in the canvas.

Now the right detail panel has:

Its own scroll area

Sticky player header

Scrollable Awards / Masterhoods / Paragons sections

Better mobile sizing

That should stop long player details from getting cut off.


not able to scroll as far down missing the last one or two

The scroll is reaching the bottom too tightly, so the last rows are being hidden under the rounded panel edge. I’ll add bottom breathing room inside the scroll areas and make the section scroll height a little more forgiving.

Thought for 4s
Fixed. The scroll sections now have extra bottom padding, so the last award rows should be visible instead of clipped.


and before we apply this I would like the color layout to change to the Ebonmarch colors.  

Good call doing this before locking it in.

I’ve updated the color system in the canvas to a true Ebonmarch palette:

What changed
Background → deeper black/blood red blend

Panels → darker, richer leather tone (less brown, more black-red)

Gold → more muted heraldic gold (less bright yellow)

Red → deeper crimson instead of bright red

Text → warmer parchment tone for readability

Visual feel now
More “noble house / war banner”

Less “modern UI gold/brown”

Better contrast for long reading (important for your detail panel)

If you want to push it even further (optional next tweaks)
We can dial it in to match Ebonmarch identity harder:

1. Add subtle gold edge glow to cards
.player-card.selected {
  box-shadow:
    0 0 0 1px rgba(207,162,58,0.5),
    0 0 12px rgba(207,162,58,0.25);
}
2. Add banner-style header accent
.hero {
  border-left: 6px solid var(--gold);
}
3. Make filters feel like “command console”
Darker inputs with gold focus already exist, but we can sharpen them more if you want.

Next step
Now that:

Colors are correct

Scroll is fixed

Layout is stable

👉 Next best improvement would be:

“compact mode” toggle

Smaller cards

Denser grid

Faster browsing for 500+ players

If you want that, say:
“add compact mode”


okay I think we have the wrong color scheme.  

Yes, that changes the direction completely. Ebonmarch should be purple, gray, black, and white/silver, not red and gold. I’ll shift the dashboard to match the banner: deep purple field, stone gray panels, black accents, and moonlit silver highlights.

Thought for 6s
You’re right. I updated the canvas to match the banner colors:

Deep purple

Stone gray

Black

Silver / white accents

The red and gold scheme is removed from the main palette.


Now that is awesome thank you.  

Good, that’s the right direction for Ebonmarch.

At this point your dashboard is in a strong place:

✅ Proper GitHub ↔ Apps Script architecture

✅ Large dataset performance handled

✅ Scroll issues fixed

✅ Detail panel usable

✅ Theme matches heraldry

Next high-impact upgrades (pick what you want)
1. Compact Mode (best for 300–500 players)
Toggle that shrinks cards so you can scan faster

More players per screen

Less scrolling

Ideal for event use

2. Quick Stats on Cards
Right now cards show name + park

We could add:

Total awards

Small icons for Masterhood / Paragon presence

Example:

Waldodorf
Grim Garrison
[A][M][P]  142
3. Fast Search Boost
Right now it’s basic contains search

We can upgrade to:

Starts-with priority

Park + name combined search

Instant feel even at 500+ players

4. Sticky Selected Player Highlight
If you scroll far, it’s easy to lose your selected card

We can:

Keep a glow outline

Auto-scroll back to selected if needed

5. “Top Players” / Leader View
Optional toggle:

Sort by total awards

Sort by specific award type

Great for tournaments / brag boards

6. ORK Profile Button
You already have the ORK URL

We can add in the detail panel:

[ View ORK Profile ]
My recommendation (next step)
👉 Do Compact Mode + Quick Stats on Cards

That gives the biggest usability gain immediately.

If you’re ready, say:

“add compact mode”

and I’ll wire it directly into your current file without breaking anything.


What would the compact view look like?

Compact view would make each player card shorter and denser.

Instead of this:

┌──────────────┐
│              │
│  Waldodorf   │
│ Grim Garrison│
│   A  M  P    │
│              │
└──────────────┘
It would look more like:

┌────────────────────┐
│ Waldodorf       142 │
│ Grim Garrison  A M P│
└────────────────────┘
So the grid changes from big square cards to slim horizontal tiles.

Best compact style for this dashboard
Waldodorf              142
Grim Garrison        A M P
Benefits:

More players visible at once

Easier scanning by name

Still keeps park and award/masterhood/paragon markers

Better for 300–500+ players

I would add a toggle near the filters:

[ Square View ] [ Compact View ]
Square view = current visual, better looking
Compact view = faster searching, better for large lists


Let us do that

Added compact mode directly into your dashboard.

What you now have
Toggle buttons (top bar)
Square → current card view

Compact → dense list view

Compact mode behavior
Cards switch to horizontal layout

Name + park stacked left

Badges aligned right

Much tighter spacing

More players visible per screen

What it feels like
Square = visual browsing
Compact = rapid scanning

Next improvement (optional but powerful)
We can enhance compact mode further by adding:

Total awards number on the right

Sort by awards toggle

Highlight top performers

If you want that next step:

👉 say “enhance compact stats”


Let us enhance, but when you write the code please do not add the descriptors for the lines just the code

Thought for a couple of seconds
Updated.


and last for the dashboard, if they have a "Master hood" even if the award shows 9, it should be translated into having 10

Good catch — that’s exactly the kind of data polish that makes the dashboard feel correct.

You don’t want to change the raw data, just how it’s interpreted/displayed.

Update this section in your Apps Script
Find this part in getEbonmarchPlayerIndex_():

awardKeys: meta.awardOptions.filter(key => Number(r[key] || 0) > 0),
Replace with:

awardKeys: meta.awardOptions.filter(key => {
  const value = Number(r[key] || 0);

  const hasMasterhood = splitDashboardList_(r.masterhoods)
    .map(m => m.toLowerCase())
    .includes(labelAward_(key).toLowerCase());

  return value > 0 || hasMasterhood;
}),
Now update the DETAIL awards count
Find this in getEbonmarchPlayerDetail_():

.map(key => ({
  name: labelAward_(key),
  count: Number(player[key] || 0)
}))
Replace with:

.map(key => {
  const base = Number(player[key] || 0);

  const hasMasterhood = splitDashboardList_(player.masterhoods)
    .map(m => m.toLowerCase())
    .includes(labelAward_(key).toLowerCase());

  return {
    name: labelAward_(key),
    count: hasMasterhood ? Math.max(base, 10) : base
  };
})
Optional (recommended for consistency)
Also update totalAwards display on cards

Find in your HTML JS:

const totalAwards = Number(player.totalAwards || 0);
Replace with:

const masterhoodCount = (player.masterhoodKeys || []).length;
const totalAwards = Math.max(
  Number(player.totalAwards || 0),
  masterhoodCount * 10
);
Result
If someone has 9 awards + Masterhood → shows 10

If someone has 10+ already → unchanged

Works in:

Card display

Detail panel

Filtering

If you want to go one step further later:

👉 Show Masterhood visually as:

Battle  (10) ★
Just say:
“add masterhood badge”



That error is just a small syntax break.

You’re missing a comma after the awards block.

Fix this section
Right now you have:

})
masterhoods: splitDashboardList_(player.masterhoods),
paragons: splitDashboardList_(player.paragons)
Change it to:
}),
masterhoods: splitDashboardList_(player.masterhoods),
paragons: splitDashboardList_(player.paragons)
Why
JavaScript expects commas between object properties:

return {
  awards: [...],   // <-- needs comma
  masterhoods: ...
}
Without it, it throws:

Unexpected identifier 'masterhoods'
After fixing
Save

Deploy → Manage deployments → Edit → Deploy

Test again

If anything else pops up, send it — you’re very close now.


alright, i still get error can you provide the complete version for me for the whole .gs?

Thought for 5s
Paste this entire code into WebApp_Ebonmarch.gs.

function doGet(e) {
  e = e || { parameter: {} };

  const action = e.parameter.action || "index";
  const callback = e.parameter.callback || "callback";

  let data;

  try {
    if (action === "meta") {
      data = getEbonmarchDashboardMeta();
    } else if (action === "detail") {
      data = getEbonmarchPlayerDetail_(e.parameter.id);
    } else {
      data = getEbonmarchPlayerIndex_();
    }
  } catch (err) {
    data = {
      error: true,
      message: err.message,
      stack: err.stack
    };
  }

  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(data) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getEbonmarchPlayerIndex_() {
  const rows = getEbonmarchDashboardData();
  const meta = getEbonmarchDashboardMeta();

  return {
    updatedAt: new Date().toISOString(),
    parks: [...new Set(rows.map(r => r.park).filter(Boolean))].sort(),
    awardTypes: meta.awardOptions,
    masterhoodTypes: meta.masterhoodTypes,
    paragonTypes: meta.paragonClasses,

    players: rows.map(r => {
      const masterhoods = splitDashboardList_(r.masterhoods);

      return {
        id: r.playerId || r.player,
        name: r.player,
        park: r.park,
        kingdom: r.kingdom,
        lastSignIn: r.lastSignIn,
        signIns: r.signIns,
        totalAwards: adjustedTotalAwards_(r),
        awardKeys: meta.awardOptions.filter(key => {
          const value = Number(r[key] || 0);
          const hasMasterhood = hasMasterhoodForAward_(masterhoods, key);
          return value > 0 || hasMasterhood;
        }),
        masterhoodKeys: masterhoods,
        paragonKeys: splitDashboardList_(r.paragons),
        hasAwards: Number(r.totalAwards || 0) > 0,
        hasMasterhoods: masterhoods.length > 0,
        hasParagons: Boolean(r.paragons)
      };
    })
  };
}

function getEbonmarchPlayerDetail_(id) {
  const rows = getEbonmarchDashboardData();
  const meta = getEbonmarchDashboardMeta();

  const player = rows.find(r =>
    String(r.playerId || r.player) === String(id)
  );

  if (!player) {
    return {
      error: true,
      message: "Player not found: " + id
    };
  }

  const masterhoods = splitDashboardList_(player.masterhoods);

  return {
    id: player.playerId || player.player,
    name: player.player,
    park: player.park,
    kingdom: player.kingdom,
    lastSignIn: player.lastSignIn,
    signIns: player.signIns,
    totalAwards: adjustedTotalAwards_(player),
    ork: player.ork,

    awards: meta.awardOptions
      .filter(key => {
        const value = Number(player[key] || 0);
        const hasMasterhood = hasMasterhoodForAward_(masterhoods, key);
        return value > 0 || hasMasterhood;
      })
      .map(key => {
        const base = Number(player[key] || 0);
        const hasMasterhood = hasMasterhoodForAward_(masterhoods, key);

        return {
          name: labelAward_(key),
          count: hasMasterhood ? Math.max(base, 10) : base
        };
      }),

    masterhoods: masterhoods,
    paragons: splitDashboardList_(player.paragons)
  };
}

function getEbonmarchDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EBONMARCH.SHEETS.DASHBOARD);

  if (!sheet) {
    throw new Error("Missing sheet: " + EBONMARCH.SHEETS.DASHBOARD);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const h = headerMap_(values[0]);
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const player = String(row[h["Player"]] || "").trim();

    if (!player) continue;

    rows.push({
      playerId: String(row[h["Player ID"]] || "").trim(),
      player: decodeHtml_(player),
      park: decodeHtml_(String(row[h["Park"]] || "").trim()),
      kingdom: decodeHtml_(String(row[h["Kingdom"]] || "").trim()),

      lastSignIn: formatDateForDashboard_(row[h["Last Sign-In"]]),
      signIns: Number(row[h["Sign-Ins Past 12 Months"]] || 0),

      totalAwards: Number(row[h["Total Awards"]] || 0),
      battle: Number(row[h["Battle"]] || 0),
      warrior: Number(row[h["Warrior"]] || 0),
      crown: Number(row[h["Crown"]] || 0),
      dragon: Number(row[h["Dragon"]] || 0),
      garber: Number(row[h["Garber"]] || 0),
      owl: Number(row[h["Owl"]] || 0),
      rose: Number(row[h["Rose"]] || 0),
      smith: Number(row[h["Smith"]] || 0),
      lion: Number(row[h["Lion"]] || 0),
      gryphon: Number(row[h["Gryphon"]] || 0),
      jovius: Number(row[h["Jovius"]] || 0),
      mask: Number(row[h["Mask"]] || 0),

      paragons: String(row[h["Paragons"]] || "").trim(),
      masterhoods: String(row[h["Masterhoods"]] || "").trim(),
      ork: String(row[h["ORK URL"]] || "").trim()
    });
  }

  return rows;
}

function getEbonmarchDashboardMeta() {
  return {
    title: "Grand Duchy of Ebonmarch Dashboard",

    awardOptions: [
      "battle",
      "warrior",
      "crown",
      "dragon",
      "garber",
      "owl",
      "rose",
      "smith",
      "lion",
      "gryphon",
      "jovius",
      "mask",
      "totalAwards"
    ],

    masterhoodTypes: [
      "Battle",
      "Warrior",
      "Crown",
      "Dragon",
      "Garber",
      "Owl",
      "Rose",
      "Smith",
      "Lion",
      "Gryphon",
      "Jovius",
      "Mask"
    ],

    paragonClasses: [
      "Anti-Paladin",
      "Archer",
      "Assassin",
      "Barbarian",
      "Bard",
      "Druid",
      "Healer",
      "Monk",
      "Paladin",
      "Scout",
      "Warrior",
      "Wizard"
    ]
  };
}

function splitDashboardList_(value) {
  if (!value) return [];

  return String(value)
    .split(/[,|;]/)
    .map(s => s.trim())
    .filter(Boolean);
}

function hasMasterhoodForAward_(masterhoods, key) {
  const awardName = labelAward_(key).toLowerCase();

  return masterhoods
    .map(m => String(m).toLowerCase())
    .some(m => m === awardName || m.includes(awardName));
}

function adjustedTotalAwards_(row) {
  const meta = getEbonmarchDashboardMeta();
  let total = 0;

  const masterhoods = splitDashboardList_(row.masterhoods);

  meta.awardOptions.forEach(key => {
    if (key === "totalAwards") return;

    const base = Number(row[key] || 0);
    const hasMasterhood = hasMasterhoodForAward_(masterhoods, key);

    total += hasMasterhood ? Math.max(base, 10) : base;
  });

  return Math.max(Number(row.totalAwards || 0), total);
}

function labelAward_(key) {
  const labels = {
    battle: "Battle",
    warrior: "Warrior",
    crown: "Crown",
    dragon: "Dragon",
    garber: "Garber",
    owl: "Owl",
    rose: "Rose",
    smith: "Smith",
    lion: "Lion",
    gryphon: "Gryphon",
    jovius: "Jovius",
    mask: "Mask",
    totalAwards: "Total Awards"
  };

  return labels[key] || key;
}

function formatDateForDashboard_(value) {
  if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }

  return String(value).trim();
}

function headerMap_(headers) {
  const map = {};

  headers.forEach((header, index) => {
    map[String(header).trim()] = index;
  });

  return map;
}

function decodeHtml_(value) {
  if (!value) return "";

  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}
Do not add another const EBONMARCH = ... in this file. Your project already has that in 10_Setup.gs.


so because of the number of awards/Paragons/and MAsterhoods.  can not see all the awards.  

Thought for 4s
Fixed in the canvas.

Change made:

.section-content {
  overflow: visible;
}
Now the whole right detail panel scrolls, instead of each award section having its own tiny scroll box. This should let you see all Awards, Masterhoods, and Paragons cleanly.


remove all of the "details" for each part of the code.  And does this go in app scripts or does it go into git hub?

Thought for a couple of seconds
Removed the code comments/details from the GitHub index.html in the canvas.

Where things go:

GitHub

index.html
This is the dashboard page, layout, colors, filters, cards, scrolling, compact mode.

Apps Script

WebApp_Ebonmarch.gs
This is the data API that GitHub calls.

Do not put the GitHub index.html into Apps Script unless you are testing the old Apps Script-only version.

Your final setup is:

GitHub Pages
  index.html

Apps Script
  WebApp_Ebonmarch.gs
  10_Setup.gs
  20_Player_IDs.gs
  30_Queue.gs
  40_Profile_Pull.gs
  50_Parse_Profile_Raw.gs
  60_Rebuild_Outputs.gs

okay for the page, it is no longer scrolling through the awards and only shows the top awards.  I want to be able to view all awards for each person. This is to help make award recommendations and to ensure people are giving the correct level of these awards

Thought for a few seconds
Fixed in the GitHub page canvas.

This goes in:

GitHub → index.html
Not Apps Script.

The change makes the entire right-side player detail panel scroll, instead of trapping Awards in a small internal box. Now you should be able to view all award counts, masterhoods, and paragons for each person.


and before woe do that.  I would like to page to load with the ebonmarch.jpg, and then have it fade into the backdrop of the site

Added.

What it does:

Loads ebonmarch.jpg full-screen first

Slight pause

Smooth fade out

Then reveals your dashboard

What you need:
Put this file in your GitHub repo:

ebonmarch.jpg
Same level as:

index.html
If you want it more dramatic (longer hold, slower fade, darker background), I can tune that next.


get a broken image screen when I load the page then it fades to the dashboard

Thought for a couple of seconds
Ebonmarch Ork Dashboard Index
· html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ebonmarch ORK Dashboard</title>

  <style>
    :root {
      --bg: #0b0b0d;
      --page-bg: #15121a;
      --panel: #242228;
      --panel-2: #343139;
      --panel-3: #47434d;

      --text: #f2f0ec;
      --muted: #c9c4bd;
      --gold: #bfc0bd;
      --gold-2: #f2f0ec;
      --red: #544268;
      --red-2: #6d5883;
      --deep-red: #33283f;

      --purple: #544268;
      --purple-2: #6d5883;
      --stone: #9c9c99;
      --stone-dark: #5f5f5c;
      --black: #050505;
      --silver: #e7e5df;

      --border: rgba(231, 229, 223, 0.38);
      --border-soft: rgba(231, 229, 223, 0.16);
      --shadow: rgba(0, 0, 0, 0.62);

      --good: #9fbf8f;
      --warn: #c6c1b8;
That means GitHub cannot find the image file.

I updated the canvas to use:

<img src="Ebonmarcha.jpg">
Now upload the image to GitHub with this exact filename:

Ebonmarcha.jpg
It must be in the same repo folder as:

index.html
GitHub filenames are case-sensitive, so:

Ebonmarcha.jpg
is different from:

ebonmarch.jpg


There it is — mismatch.

Your repo has:

Ebonmarch.jpg
But your HTML is now using:

<img src="Ebonmarcha.jpg">
Fix (pick one)
Option A (easiest)
Change HTML to:

<img src="Ebonmarch.jpg">
Option B
Rename the file in GitHub to:

Ebonmarcha.jpg
Recommendation
Go with Option A (less risk).

After that, refresh your page and the splash screen will display correctly.


how do I delete an image in git hub

Here’s the simple way to delete a file (like your image) in GitHub:

Delete file in GitHub (web)
Go to your repository

Click on the file (ex: Ebonmarch.jpg)

In the top right, click the trash can icon 🗑️

If you don’t see it, click the … (three dots) menu

Scroll down

Click Commit changes

That deletes it immediately.

Then upload the correct one
Click Add file → Upload files

Drag in your image

Make sure the name matches exactly:

Ebonmarch.jpg
Commit

If you want, I can also help you:

Make the splash scale better on mobile

Add a subtle fade-to-purple overlay instead of straight fade-out


after changing images it still loads the old one

That’s just browser caching, not your code.

GitHub Pages is serving the new file, but your browser is holding onto the old one.

Quick fixes
1. Hard refresh (fastest)
Try one of these:

Windows:

Ctrl + Shift + R
Mac:

Cmd + Shift + R
2. Open in incognito / private window
This bypasses cache completely.

3. Add cache-buster (best long-term fix)
Change your image line to:

<img src="Ebonmarch.jpg?v=2">
If you ever update the image again, just bump the number:

<img src="Ebonmarch.jpg?v=3">
4. Verify GitHub actually updated
Click your image directly in the repo and confirm:

It shows the new image

Filename matches exactly

If it still shows the old one after a hard refresh, tell me — that usually means a path issue instead of cache.


okay now we are looking at fine tuning my Tournement tracker

Absolutely. For the Tournament Tracker, we should start by locking down which tracker we’re fine tuning:

Weapon Master / Quals points tracker

Battle Master team bracket tracker

Public HTML tournament viewer

Kingmaker / awards-style dashboard

For the fastest start, send me either:

What it currently does
What is not working
What you want changed
or paste the current Apps Script / HTML section you want cleaned up.


The Weapon Master tracker specifically.  

Perfect. For the Weapon Master tracker, we’re dealing with:

Categories:
Single Short
Flow
Sword & Board
Open
Greats

Points:
1st = 4
2nd = 2
3rd = 1
4th = 0.5
5th = 0.5
Best next fine-tuning areas:

1. Results by bracket formatting
2. Points Log calculations
3. Event Summary top 5
4. Kingdom vs Duchy separation
5. Year filtering / archiving
6. Public HTML viewer
7. Manual refresh buttons
8. Adding or removing brackets
Tell me which part is causing trouble first, or paste the current script section.


Nothing is causing trouble.  I would like it just easier to read

For easier reading, I’d tune the Weapon Master tracker around presentation, not logic.

Best improvements:

Event blocks
Each event gets a clear boxed section with:

Event Date
Level
Location
Bracket Results
Top 5 Event Leaders
Color bands by bracket
Use consistent soft colors:

Single Short
Flow
Sword & Board
Open
Greats
Freeze headers
Freeze row 1 on every output tab.

Wider player columns
Names should never feel cramped.

Centered placements and points
Makes 1st, 2nd, 3rd, 4th easier to scan.

Leaderboard tab
A clean readable summary:

Rank | Player | Total Points | Events Entered | 1st | 2nd | 3rd | Duchy/Park
Separate public-view tabs
Keep raw data hidden and make readable tabs only:

Public Results
Public Leaderboard
Event Summary
My recommendation: start with a cleaner Public Leaderboard and Public Results tab that rebuild automatically from your existing data, without changing how the tracker works.


So we are going to do a small adjustment and create a new one.  

I would like to make one that is only Ebonmarch and Valkyrie tournaments.  Kingdom is too ambitious

That’s a smart scope cut.

New tracker should be:

Ebonmarch / Valkyrie Weapon Master Tracker
Core setup:

Form Responses
Results_by_Bracket
Points_Log
Event_Summary
Leaderboard
Public_View
Event Level options:

Ebonmarch
Valkyrie
Brackets:

Single Short
Flow
Sword & Board
Open
Greats
Points:

1st = 4
2nd = 2
3rd = 1
4th = 0.5
5th = 0.5
The big simplification:

No Kingdom split
No other duchies
No cross-region calculations
We only track:

Ebonmarch totals
Valkyrie totals
Combined totals
Recommended tabs:

Form Responses 1
Setup
Results_by_Bracket
Points_Log
Leaderboard_Ebonmarch
Leaderboard_Valkyrie
Leaderboard_Combined
Event_Summary
Public_View
Next I’d build the clean Apps Script that rebuilds those tabs from the form response sheet.


no combined totals just want the Duchy as one, and the Valkyrie as another

Got it.

No combined totals.

Use only:

Leaderboard_Ebonmarch
Leaderboard_Valkyrie
Recommended tabs:

Form Responses 1
Setup
Results_by_Bracket
Points_Log
Leaderboard_Ebonmarch
Leaderboard_Valkyrie
Event_Summary
Public_View
Structure:

Level = Ebonmarch or Valkyrie
Each event only counts toward its own leaderboard:

Ebonmarch event → Leaderboard_Ebonmarch
Valkyrie event → Leaderboard_Valkyrie
No kingdom totals.
No combined totals.
No other duchies.

Next step is building the Apps Script rebuild system for this smaller tracker.


is there a way to do this straight out of git hub... building an input selection for the brackets, then making the output into a saved location?

Thought for a couple of seconds
Yes and no.

GitHub Pages can handle the input screen, but it cannot directly save data back into GitHub or a spreadsheet by itself.

GitHub Pages is static, so it can:

Display forms
Let you enter bracket results
Calculate points
Show leaderboards
Download/export files
But it cannot directly:

Save new results permanently
Edit a Google Sheet
Write to GitHub files
Store tournament history online
Best setup for what you want
Use:

GitHub Pages = front-end tournament input form
Google Apps Script = save results
Google Sheets = stored data
Flow:

GitHub page
↓
User enters tournament results
↓
Submit button sends data to Apps Script
↓
Apps Script saves it to Google Sheets
↓
GitHub page reloads leaderboard from Apps Script
That would let you have:

Select Level:
- Ebonmarch
- Valkyrie

Select Bracket:
- Single Short
- Flow
- Sword & Board
- Open
- Greats

Enter:
1st
2nd
3rd
4th
5th

Submit Results
Then it saves into a sheet like:

Timestamp | Level | Event Date | Location | Bracket | Placement | Player | Points
The saved location should be Google Sheets
That is the easiest and safest place to store it.

GitHub should be the public/interface side.
Google Sheets should be the database.

So the answer is:

Build the input page in GitHub: yes.
Save results directly in GitHub: no, not easily.
Save results through Apps Script into Google Sheets: yes, recommended.
This would be cleaner than using Google Forms and easier to read on mobile.


So we can loop it back around.  So this is is what I am thinking the main page can show most recent three tourny results, have an option to input tourney information that will save it to the google sheet for the data base.  

Yes, that is a good architecture.

Main page layout
Ebonmarch / Valkyrie Tournament Tracker

Most Recent 3 Tournaments
[ Event 1 ]
[ Event 2 ]
[ Event 3 ]

Buttons:
[ Enter New Tournament ]
[ View Ebonmarch Leaderboard ]
[ View Valkyrie Leaderboard ]
Data flow
GitHub Pages front end
↓
Apps Script web app
↓
Google Sheet database
↓
GitHub page reloads latest results
Input flow
Level:
- Ebonmarch
- Valkyrie

Event Date
Location

Bracket:
- Single Short
- Flow
- Sword & Board
- Open
- Greats

Placements:
1st
2nd
3rd
4th
5th

Submit
When submitted, Apps Script saves rows like:

Timestamp | Level | Event Date | Location | Bracket | Placement | Player | Points
Best next build order
Create the Google Sheet database tabs

Build the Apps Script API:

?action=recent
?action=submit
?action=leaderboard&level=Ebonmarch
?action=leaderboard&level=Valkyrie
Build the GitHub page:

index.html
I’d recommend starting with the Apps Script database API first, then the GitHub page.


Then with that said it will only save the information for the last two years

Yes. That is easy to build into the save/rebuild logic.

Use this rule:

Only keep tournament rows where Event Date is within the last 2 years.
Recommended setup:

Live_Results
Archive_Results
When a new tournament is submitted:

Save new rows into Live_Results

Check all rows in Live_Results

Anything older than 2 years moves to Archive_Results

Leaderboards only read from Live_Results

So your active tracker stays clean:

Ebonmarch = last 2 years only
Valkyrie = last 2 years only
Archive still keeps old history, but does not affect current leaderboards.

Best database tabs:

Live_Results
Archive_Results
Event_Summary
Leaderboard_Ebonmarch
Leaderboard_Valkyrie
For the GitHub page:

Main Page:
- Most recent 3 tournaments
- Enter New Tournament
- View Ebonmarch Leaderboard
- View Valkyrie Leaderboard
Next step would be building the Apps Script API that saves submissions and automatically archives anything older than 2 years.


The leadership board will only show the last 12 months (rolling) from the time it is entered.  As tournys are held roughly the same time each year

Perfect. Then use two time windows:

Live storage = last 2 years
Leaderboards = rolling last 12 months
That means:

Live_Results
- keeps up to 2 years of tournament history
- useful for recent event history and review

Leaderboard_Ebonmarch
Leaderboard_Valkyrie
- only calculate from the last 12 months
- rolling from the current date
Example:

If today is:

May 6, 2026
leaderboards only count events from:

May 6, 2025 through May 6, 2026
but Live_Results keeps:

May 6, 2024 through May 6, 2026
Best rule:

const LIVE_KEEP_MONTHS = 24;
const LEADERBOARD_MONTHS = 12;
So the system will:

Submit tournament
Save rows
Archive anything older than 24 months
Show recent 3 tournaments from Live_Results
Build leaderboards using only last 12 months
That is the right setup for yearly recurring tournaments.


That sounds good to me.  So the next is building this system a bit better

We’ll build this as a clean two-part system: Google Sheets/Apps Script as the database and API, GitHub Pages as the readable input and leaderboard site. I’ll keep the scope to Ebonmarch and Valkyrie only, with no combined totals.

Thought for a few seconds
Yes. Next build should be:

Google Sheet tabs
Live_Results
Archive_Results
Events
Leaderboard_Ebonmarch
Leaderboard_Valkyrie
GitHub page sections
Home
- Most recent 3 tournaments

Enter Tournament
- Level: Ebonmarch / Valkyrie
- Date
- Location
- Bracket results

Leaderboards
- Ebonmarch
- Valkyrie
Rules
Live_Results keeps last 24 months
Archive_Results stores anything older
Leaderboards only count last 12 months
No combined totals
Data row format
Timestamp
Event ID
Level
Event Date
Location
Bracket
Placement
Player
Points
Next step
We should build the Apps Script backend first, because GitHub needs somewhere to save and read data from.

The Apps Script should support:

?action=recent
?action=submit
?action=leaderboard&level=Ebonmarch
?action=leaderboard&level=Valkyrie
Once that works, we build the GitHub index.html.


okay let us do that

I’ll start with the Apps Script backend. This will create the needed tabs if missing, accept GitHub submissions, return recent tournaments, and build separate 12-month leaderboards for Ebonmarch and Valkyrie.

Thought for a couple of seconds
Paste this into a new Apps Script project attached to the Google Sheet.

const WM = {
  SHEETS: {
    LIVE: "Live_Results",
    ARCHIVE: "Archive_Results",
    EVENTS: "Events",
    EBONMARCH: "Leaderboard_Ebonmarch",
    VALKYRIE: "Leaderboard_Valkyrie"
  },
  LEVELS: ["Ebonmarch", "Valkyrie"],
  BRACKETS: ["Single Short", "Flow", "Sword & Board", "Open", "Greats"],
  POINTS: {
    1: 4,
    2: 2,
    3: 1,
    4: 0.5,
    5: 0.5
  },
  LIVE_KEEP_MONTHS: 24,
  LEADERBOARD_MONTHS: 12
};

function doGet(e) {
  e = e || { parameter: {} };

  const action = e.parameter.action || "recent";
  const callback = e.parameter.callback || "callback";

  let data;

  try {
    setupSheets_();

    if (action === "recent") {
      data = getRecentTournaments_();
    } else if (action === "leaderboard") {
      data = getLeaderboard_(e.parameter.level);
    } else if (action === "meta") {
      data = getMeta_();
    } else {
      data = { ok: false, message: "Unknown action: " + action };
    }
  } catch (err) {
    data = { ok: false, message: err.message, stack: err.stack };
  }

  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(data) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  let data;

  try {
    setupSheets_();

    const payload = JSON.parse(e.postData.contents || "{}");

    if (payload.action === "submit") {
      data = submitTournament_(payload);
    } else {
      data = { ok: false, message: "Unknown POST action." };
    }
  } catch (err) {
    data = { ok: false, message: err.message, stack: err.stack };
  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, WM.SHEETS.LIVE, [
    "Timestamp",
    "Event ID",
    "Level",
    "Event Date",
    "Location",
    "Bracket",
    "Placement",
    "Player",
    "Points"
  ]);

  ensureSheet_(ss, WM.SHEETS.ARCHIVE, [
    "Timestamp",
    "Event ID",
    "Level",
    "Event Date",
    "Location",
    "Bracket",
    "Placement",
    "Player",
    "Points"
  ]);

  ensureSheet_(ss, WM.SHEETS.EVENTS, [
    "Event ID",
    "Level",
    "Event Date",
    "Location",
    "Submitted At",
    "Bracket Count"
  ]);

  ensureSheet_(ss, WM.SHEETS.EBONMARCH, [
    "Rank",
    "Player",
    "Total Points",
    "Events Entered",
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th"
  ]);

  ensureSheet_(ss, WM.SHEETS.VALKYRIE, [
    "Rank",
    "Player",
    "Total Points",
    "Events Entered",
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th"
  ]);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = headers.some((h, i) => current[i] !== h);

  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function submitTournament_(payload) {
  const level = String(payload.level || "").trim();
  const eventDate = String(payload.eventDate || "").trim();
  const location = String(payload.location || "").trim();
  const brackets = payload.brackets || [];

  if (!WM.LEVELS.includes(level)) {
    throw new Error("Invalid level: " + level);
  }

  if (!eventDate) {
    throw new Error("Missing event date.");
  }

  if (!location) {
    throw new Error("Missing location.");
  }

  if (!Array.isArray(brackets) || !brackets.length) {
    throw new Error("No bracket results submitted.");
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const live = ss.getSheetByName(WM.SHEETS.LIVE);
  const events = ss.getSheetByName(WM.SHEETS.EVENTS);

  const submittedAt = new Date();
  const eventId = buildEventId_(level, eventDate, location, submittedAt);
  const rows = [];

  brackets.forEach(bracket => {
    const bracketName = String(bracket.bracket || "").trim();

    if (!WM.BRACKETS.includes(bracketName)) return;

    for (let place = 1; place <= 5; place++) {
      const player = String(bracket["place" + place] || "").trim();
      if (!player) continue;

      rows.push([
        submittedAt,
        eventId,
        level,
        eventDate,
        location,
        bracketName,
        place,
        player,
        WM.POINTS[place]
      ]);
    }
  });

  if (!rows.length) {
    throw new Error("No valid placements found.");
  }

  live.getRange(live.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

  events.appendRow([
    eventId,
    level,
    eventDate,
    location,
    submittedAt,
    brackets.length
  ]);

  archiveOldResults_();
  rebuildLeaderboards_();

  return {
    ok: true,
    eventId: eventId,
    rowsSaved: rows.length
  };
}

function getRecentTournaments_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const events = ss.getSheetByName(WM.SHEETS.EVENTS);
  const values = events.getDataRange().getValues();

  if (values.length < 2) {
    return { ok: true, events: [] };
  }

  const h = headerMap_(values[0]);

  const rows = values.slice(1)
    .filter(r => r[h["Event ID"]])
    .map(r => ({
      eventId: r[h["Event ID"]],
      level: r[h["Level"]],
      eventDate: formatDate_(r[h["Event Date"]]),
      location: r[h["Location"]],
      submittedAt: formatDateTime_(r[h["Submitted At"]]),
      bracketCount: r[h["Bracket Count"]]
    }))
    .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
    .slice(0, 3);

  return {
    ok: true,
    events: rows
  };
}

function getLeaderboard_(level) {
  if (!WM.LEVELS.includes(level)) {
    throw new Error("Invalid level: " + level);
  }

  rebuildLeaderboards_();

  const sheetName = level === "Ebonmarch"
    ? WM.SHEETS.EBONMARCH
    : WM.SHEETS.VALKYRIE;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return { ok: true, level: level, players: [] };
  }

  const h = headerMap_(values[0]);

  return {
    ok: true,
    level: level,
    players: values.slice(1)
      .filter(r => r[h["Player"]])
      .map(r => ({
        rank: r[h["Rank"]],
        player: r[h["Player"]],
        totalPoints: r[h["Total Points"]],
        eventsEntered: r[h["Events Entered"]],
        first: r[h["1st"]],
        second: r[h["2nd"]],
        third: r[h["3rd"]],
        fourth: r[h["4th"]],
        fifth: r[h["5th"]]
      }))
  };
}

function rebuildLeaderboards_() {
  rebuildLeaderboardForLevel_("Ebonmarch", WM.SHEETS.EBONMARCH);
  rebuildLeaderboardForLevel_("Valkyrie", WM.SHEETS.VALKYRIE);
}

function rebuildLeaderboardForLevel_(level, sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const live = ss.getSheetByName(WM.SHEETS.LIVE);
  const out = ss.getSheetByName(sheetName);
  const values = live.getDataRange().getValues();

  const headers = [
    "Rank",
    "Player",
    "Total Points",
    "Events Entered",
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th"
  ];

  out.clearContents();
  out.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (values.length < 2) return;

  const h = headerMap_(values[0]);
  const cutoff = addMonths_(new Date(), -WM.LEADERBOARD_MONTHS);
  const map = {};

  values.slice(1).forEach(row => {
    if (row[h["Level"]] !== level) return;

    const eventDate = parseDate_(row[h["Event Date"]]);
    if (!eventDate || eventDate < cutoff) return;

    const player = String(row[h["Player"]] || "").trim();
    if (!player) return;

    const eventId = String(row[h["Event ID"]] || "").trim();
    const placement = Number(row[h["Placement"]] || 0);
    const points = Number(row[h["Points"]] || 0);

    if (!map[player]) {
      map[player] = {
        player: player,
        totalPoints: 0,
        events: {},
        first: 0,
        second: 0,
        third: 0,
        fourth: 0,
        fifth: 0
      };
    }

    map[player].totalPoints += points;
    map[player].events[eventId] = true;

    if (placement === 1) map[player].first++;
    if (placement === 2) map[player].second++;
    if (placement === 3) map[player].third++;
    if (placement === 4) map[player].fourth++;
    if (placement === 5) map[player].fifth++;
  });

  const rows = Object.values(map)
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.first !== a.first) return b.first - a.first;
      if (b.second !== a.second) return b.second - a.second;
      return a.player.localeCompare(b.player);
    })
    .map((p, i) => [
      i + 1,
      p.player,
      p.totalPoints,
      Object.keys(p.events).length,
      p.first,
      p.second,
      p.third,
      p.fourth,
      p.fifth
    ]);

  if (rows.length) {
    out.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  out.setFrozenRows(1);
  out.autoResizeColumns(1, headers.length);
}

function archiveOldResults_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const live = ss.getSheetByName(WM.SHEETS.LIVE);
  const archive = ss.getSheetByName(WM.SHEETS.ARCHIVE);

  const values = live.getDataRange().getValues();
  if (values.length < 2) return;

  const headers = values[0];
  const h = headerMap_(headers);
  const cutoff = addMonths_(new Date(), -WM.LIVE_KEEP_MONTHS);

  const keep = [headers];
  const move = [];

  values.slice(1).forEach(row => {
    const eventDate = parseDate_(row[h["Event Date"]]);

    if (eventDate && eventDate < cutoff) {
      move.push(row);
    } else {
      keep.push(row);
    }
  });

  if (move.length) {
    archive.getRange(archive.getLastRow() + 1, 1, move.length, move[0].length).setValues(move);
    live.clearContents();
    live.getRange(1, 1, keep.length, keep[0].length).setValues(keep);
  }
}

function getMeta_() {
  return {
    ok: true,
    levels: WM.LEVELS,
    brackets: WM.BRACKETS,
    points: WM.POINTS,
    liveKeepMonths: WM.LIVE_KEEP_MONTHS,
    leaderboardMonths: WM.LEADERBOARD_MONTHS
  };
}

function buildEventId_(level, eventDate, location, date) {
  const cleanLevel = level.replace(/\s+/g, "_");
  const cleanLocation = location.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const stamp = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyyMMddHHmmss");
  return cleanLevel + "_" + eventDate + "_" + cleanLocation + "_" + stamp;
}

function parseDate_(value) {
  if (!value) return null;

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return value;
  }

  const date = new Date(value);
  if (isNaN(date)) return null;

  return date;
}

function addMonths_(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate_(value) {
  const date = parseDate_(value);
  if (!date) return String(value || "");

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
}

function formatDateTime_(value) {
  const date = parseDate_(value);
  if (!date) return String(value || "");

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm"
  );
}

function headerMap_(headers) {
  const map = {};

  headers.forEach((header, index) => {
    map[String(header).trim()] = index;
  });

  return map;
}
Then deploy it:

Deploy → New deployment → Web app
Execute as: Me
Who has access: Anyone
After deployment, test this in the browser:

YOUR_WEB_APP_URL?action=meta&callback=test
You should see:

test({"ok":true,...})

https://script.google.com/macros/s/AKfycbw-KyzU9ZOZ5wNwvltar0HzihSBgHomOTI4nlrk_1f_mNZbZ9PezOHBrqpQmzyk5IeN/exec

Thought for a couple of seconds
Test this first:

https://script.google.com/macros/s/AKfycbw-KyzU9ZOZ5wNwvltar0HzihSBgHomOTI4nlrk_1f_mNZbZ9PezOHBrqpQmzyk5IeN/exec?action=meta&callback=test
You should see something like:

test({"ok":true,"levels":["Ebonmarch","Valkyrie"],...})
If that works, the GitHub page can use this as:

const API_URL = "https://script.google.com/macros/s/AKfycbw-KyzU9ZOZ5wNwvltar0HzihSBgHomOTI4nlrk_1f_mNZbZ9PezOHBrqpQmzyk5IeN/exec";

callback({"ok":true,"events":[]})

That means the Apps Script API is working.

It returned:

callback({"ok":true,"events":[]})
So:

Connection works
No events have been submitted yet
Recent tournaments list is empty
Next step is building the GitHub index.html for:

Most recent 3 tournaments
Enter new tournament
Ebonmarch leaderboard
Valkyrie leaderboard

okay let us build that next.  the Layout should be

Type of Tournament.  Duchy or Valkyrie.  

Then should be able to enter the results of each Bracket.  

Single Short, Sword and Board, Florentine (Flow), Open, and Great.  (Open and Great are optional).  The other three are mandatory.  

Results will show the top 10 for the Leadership board.  The Individual Event results should show the top 5.  

I’ll build this as a GitHub Pages index.html for the Weapon Master tracker, separate from the ORK dashboard. It will read from your Apps Script API and submit tournament results back to the sheet.

Weapon Master Tracker Index
· html
<!DOCTYPE html>
        if (!hasAny && !bracket.required) return null;
        return result;
      }).filter(Boolean);
    }

    function clearEntryForm() {
      document.getElementById("eventDate").value = "";
      document.getElementById("location").value = "";
      els.brackets.querySelectorAll("input").forEach(input => input.value = "");
    }

    function jsonp(url, params = {}) {
      return new Promise((resolve, reject) => {
        const callbackName = "wmJsonp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
        const query = new URLSearchParams({ ...params, callback: callbackName });
        const script = document.createElement("script");
        let timeoutId;

        window[callbackName] = data => {
          clearTimeout(timeoutId);
          delete window[callbackName];
          script.remove();
          resolve(data);
        };

        script.onerror = () => {
          clearTimeout(timeoutId);
          delete window[callbackName];
          script.remove();
          reject(new Error("JSONP failed"));
        };

        timeoutId = setTimeout(() => {
          delete window[callbackName];
          script.remove();
          reject(new Error("JSONP timed out"));
        }, 30000);

        script.src = url + "?" + query.toString();
        document.body.appendChild(script);
      });
    }

    async function postJson(url, payload) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!data.ok) throw new Error(data.message || "Submit failed");
      return data;
    }

    function setStatus(type, text) {
      els.statusDot.className = "dot" + (type === "ready" ? " ready" : type === "error" ? " error" : "");
      els.statusText.textContent = text;
    }

    function showMessage(text, type) {
      els.submitMessage.textContent = text;
      els.submitMessage.className = "message" + (type ? " " + type : "");
    }

    function clearMessage() {
      showMessage("", "");
    }

    function displayLevel(level) {
      return level === "Ebonmarch" ? "Duchy" : level;
    }

    function suffix(n) {
      if (n === 1) return "st";
      if (n === 2) return "nd";
      if (n === 3) return "rd";
      return "th";
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  </script>
</body>
</html>

Thought for 1m 3s
Built the GitHub index.html for the Weapon Master tracker in the canvas.

It includes:

Type of Tournament: Duchy / Valkyrie

Required brackets:

Single Short

Sword & Board

Flow

Optional brackets:

Open

Greats

Top 10 leaderboards

Recent 3 tournaments

Submission back to your Apps Script URL

This goes in GitHub as:

index.html

okay, I messed up and named the file index instead of index.html is there a way to edit the file name?

Yes.

Rename file in GitHub
Open the file named:

index
Click the pencil icon (Edit file)

At the top where the filename is shown:

index
change it to:

index.html
Scroll down

Click:

Commit changes
GitHub will rename it correctly.

After that, GitHub Pages will automatically recognize it as the homepage.


okay that is now corrected

Perfect.

Now GitHub Pages will properly load:

index.html
Next steps:

Wait ~30–60 seconds for GitHub Pages to update

Open your GitHub Pages URL

Verify:

Home page loads

Recent tournaments panel appears

Enter Tournament tab works

Leaderboards load

Then test a real submission:

Type: Duchy
Date
Location
Single Short
Sword & Board
Flow
Submit
After submitting:

Check Google Sheets

Confirm rows appear in:

Live_Results

Events

Confirm leaderboard updates automatically

That will fully verify the system end-to-end.


This works a lot better than the apps script version

Yes — this architecture is much better for what you’re building.

Why it feels better:

GitHub Pages
= fast UI
= responsive
= modern layout
= no Apps Script HTML lag
= handles larger datasets better
while:

Apps Script
= database/API only
= save data
= calculations
= leaderboard rebuilds
= archival logic
That separation is exactly why the ORK dashboard improved too.

You’ve basically moved from:

Spreadsheet app with HTML attached
to:

Web application backed by Google Sheets
Which is the correct direction for:

ORK dashboards

Weapon Master tracking

Battle Master brackets

Event systems

Public viewers

The biggest future advantage:

You can completely redesign the UI later
WITHOUT touching the database.
That is huge.


Is there a way to link the ork json files to the website to enter names and ensure spelling si correct?

Thought for 5s
Yes. Best way:

ORK data → Apps Script cache → GitHub website autocomplete
Do not have GitHub call ORK directly. Better to let Apps Script pull ORK names, store/cache them, then GitHub asks Apps Script for the player list.

What this gives you
When entering tournament results:

1st Place: [Start typing name...]
It can suggest:

Waldodorf
Waldorin
Waldorf the Red
Then the selected value saves with correct spelling.

Best setup
Add a sheet tab:

Player_Cache
With columns:

Player ID | Player Name | Park | Kingdom | Last Updated
Then Apps Script adds:

?action=players
GitHub loads that list and uses it for autocomplete.

GitHub side
The tournament entry fields become searchable name fields instead of plain text fields.

Example behavior:

Type "wal"
↓
Dropdown shows matching ORK names
↓
Click correct player
↓
Saves exact ORK spelling
Important
You can still allow manual entry for visiting players not in the cache.

Best UX:

Select known ORK player
or
Type manually if not found
Recommended next step
Build this in two parts:

1. Apps Script endpoint:
   ?action=players

2. GitHub autocomplete:
   player name suggestions on all placement fields
This would make the tracker much cleaner and prevent misspellings like:

Waldodorf
Waldodorph
Waldorf

so how would we build the cache?

Thought for 5s
Build the cache in Google Sheets, not GitHub.

Add a new tab
Create a sheet tab named:

Player_Cache
Headers:

Player ID | Player Name | Park | Kingdom | ORK URL | Last Updated
Cache idea
Apps Script will:

Pull players from ORK / your existing ORK dashboard data

Save clean names into Player_Cache

GitHub asks Apps Script for ?action=players

Website uses that list for autocomplete

Easiest first version
Since your Ebonmarch ORK dashboard already has player data, use that first.

Add this to the Weapon Master Apps Script:

function getPlayers_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Player_Cache");

  if (!sheet) {
    return {
      ok: false,
      message: "Missing Player_Cache sheet."
    };
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return {
      ok: true,
      players: []
    };
  }

  const h = headerMap_(values[0]);

  const players = values.slice(1)
    .filter(row => row[h["Player Name"]])
    .map(row => ({
      id: String(row[h["Player ID"]] || "").trim(),
      name: String(row[h["Player Name"]] || "").trim(),
      park: String(row[h["Park"]] || "").trim(),
      kingdom: String(row[h["Kingdom"]] || "").trim(),
      ork: String(row[h["ORK URL"]] || "").trim()
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ok: true,
    players: players
  };
}
Then update your doGet(e):

if (action === "players") {
  data = getPlayers_();
} else if (action === "recent") {
  data = getRecentTournaments_();
} else if (action === "leaderboard") {
  data = getLeaderboard_(e.parameter.level);
} else if (action === "meta") {
  data = getMeta_();
} else {
  data = { ok: false, message: "Unknown action: " + action };
}
Then test
YOUR_SCRIPT_URL?action=players&callback=test
You want:

test({"ok":true,"players":[...]})
Best long-term version
Later we add a button/function:

refreshPlayerCache_()
That pulls from ORK and rebuilds Player_Cache.

But first, the simplest working path is:

Player_Cache tab
↓
?action=players
↓
GitHub autocomplete
Once that works, we wire the player-name fields on the GitHub page to use the cache.


what i we build a cache that encompasses all of atmgard so that even outside visitors are found?

Thought for a few seconds
Yes, but I would not build that by pulling all Amtgard players live every time.

Best structure:

All-Amtgard Player Cache
Google Sheet tab/database
Updated on command or scheduled refresh
Used by GitHub autocomplete
Recommended cache tab
Player_Cache_All
Columns:

Player ID
Player Name
Park
Kingdom
Park ID
Kingdom ID
ORK URL
Active Status
Last Sign-In
Last Updated
How it should work
The system would:

1. Pull kingdom list
2. Pull parks per kingdom
3. Pull active roster per park
4. Save all players into Player_Cache_All
5. GitHub uses ?action=players
6. Autocomplete searches that cache
Important warning
All Amtgard could be thousands of players, so the website should not load the full cache immediately.

Better autocomplete flow:

User types at least 2–3 letters
↓
GitHub asks Apps Script:
?action=playerSearch&q=wald
↓
Apps Script searches Player_Cache_All
↓
Returns top 20 matches
That avoids loading thousands of names into the browser.

Best endpoint
Instead of:

?action=players
Use:

?action=playerSearch&q=NAME
Return:

{
  ok: true,
  players: [
    {
      id: "12345",
      name: "Waldodorf",
      park: "Grim Garrison",
      kingdom: "Rising Winds",
      ork: "..."
    }
  ]
}
Best build order
Create Player_Cache_All

Add refreshAllAmtgardPlayerCache_()

Add playerSearch_(query)

Connect GitHub autocomplete fields

Add manual fallback for players not found

So yes, this is doable. The key is: cache all Amtgard in Sheets, but only search small chunks from GitHub.


The information in the cache would just be Active players only, and include the Player ID/Player Name (what is searches by)/Kingdom

Yes. Keep the cache very lean.

Cache tab
Player_Cache_All
Headers:

Player ID | Player Name | Kingdom | Last Updated
That is enough for autocomplete and correct spelling.

Search behavior
GitHub page should not load the whole cache.

Use:

?action=playerSearch&q=wald
Return only top matches:

{
  ok: true,
  players: [
    {
      id: "12345",
      name: "Waldodorf",
      kingdom: "Rising Winds"
    }
  ]
}
Why this is better
Smaller sheet

Faster search

No unnecessary park/award data

Easier to refresh

Works for outside visitors

Keeps tournament entry spelling clean

Minimum Apps Script functions needed next
refreshAllActivePlayersCache_()
playerSearch_(q)
And update doGet(e) with:

?action=playerSearch&q=name
For tournament saving, we can still save only the player name right now, or improve it to save both:

Player ID
Player Name
My recommendation: save both.


Just player name as the ID is hardly used

That’s reasonable for Weapon Master tracking.

Use the cache only for:

Autocomplete
Correct spelling
Kingdom reference
But save only:

Player Name
Final cache structure
Player_Cache_All
Headers:

Player Name | Kingdom | Last Updated
That keeps it:

lightweight

fast

easy to maintain

Search endpoint
?action=playerSearch&q=wal
Returns:

{
  ok: true,
  players: [
    {
      name: "Waldodorf",
      kingdom: "Rising Winds"
    }
  ]
}
Website behavior
Typing:

wal
shows:

Waldodorf — Rising Winds
Waldorin — Goldenvale
Selecting fills:

Waldodorf
into the tournament placement field.

That is the cleanest setup for this tracker.


okay so let us build the Cache, we will want it to auto run until complete. But because of the area we will want to run it by the geographical Kingdoms around The Risingwinds, 

We’ll build this as a staged cache runner so Apps Script does not time out. It will process one kingdom/park batch at a time, save progress, and keep triggering itself until complete.

Thought for 6s
Yes. Best design:

Player_Cache_All
Cache_State
Start with configurable nearby kingdoms:

const PLAYER_CACHE = {
  SHEET: "Player_Cache_All",
  STATE: "Cache_State",
  KINGDOMS: [
    { id: 10, name: "Rising Winds" }
  ],
  MAX_PARKS_PER_RUN: 3
};
Then we add nearby kingdoms as you confirm their ORK Kingdom IDs.

For now, paste this into Apps Script as a new file:

const PLAYER_CACHE = {
  SHEET: "Player_Cache_All",
  STATE: "Cache_State",
  KINGDOMS: [
    { id: 10, name: "Rising Winds" }
  ],
  MAX_PARKS_PER_RUN: 3
};

function startPlayerCacheRefresh() {
  setupPlayerCacheSheets_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cache = ss.getSheetByName(PLAYER_CACHE.SHEET);
  const state = ss.getSheetByName(PLAYER_CACHE.STATE);

  cache.clearContents();
  cache.getRange(1, 1, 1, 3).setValues([[
    "Player Name",
    "Kingdom",
    "Last Updated"
  ]]);

  state.clearContents();
  state.getRange(1, 1, 1, 5).setValues([[
    "Kingdom Index",
    "Park Index",
    "Status",
    "Last Run",
    "Message"
  ]]);

  state.getRange(2, 1, 1, 5).setValues([[
    0,
    0,
    "Running",
    new Date(),
    "Started"
  ]]);

  deletePlayerCacheTriggers_();
  runPlayerCacheRefresh_();
}

function runPlayerCacheRefresh_() {
  setupPlayerCacheSheets_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const state = ss.getSheetByName(PLAYER_CACHE.STATE);
  const cache = ss.getSheetByName(PLAYER_CACHE.SHEET);

  const stateRow = state.getRange(2, 1, 1, 5).getValues()[0];

  let kingdomIndex = Number(stateRow[0] || 0);
  let parkIndex = Number(stateRow[1] || 0);

  if (kingdomIndex >= PLAYER_CACHE.KINGDOMS.length) {
    state.getRange(2, 3, 1, 3).setValues([[
      "Complete",
      new Date(),
      "Finished"
    ]]);
    deletePlayerCacheTriggers_();
    removeDuplicatePlayerCacheRows_();
    return;
  }

  const kingdom = PLAYER_CACHE.KINGDOMS[kingdomIndex];
  const parks = getKingdomParks_(kingdom.id);

  let processed = 0;

  while (parkIndex < parks.length && processed < PLAYER_CACHE.MAX_PARKS_PER_RUN) {
    const park = parks[parkIndex];
    const players = getActivePlayersForPark_(park.id, kingdom.name);

    if (players.length) {
      cache.getRange(cache.getLastRow() + 1, 1, players.length, 3).setValues(players);
    }

    parkIndex++;
    processed++;
  }

  if (parkIndex >= parks.length) {
    kingdomIndex++;
    parkIndex = 0;
  }

  state.getRange(2, 1, 1, 5).setValues([[
    kingdomIndex,
    parkIndex,
    kingdomIndex >= PLAYER_CACHE.KINGDOMS.length ? "Complete" : "Running",
    new Date(),
    "Processed batch"
  ]]);

  if (kingdomIndex >= PLAYER_CACHE.KINGDOMS.length) {
    deletePlayerCacheTriggers_();
    removeDuplicatePlayerCacheRows_();
  } else {
    scheduleNextPlayerCacheRun_();
  }
}

function setupPlayerCacheSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let cache = ss.getSheetByName(PLAYER_CACHE.SHEET);
  if (!cache) cache = ss.insertSheet(PLAYER_CACHE.SHEET);

  if (cache.getLastRow() === 0) {
    cache.getRange(1, 1, 1, 3).setValues([[
      "Player Name",
      "Kingdom",
      "Last Updated"
    ]]);
  }

  let state = ss.getSheetByName(PLAYER_CACHE.STATE);
  if (!state) state = ss.insertSheet(PLAYER_CACHE.STATE);

  if (state.getLastRow() === 0) {
    state.getRange(1, 1, 1, 5).setValues([[
      "Kingdom Index",
      "Park Index",
      "Status",
      "Last Run",
      "Message"
    ]]);
  }

  cache.setFrozenRows(1);
  state.setFrozenRows(1);
}

function getKingdomParks_(kingdomId) {
  const url = "https://ork.amtgard.com/orkui/index.php?Route=Kingdom/index/" + kingdomId;
  const html = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText();

  const parks = [];
  const regex = /Route=Park\\/index\\/(\\d+)[^>]*>([^<]+)</g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    parks.push({
      id: match[1],
      name: decodeHtml_(match[2])
    });
  }

  return uniqueParks_(parks);
}

function getActivePlayersForPark_(parkId, kingdomName) {
  const url = "https://ork.amtgard.com/orkui/index.php?Route=Reports/active/Park&id=" + parkId;
  const html = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText();

  const rows = [];
  const now = new Date();

  const linkRegex = /Route=Player\\/index\\/(\\d+)[^>]*>([^<]+)</g;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const name = decodeHtml_(match[2]).trim();

    if (!name) continue;
    if (/^\d+$/.test(name)) continue;
    if (name.toLowerCase() === "player") continue;

    rows.push([
      name,
      kingdomName,
      now
    ]);
  }

  return rows;
}

function removeDuplicatePlayerCacheRows_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PLAYER_CACHE.SHEET);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return;

  const headers = values[0];
  const seen = {};
  const output = [headers];

  values.slice(1).forEach(row => {
    const name = String(row[0] || "").trim();
    const kingdom = String(row[1] || "").trim();
    const key = name.toLowerCase() + "|" + kingdom.toLowerCase();

    if (!name || seen[key]) return;

    seen[key] = true;
    output.push(row);
  });

  sheet.clearContents();
  sheet.getRange(1, 1, output.length, output[0].length).setValues(output);
  sheet.autoResizeColumns(1, 3);
}

function scheduleNextPlayerCacheRun_() {
  deletePlayerCacheTriggers_();

  ScriptApp.newTrigger("runPlayerCacheRefresh_")
    .timeBased()
    .after(60 * 1000)
    .create();
}

function deletePlayerCacheTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === "runPlayerCacheRefresh_") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function uniqueParks_(parks) {
  const seen = {};
  return parks.filter(park => {
    if (seen[park.id]) return false;
    seen[park.id] = true;
    return true;
  });
}

function playerSearch_(q) {
  const query = String(q || "").trim().toLowerCase();

  if (query.length < 2) {
    return {
      ok: true,
      players: []
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PLAYER_CACHE.SHEET);

  if (!sheet) {
    return {
      ok: false,
      message: "Missing " + PLAYER_CACHE.SHEET
    };
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      ok: true,
      players: []
    };
  }

  const players = values.slice(1)
    .map(row => ({
      name: String(row[0] || "").trim(),
      kingdom: String(row[1] || "").trim()
    }))
    .filter(player => player.name && player.name.toLowerCase().includes(query))
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 20);

  return {
    ok: true,
    players: players
  };
}
Then update your doGet(e) to include:

} else if (action === "playerSearch") {
  data = playerSearch_(e.parameter.q);
So that section becomes:

if (action === "recent") {
  data = getRecentTournaments_();
} else if (action === "leaderboard") {
  data = getLeaderboard_(e.parameter.level);
} else if (action === "meta") {
  data = getMeta_();
} else if (action === "playerSearch") {
  data = playerSearch_(e.parameter.q);
} else {
  data = { ok: false, message: "Unknown action: " + action };
}
To start the cache:

Run startPlayerCacheRefresh
For nearby kingdoms, we will add more entries here:

KINGDOMS: [
  { id: 10, name: "Rising Winds" }
]
Example format:

KINGDOMS: [
  { id: 10, name: "Rising Winds" },
  { id: 0, name: "Kingdom Name" }
]
Once you give me the nearby kingdom IDs you want included, we can add them to the list.


Let us start by building the cache before we add anything to the website so that we can verify the cache works first.  

Yes. Build and verify the cache first.

Step 1: Add a new Apps Script file
In Apps Script:

+ → Script
Name it:

Player_Cache
Paste the cache code into that file.

Step 2: Keep only Rising Winds first
Use this first:

KINGDOMS: [
  { id: 10, name: "Rising Winds" }
]
Do not add other kingdoms yet.

Step 3: Save
Click the save icon.

Step 4: Run the starter function
From the function dropdown, choose:

startPlayerCacheRefresh
Click Run.

You may need to authorize permissions.

Step 5: Check the sheet
It should create:

Player_Cache_All
Cache_State
Cache_State should show:

Running
or eventually:

Complete
Player_Cache_All should fill with:

Player Name | Kingdom | Last Updated
Step 6: Let the auto-run finish
Because it processes in batches, it may take a few minutes.

Check Cache_State:

Status = Complete
Step 7: Test the search endpoint
Once complete, open:

YOUR_SCRIPT_URL?action=playerSearch&q=wal&callback=test
Expected:

test({"ok":true,"players":[...]})
For your current URL:

https://script.google.com/macros/s/AKfycbw-KyzU9ZOZ5wNwvltar0HzihSBgHomOTI4nlrk_1f_mNZbZ9PezOHBrqpQmzyk5IeN/exec?action=playerSearch&q=wal&callback=test
If that returns matching players, the cache works.


Syntax error: SyntaxError: Invalid regular expression flags line: 142 file: Cache.gs

That error is from the regex escaping in Apps Script.

Replace this:

const regex = /Route=Park\\/index\\/(\\d+)[^>]*>([^<]+)</g;
with:

const regex = /Route=Park\/index\/(\d+)[^>]*>([^<]+)</g;
And replace this:

const linkRegex = /Route=Player\\/index\\/(\\d+)[^>]*>([^<]+)</g;
with:

const linkRegex = /Route=Player\/index\/(\d+)[^>]*>([^<]+)</g;
Apps Script regex literals do not need the extra escaping that happened during formatting.


awesome this worked, and to verify does this auto run?

Yes.

Once you run:

startPlayerCacheRefresh
it automatically:

Processes a few parks
↓
Creates a timed trigger
↓
Runs again in ~1 minute
↓
Processes next parks
↓
Repeats until complete
↓
Deletes its own trigger
So you only manually start it once.

How to verify
Check:

Cache_State
You should see:

Running
then eventually:

Complete
Also verify triggers
In Apps Script:

Triggers (clock icon on left)
You should temporarily see:

runPlayerCacheRefresh_
Time-driven
When complete, it removes itself automatically.

Current setup behavior
Right now:

Rising Winds only
Active players only
Deduplicated
Which is exactly where you should start before expanding outward.


Uploaded image
this was on its first run

That means it completed successfully on the first pass.

Specifically:

Kingdom Index = 1
Park Index = 0
Status = Complete
Because your current kingdom list only has:

{ id: 10, name: "Rising Winds" }
Index 1 means:

Finished processing kingdom 0
Moved past the end of the array
Done
Now verify the actual cache:

Open:

Player_Cache_All
You should see rows like:

Player Name | Kingdom | Last Updated
with active Rising Winds players populated.

Then test the endpoint:

https://script.google.com/macros/s/AKfycbw-KyzU9ZOZ5wNwvltar0HzihSBgHomOTI4nlrk_1f_mNZbZ9PezOHBrqpQmzyk5IeN/exec?action=playerSearch&q=wal&callback=test
If that returns players, the cache system is fully working.


test({"ok":false,"message":"Unknown action: playerSearch"})

That means the cache function exists, but your main doGet(e) does not know how to route to it yet.

In your main web app .gs file, find this section inside doGet(e):

if (action === "recent") {
  data = getRecentTournaments_();
} else if (action === "leaderboard") {
  data = getLeaderboard_(e.parameter.level);
} else if (action === "meta") {
  data = getMeta_();
} else {
  data = { ok: false, message: "Unknown action: " + action };
}
Replace it with:

if (action === "recent") {
  data = getRecentTournaments_();
} else if (action === "leaderboard") {
  data = getLeaderboard_(e.parameter.level);
} else if (action === "meta") {
  data = getMeta_();
} else if (action === "playerSearch") {
  data = playerSearch_(e.parameter.q);
} else {
  data = { ok: false, message: "Unknown action: " + action };
}
Then:

Save

Deploy → Manage deployments

Edit current deployment

Deploy again

Then test again:

https://script.google.com/macros/s/AKfycbw-KyzU9ZOZ5wNwvltar0HzihSBgHomOTI4nlrk_1f_mNZbZ9PezOHBrqpQmzyk5IeN/exec?action=playerSearch&q=wal&callback=test

There is not data in the Player_Cache_All

That means the cache runner completed, but it found 0 parks or 0 active players. Most likely the ORK page format did not match the regex.

Let’s verify in two steps.

Step 1: Add this test function
Paste this into Cache.gs:

function testRisingWindsParks() {
  const parks = getKingdomParks_(10);
  Logger.log(JSON.stringify(parks, null, 2));
  Logger.log("Park count: " + parks.length);
}
Run:

testRisingWindsParks
Then check:

Execution log
If it says:

Park count: 0
then the park parser is the issue.

Step 2: Replace getKingdomParks_ with this better version
function getKingdomParks_(kingdomId) {
  const url = "https://ork.amtgard.com/orkui/index.php?Route=Kingdom/index/" + kingdomId;
  const html = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText();

  const parks = [];

  const patterns = [
    /Route=Park\/index\/(\d+)[^>]*>([^<]+)</g,
    /Route=Reports\/roster\/Park&id=(\d+)[^>]*>([^<]+)</g,
    /Park&id=(\d+)[^>]*>([^<]+)</g
  ];

  patterns.forEach(regex => {
    let match;
    while ((match = regex.exec(html)) !== null) {
      const id = String(match[1]).trim();
      const name = decodeHtml_(match[2]).trim();

      if (!id || !name) continue;
      if (/^\d+$/.test(name)) continue;

      parks.push({
        id: id,
        name: name
      });
    }
  });

  return uniqueParks_(parks);
}
Step 3: Add this test function too
function testActivePlayersForPark() {
  const players = getActivePlayersForPark_(714, "Rising Winds");
  Logger.log(JSON.stringify(players.slice(0, 10), null, 2));
  Logger.log("Player count: " + players.length);
}
This uses Grim Garrison as a test park.

Run:

testActivePlayersForPark
If that returns players, the active player parser works.

If it returns 0, then we replace getActivePlayersForPark_ next.


Both still have: 
Execution log
9:26:07 AM	Notice	Execution started
9:26:08 AM	Info	[]
9:26:08 AM	Info	Player count: 0
9:26:08 AM	Notice	Execution completed

Thought for 23s
The issue is the park method is not finding players. Let’s switch to a better method:

Instead of:

Kingdom → Parks → Active Players per Park
Use:

Kingdom → Active Players report directly
The ORK active report has a Persona column, which is exactly what we need for the cache. 

Replace your entire Cache.gs with this:

const PLAYER_CACHE = {
  SHEET: "Player_Cache_All",
  STATE: "Cache_State",
  KINGDOMS: [
    { id: 10, name: "Rising Winds" }
  ],
  MAX_KINGDOMS_PER_RUN: 1
};

function startPlayerCacheRefresh() {
  setupPlayerCacheSheets_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cache = ss.getSheetByName(PLAYER_CACHE.SHEET);
  const state = ss.getSheetByName(PLAYER_CACHE.STATE);

  cache.clearContents();
  cache.getRange(1, 1, 1, 3).setValues([[
    "Player Name",
    "Kingdom",
    "Last Updated"
  ]]);

  state.clearContents();
  state.getRange(1, 1, 1, 4).setValues([[
    "Kingdom Index",
    "Status",
    "Last Run",
    "Message"
  ]]);

  state.getRange(2, 1, 1, 4).setValues([[
    0,
    "Running",
    new Date(),
    "Started"
  ]]);

  deletePlayerCacheTriggers_();
  runPlayerCacheRefresh_();
}

function runPlayerCacheRefresh_() {
  setupPlayerCacheSheets_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const state = ss.getSheetByName(PLAYER_CACHE.STATE);
  const cache = ss.getSheetByName(PLAYER_CACHE.SHEET);

  const stateRow = state.getRange(2, 1, 1, 4).getValues()[0];

  let kingdomIndex = Number(stateRow[0] || 0);

  if (kingdomIndex >= PLAYER_CACHE.KINGDOMS.length) {
    state.getRange(2, 2, 1, 3).setValues([[
      "Complete",
      new Date(),
      "Finished"
    ]]);
    deletePlayerCacheTriggers_();
    removeDuplicatePlayerCacheRows_();
    return;
  }

  let processed = 0;
  let message = "";

  while (
    kingdomIndex < PLAYER_CACHE.KINGDOMS.length &&
    processed < PLAYER_CACHE.MAX_KINGDOMS_PER_RUN
  ) {
    const kingdom = PLAYER_CACHE.KINGDOMS[kingdomIndex];
    const players = getActivePlayersForKingdom_(kingdom.id, kingdom.name);

    if (players.length) {
      cache.getRange(cache.getLastRow() + 1, 1, players.length, 3).setValues(players);
    }

    message = kingdom.name + ": " + players.length + " players";
    kingdomIndex++;
    processed++;
  }

  state.getRange(2, 1, 1, 4).setValues([[
    kingdomIndex,
    kingdomIndex >= PLAYER_CACHE.KINGDOMS.length ? "Complete" : "Running",
    new Date(),
    message
  ]]);

  if (kingdomIndex >= PLAYER_CACHE.KINGDOMS.length) {
    deletePlayerCacheTriggers_();
    removeDuplicatePlayerCacheRows_();
  } else {
    scheduleNextPlayerCacheRun_();
  }
}

function getActivePlayersForKingdom_(kingdomId, kingdomName) {
  const url = "https://ork.amtgard.com/orkui/index.php?Route=Reports/active/Kingdom&id=" + kingdomId;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const html = response.getContentText();

  const rows = parseActivePlayerTable_(html, kingdomName);

  return rows;
}

function parseActivePlayerTable_(html, kingdomName) {
  const output = [];
  const now = new Date();

  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  let personaIndex = -1;

  for (let i = 0; i < trMatches.length; i++) {
    const cells = extractCells_(trMatches[i]);

    if (!cells.length) continue;

    if (personaIndex === -1) {
      const lower = cells.map(c => c.toLowerCase());
      personaIndex = lower.indexOf("persona");
      continue;
    }

    const name = String(cells[personaIndex] || "").trim();

    if (!name) continue;
    if (name.toLowerCase() === "persona") continue;
    if (name.toLowerCase().startsWith("total:")) continue;

    output.push([
      name,
      kingdomName,
      now
    ]);
  }

  return output;
}

function extractCells_(trHtml) {
  const matches = trHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];

  return matches.map(cell => {
    return decodeHtml_(
      cell
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    );
  });
}

function setupPlayerCacheSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let cache = ss.getSheetByName(PLAYER_CACHE.SHEET);
  if (!cache) cache = ss.insertSheet(PLAYER_CACHE.SHEET);

  if (cache.getLastRow() === 0) {
    cache.getRange(1, 1, 1, 3).setValues([[
      "Player Name",
      "Kingdom",
      "Last Updated"
    ]]);
  }

  let state = ss.getSheetByName(PLAYER_CACHE.STATE);
  if (!state) state = ss.insertSheet(PLAYER_CACHE.STATE);

  if (state.getLastRow() === 0) {
    state.getRange(1, 1, 1, 4).setValues([[
      "Kingdom Index",
      "Status",
      "Last Run",
      "Message"
    ]]);
  }

  cache.setFrozenRows(1);
  state.setFrozenRows(1);
}

function removeDuplicatePlayerCacheRows_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PLAYER_CACHE.SHEET);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return;

  const headers = values[0];
  const seen = {};
  const output = [headers];

  values.slice(1).forEach(row => {
    const name = String(row[0] || "").trim();
    const kingdom = String(row[1] || "").trim();
    const key = name.toLowerCase() + "|" + kingdom.toLowerCase();

    if (!name || seen[key]) return;

    seen[key] = true;
    output.push(row);
  });

  sheet.clearContents();
  sheet.getRange(1, 1, output.length, output[0].length).setValues(output);
  sheet.autoResizeColumns(1, 3);
}

function playerSearch_(q) {
  const query = String(q || "").trim().toLowerCase();

  if (query.length < 2) {
    return {
      ok: true,
      players: []
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PLAYER_CACHE.SHEET);

  if (!sheet) {
    return {
      ok: false,
      message: "Missing " + PLAYER_CACHE.SHEET
    };
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      ok: true,
      players: []
    };
  }

  const players = values.slice(1)
    .map(row => ({
      name: String(row[0] || "").trim(),
      kingdom: String(row[1] || "").trim()
    }))
    .filter(player => player.name && player.name.toLowerCase().includes(query))
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 20);

  return {
    ok: true,
    players: players
  };
}

function scheduleNextPlayerCacheRun_() {
  deletePlayerCacheTriggers_();

  ScriptApp.newTrigger("runPlayerCacheRefresh_")
    .timeBased()
    .after(60 * 1000)
    .create();
}

function deletePlayerCacheTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === "runPlayerCacheRefresh_") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function decodeHtml_(value) {
  if (!value) return "";

  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function testKingdomActivePlayers() {
  const players = getActivePlayersForKingdom_(10, "Rising Winds");
  Logger.log(JSON.stringify(players.slice(0, 20), null, 2));
  Logger.log("Player count: " + players.length);
}
Then run:

testKingdomActivePlayers
If that shows players, run:

startPlayerCacheRefresh

Uploaded image
This is how it looks within the ORK itself, as the parks are separated within the Kingdom. 

Right, that screenshot helps. The ORK kingdom page is visually showing parks, but the HTML is likely not exposing them in the simple Route=Park/index/... pattern we were searching for.

For the cache, the better path is:

Use ORK’s active report directly by Kingdom
not the park cards
So for Rising Winds, we want this style of URL:

https://ork.amtgard.com/orkui/index.php?Route=Reports/active/Kingdom&id=10
If that page loads active players, we can parse names directly from there.

Next test:

Open this in your browser:

https://ork.amtgard.com/orkui/index.php?Route=Reports/active/Kingdom&id=10
If it shows a table of active players, then the cache parser should use that.

If it does not load, then we will use the ORK park cards visually shown there, but we’ll need to inspect the actual links behind the cards and adjust the parser to match them.


it requires to sign in to view that information

Thought for 25s
That changes the plan.

If ORK requires sign-in for the active kingdom report, Apps Script cannot safely or reliably pull that page. So we should not use:

Reports/active/Kingdom
Instead, we have two workable options:

Best option
Use the public park roster pages and filter for activity if the page includes last sign-in.

Flow:

Kingdom page
↓
Find park IDs
↓
Open public roster page per park
↓
Pull Player Name
↓
If Last Sign-In exists, keep only active/recent
↓
Save to Player_Cache_All
The cache still stays:

Player Name | Kingdom | Last Updated
If public roster does not show Last Sign-In
Then we cannot guarantee “active only” from public ORK data.

In that case the best practical cache is:

Known ORK players from public roster pages
and autocomplete still solves the spelling issue.

What we should do next
Update the cache to pull from:

https://ork.amtgard.com/orkui/index.php?Route=Reports/roster/Park&id=PARK_ID
not:

Reports/active/Kingdom
Then we test one known park, like Grim Garrison:

Park ID 714
If that returns player names, we build the wider cache from park rosters.


what about using the Kingdom Jsork page?  

Thought for 13s
Yes, that may be the better path.

The ORK base route we have been using is:

https://ork.amtgard.com/orkui/index.php?Route=


If the JSORK/JSON-style kingdom page exposes the park/player data publicly, then it is much better than scraping HTML.

Best use would be:

JSORK Kingdom endpoint
↓
Pull parks / players
↓
Cache player names + kingdom
↓
GitHub autocomplete searches cache
What we need next is the exact JSORK URL.

Try looking for something like:

https://ork.amtgard.com/orkui/index.php?Route=Kingdom/json/10
or if you already have the JSORK link, send it to me.

Once we have the actual endpoint, we can replace the fragile HTML parser with a cleaner JSON parser.


To utilize jsork the API file and the jquery library must be included in the web page as follows:

<script src="jsork.js"></script>
<script src="jquery.js"></script>
Then within any other javascript you utilize the promised based APIs. So to retrieve all the Kingdoms run the following:

jsork.kingdom.getKingdoms().then(function(allKingdoms) {
    console.log("There are " + allKingdoms.length + " Kingdoms in Amtgard");
})

Perfect. That is significantly better than scraping HTML.

This means:

JSORK
= public structured API wrapper
= cleaner
= faster
= more reliable
= less regex parsing
So the new architecture should be:

GitHub Page
↓
JSORK pulls public Amtgard data directly
↓
Apps Script stores lightweight cache
↓
Tournament system uses cache autocomplete
Best part
You may not even need Apps Script to build the player cache initially.

The GitHub page itself can use JSORK to:

jsork.kingdom.getKingdoms()
then:

jsork.park.getParks()
then:

jsork.player.getPlayers()
depending on what APIs JSORK exposes.

Best long-term design
Apps Script stores:
Tournament results
Leaderboards
Archives
GitHub + JSORK handles:
Player search
Autocomplete
Kingdom lookup
Park lookup
That separates:

static Amtgard data

tournament data

Very clean architecture.

What we need next
We need the available JSORK methods.

For example:

jsork.kingdom.getKingdoms()
What else exists?

Likely:

jsork.park.getParks()
jsork.player.getPlayers()
jsork.player.search()
If you can provide:

the jsork.js file

or a list of methods/docs

then we can wire autocomplete directly into the GitHub tournament page without building a huge Apps Script player cache first.


I do not have the jsork.js file as all we have are these links: 

Unless these are what you are looking for: 

<script src="jsork.js"></script>
<script src="jquery.js"></script>

Thought for 8s
Those two lines are examples, but they only work if the files are actually available in the same folder as the webpage:

<script src="jsork.js"></script>
<script src="jquery.js"></script>
For GitHub Pages, that would mean your repo must contain:

index.html
jsork.js
jquery.js
You do not currently have those files.

I found the JSORK project page here: kenwalker.github.io/jsork. It documents JSORK as a JavaScript Amtgard ORK API wrapper. 

What we need next
Go to the JSORK page and look for either:

GitHub
or a direct download for:

jsork.js
Once you get that file, upload it into your GitHub repo beside index.html.

Your repo would become
index.html
jsork.js
jquery.js
For jQuery, you do not need to upload it manually. Use a CDN:

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="jsork.js"></script>
Then we can test:

jsork.kingdom.getKingdoms().then(function(allKingdoms) {
  console.log(allKingdoms);
});
So: yes, those are the right kind of lines, but we still need the actual jsork.js file or a direct hosted URL to it.



Pasted text.txt
Document

Excellent. You now have the actual jsork.js source. 


And this changes everything.

You do not need to build the player cache through Apps Script anymore.

The cleanest architecture is now:

GitHub Pages
↓
jsork.js directly queries ORK API
↓
Autocomplete player search live
↓
Apps Script only stores tournament results
That is dramatically better.

Most important discovery
This exists in JSORK:

jsork.searchservice.searchPlayer(searchTerm)


Which means you already have:

Live ORK player search
with no cache needed.

This is the exact function you want
jsork.searchservice.searchPlayer("wal")
  .then(results => {
    console.log(results);
  });
This likely returns:

Player Name

Kingdom

Player ID

ORK info

directly from ORK.

New Best Architecture
GitHub
Handles:

UI

Autocomplete

Search

Tournament entry

Apps Script
Handles:

Saving tournament results

Leaderboards

Archival

Last 12 month rolling totals

ORK / JSORK
Handles:

Player validation

Correct spelling

Kingdom lookup

Live player searching

What you should do now
Step 1
Create a new file in GitHub:

jsork.js
Paste the uploaded JSORK code into it.

Step 2
Add jQuery CDN in your index.html

Before:

<script src="script.js"></script>
add:

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="jsork.js"></script>
So:

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="jsork.js"></script>
<script src="script.js"></script>
Step 3
Test in browser console

Open your GitHub page.

Press:

F12
Console:

jsork.searchservice.searchPlayer("wal")
  .then(results => console.log(results));
If results appear:

DONE.
You now have live ORK search integrated into the website.

This is MUCH better than the cache
Because now:

No refresh jobs
No Apps Script triggers
No stale cache
No giant player sheet
No maintenance
And outside visitors automatically work.


jsork
(Pronounced J-Sork) JSON APIs to the Amtgard ORK
See the Github pages document as that is where more doc and examples will be added.

jsork Github Pages

This is work in progress so not all APIs have been implemented yet.

There's a requirement for jQuery to be present.

So at a minimum you need the Jsork APIs and jQuery loaded in your page as follows:

<script src="jquery.js"></script>
<script src="jsork.js"></script>
The APIs are grouped into categores like kingdom, park, player, etc. To use the API you get to it through the global jsork namespace.

All the API calls take whatever arguments are required and return a promise.

jsork.kingdom.getKingdoms().then(function(allKingdoms) {
    console.log("There are " + allKingdoms.length + " Kingdoms in Amtgard");
})
Would print out There are 25 Kingdoms in Amtgard

jsork.player.getInfo(43232).then(function(player) {
    console.log("Ken's persona is " + player.Persona);
})
Would print out Ken's persona is Kismet Shenchu

Some APIs have additional parameters like getting a players awards. You can ask for them all using jsork.awardIDs.ALL or like the following example just as for the one you want.

jsork.player.getAwards(43232, jsork.awardIDs.ORDER_OF_THE_SMITH).then(function(data) {
    console.log("Ken has " + data.length + " Orders of the Smith");}
);
Would print out Ken has 4 Orders of the Smith

Another example is to look for, say, a Knighting?

jsork.player.getAwards(43232, jsork.awardIDs.KNIGHT_OF_THE_FLAME).then(function(data) {
    console.log("Ken received his Flame belt on " + data[0].Date);}
);
Would print out Ken received his Flame belt on 2021-04-03

Yes, that confirms it.

For the tournament tracker, we can use JSORK directly on GitHub for name lookup.

What to add to GitHub
Your repo should have:

index.html
jsork.js
You do not need to upload jquery.js if we use the CDN.

In index.html, before your main script runs, add:

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="jsork.js"></script>
What we will use
For autocomplete:

jsork.searchservice.searchPlayer(searchTerm)
That lets the placement fields search ORK directly.

Example behavior:

Type: wal
Dropdown:
Waldodorf — Rising Winds
Waldorin — Goldenvale
Selecting one fills the input with the exact ORK spelling.

New plan
Do not continue building the Apps Script cache.

Use:

GitHub + JSORK = player name search
Apps Script = tournament save + leaderboards
That is cleaner and more reliable.


So in the. "jsork" I would just need the call line?

No — the jsork.js file must contain the actual JSORK library code itself, not just the <script> line.

So your GitHub repo should look like:

index.html
script.js
style.css
jsork.js
What goes inside jsork.js
The large JSORK code you uploaded earlier. 


That entire library gets pasted into:

jsork.js
Then in index.html
You reference it with:

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="jsork.js"></script>
<script src="script.js"></script>
That tells the browser:

1. Load jQuery
2. Load JSORK library
3. Load your website script
Then inside your own script.js, you can do:

jsork.searchservice.searchPlayer("wal")
  .then(results => {
    console.log(results);
  });
So:

jsork.js
contains the actual library code.

The <script src="jsork.js"></script> line only loads that file into the page.


so we can not use that code line to refrence it?

You can, but only if the file is hosted somewhere publicly.

This line:

<script src="jsork.js"></script>
means:

Load a file named jsork.js from THIS SAME folder
It does not magically know where JSORK exists online.

So you have two options:

Option 1 (Best)
Upload the JSORK code into your repo as:

jsork.js
Then use:

<script src="jsork.js"></script>
This is the safest and most reliable option.

Option 2
Reference a hosted online copy directly.

Example:

<script src="https://SOMEWHERE/jsork.js"></script>
BUT:

you need a valid hosted URL

if that site goes down, your page breaks

if they change the file, your site changes

Recommended for your project
Because this is:

long-term

tournament infrastructure

GitHub-hosted

you should absolutely do:

Upload jsork.js into your GitHub repo
Then:

<script src="jsork.js"></script>
That makes your project self-contained and stable.


That line is hosted publicly 

To utilize jsork the API file and the jquery library must be included in the web page as follows:

<script src="jsork.js"></script>
<script src="jquery.js"></script>

That documentation is assuming:

You already downloaded the files
and placed them beside your webpage.

Those lines are local file references, not hosted CDN references.

Example:

<script src="jsork.js"></script>
means:

Look in the SAME folder as index.html
for a file named jsork.js
It is not pointing to a public website.

If JSORK were publicly hosted, the line would look more like:

<script src="https://example.com/jsork.js"></script>
Notice the full URL.

The documentation you pasted never gives a URL — only a filename — which means:

The library is expected to be downloaded locally.
So for GitHub Pages:

Correct setup
Your repo:

index.html
style.css
script.js
jsork.js
Then:

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="jsork.js"></script>
<script src="script.js"></script>
That is the proper implementation.


so what does this mean? jsork supports javascript API calls to the Amtgard ORK

It means:

jsork.js
is a JavaScript library that knows how to talk to the Amtgard ORK API.

Think of it like a translator/helper layer.

Without JSORK, you would have to manually do complicated API calls like:

$.getJSON(
  "https://ork.amtgard.com/orkservice/Json/index.php?...lots of parameters..."
)
JSORK simplifies that into:

jsork.searchservice.searchPlayer("wal")
or:

jsork.kingdom.getKingdoms()
So:

JSORK ≠ the ORK website
JSORK = helper library for accessing ORK data
The ORK API itself lives here:

https://ork.amtgard.com/orkservice/Json/index.php


And JSORK is simply a wrapper around that API. 


So your GitHub page still needs the JSORK library file loaded into it before you can use commands like:

jsork.searchservice.searchPlayer()
That is why you need:

<script src="jsork.js"></script>
because that line loads the helper library into the webpage.


I apologize if I am being difficult on this, I just wnat to be sure that it is 100% the correct call

You are not being difficult at all. You are asking exactly the right question.

And yes — I am 100% certain now after seeing the actual JSORK source. 


This line:

<script src="jsork.js"></script>
is NOT a hosted web API URL.

It is a local file reference.

Meaning:

Load a file named jsork.js from this website/repository
That is why the documentation also says:

the API file and the jquery library must be included
The phrase:

API file
means:

Download/provide the jsork.js file itself
not:

Reference an online hosted service
The actual ORK API endpoint IS hosted online here:

https://ork.amtgard.com/orkservice/Json/index.php


But jsork.js is the helper library that talks to that endpoint for you.

So the correct setup for GitHub Pages is absolutely:

index.html
script.js
style.css
jsork.js
And then:

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="jsork.js"></script>
<script src="script.js"></script>
That is the correct implementation.


To utilize jsork the API file and the jquery library must be included in the web page as follows:

<script src="jsork.js"></script>
<script src="jquery.js"></script>

So what this means is that the library has to be included in the website 

Yes. Exactly.

That sentence means:

Your website must LOAD the jsork library file
before you can use:

jsork.kingdom.getKingdoms()
jsork.searchservice.searchPlayer()
jsork.player.getAwards()
So:

<script src="jsork.js"></script>
means:

Load the jsork library into this webpage
And for that to work, the actual file:

jsork.js
must exist either:

locally in your GitHub repo

OR at a full hosted URL

Since the documentation only gives:

<script src="jsork.js"></script>
that means:

They expect you to have the jsork.js file locally.
You interpreted the documentation correctly.


okay, Though the creater Ken created this file he menat for the code to be shared?

Yes — exactly.

Ken intended:

jsork.js
to be a reusable shared library that developers download and include in their own projects.

That is why:

it is MIT licensed 


it is on GitHub 


the documentation says to “include” the file

it exposes a global jsork namespace 


This is a very common older JavaScript library pattern.

Equivalent examples:

<script src="jquery.js"></script>
<script src="underscore.js"></script>
<script src="moment.js"></script>
All of those historically meant:

Download the library file
Put it in your project
Load it into the webpage
So for your GitHub project:

You ARE using it correctly
by:

putting jsork.js into the repo

loading it with:

<script src="jsork.js"></script>
then using:

jsork.searchservice.searchPlayer()
That is exactly how it was intended to be used.


// jsork.js 0.1
// https://github.com/kenwalker/jsork
// (c) 2017 Ken Walker
// jsork may be freely distributed under the MIT license.

(function() {

// Baseline setup
// --------------

// Establish the root object, window (self) in the browser, global
// on the server, or this in some virtual machines. We use self
// instead of window for WebWorker support.
var root = typeof self === 'object' && self.self === self && self ||
typeof global === 'object' && global.global === global && global ||
this || {};

// Create a safe reference to the jsork object for use below.
var jsork = function(obj) {
if (obj instanceof jsork)return obj;
if ( !(this instanceof jsork))return new jsork(obj);
this._wrapped = obj;
};

// Export the jsork object for Node.js, with
// backwards-compatibility for their old module API. If we're in
// the browser, add jsork as a global object.
// (nodeType is checked to ensure that module
// and exports are not HTML elements.)
if (typeof exports != 'undefined' && !exports.nodeType) {
if (typeof module != 'undefined' && !module.nodeType && module.exports) {
exports = module.exports = jsork;
}
exports.jsork = jsork;
} else {
root.jsork = jsork;
}

// Current version.
jsork.VERSION = '1.0';
jsork.TOKEN = null;
jsork.TIMEOUT = null;

// var ork = 'http://localhost:19080/orkservice/Json/index.php';
var ork = 'https://ork.amtgard.com/orkservice/Json/index.php';

jsork.filters = {
ACTIVE: 0,
INACTIVE: 1,
WAIVERED: 2,
UNWAIVERED: 3,
BANNED: 4,
SUSPENDED: 5,
DUESPAID: 6,
NOFILTER: 7,
ROSE: ''
};

jsork.setOrk = function(url) {
ork = url;
};

jsork.login = function(username, password) {
$.ajaxSetup({timeout: 20000});
jsork.TOKEN = null;
username = username.trim();
password = password.trim();
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?request=',
{
call: 'Authorization/Authorize',
request: {
UserName: username,
Password: password
}
},
function(data) {
if (data.Status.Status === 0) {
// if (!data.Token || !data.UserId) {
// reject("Invalid info returned after login");
// return;
// }
jsork.TOKEN = data.Token;
jsork.player.getInfo(data.UserId).then(function(player) {
player.Timeout = data.Timeout;
player.Token = data.Token;
resolve(player);
// }).catch(function(error) {
// reject("failed to retried player info after login");
});
} else {
reject(data);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.logout = function() {
var promise = new Promise(function(resolve, reject) {
jsork.TOKEN = null;
resolve();
});
return promise;
}

jsork.getAuthorizations = function(mundaneId) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Authorization/GetAuthorizations',
request: {
Token: jsork.TOKEN,
MundaneId: mundaneId
}
},
function(data) {
resolve(data);
});
});
return promise;
};

jsork.removeParkAttendance = function (attendanceId) {
var promise = new Promise(function (resolve, reject) {
$.getJSON(ork + '?request=',
{
call: 'Attendance/RemoveAttendance',
request: {
Token: jsork.TOKEN,
AttendanceId: attendanceId
}
},
function (data) {
if (data.Status === 0) {
resolve(data);
} else {
reject(data);
}
}).fail(function (error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.addParkAttendance = function (mundane_id, persona, class_id, date, credits, flavor, park_id, calendar_event_id) {
var promise = new Promise(function (resolve, reject) {
$.getJSON(ork + '?request=',
{
call: 'Attendance/AddAttendance',
request: {
Token: jsork.TOKEN,
MundaneId: mundane_id,
Persona: persona,
ClassId: class_id,
Date: date,
Credits: credits,
Flavor: flavor,
Note: null,
ParkId: park_id,
EventCalendarDetailId: calendar_event_id
}
},
function (data) {
if (data.Status === 0) {
resolve(data);
} else {
reject(data);
}
}).fail(function (error, textStatus) {
reject(textStatus);
});
});
return promise;
};

// Define all the Kingdom applicable APIs
jsork.kingdom = {};

jsork.kingdom.getAttendance = function(kingdomId, date) {
var promise = new Promise(function(resolve, reject) {
var month = date.getMonth() + 1; //months from 1-12
var day = date.getUTCDate();
var year = date.getFullYear();
var requestDate = year + '-' + month + '-' + day;
var request =
{
KingdomId: kingdomId,
Date: requestDate
};
$.getJSON(ork + '?request=',
{
call: 'Report/AttendanceForDate',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Attendance);
} else {
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.kingdom.getKingdoms = function() {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?request=',
{
call: 'Kingdom/GetKingdoms',
request: {}
},
function(data) {
if (data.Status.Status === 0) {
var kingdomArray = $.map(data.Kingdoms, function(value, index) {
return value;
});
resolve(kingdomArray);
} else {
reject(Error('Call failed ' + JSON.stringify(data)));
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.kingdom.getAllParks = async function () {
const kingdomsArray = await jsork.kingdom.getKingdoms();

const parkPromises = kingdomsArray.map(
  aKingdom => jsork.kingdom.getParks(aKingdom.KingdomId)
);
const parkResults = await Promise.all(parkPromises);

return parkResults.flat().filter(park => park.Active === 'Active');
};

jsork.kingdom.getParks = function(kingdomID) {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?request=',
{
call: 'Kingdom/GetParks',
request: {KingdomId: kingdomID}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.Parks);
} else {
// on error just assume no parks
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.kingdom.getOfficers = function(kingdomId) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Kingdom/GetOfficers',
request: {KingdomId: kingdomId}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.Officers);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.kingdom.getParkTitles = function(kingdomId) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Kingdom/GetKingdomParkTitles',
request: {KingdomId: kingdomId}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.ParkTitles);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.kingdom.getInfo = function(kingdomId) {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?request=',
{
call: 'Kingdom/GetKingdomDetails',
request: {KingdomId: kingdomId}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.KingdomInfo);
} else {
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.kingdom.getPrincipalities = function(kingdomId, callback) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Kingdom/GetPrincipalities',
request: {KingdomId: kingdomId}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.Principalities);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.kingdom.getPlayers = function(kingdomId, filter) {
var promise = new Promise(function(resolve) {
var request =
{
Token: jsork.TOKEN,
Id: kingdomId,
Type: 'Kingdom'
};
jsork._priv.addFilterToPlayerRequest(request, filter);
$.getJSON(ork + '?request=',
{
call: 'Report/GetPlayerRoster',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Roster);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.kingdom.getReeveQualified = function(kingdomId) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Report/GetReeveQualified',
request: {KingdomId: kingdomId}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.ReeveQualified);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.kingdom.getParagons = function(kingdomId) {
var promise = new Promise(function(resolve) {
var request =
{
KingdomId: kingdomId
};
$.getJSON(ork + '?request=',
{
call: 'Report/ClassMasters',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Awards);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.kingdom.getKnights = function(kingdomID) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Report/PlayerAwards',
request: {
KingdomId: kingdomID,
IncludeKnights: 1,
}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.Awards);
} else {
// on error just assume no parks
resolve([]);
}
});
});
return promise;
};

jsork.kingdom.playerAwards = function(kingdomID, minLadder) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Report/PlayerAwards',
request: {
KingdomId: kingdomID,
Ladder: minLadder,
IncludeKnights: 1,
IncludeMasters: 1,
IncludeLadder: 1,
LadderMinimum: minLadder
}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.Awards);
} else {
// on error just assume no parks
resolve([]);
}
});
});
return promise;
};

jsork.kingdom.playerAwardsPark = function(kingdomID, parkID, minLadder) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Report/PlayerAwards',
request: {
KingdomId: kingdomID,
ParkId: parkID,
Ladder: minLadder,
IncludeKnights: 1,
IncludeMasters: 1,
IncludeLadder: 1,
LadderMinimum: minLadder
}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.Awards);
} else {
// on error just assume no parks
resolve([]);
}
});
});
return promise;
};

jsork.kingdom.parkAverages = function(kingdomId) {
var promise = new Promise(function(resolve) {
var request =
{
KingdomId: kingdomId
};
$.getJSON(ork + '?request=',
{
call: 'Report/GetKingdomParkAverages',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.KingdomParkAveragesSummary);
} else {
resolve([]);
}
});
});
return promise;
};

// Define all the Report applicable APIs
jsork.reports = {};

// Define all the Park applicable APIs
jsork.park = {};

jsork.park.getPlayers = function(parkID, filter) {
var promise = new Promise(function(resolve) {
var request =
{
Id: parkID,
Type: 'Park'
};
jsork._priv.addFilterToPlayerRequest(request, filter);
$.getJSON(ork + '?request=',
{
call: 'Report/GetPlayerRoster',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Roster);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.park.getReeveQualified = function(parkID) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Report/GetReeveQualified',
request: {ParkId: parkID}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.ReeveQualified);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.park.getParagons = function(parkId) {
var promise = new Promise(function(resolve) {
var request =
{
ParkId: parkId
};
$.getJSON(ork + '?request=',
{
call: 'Report/ClassMasters',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Awards);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.park.getKnights = function(parkId) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Report/PlayerAwards',
request: {
ParkId: parkId,
IncludeKnights: 1,
}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.Awards);
} else {
// on error just assume no parks
resolve([]);
}
});
});
return promise;
};

jsork.park.getActivePlayers = function(parkID) {
var request = {
ParkId: parkID
};
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Report/GetActivePlayers',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.ActivePlayerSummary);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.park.getOfficers = function(parkID) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Park/GetOfficers',
request: {ParkId: parkID}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.Officers);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.park.getInfo = function(parkID) {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?request=',
{
call: 'Park/GetParkDetails',
request: {ParkId: parkID}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data);
} else {
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.park.getShortInfo = function(parkID) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Park/GetParkShortInfo',
request: {ParkId: parkID}
},
function(data) {
if (data.Status.Status === 0) {
resolve(data.ParkInfo);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.park.getAttendance = function(parkID, date) {
var promise = new Promise(function(resolve, reject) {
var month = date.getMonth() + 1; //months from 1-12
var day = date.getUTCDate();
var year = date.getFullYear();
var requestDate = year + '-' + month + '-' + day;
var request =
{
ParkId: parkID,
Date: requestDate
};
$.getJSON(ork + '?request=',
{
call: 'Report/AttendanceForDate',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Attendance);
} else {
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.park.getAllAttendance = function(parkID) {
var promise = new Promise(function(resolve, reject) {
var request =
{
ParkId: parkID
};
$.getJSON(ork + '?request=',
{
call: 'Report/AttendanceSummary',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Dates);
} else {
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.park.getParkDays = function(parkID) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Park/GetParkDays',
request: {ParkId: parkID}
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.ParkDays);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.park.createPlayer = function(parkID, userName, givenName, surname, persona, email, waivered) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Player/CreatePlayer',
request: {
Token: jsork.TOKEN,
ParkId: parkID,
UserName: userName,
GivenName: givenName,
Surname: surname,
Persona: persona,
Email: email,
Waivered: waivered ? 1:0,
IsActive: 1
}
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data);
} else {
resolve(data);
}
});
});
return promise;
};

jsork.park.findParkNear = function(latitude, longitude, start, end, distance, limit) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Park/PlayAmtgard',
request: {
latitude: latitude,
longitude: longitude,
distance: distance,
start: start,
end: end,
limit: limit
}
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.ParkDays);
} else {
resolve([]);
}
});
});
return promise;
};

// Define all the Player applicable APIs
jsork.player = {};

jsork.player.getInfo = function(mundaneID) {
var promise = new Promise(function(resolve, reject) {
var request =
{
Token: jsork.TOKEN,
MundaneId: mundaneID
};
$.getJSON(ork + '?request=',
{
call: 'Player/GetPlayer',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Player);
} else {
reject('Error retrieving player');
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.player.setImage = function(mundaneID, base64Image) {
var promise = new Promise(function(resolve, reject) {
$.post(
ork + '?request=Player/SetImage',
{
call: 'Player/SetImage',
request: {
Token: jsork.TOKEN,
MundaneId: mundaneID,
Image: base64Image,
ImageMimeType: 'image/jpeg'
}
},
function(data) {
resolve(data);
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.player.getClasses = function(mundaneID) {
if (jsork.TIMEOUT) {
$.ajaxSetup({timeout: jsork.TIMEOUT});
}
var promise = new Promise(function(resolve, reject) {
var request =
{
MundaneId: mundaneID
};
$.getJSON(ork + '?request=',
{
call: 'Player/GetPlayerClasses',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
var result = [];
$.each(data.Classes, function(index, item) {
var reconciledCredits = item.Credits + item.Reconciled;
var nextClass = {
class: item.ClassName,
level: jsork._priv.levelForCredits(reconciledCredits),
aboutToLevel: jsork.aboutToLevelTo(reconciledCredits),
credits: reconciledCredits || 0,
reconciled: item.Reconciled || 0
};
result.push(nextClass);
});
resolve(result);
} else {
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.player.getAwards = function(mundaneID, filter) {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?request=',
{
call: 'Player/AwardsForPlayer',
request: {
MundaneId: mundaneID,
AwardsId: filter
}
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
data.Awards = data.Awards.filter(function(award) {
var includeAward = true;
if (filter !== jsork.awardIDs.ALL) {
includeAward = award.AwardId === filter;
}
return includeAward && award.MundaneId === mundaneID;
});
resolve(data.Awards);
} else {
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.player.awardLevel = function(mundaneID, awardId) {
var promise = new Promise(function(resolve, reject) {
// jsork._priv.addFilterToAwardRequest(request, filter);
$.getJSON(ork + '?request=',
{
call: 'Player/AwardsForPlayer',
request: {
MundaneId: mundaneID,
AwardsId: awardId
}
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
var maxLevel = 0, countLevel = 0;
data.Awards = data.Awards.filter(function(award) {
return award.AwardId === awardId;
});
data.Awards.forEach(function(award) {
if (award.Rank > maxLevel) {
maxLevel = award.Rank;
}
countLevel++;
});
if (countLevel > maxLevel) {
maxLevel = countLevel;
}
resolve(maxLevel);
} else {
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.player.getAttendanceFrom = function(mundaneID, dateStart) {
var promise = new Promise(function(resolve) {
var request =
{
MundaneId: mundaneID,
date_start: dateStart
};
$.getJSON(ork + '?request=',
{
call: 'Player/AttendanceForPlayer',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Attendance);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.player.getAttendance = function(mundaneID) {
var promise = new Promise(function(resolve) {
var request =
{
MundaneId: mundaneID
};
$.getJSON(ork + '?request=',
{
call: 'Player/AttendanceForPlayer',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Attendance);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.player.getLastAttendance = function(mundaneID) {
var promise = new Promise(function(resolve, reject) {
var request =
{
MundaneId: mundaneID,
limit: 1
};
$.getJSON(ork + '?request=',
{
call: 'Player/AttendanceForPlayer',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Attendance);
} else {
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.player.getFirstAttendance = function(mundaneID) {
var promise = new Promise(function(resolve, reject) {
var request =
{
MundaneId: mundaneID,
order: 'asc',
limit: 1
};
$.getJSON(ork + '?request=',
{
call: 'Player/AttendanceForPlayer',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Attendance);
} else {
resolve([]);
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.player.updatePlayer = function(mundaneId, userName, givenName, surname, persona, email, waivered, active, duesDate, semesters) {
var promise = new Promise(function(resolve) {
$.post(
ork + '?request=Player/UpdatePlayer',
{
call: 'Player/UpdatePlayer',
request: {
Token: jsork.TOKEN,
MundaneId: mundaneId,
UserName: userName,
GivenName: givenName,
Surname: surname,
Persona: persona,
Email: email,
Waivered: waivered ? 1:0,
Active: active ? 1:0,
DuesDate: duesDate,
DuesSemesters: semesters
}
},
function(data) {
resolve(data);
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.player.updatePlayerWaiver = function(mundaneId, waivered, active) {
var promise = new Promise(function(resolve) {
$.post(
ork + '?request=Player/UpdatePlayer',
{
call: 'Player/UpdatePlayer',
request: {
Token: jsork.TOKEN,
MundaneId: mundaneId,
Active: active ? 1:0,
Waivered: waivered ? 1:0,
}
},
function(data) {
resolve(data);
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.player.revokeDues = function(mundaneId) {
var promise = new Promise(function(resolve) {
$.post(
ork + '?request=Player/UpdatePlayer',
{
call: 'Player/UpdatePlayer',
request: {
Token: jsork.TOKEN,
MundaneId: mundaneId,
RemoveDues: 'Revoke Dues'
}
},
function(data) {
resolve(data);
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.player.getUnits = function(mundaneId) {
var promise = new Promise(function(resolve) {
var request =
{
MundaneId: mundaneId,
IncludeCompanies: 1,
IncludeHouseHolds: 1,
ActiveOnly: 1
};
$.getJSON(ork + '?request=',
{
call: 'Report/UnitSummary',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Units);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.heraldry = {};
jsork.heraldry.getHeraldryUrl = function(id, type) {
var promise = new Promise(function(resolve) {
var request =
{
Id: id,
Type: type
};
$.getJSON(ork + '?request=',
{
call: 'Heraldry/GetHeraldryUrl',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Result.Url);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.award = {};
jsork.award.getAwardList = function() {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Award/GetAwardList'
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Awards);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.event = {};

jsork.event.findEventNear = function(latitude, longitude, start, end, distance, limit) {
var promise = new Promise(function(resolve) {
$.getJSON(ork + '?request=',
{
call: 'Event/PlayAmtgard',
request: {
latitude: latitude,
longitude: longitude,
distance: distance,
start: start,
end: end,
limit: limit
}
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.ParkDays);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.kingdom.getEvents = function(kingdomId) {
var promise = new Promise(function(resolve) {
var request =
{
KingdomId: kingdomId
};
$.getJSON(ork + '?request=',
{
call: 'Event/GetEvents',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.event.getEvents = function() {
var promise = new Promise(function(resolve) {
var request =
{
};
$.getJSON(ork + '?request=',
{
call: 'Event/GetEvents',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.event.getEvent = function(eventId) {
var promise = new Promise(function(resolve) {
var request =
{
EventId: eventId
};
$.getJSON(ork + '?request=',
{
call: 'Event/GetEvent',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data);
} else {
resolve([]);
}
});
});
return promise;
};

jsork.event.getEventDetail = function(eventId) {
var promise = new Promise(function(resolve, reject) {
var request =
{
EventId: eventId,
Current: true
};
$.getJSON(ork + '?request=',
{
call: 'Event/GetEventDetails',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data);
} else {
resolve([]);
}
}).fail(function (error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.event.getAttendance = function(eventId, eventCalendarDetailId) {
var promise = new Promise(function(resolve, reject) {
var request =
{
EventId: eventId,
EventCalendarDetailId: eventCalendarDetailId
};
$.getJSON(ork + '?request=',
{
call: 'Report/AttendanceForEvent',
request: request
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Attendance);
} else {
resolve([]);
}
}).fail(function (error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.event.addAttendance = function(mundane_id, persona, class_id, credits, date, flavor, calendar_event_id) {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?request=',
{
call: 'Attendance/AddAttendance',
request: {
Token: jsork.TOKEN,
MundaneId: mundane_id,
Persona: persona,
ClassId: class_id,
Credits: credits,
Date: date,
Flavor: flavor,
Note: null,
ParkId: 0,
EventCalendarDetailId: calendar_event_id
}
},
function(data) {
if (data.Status === 0) {
resolve(data);
} else {
reject(data);
}
});
});
return promise;
};

jsork.searchservice = {};

jsork.searchservice.searchPlayer = function(searchTerm) {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?',
{
call: 'SearchService/Player',
type: 'All',
search: searchTerm,
limit: '20',
Token: jsork.TOKEN
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Result);
} else {
reject(Error('Call failed ' + JSON.stringify(data)));
}
}).fail(function(error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.searchservice.searchPlayerUsername = function(userName) {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?',
{
call: 'SearchService/Player',
type: 'USER',
search: userName,
limit: '2000',
Token: jsork.TOKEN
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Result);
} else {
reject(Error('Call failed ' + JSON.stringify(data)));
}
});
});
return promise;
};

jsork.searchservice.searchKingdomEvent = function(kingdomId, searchTerm) {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?',
{
call: 'SearchService/Event',
kingdom_id: kingdomId,
date_order: 'true',
name: searchTerm,
limit: '200',
Token: jsork.TOKEN
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Result);
} else {
reject(Error('Call failed ' + JSON.stringify(data)));
}
}).fail(function (error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.searchservice.searchParkEvent = function(parkId, searchTerm) {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?',
{
call: 'SearchService/Event',
park_id: parkId,
date_order: 'true',
name: searchTerm,
limit: '200',
Token: jsork.TOKEN
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Result);
} else {
reject(Error('Call failed ' + JSON.stringify(data)));
}
}).fail(function (error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork.searchservice.allEvents = function() {
var promise = new Promise(function(resolve, reject) {
$.getJSON(ork + '?',
{
call: 'SearchService/Event',
date_order: 'true',
limit: '10000',
date_start: new Date().toISOString(),
Token: jsork.TOKEN
},
function(data) {
if (data.Status.Status === 0 || data.Status === true) {
resolve(data.Result);
} else {
reject(Error('Call failed ' + JSON.stringify(data)));
}
}).fail(function (error, textStatus) {
reject(textStatus);
});
});
return promise;
};

jsork._priv = {};
jsork._priv.addFilterToPlayerRequest = function(request, filter) {
switch (filter) {
case jsork.filters.WAIVERED:
return $.extend(request, {Waivered: true});
case jsork.filters.UNWAIVERED:
return $.extend(request, {UnWaivered: true});
case jsork.filters.ACTIVE:
return $.extend(request, {Active: true});
case jsork.filters.INACTIVE:
return $.extend(request, {InActive: true});
case jsork.filters.BANNED:
return $.extend(request, {Banned: true});
case jsork.filters.SUSPENDED:
return $.extend(request, {Suspended: true});
case jsork.filters.DUESPAID:
return $.extend(request, {DuesPaid: true});
case jsork.filters.NOFILTER:
return request;
default:
throw Error('Illegal filter argument ' + filter);
}
};

jsork._priv.addFilterToAwardrequest = function(request, filter) {
// This might get written like player request above but for now just pass through the filter
return $.extend(request, {AwardsId: filter});
};

jsork._priv.levelForCredits = function(credits) {
switch (true) {
case credits === null || credits < 5:
return 1;
case credits < 12:
return 2;
case credits < 21:
return 3;
case credits < 34:
return 4;
case credits < 53:
return 5;
default:
return 6;
}
};

jsork.aboutToLevelTo = function(credits) {
switch (true) {
case credits === null:
return 0;
case credits === 4:
return 2;
case credits === 11:
return 3;
case credits === 20:
return 4;
case credits === 33:
return 5;
case credits === 52:
return 6;
default:
return 0;
}
};

jsork.awardIDs = {
ALL: 9999, MASTER_ROSE: 1, MASTER_SMITH: 2, MASTER_LION: 3, MASTER_OWL: 4, MASTER_DRAGON: 5, MASTER_GARBER: 6,
MASTER_JOVIUS: 7, MASTER_ZODIAC: 8, MASTER_MASK: 9, MASTER_HYDRA: 10, MASTER_GRIFFIN: 11, WARLORD: 12, MASTER_CROWN: 240, LORDS_PAGE: 13,
MANATARMS: 14, PAGE: 15, SQUIRE: 16, KNIGHT_OF_THE_FLAME: 17, KNIGHT_OF_THE_CROWN: 18, KNIGHT_OF_THE_SERPENT: 19,
KNIGHT_OF_THE_SWORD: 20, ORDER_OF_THE_ROSE: 21, ORDER_OF_THE_SMITH: 22, ORDER_OF_THE_LION: 23, ORDER_OF_THE_OWL: 24,
ORDER_OF_THE_DRAGON: 25, ORDER_OF_THE_GARBER: 26, ORDER_OF_THE_WARRIOR: 27, ORDER_OF_THE_JOVIUS: 28, ORDER_OF_THE_MASK: 29,
ORDER_OF_THE_ZODIAC: 30, ORDER_OF_THE_WALKER_IN_THE_MIDDLE: 31, ORDER_OF_THE_HYDRA: 32, ORDER_OF_THE_GRIFFIN: 33,
ORDER_OF_THE_FLAME: 34, ORDER_OF_THE_CROWN: 239, DEFENDER: 35, WEAPONMASTER: 36, PARAGON_ANTIPALADIN: 37, PARAGON_ARCHER: 38, PARAGON_ASSASSIN: 39,
PARAGON_BARBARIAN: 40, PARAGON_BARD: 41, PARAGON_DRUID: 42, PARAGON_HEALER: 43, PARAGON_MONK: 44, PARAGON_MONSTER: 45,
PARAGON_PALADIN: 46, PARAGON_PEASANT: 47, PARAGON_RAIDER: 48, PARAGON_SCOUT: 49, PARAGON_WARRIOR: 50, PARAGON_WIZARD: 51,
PARAGON_COLOR: 241, PARAGON_REEVE: 242,
LORD: 52, LADY: 53, BARONET: 54, BARONETESS: 55, BARON: 56, BARONESS: 57, VISCOUNT: 58, VISCOUNTESS: 59, COUNT: 60,
COUNTESS: 61, MARQUIS: 62, MARQUESS: 63, DUKE: 64, DUCHESS: 65, ARCHDUKE: 66, ARCHDUCHESS: 67, GRAND_DUKE: 68,
GRAND_DUCHESS: 69, SHERIFF: 70, PROVINCIAL_BARON: 71, PROVINCIAL_BARONESS: 72, PROVINCIAL_DUKE: 73, PROVINCIAL_DUCHESS: 74,
PROVINCIAL_GRAND_DUKE: 75, PROVINCIAL_GRAND_DUCHESS: 76, SHIRE_REGENT: 77, BARONIAL_REGENT: 78, DUCAL_REGENT: 79,
GRAND_DUCAL_REGENT: 80, SHIRE_CLERK: 81, BARONIAL_SENESCHAL: 82, DUCAL_CHANCELLOR: 83, GRAND_DUCAL_GENERAL_MINISTER: 84,
PROVINCIAL_CHAMPION: 85, BARONIAL_CHAMPION: 86, DUCAL_DEFENDER: 87, GRAND_DUCAL_DEFENDER: 88, KINGDOM_CHAMPION: 89,
KINGDOM_REGENT: 90, KINGDOM_PRIME_MINISTER: 91, KINGDOM_MONARCH: 92, DIRECTOR_OF_THE_BOARD: 93, CUSTOM_AWARD: 94,
GUILDMASTER_OF_REEVES: 202, GUILDMASTER_OF_WIZARDS: 201, GUILDMASTER_OF_WARRIORS: 200, GUILDMASTER_OF_SCOUTS: 199,
PLAGUESERVANT_OF_PEASANTS: 198, GUILDMASTER_OF_PALADINS: 197, GUILDMASTER_OF_MONSTERS: 196, GUILDMASTER_OF_MONKS: 195,
GUILDMASTER_OF_HEALERS: 194, GUILDMASTER_OF_DRUIDS: 193, GUILDMASTER_OF_BARDS: 192, GUILDMASTER_OF_BARBARIANS: 191,
GUILDMASTER_OF_ASSASSINS: 190, GUILDMASTER_OF_ARCHERS: 189, GUILDMASTER_OF_KNIGHTS: 188, APPRENTICE: 203,
COM_EXECUTIVE_COMMITTEE: 204, CHAMPION_PRINCIPALITY: 205, CHAMPION_SHIRE: 206, DRAGONMASTER: 207, CULTURAL_OLYMPIAN: 208,
ESQUIRE: 209, GUILDMASTER_OF_ANTIPALADINS: 210, GUILDMASTER_OF_REEVES_SHIRE: 211, GUILDMASTER_OF_REEVES_BARONY: 212,
GUILDMASTER_OF_REEVES_DUCHY: 213, GUILDMASTER_OF_REEVES_GRAND_DUCHY: 214, GUILDMASTER_OF_REEVES_PRINCIPALITY: 215,
AUTOCRAT_KINGDOM: 216, SUBCRAT_KINGDOM: 217, AUTOCRAT_INTERKINGDOM: 218, SUBCRAT_INTERKINGDOM: 219, AUTOCRAT_PARK: 220,
SUBCRAT_PARK: 221, AUTOCRAT_INTERPARK: 222, SUBCRAT_INTERPARK: 223, GRAND_OLYMPIAN: 224, RULES_REPRESENTATIVE: 225,
MASTER: 226, MONARCH_PRINCIPALITY: 227, REGENT_PRINCIPALITY: 228, WAR_EVENT_WINNER: 229, WAR_OLYMPIAN: 230, WARMASTER: 231
};

jsork.awardIDsToString = {};
jsork.awardIDsToString[jsork.awardIDs.LORD] = 'Lord';
jsork.awardIDsToString[jsork.awardIDs.LADY] = 'Lady';
jsork.awardIDsToString[jsork.awardIDs.BARONET] = 'Baronet';
jsork.awardIDsToString[jsork.awardIDs.BARONETESS] = 'Baronetess';
jsork.awardIDsToString[jsork.awardIDs.BARON] = 'Baron';
jsork.awardIDsToString[jsork.awardIDs.BARONESS] = 'Baroness';
jsork.awardIDsToString[jsork.awardIDs.VISCOUNT] = 'Viscount';
jsork.awardIDsToString[jsork.awardIDs.VISCOUNTESS] = 'Viscountess';
jsork.awardIDsToString[jsork.awardIDs.COUNT] = 'Count';
jsork.awardIDsToString[jsork.awardIDs.COUNTESS] = 'Countess';
jsork.awardIDsToString[jsork.awardIDs.MARQUIS] = 'Marquis';
jsork.awardIDsToString[jsork.awardIDs.MARQUESS] = 'Marquess';
jsork.awardIDsToString[jsork.awardIDs.DUKE] = 'Duke';
jsork.awardIDsToString[jsork.awardIDs.DUCHESS] = 'Duchess';
jsork.awardIDsToString[jsork.awardIDs.ARCHDUKE] = 'Archduke';
jsork.awardIDsToString[jsork.awardIDs.ARCHDUCHESS] = 'Archduchess';
jsork.awardIDsToString[jsork.awardIDs.GRAND_DUKE] = 'Grand Duke';
jsork.awardIDsToString[jsork.awardIDs.GRAND_DUCHESS] = 'Grand Duchess';

// AMD registration happens at the end for compatibility with AMD loaders
// that may not enforce next-turn semantics on modules. Even though general
// practice for AMD registration is to be anonymous, underscore registers
// as a named module because, like jQuery, it is a base library that is
// popular enough to be bundled in a third party lib, but not be part of
// an AMD load request. Those cases could generate an error when an
// anonymous define() is called outside of a loader request.
if (typeof define === 'function' && define.amd) {
define('jsork', [], function() {
return jsork;
});
}
}());


Close
