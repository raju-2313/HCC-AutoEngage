/**
 * src/services/quiz/questionBank.js
 * Curated, hand-verified technical question bank.
 *
 * Covers:
 *   - JavaScript / Node.js
 *   - Python
 *   - Data Structures & Algorithms
 *   - Web & Databases (SQL / HTTP)
 *   - Git & Linux & Architecture
 *
 * Difficulty tiers: 'beginner' | 'advanced'
 */

export const QUESTION_BANK = [
  // ── Ultra-Beginner Series (Designed for College Freshmen & Novices) ────────
  {
    id: 'beg-001',
    category: 'python',
    difficulty: 'beginner',
    title: 'Python Multiplication Basics',
    questionText: 'What is the output of the following Python code?',
    codeSnippet: 'x = 5\nprint(x * 2)',
    options: [
      { id: 'A', text: '10' },
      { id: 'B', text: '25' },
      { id: 'C', text: '55' },
      { id: 'D', text: '52' },
    ],
    correctOption: 'A',
    explanation: 'x is an integer with value 5, so x * 2 performs standard numeric multiplication, which prints 10.',
    pointsReward: 10,
    xpReward: 20,
  },
  {
    id: 'beg-002',
    category: 'javascript',
    difficulty: 'beginner',
    title: 'JavaScript Constant Declaration',
    questionText: 'Which keyword in modern JavaScript is used to declare a variable whose value CANNOT be reassigned?',
    codeSnippet: 'const PI = 3.14159;\n// Reassigning PI later will cause an error',
    options: [
      { id: 'A', text: 'const' },
      { id: 'B', text: 'let' },
      { id: 'C', text: 'var' },
      { id: 'D', text: 'constant' },
    ],
    correctOption: 'A',
    explanation: 'const creates a read-only, block-scoped reference. Attempting to reassign a const variable throws a TypeError.',
    pointsReward: 10,
    xpReward: 20,
  },
  {
    id: 'beg-003',
    category: 'python',
    difficulty: 'beginner',
    title: 'Python For Loop Iterations',
    questionText: 'How many times will "HCC" be printed to the screen?',
    codeSnippet: 'for i in range(3):\n    print("HCC")',
    options: [
      { id: 'A', text: '3 times' },
      { id: 'B', text: '2 times' },
      { id: 'C', text: '4 times' },
      { id: 'D', text: '0 times' },
    ],
    correctOption: 'A',
    explanation: 'range(3) produces numbers 0, 1, and 2. The loop iterates 3 times, printing "HCC" 3 times.',
    pointsReward: 10,
    xpReward: 20,
  },
  {
    id: 'beg-004',
    category: 'dsa',
    difficulty: 'beginner',
    title: 'Zero-Based Array Indexing',
    questionText: 'In Python, C, Java, and JavaScript, what index is used to access the very FIRST item in a list or array?',
    codeSnippet: 'languages = ["Python", "JavaScript", "C++"]\nfirst = languages[?]',
    options: [
      { id: 'A', text: '0' },
      { id: 'B', text: '1' },
      { id: 'C', text: '-1' },
      { id: 'D', text: 'first' },
    ],
    correctOption: 'A',
    explanation: 'Modern programming languages use zero-based indexing, meaning the first element is always located at index 0.',
    pointsReward: 10,
    xpReward: 20,
  },
  {
    id: 'beg-005',
    category: 'git',
    difficulty: 'beginner',
    title: 'Git Clone Command',
    questionText: 'Which Git command is used to copy/download an existing GitHub repository onto your computer for the first time?',
    codeSnippet: 'git ______ https://github.com/hcc-campus/project.git',
    options: [
      { id: 'A', text: 'clone' },
      { id: 'B', text: 'copy' },
      { id: 'C', text: 'download' },
      { id: 'D', text: 'pull' },
    ],
    correctOption: 'A',
    explanation: 'git clone <url> clones and downloads the entire repository and its commit history to your local machine.',
    pointsReward: 10,
    xpReward: 20,
  },
  {
    id: 'beg-006',
    category: 'web',
    difficulty: 'beginner',
    title: 'HTML Hyperlink Tag',
    questionText: 'Which HTML tag is used to create a clickable link to another webpage?',
    codeSnippet: '<a href="https://hackerrank.com">Click to visit</a>',
    options: [
      { id: 'A', text: '<a>' },
      { id: 'B', text: '<link>' },
      { id: 'C', text: '<href>' },
      { id: 'D', text: '<url>' },
    ],
    correctOption: 'A',
    explanation: 'The <a> (anchor) tag combined with the href attribute creates a clickable hyperlink in web pages.',
    pointsReward: 10,
    xpReward: 20,
  },
  {
    id: 'beg-007',
    category: 'python',
    difficulty: 'beginner',
    title: 'Python String Length',
    questionText: 'What is the output of the following Python snippet?',
    codeSnippet: 'word = "Code"\nprint(len(word))',
    options: [
      { id: 'A', text: '4' },
      { id: 'B', text: '3' },
      { id: 'C', text: '5' },
      { id: 'D', text: '"Code"' },
    ],
    correctOption: 'A',
    explanation: 'The built-in len() function returns the total count of characters. "Code" has exactly 4 characters.',
    pointsReward: 10,
    xpReward: 20,
  },

  // ── JavaScript: Standard Series ───────────────────────────────────────────
  {
    id: 'js-001',
    category: 'javascript',
    difficulty: 'beginner',
    title: 'JavaScript Type Coercion',
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
    title: 'JavaScript Closures & Scoping',
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
    title: 'JavaScript Event Loop & Microtasks',
    questionText: 'In what exact order will the numbers be logged?',
    codeSnippet: 'console.log(1);\nsetTimeout(() => console.log(2), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);',
    options: [
      { id: 'A', text: '1, 4, 3, 2' },
      { id: 'B', text: '1, 2, 3, 4' },
      { id: 'C', text: '1, 4, 2, 3' },
      { id: 'D', text: '1, 3, 4, 2' },
    ],
    correctOption: 'A',
    explanation: 'Synchronous statements log 1 and 4 first. Promises use the Microtask queue, which has higher priority and drains completely before the Macrotask (Task) queue (setTimeout) is processed. Thus: 1, 4, 3, 2.',
    pointsReward: 15,
    xpReward: 30,
  },
  {
    id: 'js-004',
    category: 'javascript',
    difficulty: 'advanced',
    title: 'JavaScript Strict Equality & NaN',
    questionText: 'What is the output of the following comparison in JavaScript?',
    codeSnippet: 'console.log(NaN === NaN, Object.is(NaN, NaN));',
    options: [
      { id: 'A', text: 'true true' },
      { id: 'B', text: 'false false' },
      { id: 'C', text: 'false true' },
      { id: 'D', text: 'true false' },
    ],
    correctOption: 'C',
    explanation: 'In JavaScript (and IEEE 754 floating point standard), NaN is the only value not equal to itself, so NaN === NaN evaluates to false. Object.is() uses SameValue equality, which treats NaN as equal to NaN.',
    pointsReward: 15,
    xpReward: 30,
  },

  // ── Python: Beginner ───────────────────────────────────────────────────────
  {
    id: 'py-001',
    category: 'python',
    difficulty: 'beginner',
    title: 'Python Default Mutable Arguments',
    questionText: 'What is the output of calling append_to() twice as shown?',
    codeSnippet: 'def append_to(element, target=[]):\n    target.append(element)\n    return target\n\nprint(append_to(1))\nprint(append_to(2))',
    options: [
      { id: 'A', text: '[1] then [2]' },
      { id: 'B', text: '[1] then [1, 2]' },
      { id: 'C', text: '[1, 2] then [1, 2]' },
      { id: 'D', text: 'TypeError: mutable default argument' },
    ],
    correctOption: 'B',
    explanation: 'In Python, default arguments are evaluated only once when the function is defined, not each time it is called. The same list object is mutated across calls. The safe idiom is: def append_to(element, target=None): if target is None: target = [].',
    pointsReward: 10,
    xpReward: 20,
  },

  // ── Python: Advanced ───────────────────────────────────────────────────────
  {
    id: 'py-002',
    category: 'python',
    difficulty: 'advanced',
    title: 'Python GIL & Concurrency',
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
    title: 'Hash Table Search Complexity',
    questionText: 'What is the average time complexity for searching a key in a standard Hash Table (assuming a good hash function)?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'O(log N)' },
      { id: 'B', text: 'O(1)' },
      { id: 'C', text: 'O(N)' },
      { id: 'D', text: 'O(N log N)' },
    ],
    correctOption: 'B',
    explanation: 'Under simple uniform hashing, keys are distributed uniformly across buckets, yielding O(1) average lookup, insertion, and deletion. The worst-case is O(N) when all keys hash to the same bucket.',
    pointsReward: 10,
    xpReward: 20,
  },

  // ── DSA: Advanced ──────────────────────────────────────────────────────────
  {
    id: 'dsa-002',
    category: 'dsa',
    difficulty: 'advanced',
    title: 'Binary Search Tree Traversal',
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
  {
    id: 'dsa-003',
    category: 'dsa',
    difficulty: 'advanced',
    title: 'Two Pointer & Space Complexity',
    questionText: 'Floyd’s Cycle-Finding Algorithm (Tortoise and Hare) detects a cycle in a linked list using which space complexity?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'O(1) auxiliary space' },
      { id: 'B', text: 'O(N) auxiliary space' },
      { id: 'C', text: 'O(log N) auxiliary space' },
      { id: 'D', text: 'O(N²) auxiliary space' },
    ],
    correctOption: 'A',
    explanation: 'Floyd’s algorithm uses only two pointer references (a slow pointer advancing 1 step and a fast pointer advancing 2 steps). Since no extra data structures (like a Set or Hash Table) are allocated, it runs in strictly O(1) auxiliary space.',
    pointsReward: 15,
    xpReward: 30,
  },

  // ── Databases / SQL ────────────────────────────────────────────────────────
  {
    id: 'sql-001',
    category: 'databases',
    difficulty: 'beginner',
    title: 'SQL JOIN Semantics',
    questionText: 'Which SQL JOIN returns all rows from the left table, and matching rows from the right table (filling with NULL if no match)?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'INNER JOIN' },
      { id: 'B', text: 'LEFT JOIN (LEFT OUTER JOIN)' },
      { id: 'C', text: 'FULL OUTER JOIN' },
      { id: 'D', text: 'CROSS JOIN' },
    ],
    correctOption: 'B',
    explanation: 'A LEFT JOIN returns all records from the left table, and the matched records from the right table. If there is no match on the join predicate, the result contains NULL values for every column of the right table.',
    pointsReward: 10,
    xpReward: 20,
  },
  {
    id: 'sql-002',
    category: 'databases',
    difficulty: 'advanced',
    title: 'Database ACID Isolation Levels',
    questionText: 'Which SQL isolation level protects against Dirty Reads and Non-Repeatable Reads, but may still allow Phantom Reads in the ANSI standard?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'Read Uncommitted' },
      { id: 'B', text: 'Read Committed' },
      { id: 'C', text: 'Repeatable Read' },
      { id: 'D', text: 'Serializable' },
    ],
    correctOption: 'C',
    explanation: 'According to the ANSI SQL-92 standard, Repeatable Read prevents both Dirty Reads and Non-Repeatable Reads, but permits Phantom Reads (new rows inserted by another transaction meeting search criteria). Serializable prevents all three.',
    pointsReward: 15,
    xpReward: 30,
  },

  // ── Git & Version Control ──────────────────────────────────────────────────
  {
    id: 'git-001',
    category: 'git',
    difficulty: 'beginner',
    title: 'Git Merge vs Rebase',
    questionText: 'What is the primary difference between "git merge feature" and "git rebase main"?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'Merge creates a new merge commit preserving branch history; rebase rewrites commit history onto the target base.' },
      { id: 'B', text: 'Merge deletes the remote repository branch automatically; rebase preserves it.' },
      { id: 'C', text: 'Rebase can only be used on uncommitted staging index changes.' },
      { id: 'D', text: 'Merge is forbidden on public branches; rebase is always required on shared branches.' },
    ],
    correctOption: 'A',
    explanation: 'git merge creates a join commit tying two histories together. git rebase reapplies your work on top of the target branch by creating new commits with different SHA-1 hashes, producing a linear, clean commit history.',
    pointsReward: 10,
    xpReward: 20,
  },

  // ── Web & HTTP Protocols ───────────────────────────────────────────────────
  {
    id: 'web-001',
    category: 'web',
    difficulty: 'beginner',
    title: 'HTTP Idempotency',
    questionText: 'Which of the following HTTP methods is NOT idempotent according to RFC 7231?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'GET' },
      { id: 'B', text: 'PUT' },
      { id: 'C', text: 'DELETE' },
      { id: 'D', text: 'POST' },
    ],
    correctOption: 'D',
    explanation: 'An HTTP method is idempotent if the intended effect of multiple identical requests is the same as for a single request. GET, PUT, and DELETE are idempotent. POST is typically used to append/create new subordinate resources, producing different side effects on repeated calls.',
    pointsReward: 10,
    xpReward: 20,
  },
  {
    id: 'web-002',
    category: 'web',
    difficulty: 'advanced',
    title: 'HTTP Status 401 vs 403',
    questionText: 'What is the fundamental semantic difference between HTTP 401 Unauthorized and HTTP 403 Forbidden?',
    codeSnippet: null,
    options: [
      { id: 'A', text: '401 means authentication credentials are missing or invalid; 403 means the server understands identity but refuses authorization.' },
      { id: 'B', text: '401 is a client error; 403 is a server internal error.' },
      { id: 'C', text: '401 is only used with HTTPS; 403 is used with plain HTTP.' },
      { id: 'D', text: 'There is no difference; they are interchangeable aliases.' },
    ],
    correctOption: 'A',
    explanation: 'HTTP 401 (Unauthorized) indicates that the request lacks valid authentication credentials for the target resource. HTTP 403 (Forbidden) means the server understood who you are (authenticated), but your role/permissions do not grant access to the resource.',
    pointsReward: 15,
    xpReward: 30,
  },

  // ── Computer Systems / Architecture ────────────────────────────────────────
  {
    id: 'sys-001',
    category: 'systems',
    difficulty: 'beginner',
    title: 'Process vs Thread',
    questionText: 'What resource is shared by default between multiple threads belonging to the same process?',
    codeSnippet: null,
    options: [
      { id: 'A', text: 'Thread Call Stack and CPU Registers' },
      { id: 'B', text: 'Virtual Address Space, Heap Memory, and Open File Descriptors' },
      { id: 'C', text: 'Process ID (PID) and Program Counter' },
      { id: 'D', text: 'Thread Local Storage (TLS)' },
    ],
    correctOption: 'B',
    explanation: 'Threads within the same process share the process’s virtual address space, heap memory, global variables, and OS handles (open file descriptors). Each thread maintains its own private call stack and register state (program counter).',
    pointsReward: 10,
    xpReward: 20,
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
 * Returns a randomized or seeded sample of N questions from the bank.
 */
export function getRandomSampleQuestions(count = 10) {
  const shuffled = [...QUESTION_BANK].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Curated 7-day scheduled questions for community testing sprint.
 * Maps 'YYYY-MM-DD' (Asia/Kolkata) to Question Bank ID.
 */
export const SCHEDULED_QUESTIONS = {
  '2026-11-06': 'beg-001',   // Day 1 (Thu): Python Multiplication Basics (x * 2)
  '2026-11-07': 'beg-002',   // Day 2 (Fri): JavaScript Constant Declaration (const)
  '2026-11-08': 'beg-003',   // Day 3 (Sat): Python For Loop Iterations (range(3))
  '2026-11-09': 'beg-004',   // Day 4 (Sun): Zero-Based Array Indexing (index 0)
  '2026-11-10': 'beg-005',   // Day 5 (Mon): Git Clone Command (git clone)
  '2026-11-11': 'beg-006',   // Day 6 (Tue): HTML Hyperlink Tag (<a>)
  '2026-11-12': 'beg-007',   // Day 7 (Wed): Python String Length (len("Code"))
};

/**
 * Returns the current date in Asia/Kolkata timezone formatted as YYYY-MM-DD.
 */
export function getKolkataDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

/**
 * Returns a deterministic daily question based on date string (defaults to Asia/Kolkata current date).
 * Checks the curated SCHEDULED_QUESTIONS calendar first, then falls back to hash-based selection.
 */
export function getDailyQuestion(daySeed = getKolkataDateString()) {
  if (SCHEDULED_QUESTIONS[daySeed]) {
    const scheduled = QUESTION_BANK.find((q) => q.id === SCHEDULED_QUESTIONS[daySeed]);
    if (scheduled) return scheduled;
  }

  let hash = 0;
  for (let i = 0; i < daySeed.length; i++) {
    hash = (hash << 5) - hash + daySeed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % QUESTION_BANK.length;
  return QUESTION_BANK[index];
}
