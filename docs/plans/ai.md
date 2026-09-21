## AI Chat (Ask Mr. Amr's AI)

We want to integrate AI into the platform to provide an intelligent assistant that can answer questions, use website-specific tools, and help students learn English.

* **Model:** `gemini-flash-lite-latest`
* **Provider:** Google AI Studio
* **API Keys:** API keys already exist.

### Interface

* The AI Assistant will initially be implemented as a **widget visible on all pages**.
* When additional pages are added in the future, the assistant will remain globally available.
* A dedicated `/ai` page will be added later, providing the same assistant in a full-page experience.
* Pressing the floating AI widget opens a chat modal:

  * Almost full-screen on desktop.
  * Full-screen on mobile, with no rounded outer borders.
* The chat will have **suggested prompts** to help users discover what the assistant can do.

### Chat History

* Chat history will be stored in the browser's `localStorage`.
* The history sidebar should have a more menu that allows users to:

  * Start a new chat.
  * Delete a chat.
  * Pin a chat.
  * Rename a chat.
  * Export a chat.
  * Export formats should include PDF, Markdown (`.md`), and other useful formats.
* The more icon appears only when the history item is hovered. This way the item's title is shown most of the time unless hovered.
* The **New Chat** button should be disabled when the user is already in a completely new/empty chat.
* When an element is pinned, the pinned icon appears in place of the more icon, when the item is hovered, the more icon appears instead. 

### Chat UI/UX

* Render **Markdown** in both user messages and AI responses.
* Automatically determine text direction for both user messages and AI responses, you can use `dir="auto"` or something similar.
* Every AI response should have:

  * Copy button.
  * Read Aloud button.
  * Regenerate/Redo button.
* Every user message should have:

  * Copy button.
  * Edit button.
* Editing behavior:

  * If the edited message is the latest user message, continue in the current conversation.
  * If an earlier message is edited, create a new branch/conversation while preserving the original conversation in history.
* The interface should clearly distinguish between the original conversation and branched conversations.

### AI Tools

The AI should be able to use a modular tool system that is easy for developers to expand with additional tools in the future.

#### Website / Mr. Amr Tools

* **Contact Mr. Amr**

  * The AI can provide ways to communicate with Mr. Amr as actual styled buttons/links.
  * Each method should have its appropriate icon.
  * Examples:

    * WhatsApp → WhatsApp icon/button.
    * Facebook → Facebook icon/button.
    * YouTube → YouTube icon/button.
    * Email → Email icon/button.

* **Show YouTube Video**

  * The AI can recommend a relevant YouTube video.
  * The video should be displayed directly inside the chat as an actual embedded `<iframe>` rather than only providing a URL.

* **Show Mr. Amr's Image**

  * The AI can display the actual image/photo of Mr. Amr inside the conversation when relevant.

* **Website Navigation**

  * The AI can direct users to relevant pages or sections of the website.
  * For example:

    * "Where can I find the grammar lessons?"
    * The AI can provide an actual button that takes the user directly there. (Leave this for now)

* **Website Content Search**

  * The AI can search the website's available content and recommend relevant lessons, videos, resources, or information. (Leave this for now, too)

### English Learning Tools

The AI should have interactive tools specifically designed to help students learn English.

* **Grammar Explainer**

  * Explain grammar concepts at different difficulty levels.
  * Provide examples and common mistakes.

* **Grammar Practice**

  * Generate interactive grammar questions.
  * Allow students to answer directly inside the chat.
  * Check their answers and explain mistakes.

* **Vocabulary Builder**

  * Explain words.
  * Provide definitions, examples, synonyms, antonyms, collocations, and related vocabulary.

* **Vocabulary Quiz**

  * Generate interactive vocabulary quizzes based on a requested level or topic.

* **Writing Corrector**

  * Students can submit English writing.
  * The AI identifies mistakes and explains the corrections.
  * Optionally provide a corrected version.

* **Writing Practice**

  * Give students writing prompts.
  * Evaluate their responses according to grammar, vocabulary, clarity, and other appropriate criteria.

* **Translation**

  * Translate between English and Arabic.
  * Explain important differences when useful rather than simply translating word-for-word.

* **Pronunciation**

  * Provide pronunciation guidance.
  * Display IPA when useful.
  * Allow students to hear words or sentences using text-to-speech.

* **Conversation Practice**

  * Simulate realistic English conversations.
  * Examples:

    * Job interview.
    * Restaurant.
    * Travel.
    * School.
    * Daily conversation.
  * The AI can correct mistakes after the conversation or provide feedback during practice.

* **Reading Practice**

  * Generate or provide suitable reading passages.
  * Ask comprehension questions.
  * Explain difficult vocabulary.

* **Listening Practice**

  * Provide listening exercises using available audio/video resources.
  * Ask comprehension questions afterward.

* **English Level Practice**

  * Allow students to select an approximate level such as A1, A2, B1, B2, C1, or C2.
  * Adapt explanations, vocabulary, and exercises accordingly.

* **Exam Practice**

  * Generate exam-style questions.
  * Support multiple-choice, fill-in-the-blank, correction, vocabulary, grammar, reading, and writing exercises.

* **Flashcards**

  * Generate interactive vocabulary flashcards.
  * Allow students to mark words as known/unknown.

* **Word of the Day**

  * Introduce a useful English word with its meaning, pronunciation, examples, and related vocabulary.

### Interactive Chat Components

The AI should not be limited to plain text responses.

Depending on the tool being used, it should be able to render interactive components directly inside the conversation, such as:

* Buttons.
* Links.
* YouTube embeds.
* Images.
* Audio players.
* Multiple-choice questions.
* Fill-in-the-blank exercises.
* Flashcards.
* Vocabulary cards.
* Grammar exercises.
* Progress indicators.
* Mini quizzes.
* Pronunciation cards.
* Lesson/resource cards.

The tool system should be designed so developers can add new tools without having to rewrite the core AI chat system.