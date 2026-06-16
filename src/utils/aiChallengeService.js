const TOPICS = {
  Arrays: ["array traversal", "sliding window", "two pointers", "prefix sum"],
  Trees: ["tree traversal", "BST operations", "tree DP", "lowest common ancestor"],
  Graphs: ["BFS/DFS", "shortest path", "cycle detection", "topological sort"],
  "Dynamic Programming": ["memoization", "tabulation", "knapsack", "LCS"],
  LinkedList: ["reversal", "cycle detection", "merge", "fast-slow pointers"],
};

const DIFFICULTY = {
  1: { easy: "very basic", medium: "beginner", hard: "intermediate" },
  2: { easy: "beginner", medium: "intermediate", hard: "medium-hard" },
  3: { easy: "easy", medium: "medium", hard: "hard" },
  4: { easy: "medium", medium: "hard", hard: "very hard" },
  5: { easy: "hard", medium: "very hard", hard: "expert" },
};

export const generateDailyChallenges = async (userData) => {
  const level = userData?.level ?? 1;
  const topic = userData?.topic ?? "Arrays";
  const role = userData?.levelTitle ?? "The Beginner";
  const subtopics = TOPICS[topic] || TOPICS["Arrays"];
  const difficulty = DIFFICULTY[Math.min(level, 5)];

  const prompt = `You are a DSA challenge generator for a coding game called "DSA Life Simulator".

Generate exactly 3 daily coding challenges for this user:
- Role: ${role}
- Level: ${level}
- Topic: ${topic}
- Subtopics available: ${subtopics.join(", ")}

Rules:
- Challenge 1: ${difficulty.easy} difficulty (warm-up)
- Challenge 2: ${difficulty.medium} difficulty (main challenge)  
- Challenge 3: ${difficulty.hard} difficulty (boss challenge)
- Each challenge must be unique and specifically about ${topic}
- Make titles creative and engaging
- Keep descriptions concise but clear (2-3 sentences)
- Credits reward: Challenge 1 = 20, Challenge 2 = 40, Challenge 3 = 80
- XP reward: Challenge 1 = 50, Challenge 2 = 100, Challenge 3 = 200
- Bonus credits for completing all 3: 100 credits + 150 XP

Respond ONLY with a valid JSON array, no markdown, no explanation:
[
  {
    "id": "c1",
    "title": "Challenge title here",
    "description": "Clear description of what to solve.",
    "difficulty": "Easy",
    "topic": "${topic}",
    "credits": 20,
    "xp": 50,
    "timeLimit": 15,
    "hints": ["hint 1", "hint 2"]
  },
  {
    "id": "c2",
    "title": "Challenge title here",
    "description": "Clear description of what to solve.",
    "difficulty": "Medium",
    "topic": "${topic}",
    "credits": 40,
    "xp": 100,
    "timeLimit": 25,
    "hints": ["hint 1", "hint 2"]
  },
  {
    "id": "c3",
    "title": "Challenge title here",
    "description": "Clear description of what to solve.",
    "difficulty": "Hard",
    "topic": "${topic}",
    "credits": 80,
    "xp": 200,
    "timeLimit": 40,
    "hints": ["hint 1", "hint 2"]
  }
]`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.map((b) => b.text || "").join("") || "[]";

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("❌ Failed to parse AI challenges:", e);
    return getFallbackChallenges(topic);
  }
};

// Fallback in case AI fails
const getFallbackChallenges = (topic) => [
  {
    id: "c1",
    title: `${topic} Warm-Up`,
    description: `Solve a basic ${topic} problem to get started.`,
    difficulty: "Easy",
    topic,
    credits: 20,
    xp: 50,
    timeLimit: 15,
    hints: ["Think step by step", "Start with brute force"],
  },
  {
    id: "c2",
    title: `${topic} Challenge`,
    description: `An intermediate ${topic} problem requiring careful thought.`,
    difficulty: "Medium",
    topic,
    credits: 40,
    xp: 100,
    timeLimit: 25,
    hints: ["Consider time complexity", "Can you optimize?"],
  },
  {
    id: "c3",
    title: `${topic} Boss Fight`,
    description: `A hard ${topic} problem. Only the best engineers crack this.`,
    difficulty: "Hard",
    topic,
    credits: 80,
    xp: 200,
    timeLimit: 40,
    hints: ["Think about edge cases", "Multiple approaches exist"],
  },
];