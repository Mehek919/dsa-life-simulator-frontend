export const DISTRICTS = {
  google: {
    full: "Districts 1 to 3: FAANG",
    blurb:
      "Missions built from what Google, Meta, Amazon, Apple and Netflix actually ask, with a Boss Battle at the end.",
  },
  fintech: {
    // Check this number: notes have District 6 as FinTech and as Consulting.
    full: "District 6: The FinTech Frontier",
    blurb:
      "157 missions built from what Stripe, PayPal, Ant Group, Adyen and Wise actually ask, with a Boss Battle at the end.",
  },
  silicon: {
    full: "District 7: The Silicon Frontier",
    blurb:
      "150 missions built from what Tesla, NVIDIA, Qualcomm, Li Auto and Bosch actually ask, with a Boss Battle at the end.",
  },
  enterprise: {
    full: "District 4: The Enterprise Empire",
    blurb:
      "145 missions built from what Microsoft, Oracle, Salesforce, Adobe and Broadcom actually ask, with a Boss Battle at the end.",
  },
  starter: {
    full: "Starter Zone",
    blurb:
      "Gentle missions that teach the core patterns first. Company districts unlock as you level up.",
  },
};

export const LEVELS = {
  beginner: { label: "Beginner" },
  intermediate: { label: "Intermediate" },
  ready: { label: "Interview ready" },
};

// Used when the user skips, or for any answer they never gave.
export const DEFAULTS = { goal: "starter", difficulty: "intermediate", commMode: "text" };

