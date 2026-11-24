const PEOPLE = {
  us:      [['Nina Alvarez', 'Maya'], ['Daniel Okafor', 'Ethan'], ['Laura Chen', 'Sofia']],
  india:   [['Ananya Iyer', 'Rohit'], ['Karthik Menon', 'Sneha'], ['Neha Kulkarni', 'Arjun']],
  china:   [['Lin Wei', 'Chen Yu'], ['Zhang Hao', 'Liu Fang'], ['Wang Jing', 'Zhou Min']],
  nl:      [['Sanne de Vries', 'Bram'], ['Joris Bakker', 'Eva'], ['Lotte Visser', 'Daan']],
  uk:      [['Hannah Price', 'Tom'], ['Kaspar Tamm', 'Grace'], ['Oliver Grant', 'Mari']],
  de:      [['Julia Wagner', 'Felix'], ['Ravi Shankar', 'Lena'], ['Tobias Keller', 'Anja']],
};

const ROLE_SETS = {
  default: ['Senior Software Engineer', 'Staff Engineer', 'Engineering Manager'],
  consulting: ['Technical Lead', 'Delivery Manager', 'HR Business Partner'],
  embedded: ['Senior Firmware Engineer', 'Principal Engineer', 'Engineering Manager'],
};

const EXPERIENCES = {
  google: {
    place: 'Googleplex', city: 'Mountain View, California', arch: 'campus', sky: 'sun', people: 'us',
    palette: ['#4c8dff', '#34c26a', '#f4b400', '#ea4335'],
    formats: { screen: 'video', onsite: 'onsite' },
    ambience: 'Low, colourful buildings and lots of open space. Bikes leaned against a wall. People talk through problems at whiteboards.',
    day: {
      screen: ['Recruiter call', 'Phone screen · 45 min', 'Onsite rounds · 45 min each', 'Hiring committee'],
      onsite: ['Recruiter call', 'Phone screen', 'Onsite round · 45 min', 'Hiring committee'],
      current: { screen: 1, onsite: 2 },
    },
    greet: 'I care much more about how you think than whether you get the perfect answer first time.',
    note: {
      coding: 'Think out loud as you go. If I change a constraint halfway through, that is on purpose.',
      behavioral: 'I will ask about real situations, and I am interested in how you handled the ambiguity.',
      'system-design': 'Start with what you would clarify. There is no single right design here.',
    },
    start: 'Here is the problem. Take a moment, then tell me how you are reading it.',
  },
  amazon: {
    place: 'Day 1 building', city: 'Seattle, Washington', arch: 'spheres', sky: 'rain', people: 'us',
    palette: ['#ff9f43', '#232f3e', '#ffd166', '#2bb3c0'],
    formats: { loop: 'video', 'bar-raiser': 'video' },
    ambience: 'Glass towers in the rain, and the domes of the Spheres across the street.',
    loopSlots: ['Coding', 'Coding', 'System design', 'Bar Raiser'],
    day: {
      loop: ['Online assessment', 'Phone screen', 'Loop · 4 × 55 min', 'Debrief against the Leadership Principles'],
      'bar-raiser': ['Online assessment', 'Phone screen', 'Loop · Bar Raiser round', 'Debrief against the Leadership Principles'],
      current: { loop: 2, 'bar-raiser': 2 },
    },
    greet: 'We will spend part of today on how you work, so expect questions about real examples from your past.',
    note: {
      coding: 'For the code, I will look at whether it is scalable, robust and tested. For the stories, use specifics: what you did and what the result was.',
      behavioral: 'Please give specific examples. I will ask what YOU did and what the measurable result was.',
    },
    barRaiser: {
      role: 'Bar Raiser · from another team',
      greet: 'I am from a different team, so I am here as an objective voice in the decision. I will go deep on a couple of your stories.',
      note: 'I will keep asking follow-ups until the details are concrete. That is normal, it is not a bad sign.',
    },
    start: 'Let us start. Tell me about a time you took ownership of something nobody asked you to do.',
  },
  meta: {
    place: 'MPK 21', city: 'Menlo Park, California', arch: 'roofgarden', sky: 'sun', people: 'us',
    palette: ['#3f8cff', '#00c6ff', '#7b61ff', '#1fd1a5'],
    formats: { screen: 'video', onsite: 'onsite' },
    ambience: 'A long building with a garden on its roof. Murals on the walls and a lot of open desks.',
    day: {
      screen: ['Recruiter call', 'Tech screen · ~35 min coding', 'Full loop: coding, design, behavioral', 'Decision'],
      onsite: ['Recruiter call', 'Tech screen', 'Full loop coding · 45 min', 'Decision'],
      current: { screen: 1, onsite: 2 },
    },
    greet: 'We have a fair bit to get through, so I will keep us moving.',
    note: {
      coding: 'Aim for working code, then walk me through a test case on it before we move on.',
      behavioral: 'Short, specific answers work best. I may jump to a new question to fit everything in.',
    },
    screenNote: 'There are usually two problems in this screen, so watch the clock.',
    start: 'Okay, first problem is in the editor. Go for it.',
  },
  microsoft: {
    place: 'Redmond campus', city: 'Redmond, Washington', arch: 'glass', sky: 'rain', people: 'us',
    palette: ['#35c4e6', '#7fba00', '#f25022', '#ffb900'],
    formats: { loop: 'onsite' },
    ambience: 'Rain on the windows of a wooded campus. A quiet lobby and a whiteboard in every meeting room.',
    day: { loop: ['Recruiter screen', 'Technical screen', 'Interview loop · 45 min rounds', 'Decision'], current: { loop: 2 } },
    greet: 'This is meant to be collaborative, so treat me like a teammate.',
    note: {
      coding: 'Ask clarifying questions before you code. Real code please, not pseudocode, and we will test it together at the end.',
      behavioral: 'I am interested in how you work with people, so be specific about your part.',
    },
    start: 'Here is the problem. What would you like to clarify first?',
  },
  apple: {
    place: 'Apple Park', city: 'Cupertino, California', arch: 'ring', sky: 'sun', people: 'us',
    palette: ['#d7dde6', '#8e9aaf', '#f5f5f7', '#6ea8ff'],
    formats: { onsite: 'onsite' },
    ambience: 'A huge ring of curved glass around a garden of trees. Very quiet. Everything is precisely finished.',
    day: { onsite: ['Recruiter call', 'Technical phone screens', 'Onsite rounds', 'Team decision'], current: { onsite: 2 } },
    greet: 'I would like to hear about something you have built, in detail.',
    note: {
      coding: 'The details matter to us. Tell me why you choose each step, not just what it does.',
      behavioral: 'Pick a project you are proud of. I will ask about the decisions you made along the way.',
    },
    start: 'Before the problem, walk me through one project on your resume.',
  },
  general: {
    place: 'TechCorp HQ, Tower B', city: 'Floor 14, Engineering', arch: 'office', sky: 'dusk', people: 'us',
    palette: ['#b18cff', '#22d3ee', '#ff6bd6', '#39ff88'],
    formats: { general: 'onsite' },
    ambience: 'A busy startup floor. Cold brew on tap and a wall of team photos.',
    day: { general: ['Screen', 'Technical round', 'Final round'], current: { general: 1 } },
    greet: 'This will be a standard technical round. Nothing tricky about the format.',
    note: { coding: 'Talk me through your thinking and we will go from there.' },
    start: 'Alright, let us get into it.',
  },

  // ── Enterprise Empire ──
  oracle: {
    place: 'Redwood Shores campus', city: 'Redwood City, California', arch: 'cylinders', sky: 'haze', people: 'us',
    palette: ['#f2564b', '#9aa4b2', '#c74634', '#e8e1d5'],
    formats: { onsite: 'onsite' },
    ambience: 'Tall glass cylinders standing around a lagoon. Formal and quiet inside.',
    day: { onsite: ['Recruiter', 'Technical round', 'Onsite: coding, design, backend', 'Hiring manager'], current: { onsite: 2 } },
    greet: 'We will do a coding problem and then talk about design.',
    note: { coding: 'Expect some fundamentals along the way: Java, SQL, data structures.' },
    start: 'Here is a medium-sized problem. After that I will ask how you would design around it.',
  },
  adobe: {
    place: 'Adobe headquarters', city: 'San Jose, California', arch: 'glass', sky: 'sun', people: 'us',
    palette: ['#ff5a4f', '#ffb86b', '#ff7aa2', '#7c6cff'],
    formats: { onsite: 'onsite' },
    ambience: 'Bright, colourful walls with gallery-style prints. Warm light and a relaxed feel.',
    day: { onsite: ['Recruiter', 'DSA round', 'CS fundamentals / design', 'Hiring manager'], current: { onsite: 1 } },
    greet: 'We will start with data structures and then talk about the fundamentals around it.',
    note: { coding: 'I will ask you to walk through your own solution, so keep it clean.' },
    start: 'Let us begin with the problem in the editor.',
  },
  salesforce: {
    place: 'Salesforce Tower', city: 'San Francisco, California', arch: 'tower', sky: 'haze', people: 'us',
    palette: ['#2fa8f0', '#7fdbff', '#ffb800', '#0b5cab'],
    formats: { onsite: 'onsite' },
    ambience: 'The tallest tower in the city, with views across the bay from the top floor.',
    day: { onsite: ['Recruiter', 'Technical round', 'Values & behavioral', 'Hiring manager'], current: { onsite: 1 } },
    greet: 'We look at technical skill and how you work, including trust and customer focus.',
    note: { coding: 'Tell me how you would test and monitor this in production, not just how it works.', behavioral: 'Use real examples. I am interested in how you earned trust.' },
    start: 'Let us look at the problem, and keep quality in mind as you go.',
  },
  broadcom: {
    place: 'Broadcom headquarters', city: 'Palo Alto, California', arch: 'lowrise', sky: 'haze', people: 'us',
    palette: ['#e0313f', '#ff8a80', '#b0bec5', '#455a64'],
    formats: { onsite: 'onsite' },
    ambience: 'A low, quiet engineering building. Lab benches visible through the glass.',
    day: { onsite: ['Recruiter', 'Technical: C & systems', 'Manager round'], current: { onsite: 1 } },
    greet: 'We will go deep on C and systems today.',
    note: { coding: 'Expect pointers, bits and memory. When you get one right, I will ask one level deeper.' },
    start: 'First question: walk me through what happens in memory here.',
    rolesKey: 'embedded',
  },

  // ── FinTech Frontier ──
  stripe: {
    place: 'Stripe', city: 'South San Francisco, California', arch: 'glass', sky: 'sun', people: 'us',
    palette: ['#8f86ff', '#00d4ff', '#ff7ab2', '#5e4bff'],
    formats: { onsite: 'video' },
    ambience: '',
    day: { onsite: ['Recruiter', 'Tech screen', 'Onsite: coding, bug squash, integration, design'], current: { onsite: 2 } },
    greet: 'This round is practical. Think of it as a normal day of work, not a puzzle.',
    note: { coding: 'Get a working version first. I will add new requirements as we go, and you can use documentation.' },
    start: 'Here is part one. Once it works, I will give you part two.',
    tools: ['Docs allowed', 'Your own language', 'Requirements will change'],
  },
  paypal: {
    place: 'PayPal', city: 'San Jose, California', arch: 'glass', sky: 'sun', people: 'us',
    palette: ['#3b8ff0', '#0b2e6f', '#5fc3ff', '#ffc439'],
    formats: { onsite: 'video' },
    day: { onsite: ['Online test', 'Technical rounds', 'System design', 'Hiring manager'], current: { onsite: 1 } },
    greet: 'Explaining your thought process matters a lot here, even more than the final answer.',
    note: { coding: 'Walk me through your reasoning and tell me the runtime as you go.' },
    start: 'Here is the problem. Talk me through your first thoughts.',
  },
  'ant group': {
    place: 'Ant Group', city: 'Hangzhou, China', arch: 'glass', sky: 'haze', people: 'china',
    palette: ['#1fbf6a', '#1677ff', '#7ee2b8', '#0e3b2e'],
    formats: { onsite: 'video' },
    day: { onsite: ['CV screen', 'Online assessment', 'Technical interviews', 'HR'], current: { onsite: 2 } },
    greet: 'I would like to start from a project you built and go into its design.',
    note: { coding: 'We will cover backend fundamentals too: concurrency, databases and reliability.' },
    start: 'Pick your strongest project and tell me how it handled load.',
  },
  adyen: {
    place: 'Adyen headquarters', city: 'Amsterdam, Netherlands', arch: 'canal', sky: 'rain', people: 'nl',
    palette: ['#2bd17e', '#0abf53', '#d7ffe6', '#00112c'],
    formats: { onsite: 'onsite' },
    ambience: 'Narrow canal houses and bikes everywhere. Inside: plain desks and a calm, direct feel.',
    day: { onsite: ['HackerRank', 'Technical interview', 'Culture & leadership'], current: { onsite: 1 } },
    greet: 'We do not do trick puzzles. I want to see how you solve a practical engineering problem.',
    note: { coding: 'Be practical. I care about clear decisions more than clever ones.', behavioral: 'I will ask about how you work with others and our values.' },
    start: 'Here is a practical problem. Talk me through it.',
  },
  wise: {
    place: 'Wise', city: 'London, United Kingdom', arch: 'glass', sky: 'rain', people: 'uk',
    palette: ['#9fe870', '#163300', '#00b9ff', '#ffeb69'],
    formats: { pair: 'pair' },
    day: { pair: ['Recruiter', 'Pair programming · 60 min', 'System design', 'Values'], current: { pair: 1 } },
    greet: 'We will pair on one practical problem, like we would on a normal day.',
    note: { coding: 'Use whatever language you are strongest in. No trick questions. Keep a few minutes at the end for your questions.' },
    start: 'I have shared the editor. Read the problem and tell me where you want to start.',
    tools: ['Pick your language', 'No trivia or puzzles', '5 min for your questions'],
  },

  // ── Consulting Kingdom ──
  accenture: {
    place: 'Accenture', city: 'Bengaluru, India', arch: 'office', sky: 'sun', people: 'india', rolesKey: 'consulting',
    palette: ['#b47cff', '#7500c0', '#e6c8ff', '#2a0a4a'],
    formats: { interview: 'campus' },
    cleared: ['Cognitive & technical assessment', 'Coding assessment', 'Communication assessment'],
    day: { interview: ['Online assessments', 'Communication test', 'Technical + HR interview · ~20 min', 'Offer'], current: { interview: 2 } },
    greet: 'Congratulations on clearing the assessments. This interview is short.',
    note: { coding: 'Start by introducing yourself, then I will ask about your projects and some basics. Speak clearly.' },
    start: 'Please introduce yourself and tell me about your final-year project.',
  },
  tcs: {
    place: 'TCS', city: 'Mumbai, India', arch: 'office', sky: 'haze', people: 'india', rolesKey: 'consulting',
    palette: ['#4f86f7', '#0a2a66', '#9fc0ff', '#ffd166'],
    formats: { interview: 'campus' },
    cleared: ['TCS NQT: aptitude & reasoning', 'TCS NQT: coding'],
    day: { interview: ['TCS NQT', 'Technical interview', 'Managerial round', 'HR'], current: { interview: 1 } },
    greet: 'We will do the technical part first, then a few managerial questions, then HR.',
    note: { coding: 'Expect data structures, OOP, DBMS and questions on your projects.' },
    start: 'Let us begin with your projects. Which one are you most comfortable discussing?',
  },
  infosys: {
    place: 'Infosys campus', city: 'Mysuru, India', arch: 'campusIn', sky: 'sun', people: 'india', rolesKey: 'consulting',
    palette: ['#3fa3e0', '#007cc3', '#a6dcff', '#103a5a'],
    formats: { interview: 'campus' },
    cleared: ['HackWithInfy: 3 coding problems'],
    day: { interview: ['HackWithInfy', 'Technical interview', 'HR'], current: { interview: 1 } },
    greet: 'Your HackWithInfy score got you here. Now I want to hear how you think.',
    note: { coding: 'I may interrupt while you are coding to ask what you are doing. Just explain and carry on.' },
    start: 'Here is the problem. Explain your approach out loud as you write it.',
  },
  capgemini: {
    place: 'Capgemini', city: 'Mumbai, India', arch: 'office', sky: 'haze', people: 'india', rolesKey: 'consulting',
    palette: ['#2bb7e8', '#0070ad', '#9ee6ff', '#12abdb'],
    formats: { interview: 'campus' },
    cleared: ['Pseudocode & English', 'Game-based aptitude', 'Behavioral competency'],
    day: { interview: ['Online assessments', 'Technical + HR interview · ~30 min', 'Offer'], current: { interview: 1 } },
    greet: 'You have cleared all the assessments. This last step is a conversation.',
    note: { coding: 'I will ask about your studies, your projects, some basics and where you want to grow.' },
    start: 'Tell me a little about your academic background first.',
  },
  cognizant: {
    place: 'Cognizant', city: 'Chennai, India', arch: 'office', sky: 'sun', people: 'india', rolesKey: 'consulting',
    palette: ['#3d7bf0', '#000048', '#26efe9', '#a9c4ff'],
    formats: { interview: 'campus' },
    cleared: ['Online test: coding, SQL and CS'],
    day: { interview: ['Online test', 'Technical interview · 40-50 min', 'HR'], current: { interview: 1 } },
    greet: 'We will cover some coding, SQL and OOP, and talk about your projects.',
    note: { coding: 'Short answers with an example are best.' },
    start: 'Let us start with a quick SQL question.',
  },

  // ── Silicon Frontier ──
  tesla: {
    place: 'Gigafactory Texas', city: 'Austin, Texas', arch: 'factory', sky: 'sun', people: 'us',
    palette: ['#ff4b4b', '#e8e8e8', '#2a2a2a', '#ffb3b3'],
    formats: { onsite: 'onsite' },
    ambience: 'A factory so long you cannot see the end of it. Robots moving behind glass.',
    day: { onsite: ['Recruiter', 'Technical round', 'Panel / onsite'], current: { onsite: 1 } },
    greet: 'I want to hear about what you personally built and why you built it that way.',
    note: { coding: 'Expect me to push on your decisions. Then we will do some live coding in any language you like.' },
    start: 'Pick the hardest thing on your resume. What exactly did you build?',
  },
  nvidia: {
    place: 'Endeavor building', city: 'Santa Clara, California', arch: 'triangles', sky: 'night', people: 'us', rolesKey: 'embedded',
    palette: ['#86c440', '#0e1a07', '#c8ff8a', '#3a5f17'],
    formats: { onsite: 'onsite' },
    ambience: 'A huge triangular roof with skylights. Screens showing live renders.',
    day: { onsite: ['Recruiter / manager screen', 'Technical rounds · 45 min', 'Final'], current: { onsite: 1 } },
    greet: 'We will go deep. If you get something right, I will keep asking until we find the edge.',
    note: { coding: 'Expect C/C++, operating systems, concurrency and memory.' },
    start: 'First question: what is the difference between a mutex and a semaphore?',
  },
  qualcomm: {
    place: 'Qualcomm headquarters', city: 'San Diego, California', arch: 'lowrise', palms: true, sky: 'sun', people: 'us', rolesKey: 'embedded',
    palette: ['#4a7cff', '#3253dc', '#b3c6ff', '#0b1f66'],
    formats: { onsite: 'onsite' },
    ambience: 'Palm trees, sunshine and test benches full of boards.',
    day: { onsite: ['Online test', 'Technical panel', 'HR'], current: { onsite: 1 } },
    greet: 'We will start with OS and embedded C, then your resume, then a coding question.',
    note: { coding: 'Each question will build on your last answer.' },
    start: 'Let us start: what does volatile actually do?',
  },
  bosch: {
    place: 'Bosch campus', city: 'Renningen, Germany', arch: 'lowrise', sky: 'haze', people: 'de', rolesKey: 'embedded',
    palette: ['#ff5a5a', '#007bc0', '#c7e6ff', '#2c3e50'],
    formats: { interview: 'onsite' },
    ambience: 'A research campus with labs and test tracks. Calm and methodical.',
    day: { interview: ['Online test', 'Technical round', 'HR'], current: { interview: 1 } },
    greet: 'We focus on fundamentals here, then your projects in detail.',
    note: { coding: 'C basics, OOP and data structures first. For automotive roles I may ask about CAN or RTOS.' },
    start: 'Explain the storage classes in C to me.',
  },
  'li auto': {
    place: 'Li Auto headquarters', city: 'Beijing, China', arch: 'factory', sky: 'haze', people: 'china',
    palette: ['#4fd1c5', '#0d3b38', '#a3f7ef', '#1e7f78'],
    formats: { onsite: 'onsite' },
    ambience: 'Vehicles on display in the lobby. Screens showing live fleet data.',
    day: { onsite: ['Recruiter call', 'Live coding · 60 min', 'Onsite rounds'], current: { onsite: 1 } },
    greet: 'Very little is public about our process, so treat this as a best guess at the style.',
    note: { coding: 'Think about real constraints: lots of vehicles, real-time data.' },
    start: 'Here is an algorithms problem. After that we will talk about design.',
  },
};

