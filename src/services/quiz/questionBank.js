/**
 * src/services/quiz/questionBank.js
 * Curated, hand-verified technical question bank.
 *
 * Covers:
 *   - JavaScript / Node.js
 *   - Python
 *   - Data Structures & Algorithms
 *   - Web & Databases (SQL / HTTP)
 *
 * Difficulty tiers: 'beginner' | 'advanced'
 */

export const QUESTION_BANK = [
  // ── JavaScript: Beginner ───────────────────────────────────────────────────
  {
    id: 'js-001',
    category: 'javascript',
    difficulty: 'beginner',
    title: 'Daily Tech Quiz: JavaScript Type Coercion',
    questionText: 'What is the output of the following JavaScript expression?',
    codeSnippet: 'console.log([] + []);',
    options: [
      { id: 'A', text: '"" (empty string)' },
      { id: 'B', text: '[object Object]' },
      { id: 'C', text: '[]' },
      { id: 'D', text: 'undefined' },
    ],
    correctOption: 'A',
    explanation: 'When the + operator is used with arrays, JavaScript converts both operands to primitive strings via valueOf()/toString(). An empty array [].toString() yields "", so "" + "" results in an empty string ("").',
    pointsReward: 10,
    xpReward: 20,
  },
  {
    id: 'js-002',
    category: 'javascript',
    difficulty: 'beginner',
    title: 'Daily Tech Quiz: JavaScript Variable Scoping',
    questionText: 'What does the following code log to the console?',
    codeSnippet: 'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}',
    options: [
      { id: 'A', text: '0 1 2' },
      { id: 'B', text: '3 3 3' },
      { id: 'C', text: 'undefined undefined undefined' },
      { id: 'D', text: '0 0 0' },
    ],
    correctOption: 'B',
    explanation: 'Variables declared with "var" are function-scoped or globally scoped, not block-scoped. By the time the event loop executes the queued setTimeout callbacks, the loop has completed and "i" equals 3. Using "let" instead creates a fresh binding per iteration.',
    pointsReward: 10,
    xpReward: 20,
  },

  // ── JavaScript: Advanced ───────────────────────────────────────────────────
  {
    id: 'js-003',
    category: 'javascript',
    difficulty: 'advanced',
    title: 'Daily Tech Quiz: JavaScript Microtask Queue',
    questionText: 'In what order will the numbers be logged?',
    codeSnippet: 'console.log(1);\nsetTimeout(() => console.log(2), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);',
    options: [
      { id: 'A', text: '1, 4, 3, 2' },
      { id: 'B', text: '1, 2, 3, 4' },
      { id: 'C', text: '1, 4, 2, 3' },
      { id: 'D', text: '1, 3, 4, 2' },
    ],
    correctOption: 'A',
    explanation: 'Synchronous execution logs 1 and 4 first. Promises use the Microtask queue, which has higher priority and drains completely before the Macrotask (Task) queue (setTimeout) is processed. Thus: 1, 4, 3, 2.',
    pointsReward: 15,
    xpReward: 30,
  },

  // ── Python: Beginner ───────────────────────────────────────────────────────
  {
    id: 'py-001',
    category: 'python',
    difficulty: 'beginner',
    title: 'Daily Tech Quiz: Python Default Mutable Arguments',
    questionText: 'What is the output of calling append_to() twice as shown?',
    codeSnippet: 'def append_to(element, target=[]):\n    target.append(element)\n    return target\n\nprint(append_to(1))\nprint(append_to(2))',
    options: [
      { id: 'A', text: '[1] then [2]' },
      { id: 'B', text: '[1] then [1, 2]' },
      { id: 'C', text: '[1, 2] then [1, 2]' },
      { id: 'D', text: 'TypeError: mutable default argument' },
    ],
    correctOption: 'B',
    explanation: 'In Python, default arguments are evaluated only once when the function is defined, not each time it is called. The same list object is mutated across calls. The idiomatic pattern is: def append_to(element, target=None): if target is None: target = [].',
    pointsReward: 10,
    xpReward: 20,
  },

  // ── Python: Advanced ───────────────────────────────────────────────────────
  {
    id: 'py-002',
    category: 'python',
    difficulty: 'advanced',
    title: 'Daily Tech Quiz: Python GIL & Concurrency',
    questionText: 'Which statement accurately describes Python’s Global Interpreter Lock (GIL) in CPython?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'It prevents multithreading from speeding up I/O-bound operations.' },
      { id: 'B', text: 'It prevents multiple native threads from executing Python bytecodes concurrently on multiple CPU cores.' },
      { id: 'C', text: 'It automatically makes all user-defined database transactions thread-safe.' },
      { id: 'D', text: 'It was completely removed in Python 3.8 across all implementations.' },
    ],
    correctOption: 'B',
    explanation: 'CPython’s GIL is a mutex that prevents multiple native threads from executing Python bytecodes simultaneously on multiple physical CPU cores. I/O-bound operations release the GIL during blocking wait, but CPU-bound tasks require multiprocessing to utilize multiple cores.',
    pointsReward: 15,
    xpReward: 30,
  },

  // ── DSA: Beginner ──────────────────────────────────────────────────────────
  {
    id: 'dsa-001',
    category: 'dsa',
    difficulty: 'beginner',
    title: 'Daily Tech Quiz: Hash Table Complexity',
    questionText: 'What is the average time complexity for searching a key in a standard Hash Table (assuming a good hash function)?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'O(log N)' },
      { id: 'B', text: 'O(1)' },
      { id: 'C', text: 'O(N)' },
      { id: 'D', text: 'O(N log N)' },
    ],
    correctOption: 'B',
    explanation: 'Under simple uniform hashing, keys are distributed uniformly across buckets, yielding O(1) average lookup, insertion, and deletion. The worst-case is O(N) when all keys hash to the same bucket (collision collapse).',
    pointsReward: 10,
    xpReward: 20,
  },

  // ── DSA: Advanced ──────────────────────────────────────────────────────────
  {
    id: 'dsa-002',
    category: 'dsa',
    difficulty: 'advanced',
    title: 'Daily Tech Quiz: Binary Search Tree Property',
    questionText: 'Which tree traversal of a valid Binary Search Tree (BST) visits nodes in strictly ascending sorted order?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'Pre-order (Root, Left, Right)' },
      { id: 'B', text: 'Post-order (Left, Right, Root)' },
      { id: 'C', text: 'In-order (Left, Root, Right)' },
      { id: 'D', text: 'Level-order (Breadth-First)' },
    ],
    correctOption: 'C',
    explanation: 'In a BST, all keys in the left subtree are smaller than the node, and all in the right subtree are greater. In-order traversal visits (Left, Root, Right), which recursively processes values from smallest to largest.',
    pointsReward: 15,
    xpReward: 30,
  },

  // ── SQL / Databases: Beginner ──────────────────────────────────────────────
  {
    id: 'sql-001',
    category: 'databases',
    difficulty: 'beginner',
    title: 'Daily Tech Quiz: SQL JOIN Semantics',
    questionText: 'Which SQL JOIN returns all rows from the left table, and matching rows from the right table (filling with NULL if no match)?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'INNER JOIN' },
      { id: 'B', text: 'LEFT JOIN (LEFT OUTER JOIN)' },
      { id: 'C', text: 'FULL OUTER JOIN' },
      { id: 'D', text: 'CROSS JOIN' },
    ],
    correctOption: 'B',
    explanation: 'A LEFT JOIN returns all records from the left table (table1), and the matched records from the right table (table2). If there is no match, the result contains NULL values for every column of the right table.',
    pointsReward: 10,
    xpReward: 20,
  },

  // ── SQL / Databases: Advanced ──────────────────────────────────────────────
  {
    id: 'sql-002',
    category: 'databases',
    difficulty: 'advanced',
    title: 'Daily Tech Quiz: Database ACID Isolation Levels',
    questionText: 'Which SQL isolation level protects against Dirty Reads and Non-Repeatable Reads, but may still allow Phantom Reads in the ANSI standard?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'Read Uncommitted' },
      { id: 'B', text: 'Read Committed' },
      { id: 'C', text: 'Repeatable Read' },
      { id: 'D', text: 'Serializable' },
    ],
    correctOption: 'C',
    explanation: 'According to the ANSI SQL-92 standard, Repeatable Read prevents both Dirty Reads and Non-Repeatable Reads, but permits Phantom Reads (new rows inserted by another transaction meeting search criteria). Serializable is the highest level, preventing all three anomalies.',
    pointsReward: 15,
    xpReward: 30,
  },
];

/**
 * Retrieves a question from the bank by its unique identifier.
 */
export function getQuestionById(id) {
  return QUESTION_BANK.find((q) => q.id === id) || null;
}

/**
 * Retrieves questions filtered by difficulty and/or category.
 */
export function getQuestionsByFilter({ difficulty, category } = {}) {
  return QUESTION_BANK.filter((q) => {
    if (difficulty && q.difficulty !== difficulty) return false;
    if (category && q.category !== category) return false;
    return true;
  });
}

/**
 * Returns a deterministic or randomized daily question.
 */
export function getDailyQuestion(daySeed = new Date().toISOString().split('T')[0]) {
  // Deterministic pick based on date string hash so everyone gets the same daily quiz
  let hash = 0;
  for (let i = 0; i < daySeed.length; i++) {
    hash = (hash << 5) - hash + daySeed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % QUESTION_BANK.length;
  return QUESTION_BANK[index];
}
