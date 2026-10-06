// src/arena.js
const admin  = require('firebase-admin');
const OpenAI = require('openai');

const db     = admin.firestore();
const openai = new OpenAI({
  apiKey:   process.env.GROQ_API_KEY,
  baseURL:  'https://api.groq.com/openai/v1',
});

// ── In-memory state ──────────────────────────────────────────────────────────
let waitingPlayer  = null;
const activeBattles = {};

// ── Live telemetry for the Arena lobby ───────────────────────────────────────
// Everything here is real: sockets in the lobby room, the waiting slot, unresolved
// battles, and how long recent players actually waited before being matched.
const LOBBY_ROOM = 'arena:lobby';
const recentWaits = [];                       // ms, last 20 matches
function arenaStats(io) {
  const room = io.sockets.adapter.rooms.get(LOBBY_ROOM);
  const avgWaitMs = recentWaits.length ? Math.round(recentWaits.reduce((a, b) => a + b, 0) / recentWaits.length) : null;
  return {
    online:       room ? room.size : 0,
    waiting:      waitingPlayer ? 1 : 0,
    waitingTopic: waitingPlayer ? waitingPlayer.topic : null,
    live:         Object.values(activeBattles).filter((b) => !b.resolved).length,
    avgWaitMs,
  };
}
let statsTimer = null;
function broadcastStats(io) {                 // coalesce bursts into one update
  if (statsTimer) return;
  statsTimer = setTimeout(() => { statsTimer = null; io.to(LOBBY_ROOM).emit('arena:stats', arenaStats(io)); }, 300);
}

// ── Helper: extract JSON safely ──────────────────────────────────────────────
function extractJSON(raw) {
  const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!match) throw new Error('No JSON found in AI response');
  return JSON.parse(match[0]);
}

// ── Helper: generate battle challenge via Groq ───────────────────────────────
async function generateBattleChallenge(topic = 'Array') {
  const prompt = `
Generate a single DSA coding challenge for a live 1v1 battle.
Topic: ${topic}
Difficulty: medium
Return ONLY a valid JSON object:
{
  "title": "Short challenge title",
  "question": "Full problem statement (2-4 sentences)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Option A",
  "explanation": "Why this is correct",
  "topic": "${topic}",
  "difficulty": "medium"
}
No markdown. No explanation. Just raw JSON.
  `.trim();

  const completion = await openai.chat.completions.create({
    model:       (process.env.GROQ_MODEL || 'openai/gpt-oss-120b'),
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const raw = completion.choices[0].message.content.trim();
  return extractJSON(raw);
}

// ── Helper: calculate ELO delta ──────────────────────────────────────────────
function calcELO(winnerElo, loserElo, kFactor = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo  - winnerElo) / 400));
  const expectedLoser  = 1 / (1 + Math.pow(10, (winnerElo - loserElo)  / 400));
  return {
    newWinnerElo: Math.round(winnerElo + kFactor * (1 - expectedWinner)),
    newLoserElo:  Math.round(loserElo  + kFactor * (0 - expectedLoser)),
  };
}

