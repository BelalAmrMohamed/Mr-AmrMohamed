module.exports = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  // The admin and quiz pages are static HTML in /public; these give them clean URLs under
  // `next dev` / `next start` (vercel.json carries the same rewrites for Vercel).
  async rewrites() {
    return [
      { source: "/admin", destination: "/admin/index.html" },
      { source: "/admin/dashboard", destination: "/admin/dashboard.html" },
      { source: "/quiz", destination: "/quiz/index.html" },
      { source: "/quiz/take", destination: "/quiz/take.html" },
      { source: "/admin/quizzes", destination: "/admin/quizzes.html" },
      { source: "/admin/quiz-results", destination: "/admin/quiz-results.html" },
    ];
  },
};
