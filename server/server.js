import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

const PORT = 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = 'four_the_game';

// Sort direction per game: puzzle ranks fewest moves, everything else highest score
const GAMES = {
  dino: { name: 'Dino Game', sort: -1 },
  carspeed: { name: 'CarSpeed', sort: -1 },
  puzzle: { name: 'Sliding Puzzle', sort: 1 },
  rps: { name: 'Rock Paper Scissors', sort: -1 },
  alien: { name: 'Alien Survival', sort: -1 },
  battle: { name: 'Battle Arena', sort: -1 }
};

const app = express();
app.use(cors());
app.use(express.json());

let db;

app.get('/api/leaderboard/:game', async (req, res) => {
  const game = GAMES[req.params.game];
  if (!game) return res.status(404).json({ error: 'unknown game' });
  try {
    const top = await db.collection('scores')
      .find({ game: req.params.game })
      .sort({ score: game.sort, createdAt: 1 })
      .limit(10)
      .project({ _id: 0, username: 1, score: 1, createdAt: 1 })
      .toArray();
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scores', async (req, res) => {
  const { game, username, score } = req.body || {};
  if (!GAMES[game]) return res.status(400).json({ error: 'unknown game' });
  const name = String(username || '').trim().slice(0, 16);
  const value = Number(score);
  if (!name) return res.status(400).json({ error: 'username required' });
  if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'invalid score' });
  try {
    await db.collection('scores').insertOne({
      game,
      username: name,
      score: value,
      createdAt: new Date()
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- CRUD: score management (used by admin.html) ---------- */

// Read: every score for one game, newest first, with ids for editing
app.get('/api/scores', async (req, res) => {
  const game = req.query.game;
  if (!GAMES[game]) return res.status(400).json({ error: 'unknown game' });
  try {
    const rows = await db.collection('scores')
      .find({ game })
      .sort({ score: GAMES[game].sort, createdAt: 1 })
      .toArray();
    res.json(rows.map(r => ({ id: r._id.toString(), username: r.username, score: r.score, createdAt: r.createdAt })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update: edit a score entry's username and/or score
app.put('/api/scores/:id', async (req, res) => {
  let _id;
  try { _id = new ObjectId(req.params.id); } catch { return res.status(400).json({ error: 'bad id' }); }
  const updates = {};
  if (req.body.username !== undefined) {
    const name = String(req.body.username).trim().slice(0, 16);
    if (!name) return res.status(400).json({ error: 'username required' });
    updates.username = name;
  }
  if (req.body.score !== undefined) {
    const value = Number(req.body.score);
    if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'invalid score' });
    updates.score = value;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'nothing to update' });
  try {
    const result = await db.collection('scores').updateOne({ _id }, { $set: updates });
    if (!result.matchedCount) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete: one entry, or a whole game's leaderboard via ?game=
app.delete('/api/scores/:id', async (req, res) => {
  let _id;
  try { _id = new ObjectId(req.params.id); } catch { return res.status(400).json({ error: 'bad id' }); }
  try {
    const result = await db.collection('scores').deleteOne({ _id });
    if (!result.deletedCount) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/scores', async (req, res) => {
  const game = req.query.game;
  if (!GAMES[game]) return res.status(400).json({ error: 'unknown game' });
  try {
    const result = await db.collection('scores').deleteMany({ game });
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- CRUD: contact-form feedback ---------- */

app.post('/api/feedback', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  const doc = {
    name: String(name || '').trim().slice(0, 60),
    email: String(email || '').trim().slice(0, 100),
    subject: String(subject || '').trim().slice(0, 120),
    message: String(message || '').trim().slice(0, 2000),
    createdAt: new Date()
  };
  if (!doc.name || !doc.email || !doc.message) return res.status(400).json({ error: 'name, email and message are required' });
  try {
    await db.collection('feedback').insertOne(doc);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/feedback', async (req, res) => {
  try {
    const rows = await db.collection('feedback').find({}).sort({ createdAt: -1 }).toArray();
    res.json(rows.map(r => ({ id: r._id.toString(), name: r.name, email: r.email, subject: r.subject, message: r.message, createdAt: r.createdAt })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/feedback/:id', async (req, res) => {
  let _id;
  try { _id = new ObjectId(req.params.id); } catch { return res.status(400).json({ error: 'bad id' }); }
  try {
    const result = await db.collection('feedback').deleteOne({ _id });
    if (!result.deletedCount) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plays/:game', async (req, res) => {
  if (!GAMES[req.params.game]) return res.status(404).json({ error: 'unknown game' });
  try {
    const doc = await db.collection('plays').findOneAndUpdate(
      { game: req.params.game },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ game: req.params.game, count: doc.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/plays', async (req, res) => {
  try {
    const rows = await db.collection('plays').find({}).toArray();
    const counts = {};
    for (const id of Object.keys(GAMES)) counts[id] = 0;
    for (const row of rows) counts[row.game] = row.count;
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function main() {
  const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 3000 });
  await client.connect();
  db = client.db(DB_NAME);
  await db.collection('scores').createIndex({ game: 1, score: -1 });
  console.log(`Connected to MongoDB at ${MONGO_URL} (db: ${DB_NAME})`);
  app.listen(PORT, () => console.log(`API server running at http://localhost:${PORT}`));
}

main().catch(err => {
  console.error('Failed to start API server:', err.message);
  console.error('Is MongoDB Community Server running on localhost:27017?');
  process.exit(1);
});