// ── Main socket handler ──────────────────────────────────────────────────────
module.exports = function registerArenaSocket(io) {

  io.on('connection', (socket) => {

    // ── 0. Lobby presence (powers the live telemetry) ──────────────────────
    socket.on('arena:lobby_join', () => {
      socket.join(LOBBY_ROOM);
      socket.emit('arena:stats', arenaStats(io));
      broadcastStats(io);
    });
    socket.on('arena:stats_request', () => socket.emit('arena:stats', arenaStats(io)));

    // ── 1. Join matchmaking queue ──────────────────────────────────────────
    socket.on('arena:join_queue', async (playerData) => {
      const {
        userId, displayName, photoURL,
        elo   = 1000,
        topic = 'Array',
      } = playerData;

      console.log(`⚔️  ${displayName} joined queue | ELO: ${elo} | Topic: ${topic}`);

      // Same user reconnected — update socket id
      if (waitingPlayer?.userId === userId) {
        waitingPlayer.socketId = socket.id;
        socket.emit('arena:waiting', { message: '🔍 Still looking for an opponent...' });
        return;
      }

      // No one waiting — put this player in queue
      if (!waitingPlayer) {
        waitingPlayer = { userId, displayName, photoURL, elo, topic, socketId: socket.id, joinedAt: Date.now() };
        socket.emit('arena:waiting', { message: '🔍 Looking for an opponent...' });
        broadcastStats(io);
        return;
      }

      // ── Match found ──────────────────────────────────────────────────────
      const player1    = waitingPlayer;
      const player2    = { userId, displayName, photoURL, elo, topic, socketId: socket.id };
      waitingPlayer    = null;
      if (player1.joinedAt) { recentWaits.push(Date.now() - player1.joinedAt); if (recentWaits.length > 20) recentWaits.shift(); }
      broadcastStats(io);

      const battleId    = `battle_${Date.now()}`;
      const chosenTopic = player1.topic;

      console.log(`🎮 Match: ${player1.displayName} vs ${player2.displayName} | ${battleId}`);

      // Generate challenge
      let challenge;
      try {
        challenge = await generateBattleChallenge(chosenTopic);
      } catch (err) {
        console.error('❌ Challenge generation failed:', err.message);
        io.to(player1.socketId).emit('arena:error', { message: 'Failed to generate challenge. Try again.' });
        io.to(player2.socketId).emit('arena:error', { message: 'Failed to generate challenge. Try again.' });
        return;
      }

      // Save battle to Firestore
      await db.collection('battles').doc(battleId).set({
        player1:       player1.userId,
        player2:       player2.userId,
        player1Name:   player1.displayName,
        player2Name:   player2.displayName,
        player1Elo:    player1.elo,
        player2Elo:    player2.elo,
        challenge,
        status:        'live',
        winner:        null,
        player1Time:   null,
        player2Time:   null,
        player1Answer: null,
        player2Answer: null,
        createdAt:     new Date().toISOString(),
      });

      // Track in memory
      activeBattles[battleId] = {
        player1,
        player2,
        challenge,
        startTime:       Date.now(),
        player1Answered: false,
        player2Answered: false,
        player1Correct:  false,
        player2Correct:  false,
        resolved:        false,
      };
      broadcastStats(io);

      // Join both to shared room
      const p1Socket = io.sockets.sockets.get(player1.socketId);
      if (p1Socket) p1Socket.join(battleId);
      socket.join(battleId);

      // Notify both — battle start
      io.to(player1.socketId).emit('arena:battle_start', {
        battleId,
        challenge,
        startTime: Date.now(),
        opponent:  { displayName: player2.displayName, photoURL: player2.photoURL, elo: player2.elo },
      });

      io.to(player2.socketId).emit('arena:battle_start', {
        battleId,
        challenge,
        startTime: Date.now(),
        opponent:  { displayName: player1.displayName, photoURL: player1.photoURL, elo: player1.elo },
      });

      console.log(`🚀 Battle ${battleId} is LIVE!`);
    });

    // ── 2. Submit answer ───────────────────────────────────────────────────
    socket.on('arena:submit_answer', async ({ battleId, userId, answer, timeTaken }) => {
      const battle = activeBattles[battleId];
      if (!battle || battle.resolved) return;

      const isPlayer1 = battle.player1.userId === userId;
      const isPlayer2 = battle.player2.userId === userId;
      if (!isPlayer1 && !isPlayer2) return;

      const playerKey = isPlayer1 ? 'player1' : 'player2';

      // Prevent double submission
      if (battle[`${playerKey}Answered`]) return;

      const isCorrect = answer === battle.challenge.correctAnswer;

      battle[`${playerKey}Answered`]  = true;
      battle[`${playerKey}TimeTaken`] = timeTaken;
      battle[`${playerKey}Answer`]    = answer;
      battle[`${playerKey}Correct`]   = isCorrect;

      console.log(`📝 ${userId} answered | Correct: ${isCorrect} | Time: ${timeTaken}ms`);

      // Notify opponent
      socket.to(battleId).emit('arena:opponent_answered', {
        message:   isCorrect ? '⚠️ Opponent submitted an answer!' : '😅 Opponent got it wrong!',
        isCorrect,
      });

      // Resolve conditions:
      // • First correct answer → resolve immediately
      // • Both have answered   → resolve (even if both wrong)
      const bothAnswered = battle.player1Answered && battle.player2Answered;
      const shouldResolve = isCorrect || bothAnswered;

      if (shouldResolve) {
        battle.resolved = true;
        await resolveBattle(io, battleId, battle);
      }
    });

    // ── 3. Leave queue ─────────────────────────────────────────────────────
    socket.on('arena:leave_queue', () => {
      if (waitingPlayer?.socketId === socket.id) {
        console.log(`🚶 ${waitingPlayer.displayName} left queue`);
        waitingPlayer = null;
        socket.emit('arena:left_queue', { message: 'Left matchmaking queue.' });
        broadcastStats(io);
      }
    });

    // ── 4. Disconnect → forfeit if in battle ──────────────────────────────
    socket.on('disconnect', async () => {
      // Clear waiting queue
      if (waitingPlayer?.socketId === socket.id) {
        waitingPlayer = null;
      }

      // Forfeit active battle
      for (const [battleId, battle] of Object.entries(activeBattles)) {
        if (battle.resolved) continue;

        const isP1 = battle.player1.socketId === socket.id;
        const isP2 = battle.player2.socketId === socket.id;

        if (isP1 || isP2) {
          battle.resolved  = true;
          battle.forfeitBy = isP1 ? 'player1' : 'player2';
          await resolveBattle(io, battleId, battle);
        }
      }
      broadcastStats(io);   // the socket has already left the lobby room
    });

  });
};

