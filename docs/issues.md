## Platform Improvement

## AI Chat
- The stop AI button doesn't work; if I click it, the AI doesn't stop, it keeps generating the response and consuming credits.
- The interactive quiz is now messy: I myself don't even understand the problem with it so far. In the one test I ran after the latest changes, instead of generating a quiz in one card with next and previous buttons to go through the questions, it generated 3 cards, 2 of which where 1-question each, the 3rd was a quiz on its own and a score to it. But then in another test, it generated the quiz correctly, five questions in one card. If the problem is from the model itself not the tooling, try to make the tooling way simpler for the model.

## Application
Make the website an installable app.

Online First rules (for users that install the app):
- When the user is only, they always and always pull the code from the host, not the offline cached code. We aren't going to use a service worker version, because I always forget to increament it when updating.
- When the user is offline, the cached code gets displayed with a very tiny offline banner at the bottom of the screen, that has a cancel button.
- When the user is online they always update the cached code.
- Users that didn't instal the app never cache anything at all.

## SEO & GEO
Improve the SEO and GEO of the website:
- Sign it in Google Search Console and bing search, too.

## Page For the Teacher
- The teacher (my father) requested a page for himself, where he can view the live count of the visitors of the website. We may try to integrate something like Vercel Insights like this and wire it to the website, or implement something of our own.

Implement an admin Page for me, and add features to it if you can, go all out and impress my father (the teacher).

Use this template for the sign in page: [sign in template](animated-ui-components/sign-in-page-template.html). You can modify the colors as needed.

To give you the full power, I craeted a Database for the website, use `supabase migration new <migration_name>` to create a new migration (or create it manually), and I'll use `supabase db push` when I finish. 

You can configure any new environment variables in `.env.example`, and I'll update `.env.local` and Vercel myself.