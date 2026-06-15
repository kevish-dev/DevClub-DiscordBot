// ===================================================
// utils/mod-store.js — Moderation Data Store
// ===================================================
// Handles reading/writing to warnings.json and mod-config.json
// ===================================================

const fs = require('node:fs');
const path = require('node:path');

const WARN_PATH = path.join(__dirname, '..', 'data', 'warnings.json');
const CONFIG_PATH = path.join(__dirname, '..', 'data', 'mod-config.json');

// --- Helpers for Reading/Writing JSON safely ---
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Mod Log Config ---
function setModLogChannel(guildId, channelId) {
  const config = readJson(CONFIG_PATH);
  if (!config[guildId]) config[guildId] = {};
  config[guildId].modLogChannelId = channelId;
  writeJson(CONFIG_PATH, config);
}

function getModLogChannel(guildId) {
  const config = readJson(CONFIG_PATH);
  // Fallback to legacy logChannelId if modLogChannelId is missing
  return config[guildId]?.modLogChannelId || config[guildId]?.logChannelId || null;
}

function setDeletedLogChannel(guildId, channelId) {
  const config = readJson(CONFIG_PATH);
  if (!config[guildId]) config[guildId] = {};
  config[guildId].deletedLogChannelId = channelId;
  writeJson(CONFIG_PATH, config);
}

function getDeletedLogChannel(guildId) {
  const config = readJson(CONFIG_PATH);
  // Fallback to legacy logChannelId if deletedLogChannelId is missing
  return config[guildId]?.deletedLogChannelId || config[guildId]?.logChannelId || null;
}

// --- Warnings System ---
function addWarning(userId, moderatorId, reason) {
  const warnings = readJson(WARN_PATH);
  
  if (!warnings[userId]) {
    warnings[userId] = [];
  }
  
  const newWarning = {
    moderatorId,
    reason,
    timestamp: new Date().toISOString(),
  };
  
  warnings[userId].push(newWarning);
  writeJson(WARN_PATH, warnings);
  
  return warnings[userId].length; // Returns their total warning count
}

function getWarnings(userId) {
  const warnings = readJson(WARN_PATH);
  return warnings[userId] || [];
}

module.exports = {
  setModLogChannel,
  getModLogChannel,
  setDeletedLogChannel,
  getDeletedLogChannel,
  addWarning,
  getWarnings,
};