// ── Resolve battle ───────────────────────────────────────────────────────────
async function resolveBattle(io, battleId, battle) {
  const { player1, player2 } = battle;

  let winnerId   = null;
  let loserId    = null;
  let resultType = 'solved'; // 'solved' | 'forfeit' | 'both_wrong'

  // ── Determine winner ─────────────────────────────────────────────────────
  if (battle.forfeitBy) {
    resultType = 'forfeit';
    winnerId   = battle.forfeitBy === 'player1' ? player2.userId : player1.userId;
    loserId    = battle.forfeitBy === 'player1' ? player1.userId : player2.userId;

  } else if (battle.player1Correct && battle.player2Correct) {
    // Both correct → faster time wins
    const p1Time = battle.player1TimeTaken ?? Infinity;
    const p2Time = battle.player2TimeTaken ?? Infinity;
    winnerId = p1Time <= p2Time ? player1.userId : player2.userId;
    loserId  = winnerId === player1.userId ? player2.userId : player1.userId;

  } else if (battle.player1Correct) {
    winnerId = player1.userId;
    loserId  = player2.userId;

  } else if (battle.player2Correct) {
    winnerId = player2.userId;
    loserId  = player1.userId;

  } else {
    resultType = 'both_wrong';
  }

  // ── Calculate ELO + credits ──────────────────────────────────────────────
  let newP1Elo       = player1.elo;
  let newP2Elo       = player2.elo;
  let creditsWinner  = 0;
  let creditsLoser   = 0;

  if (winnerId) {
    const isWinnerP1 = winnerId === player1.userId;
    const { newWinnerElo, newLoserElo } = calcELO(
      isWinnerP1 ? player1.elo : player2.elo,
      isWinnerP1 ? player2.elo : player1.elo,
    );
    newP1Elo       = isWinnerP1 ? newWinnerElo : newLoserElo;
    newP2Elo       = isWinnerP1 ? newLoserElo  : newWinnerElo;
    creditsWinner  = resultType === 'forfeit' ? 30 : 50;
    creditsLoser   = 10;
  } else {
    // Both wrong — small consolation credits, no ELO change
    creditsWinner = 5;
    creditsLoser  = 5;
  }

  // ── Update Firestore — battle doc ────────────────────────────────────────
  await db.collection('battles').doc(battleId).update({
    status:        'finished',
    winner:        winnerId,
    resultType,
    player1Time:   battle.player1TimeTaken  ?? null,
    player2Time:   battle.player2TimeTaken  ?? null,
    player1Answer: battle.player1Answer     ?? null,
    player2Answer: battle.player2Answer     ?? null,
    newP1Elo,
    newP2Elo,
    finishedAt:    new Date().toISOString(),
  });

  // ── Update Firestore — user docs ─────────────────────────────────────────
  const userUpdates = [];

  if (winnerId && loserId) {
    // ✅ Fix: use arenaWins / arenaLosses to match Profile.jsx
    userUpdates.push(
      db.collection('users').doc(winnerId).update({
        elo:           winnerId === player1.userId ? newP1Elo : newP2Elo,
        credits:       admin.firestore.FieldValue.increment(creditsWinner),
        arenaWins:     admin.firestore.FieldValue.increment(1),      // ✅ fixed
        battlesPlayed: admin.firestore.FieldValue.increment(1),
      }),
      db.collection('users').doc(loserId).update({
        elo:           loserId === player1.userId ? newP1Elo : newP2Elo,
        credits:       admin.firestore.FieldValue.increment(creditsLoser),
        arenaLosses:   admin.firestore.FieldValue.increment(1),      // ✅ fixed
        battlesPlayed: admin.firestore.FieldValue.increment(1),
      }),
    );
  } else {
    // Both wrong — consolation credits only
    userUpdates.push(
      db.collection('users').doc(player1.userId).update({
        credits:       admin.firestore.FieldValue.increment(creditsWinner),
        battlesPlayed: admin.firestore.FieldValue.increment(1),
      }),
      db.collection('users').doc(player2.userId).update({
        credits:       admin.firestore.FieldValue.increment(creditsLoser),
        battlesPlayed: admin.firestore.FieldValue.increment(1),
      }),
    );
  }

  await Promise.all(userUpdates);

  // ── Emit result to both players ──────────────────────────────────────────
  io.to(battleId).emit('arena:battle_result', {
    battleId,
    winnerId,
    resultType,
    correctAnswer: battle.challenge.correctAnswer,
    explanation:   battle.challenge.explanation,
    player1: {
      userId:    player1.userId,
      oldElo:    player1.elo,
      newElo:    newP1Elo,
      timeTaken: battle.player1TimeTaken ?? null,
      isCorrect: battle.player1Correct   ?? false,
      credits:   player1.userId === winnerId ? creditsWinner : creditsLoser,
    },
    player2: {
      userId:    player2.userId,
      oldElo:    player2.elo,
      newElo:    newP2Elo,
      timeTaken: battle.player2TimeTaken ?? null,
      isCorrect: battle.player2Correct   ?? false,
      credits:   player2.userId === winnerId ? creditsWinner : creditsLoser,
    },
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────
  delete activeBattles[battleId];
  broadcastStats(io);

  console.log(`🏁 Battle ${battleId} | Winner: ${winnerId ?? 'Draw'} | Type: ${resultType}`);
}