export const QUESTIONS = [
  // ───────────── Your World ─────────────
  {
    id: "districts",
    saves: "goal",
    section: "Your World",
    emoji: "📱",
    question: "2:47 AM. Your phone buzzes: \"Your code just broke something in production.\" What did you break?",
    options: [
      { value: "google", label: "🔍 A search engine. Your mom Googled \"why is Google down\" and got nothing", sub: "Google / FAANG" },
      { value: "fintech", label: "💸 A bank. Someone in Ohio just got $40 million", sub: "FinTech: Stripe, PayPal, Adyen" },
      { value: "silicon", label: "🚗 A self-driving car. It's parallel parking in a lake", sub: "Silicon: Tesla, NVIDIA, Qualcomm" },
      { value: "enterprise", label: "📊 Excel. Every accountant on Earth is screaming", sub: "Enterprise: Microsoft, Oracle, Salesforce" },
      { value: "starter", label: "🖨️ My Hello World. It printed \"Goodbye World\"", sub: "Just getting started" },
    ],
    reveal: "⚡ Plot twist: that wasn't a joke. It's a real mission in {districtFull}. {districtBlurb}",
    why: "The system you'd hate to break is usually the one you want to build. Every company tests different patterns, so we start you where your interview actually is.",
    where: "Engineer's Odyssey → {districtFull} → Mission 1",
  },
  {
    id: "difficulty",
    saves: "difficulty",
    section: "Your World",
    emoji: "🎉",
    question: "Someone at a party says \"reverse a linked list.\" You:",
    options: [
      { value: "beginner", label: "Fake a phone call and leave", sub: "Beginner" },
      { value: "intermediate", label: "Grab a napkin and start sweating", sub: "Intermediate" },
      { value: "ready", label: "Ask \"singly or doubly?\" and do it in O(1) space", sub: "Interview ready" },
    ],
    reveal: "Difficulty set to {levelLabel}. It adjusts automatically after every 3 missions, so a wrong guess costs you nothing.",
    why: "Starting too hard makes people quit, and starting too easy bores them.",
    where: "Engineer's Odyssey → Profile → Difficulty",
  },

  // ───────────── Progression ─────────────
  {
    id: "xp",
    section: "Progression",
    emoji: "📊",
    question: "Be honest. How do you track your interview prep right now?",
    options: [
      { value: "spreadsheet", label: "A spreadsheet I abandoned on day 2" },
      { value: "vibes", label: "Vibes" },
      { value: "panic", label: "I don't. I just panic" },
    ],
    reveal: "Now it tracks itself. Every mission earns XP based on its difficulty, and your level shows how far you've really come. You've been earning XP during this intro. Check the ⭐ counter at the top of the screen.",
    why: "When you can't see your progress, you quit. Most people stop prepping because they can't tell it's working.",
    where: "Top bar (every page) → ⭐ XP & Level",
  },
  {
    id: "streaks",
    section: "Progression",
    emoji: "🔥",
    question: "Your interview is in 30 days. When do you actually start preparing?",
    options: [
      { value: "today", label: "Today, obviously" },
      { value: "day25", label: "Day 25" },
      { value: "night-before", label: "The night before, with 4 energy drinks" },
    ],
    reveal: "That's what streaks fix. Solve at least one mission a day and your streak grows, and so does your XP multiplier. Miss a day and it resets.",
    why: "Interview skills fade fast. A little every day beats one panicked night.",
    where: "Top bar (every page) → 🔥 Streak counter",
  },
  {
    id: "locks",
    section: "Progression",
    emoji: "🔒",
    question: "There's a locked building on your map. What's inside?",
    options: [
      { value: "treasure", label: "Treasure" },
      { value: "harder", label: "Harder problems" },
      { value: "ex", label: "My ex" },
    ],
    reveal: "Harder problems, plus a new district. It unlocks when you clear the chapter before it.",
    why: "You can't skip the fundamentals. Real interviews don't let you either.",
    where: "Engineer's Odyssey → World Map → any 🔒 building",
  },
  {
    id: "boss",
    section: "Progression",
    emoji: "👹",
    question: "Something at the end of your district is waiting for you. It has 45 minutes and no mercy. What is it?",
    options: [
      { value: "senior", label: "A senior engineer" },
      { value: "past-code", label: "My own past code" },
      { value: "bar-raiser", label: "The bar raiser" },
    ],
    reveal: "A Boss Battle: a timed gauntlet built like a real onsite round. Beat it and you clear the district.",
    why: "It's the closest thing to the real interview before the real interview.",
    where: "Engineer's Odyssey → {districtFull} → Boss Gate (final chapter)",
  },
  {
    id: "shorts",
    section: "Progression",
    emoji: "🎬",
    question: "Every mission ends with a secret. Want to know where the algorithm you just used is secretly running right now?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "obviously", label: "Obviously yes" },
      { value: "phone", label: "Is it in my phone? It's in my phone, isn't it" },
    ],
    reveal: "After every solve, a DSA Short plays showing the real-world system that uses that exact pattern.",
    why: "Interviewers love the candidate who can explain where something is used in the real world.",
    where: "Engineer's Odyssey → any Mission → plays after you solve it",
  },

  // ───────────── Mock Interview ─────────────
  {
    id: "interviewer",
    section: "Mock Interview",
    emoji: "👁️",
    question: "An interviewer has been staring at you for 4 minutes without blinking. Who sent them?",
    options: [
      { value: "google", label: "Google" },
      { value: "stripe", label: "Stripe" },
      { value: "mom", label: "My mom" },
    ],
    reveal: "They're real (well, AI). Welcome to Mock Interview: pick a company and an AI interviewer talks to you out loud, asking questions the way that company's engineers do.",
    why: "Solving alone and solving while someone watches are two completely different skills.",
    where: "Mock Interview → pick a company",
  },
  {
    id: "personas",
    section: "Mock Interview",
    emoji: "😤",
    question: "Your interviewer interrupts you at minute 4: \"Are you sure about that?\" You:",
    options: [
      { value: "defend", label: "Defend my answer" },
      { value: "panic", label: "Panic and change everything" },
      { value: "uno", label: "Ask if THEY are sure" },
    ],
    reveal: "Every company has its own pressure persona. Some are friendly. Some are testing whether you'll crack.",
    why: "Most rejections happen because of pressure, not knowledge.",
    where: "Mock Interview → pick a company → Interviewer persona",
  },
  {
    id: "types",
    section: "Mock Interview",
    emoji: "😱",
    question: "What's the scariest interview round?",
    options: [
      { value: "coding", label: "Coding" },
      { value: "system-design", label: "System design" },
      { value: "about-yourself", label: "\"Tell me about yourself\"" },
    ],
    reveal: "We have 15+ round types. That includes the one you just picked, and the one you didn't think of.",
    why: "Real interview loops are 4 to 6 different rounds, not just coding.",
    where: "Mock Interview → pick a company → Interview type",
  },
  {
    id: "integrity",
    section: "Mock Interview",
    emoji: "🐈",
    question: "Mid-interview, your cat walks across the keyboard and pastes in a perfect solution. What happens?",
    options: [
      { value: "hired", label: "I get hired" },
      { value: "cat-hired", label: "The cat gets hired" },
      { value: "noticed", label: "Someone notices" },
    ],
    reveal: "Someone notices. Tab switches, pastes and odd patterns get flagged, the same way real proctored interviews flag them.",
    why: "A score only means something if it's real. That's why recruiters trust it.",
    where: "Mock Interview → runs during every interview",
  },
  {
    id: "reports",
    section: "Mock Interview",
    emoji: "📝",
    question: "The interview's over. Want to know what they actually wrote about you?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "nice", label: "Only if it's nice" },
    ],
    reveal: "You get the full hiring report: Hire or No Hire, and why. Real companies never show you this.",
    why: "You can't fix what nobody tells you.",
    where: "Mock Interview → after any interview → Hiring Report",
  },
  {
    id: "commMode",
    saves: "commMode",
    section: "Mock Interview",
    emoji: "🎙️",
    question: "Do you think better out loud or in silence?",
    options: [
      { value: "voice", label: "Out loud. I narrate my whole life", sub: "Voice" },
      { value: "text", label: "Silence. Talking breaks my brain", sub: "Text" },
    ],
    reveal: "Interviews and battles work by voice or by text. We've set yours, and you can switch anytime.",
    why: "Practice the way you'll be tested, but start the way you're comfortable.",
    where: "Mock Interview / Battle Arena → Communication Mode toggle",
  },

  // ───────────── Multiplayer ─────────────
  {
    id: "arena",
    section: "Multiplayer",
    emoji: "⚔️",
    question: "Someone solves your mission faster than you. You:",
    options: [
      { value: "respect", label: "Respect" },
      { value: "challenge", label: "Challenge them" },
      { value: "robot", label: "Report them for being a robot" },
    ],
    reveal: "You can challenge them. The Battle Arena has 40+ modes: Speed Coding Sprint, Bug Fix Battle, Tournament Mode and more.",
    why: "Competing with real people makes the pressure feel real.",
    where: "Battle Arena → pick a mode",
  },
  {
    id: "clans",
    section: "Multiplayer",
    emoji: "🏫",
    question: "Which college would you destroy first in a coding war?",
    options: [
      { value: "rival", label: "My rival college" },
      { value: "own", label: "My own college. Long story" },
      { value: "all", label: "All of them" },
    ],
    reveal: "College Battles and Clan Wars let your whole team fight together.",
    why: "Prepping alone gets lonely. Prepping as a team keeps you coming back.",
    where: "Battle Arena → College Battles / Clan Wars",
  },

  // ───────────── Your World ─────────────
  {
    id: "apartment",
    section: "Your World",
    emoji: "🏠",
    question: "Your apartment in EvoWorld is empty. What's the first thing you buy?",
    options: [
      { value: "chair", label: "A gaming chair" },
      { value: "whiteboard", label: "A whiteboard" },
      { value: "cat", label: "A cat (for interview purposes)" },
    ],
    reveal: "You furnish it with XP: rooms, furniture, clothing. Your progress becomes a place you can walk around in.",
    why: "People take care of things they've built themselves.",
    where: "Engineer's Odyssey → Starter Zone → Your Apartment (unlocks at Level 3)",
  },

  // ───────────── First Mission (finale) ─────────────
  {
    id: "firstMission",
    section: "First Mission",
    xp: 40, // 16 x 10 + 40 = 200, matches ONBOARDING_REWARD on the backend
    emoji: "🚨",
    question: "Remember what you broke at 2:47 AM? Time to fix it. Ready?",
    options: [
      { value: "go", label: "Let's go" },
      { value: "intern", label: "Can I blame the intern?" },
    ],
    reveal: {
      go: "Your first mission is waiting in {districtFull}. It's a real interview pattern disguised as a crisis, and it's rigged in your favor.",
      intern: "The intern has been notified. They said no. Your first mission is waiting in {districtFull}, and it's rigged in your favor.",
    },
    why: "You learn faster by doing than by reading a tutorial.",
    where: "Engineer's Odyssey → {districtFull} → Mission 1",
  },
];

export function fill(text, ctx) {
  return String(text ?? "").replace(/\{(\w+)\}/g, (m, key) => (key in ctx ? ctx[key] : m));
}

export function pick(field, value) {
  if (field && typeof field === "object") return field[value] ?? field.default ?? "";
  return field;
}

export function buildContext(answers) {
  const d = DISTRICTS[answers.goal] || DISTRICTS[DEFAULTS.goal];
  const l = LEVELS[answers.difficulty] || LEVELS[DEFAULTS.difficulty];
  return { districtFull: d.full, districtBlurb: d.blurb, levelLabel: l.label };
}

// Turns the answers into the shape POST /onboarding/complete expects.
export function toResponses(answers) {
  return QUESTIONS.filter((q) => answers[q.saves || q.id] != null).map((q) => {
    const value = answers[q.saves || q.id];
    const opt = q.options.find((o) => o.value === value);
    return { id: q.id, question: q.question, answer: opt ? opt.label : String(value) };
  });
}
export const TOTAL_XP = QUESTIONS.reduce((sum, q) => sum + (q.xp ?? 10), 0);
