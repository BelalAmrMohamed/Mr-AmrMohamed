module.exports = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  // Quiz pages are static HTML in /public; these give them clean URLs under `next dev` / `next start`
  // (vercel.json carries the same rewrites for Vercel).
  async rewrites() {
    return [
      { source: "/quiz", destination: "/quiz/index.html" },
      { source: "/quiz/take", destination: "/quiz/take.html" },
      { source: "/admin/quizzes", destination: "/admin/quizzes.html" },
      { source: "/admin/quiz-results", destination: "/admin/quiz-results.html" },
    ];
  },
};
