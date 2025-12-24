
/* 
  NEON SCHEDULE BACKEND
  Run this with: node server.js
  Requires: npm install express cors body-parser
*/

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// --- IN-MEMORY DATABASE (Replace with MongoDB/SQLite for production) ---
const DB = {
  users: [],
  groups: [],
  dataStore: {} // Map groupId -> AppState
};

// --- AUTH ROUTES ---

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  
  if (DB.users.find(u => u.email === email)) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const newUser = {
    id: crypto.randomUUID(),
    name,
    email,
    password // Hash this in production!
  };
  
  DB.users.push(newUser);
  res.status(201).json({ user: { id: newUser.id, name: newUser.name, email: newUser.email } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = DB.users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

// --- GROUP ROUTES ---

app.post('/api/groups', (req, res) => {
  const { name, adminId } = req.body;
  const newGroup = {
    id: Math.random().toString(36).substring(2, 8).toUpperCase(),
    name,
    adminId,
    members: [{ userId: adminId, role: 'Principal', joinedAt: Date.now() }]
  };
  DB.groups.push(newGroup);
  res.status(201).json(newGroup);
});

app.post('/api/groups/join', (req, res) => {
  const { groupId, userId } = req.body;
  const group = DB.groups.find(g => g.id === groupId);
  
  if (!group) return res.status(404).json({ message: 'Group not found' });
  
  if (!group.members.find(m => m.userId === userId)) {
    group.members.push({ userId, role: 'Teacher', joinedAt: Date.now() });
  }
  
  res.json(group);
});

app.get('/api/users/:userId/groups', (req, res) => {
  const { userId } = req.params;
  const userGroups = DB.groups.filter(g => g.members.some(m => m.userId === userId));
  res.json(userGroups);
});

console.log(`NeonSchedule Server running on port ${PORT}`);
app.listen(PORT);
