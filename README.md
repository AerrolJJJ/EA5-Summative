# 4-THE-GAME

A y8-inspired browser gaming website featuring six mini-games, built with HTML, CSS, and JavaScript — now with a MongoDB-backed arcade leaderboard.

**Version:** 2.0
**Year:** 2022–2026
**Institution:** De La Salle University – Dasmariñas, Senior High School
**Subject:** Computer Programming 3

---

## Games

| Game | Description | Leaderboard metric |
|------|-------------|--------------------|
| **DinoGame** | Side-scrolling dinosaur runner — dodge obstacles to survive | Highest score |
| **CarSpeed** | Top-down car racing — crash and you lose | Highest score |
| **Sliding Puzzle** | Rearrange scrambled tiles to restore the image | Fewest moves |
| **RPS** | Rock, Paper, Scissors against the computer — 10 moves | Rounds won |
| **Alien Survival** | Dodge asteroids, nukes and the closing arena | Longest survival time |
| **Battle Arena** | Turn-based combat against endless enemies | Enemies defeated |

Every game asks for your player name, saves your runs to MongoDB, and shows a **Top 10 leaderboard** at the start and after every game over. The home page shows how many times each game has been played.

---

## How to Run

### 1. Install MongoDB (one time)

1. Download **MongoDB Community Server** for Windows: https://www.mongodb.com/try/download/community
2. Run the MSI installer — keep the defaults ("Run service as Network Service user"). **MongoDB Compass** is bundled with the installer.
3. MongoDB now runs as a Windows service on `mongodb://localhost:27017`.

### 2. Install dependencies and start

```
npm install
npm run dev
```

`npm run dev` starts both:
- **Vite** dev server → open http://localhost:5173
- **API server** (Express + MongoDB) → http://localhost:3000

Other scripts: `npm run dev:web` (site only) · `npm run server` (API only).

**Using VS Code Live Server instead?** That works too — just make sure the API is running in a terminal (`npm run server`). The pages detect they're not on the Vite port and talk to `http://localhost:3000` directly.

### 3. View the database in Compass

Open MongoDB Compass → connect to `mongodb://localhost:27017` → database **`four_the_game`**:
- `scores` — every submitted run: `{ game, username, score, createdAt }`
- `plays` — per-game play counts: `{ game, count }`

(The database appears after the first score or Play click is recorded.)

> The games still work if MongoDB or the API server is offline — the leaderboard panel just shows an "offline" message and nothing is saved.

---

## Project Structure

```
EA5-Summative/
├── index.html             # Main landing page (hub)
├── server/
│   └── server.js          # Express + MongoDB API (leaderboards, play counts)
├── src/
│   ├── WebpageStyle.css   # Hub styles
│   ├── WebpageJS.js       # Hub scripts (menu, play counters, music toggle)
│   └── games/
│       ├── arcade.js      # Shared arcade UI: name prompt, Top 10 panel, home/music buttons
│       ├── arcade.css     # Shared arcade styles
│       ├── dino/          # DinoGame
│       ├── Carspeed/      # CarSpeed
│       ├── SlidePuzzleTesting/  # Sliding Puzzle
│       ├── rps/           # Rock Paper Scissors
│       ├── AlienSurvival/ # Alien Survival
│       └── BattleArena/   # Battle Arena
└── images/                # Shared images
```

## Admin page (CRUD)

Open **`admin.html`** (linked in the site footer) to manage the database — it demonstrates full CRUD:

| Operation | Where |
|-----------|-------|
| **C**reate | Games submit scores; the contact form saves feedback to MongoDB |
| **R**ead | Leaderboards, play counts, admin score/feedback tables |
| **U**pdate | Admin: edit a score's player name or value |
| **D**elete | Admin: delete a score, clear a whole leaderboard, delete feedback |

## API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/leaderboard/:game` | Top 10 scores for a game |
| POST | `/api/scores` | Save a run `{ game, username, score }` |
| GET | `/api/scores?game=` | All scores for a game (admin) |
| PUT | `/api/scores/:id` | Edit a score entry (admin) |
| DELETE | `/api/scores/:id` | Delete one score (admin) |
| DELETE | `/api/scores?game=` | Clear a game's leaderboard (admin) |
| POST | `/api/feedback` | Save a contact-form message |
| GET | `/api/feedback` | List feedback (admin) |
| DELETE | `/api/feedback/:id` | Delete feedback (admin) |
| POST | `/api/plays/:game` | Increment a game's play counter |
| GET | `/api/plays` | All play counts |

Game ids: `dino`, `carspeed`, `puzzle`, `rps`, `alien`, `battle`.

---

## Requirements

### Software
- Any modern browser: Google Chrome, Microsoft Edge, Firefox, etc.
- Node.js 18+ and npm
- MongoDB Community Server (local, port 27017) — MongoDB Compass optional, for viewing data

### Hardware
- Any AMD or Intel processor capable of running a browser
- Keyboard and mouse (Dino and CarSpeed also support touch)

---

