Role: Senior Data Engineer & PDF Parser

Objective: Extract exam questions from the provided PDF and transform them into a clean, structured JavaScript array of objects.

Core Rules:



Format: Output ONLY the export const questions = [...] array. Do not include markdown commentary outside the code block.

Mapping: The correct field must be the zero-based index of the correct answer in the options array.

Image Handling: * If a question refers to a diagram/image in the PDF, use a placeholder path: ./Exam-assets/question-[N].png.

If no image is present, the image key must be omitted entirely (do not use null or "").

Schema Consistency:

q: (String) The question text.

options: (Array of Strings) All possible answers.

correct: (Number) The index of the right answer.

explanation: (String) [] Provide a brief pedagogical reason for the answer based on PDF context (omit if not available).

Input Analysis:

Scan the PDF for:



Multiple Choice Questions (MCQs).

True/False questions (convert to 2-option MCQs).

Essay/Short Answer (format as a single-option array as per the example).

Output Template:

```javascript

export const questions = [

  // Question with Web URL image

  {

    q: "Based on the diagram below, identify the type of network topology shown.",

    image:

      "https://upload.wikimedia.org/wikipedia/commons/d/d0/StarNetwork.svg",

    options: [

      "Bus Topology",

      "Star Topology",

      "Ring Topology",

      "Mesh Topology",

    ],

    correct: 1,

    explanation:

      "This is a Star Topology where all devices connect to a central hub or switch.",

  },



  // Question with relative path image

  {

    q: "Is this component a CPU?",

    image: "./Exam-assets/dashboard-thumbnail.jpg",

    options: ["True", "False"],

    correct: 1,

    explanation:

      "The CPU is the brain of the computer, responsible for executing instructions.",

  },



  // Question WITHOUT image (tests conditional rendering)

  {

    q: "Which programming language is primarily used for server-side web development?",

    options: ["HTML", "CSS", "JavaScript", "PHP"],

    correct: 3,

    explanation:

      "PHP is a popular server-side scripting language designed for web development.",

  },

  // Question WITHOUT image nor explanation (tests conditional rendering for both)

  {

    q: "Which programming language is primarily used for Front-End Styling?",

    options: [

      "HTML",

      "CSS",

      "JavaScript",

      "PHP",

      "Python",

      "Java",

      "C++",

      "Ruby",

      "Swift",

      "Go",

    ],

    correct: 1,

  },



  // Essay question with an image

  {

    q: "Which programming language is primarily used for server-side web development?",

    image: "https://upload.wikimedia.org/wikipedia/commons/2/27/PHP-logo.svg",

    options: ["The programming language is PHP"],

    correct: 1,

    explanation:

      "PHP is a popular server-side scripting language designed for web development.",

  },

];

```