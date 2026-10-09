export const WA = "201205452322";
export const wa = (t = "Hello Mr. Amr, I'd like to schedule a consultation") =>
  `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;

export const nav = [["About", "#about"], ["Services", "#services"], ["Lesson", "#lesson"], ["Contact", "#contact"]];
export const words = ["IELTS", "TOEFL", "Academic Writing", "Conversational English", "Gulf Curricula", "Teacher Training", "Digital Pedagogy", "Egyptian Curriculum"];
export const stats = [[32, "", "Years teaching, since 1995"], [9, "", "Years in Saudi Arabia"], [5, "", "Gulf curricula mastered"], [5, "+", "Years online instruction"]];

export const services = [
  { t: "University Students", s: "IELTS · TOEFL · Academic Excellence", d: "Exam strategy, academic writing and research skills for scholarships, admissions and MA/PhD candidates.", f: ["IELTS & TOEFL preparation", "Academic writing & research papers", "University admission support", "MA/PhD candidate assistance"], cta: "Book IELTS consultation", msg: "Hello Mr. Amr, I'm interested in IELTS/TOEFL preparation" },
  { t: "K-12 Students & Parents", s: "Gulf curricula · Egyptian system", d: "Nine years in Taif plus five online: Saudi, Emirati, Qatari, Kuwaiti and Omani curricula, and every Egyptian stage.", f: ["Five Gulf national curricula", "Egyptian national curriculum", "Primary through secondary", "Conversational fluency"], cta: "Start a trial lesson", msg: "Hello Mr. Amr, I'd like to start a trial lesson for my child", featured: true },
  { t: "Educators & Teachers", s: "Mentorship · Supervision · Training", d: "As a Ministry of Education supervisor and AUC certified trainer, workshops and mentoring for teachers at every level.", f: ["Teacher training & mentorship", "Curriculum development support", "Professional workshops", "Digital pedagogy & interactive tools"], cta: "Discuss training needs", msg: "Hello Mr. Amr, I'm interested in teacher training programs" },
];
export const credentials = [
  ["Education", "B.A., General Educational Diploma, and Certified Trainer, The American University in Cairo."],
  ["Current role", "English Language Supervisor, Ministry of Education, Egypt, mentoring teachers across all school levels."],
  ["International", "9 years in Saudi Arabia (Taif) and 5 years online across Gulf national curricula."],
];
export const timeline = [
  ["1995", "Career launch", "Began teaching English in Egypt."],
  ["2006 – 2015", "Saudi Arabia", "Primary, intermediate and secondary levels in Taif."],
  ["2019", "AUC certification", "Certified Trainer by The American University in Cairo."],
  ["2020 – Now", "Online & supervision", "Gulf curricula online, plus Ministry Supervisor role."],
];
export const contacts = [
  ["WhatsApp", "+20 12 0545 2322", wa()],
  ["Telegram", "@01024394486", "https://t.me/01024394486"],
  ["Phone", "+20 102 439 4486", "tel:+201024394486"],
  ["Email", "amrmohammed4111@gmail.com", "mailto:amrmohammed4111@gmail.com"],
  ["LinkedIn", "Professional profile", "https://www.linkedin.com/in/amr-mohammed-94694435b/"],
];
export const VIDEO = "EaqgiH3RU_4";
