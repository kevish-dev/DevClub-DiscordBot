// ===================================================
// utils/leaderboard.js — JSON-backed point system
// ===================================================
// Simple read/write helpers for data/leaderboard.json.
// Shape: { "userId": { "username": "...", "points": 0, "history": [...] } }
// ===================================================

const fs = require('node:fs');
const path = require('node:path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'leaderboard.json');

/**
 * Read the entire leaderboard from disk.
 * Returns a plain object keyed by user ID.
 */
function readData() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    // If file is missing or corrupt, start fresh
    return {};
  }
}

/**
 * Write the full leaderboard object back to disk.
 */
function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Award points to a user.
 * @param {string} userId   - Discord user ID
 * @param {string} username - Display name (for embed readability)
 * @param {number} points   - Points to add (can be negative for penalties)
 * @param {string} reason   - Why the points were awarded
 * @returns {number} new total points for this user
 */
function addPoints(userId, username, points, reason) {
  const data = readData();

  if (!data[userId]) {
    data[userId] = { username, points: 0, history: [] };
  }

  // Update username in case it changed
  data[userId].username = username;
  data[userId].points += points;

  // Keep an audit trail
  data[userId].history.push({
    points,
    reason,
    timestamp: new Date().toISOString(),
  });

  writeData(data);
  return data[userId].points;
}

/**
 * Get the top N users sorted by points descending.
 * @param {number} n - How many to return (default 10)
 * @returns {Array<{ userId, username, points }>}
 */
function getTop(n = 10) {
  const data = readData();

  return Object.entries(data)
    .map(([userId, info]) => ({
      userId,
      username: info.username,
      points: info.points,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, n);
}

module.exports = { readData, writeData, addPoints, getTop };
