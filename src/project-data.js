// One entry per project. Add a real image/video and repository as they are supplied.
export const projects = [
  {
    id: 'vr', category: 'Virtual reality', title: 'Jakkho', short: 'VR',
    summary: 'Practice spotting phishing messages, unsafe Wi-Fi and fake links in VR.',
    stack: 'Unity / C# / OpenXR', repo: 'https://github.com/ryuma2317/Jakkho',
    media: { type: 'video', src: '/assets/projects/jakkho-demo.mp4', poster: '/assets/projects/jakkho-poster.jpg', mime: 'video/mp4', caption: 'Recorded VR demo · 49 seconds' },
    details: [
      ['Cybersecurity scenarios', 'A Unity VR learning project with interactive scenarios covering spear-phishing, evil-twin Wi-Fi networks and suspicious links.'],
      ['Interaction and feedback', 'Uses XR Interaction Toolkit and OpenXR, with scenario navigation, branching choices and outcome-based feedback.'],
    ],
  },
  {
    id: 'unity', category: 'Unity game', title: 'Unity Obby', short: 'Unity',
    summary: 'An obstacle-course game built with Unity.', stack: 'Unity',
    media: { type: 'pending', label: 'Gameplay preview', caption: 'Gameplay and repository link to be added' },
    details: [['Obstacle-course game', 'A Unity obstacle-course project. Gameplay captures, the repository link, and a closer look at its development will be added when available.']],
  },
  {
    id: 'react', category: 'React application', title: 'Chronovision', short: 'React',
    summary: 'GPA predictions, what-if simulations, study planning and classroom tools.',
    stack: 'React / Express / MySQL / Python', repo: 'https://github.com/ryuma2317/Chronovision',
    media: { type: 'image', src: '/assets/projects/chronovision.webp', alt: 'Actual Chronovision application sign-in screen', caption: 'Actual interface · Sign-in screen' },
    details: [
      ['The application', 'A React frontend, an Express/MySQL API, and a Python/Flask prediction service. Features include what-if simulations, study planning, quizzes, and teacher tools.'],
      ['Model context', 'The prediction models were trained on synthetic data. Chronovision is an academic application; its predictions should be understood in that context.'],
    ],
  },
  {
    id: 'cpp', category: 'C++ game', title: 'Space Crew', short: 'C++',
    summary: 'An Among Us-inspired game with crew tasks, bot players and voting.',
    stack: 'C++17 / SFML / CMake', repo: 'https://github.com/Bopha2222/Space-Crew',
    media: { type: 'pending', label: 'Space Crew', caption: 'SFML game · Gameplay capture to be added' },
    details: [
      ['Gameplay systems', 'Crew tasks, bots, sabotage and voting meetings are coordinated through the game state and a graphical SFML interface.'],
      ['Data structures', 'A CADT DSA group project with custom queue and stack implementations alongside map, task and player management.'],
    ],
  },
  {
    id: 'python', category: 'Python desktop app', title: 'Cadtalytics', short: 'Python',
    summary: 'Desktop analytics and exam-score predictions from student habits and academic data.',
    stack: 'Python / CustomTkinter / scikit-learn', repo: 'https://github.com/sslenn/Cadtalytics',
    media: { type: 'pending', label: 'Cadtalytics', caption: 'Desktop application · Interface capture to be added' },
    details: [
      ['Student analytics', 'Explore student records, score distributions, semester averages, major rankings and at-risk indicators through a CustomTkinter desktop interface.'],
      ['Prediction and data', 'A scikit-learn Random Forest regressor estimates exam scores from behavioral features. The application supports CSV data and an optional MySQL data source.'],
      ['Object-oriented design', 'A CADT Python OOP team project, with base and specialized student classes, analytics modules and individual text-report export.'],
    ],
  },
  {
    id: 'c', category: 'C programming', title: 'CADT Library MGS', short: 'C',
    summary: 'A C project run in the terminal.', stack: 'C / Terminal',
    repo: 'https://github.com/Chips-beans/CADT_Library_MGS',
    media: { type: 'pending', format: 'terminal', label: 'Terminal program', caption: 'Runs in a terminal · Source code available' },
    details: [],
  },
  {
    id: 'java', category: 'Java programming', title: 'Multithreaded sorting', short: 'Java',
    summary: 'Compare single-threaded and multithreaded merge sort in a terminal benchmark.', stack: 'Java / Threads / Merge sort',
    repo: 'https://github.com/ryuma2317/OS_Multi-Thread_Sorting-Merge-_Algorithm_Assignment',
    media: { type: 'pending', format: 'terminal', label: 'Terminal program', caption: 'Runs in a terminal · Source code available' },
    details: [
      ['Parallel execution', 'Two worker threads sort separate halves of an integer array. A third thread merges their results after both sorting threads have finished, using Thread.join() to coordinate execution.'],
      ['Benchmark design', 'Compares the two implementations on cloned inputs after a warm-up, using a fixed random seed and reporting elapsed time in milliseconds.'],
    ],
  },
];