const BAR_RAISER_NAME = 'Grace Lindqvist';
const TYPE_INDEX = { coding: 0, 'system-design': 1, behavioral: 2 };

/**
 * Everything the arrival screen needs for one company, round and interview type.
 * company: setup key ('amazon', 'ant group'); stage: round id ('screen', 'bar-raiser'); type: interview type.
 */
export function getExperience(company, stage, type = 'coding') {
  const key = EXPERIENCES[company] ? company : 'general';
  const x = EXPERIENCES[key];
  const roundIds = Object.keys(x.formats);
  const round = roundIds.includes(stage) ? stage : roundIds[0];
  const format = x.formats[round];
  const idx = TYPE_INDEX[type] ?? 0;
  const [name, colleague] = PEOPLE[x.people][idx];
  const roles = ROLE_SETS[x.rolesKey] || ROLE_SETS.default;
  const isBR = key === 'amazon' && round === 'bar-raiser';
  const note = (x.note && (x.note[type] || x.note.coding)) || '';

  return {
    key,
    round,
    format,
    place: x.place,
    city: x.city,
    arch: x.arch,
    palms: !!x.palms,
    sky: x.sky,
    palette: x.palette,
    ambience: x.ambience || '',
    tools: x.tools || null,
    cleared: x.cleared || null,
    loopSlots: x.loopSlots || null,
    day: x.day[round] || [],
    dayCurrent: (x.day.current || {})[round] ?? 1,
    interviewer: {
      name: isBR ? BAR_RAISER_NAME : name,
      role: isBR ? x.barRaiser.role : roles[idx],
    },
    receptionist: colleague,
    lines: {
      greet: isBR ? x.barRaiser.greet : x.greet,
      note: isBR ? x.barRaiser.note : (key === 'meta' && round === 'screen' ? `${note} ${x.screenNote}` : note),
      start: x.start,
    },
  };
}

export const EXPERIENCE_KEYS = Object.keys(EXPERIENCES);
