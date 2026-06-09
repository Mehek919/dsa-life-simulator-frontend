// src/data/questions.js

const questions = [
  {
    id: 1,
    topic: 'Array',
    difficulty: 'easy',
    points: 10,
    question: 'What is the time complexity of accessing an element in an array by index?',
    options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
    correct: 2
  },
  {
    id: 2,
    topic: 'Array',
    difficulty: 'medium',
    points: 20,
    question: 'Which sorting algorithm works best on a nearly sorted array?',
    options: ['Merge Sort', 'Quick Sort', 'Insertion Sort', 'Heap Sort'],
    correct: 2
  },
  {
    id: 3,
    topic: 'Tree',
    difficulty: 'easy',
    points: 10,
    question: 'What is the maximum number of children a Binary Tree node can have?',
    options: ['1', '2', '3', 'Unlimited'],
    correct: 1
  },
  {
    id: 4,
    topic: 'Tree',
    difficulty: 'medium',
    points: 20,
    question: 'Which traversal of a BST gives elements in sorted order?',
    options: ['Pre-order', 'Post-order', 'In-order', 'Level-order'],
    correct: 2
  },
  {
    id: 5,
    topic: 'Graph',
    difficulty: 'medium',
    points: 20,
    question: 'Which algorithm is used to find the shortest path in an unweighted graph?',
    options: ['DFS', 'BFS', 'Dijkstra', 'Prim'],
    correct: 1
  },
  {
    id: 6,
    topic: 'Graph',
    difficulty: 'hard',
    points: 30,
    question: 'What data structure does BFS use internally?',
    options: ['Stack', 'Queue', 'Heap', 'Tree'],
    correct: 1
  },
  {
    id: 7,
    topic: 'LinkedList',
    difficulty: 'easy',
    points: 10,
    question: 'What is the time complexity of inserting at the head of a Linked List?',
    options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
    correct: 2
  },
  {
    id: 8,
    topic: 'Stack',
    difficulty: 'easy',
    points: 10,
    question: 'Which principle does a Stack follow?',
    options: ['FIFO', 'LIFO', 'FILO', 'LILO'],
    correct: 1
  },
  {
    id: 9,
    topic: 'Queue',
    difficulty: 'easy',
    points: 10,
    question: 'Which principle does a Queue follow?',
    options: ['LIFO', 'FIFO', 'FILO', 'LILO'],
    correct: 1
  },
  {
    id: 10,
    topic: 'DynamicProgramming',
    difficulty: 'hard',
    points: 30,
    question: 'Which of the following problems is best solved using Dynamic Programming?',
    options: ['Binary Search', 'Fibonacci Sequence', 'BFS Traversal', 'Insertion Sort'],
    correct: 1
  }
];

export default questions;

