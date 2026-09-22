## Platform Improvement

## AI Chat
- There are many icons that are messed up or dont' match what I want:
    - Update the ai input send button icon
    - Update / fix the `.ai-sidebar-collapse-hover` icon, it's slightly off.
    - Update / fix the delete icon in the more menu.
    - Take a look on the other icons, too.
- The history items physically move when I hover them, like I hover an item and evey other item under it moves, which is really weird, probably the hover state is playing with the height, it shouldn't play with the height.
- Some download options are missing, like PDF for example, you removed them.
- The stop ai button doesn't work, if I click it the AI doesn't stop.
- The interactive quiz is now more messy and worse than what it already was:
    - Instead of generating the quiz at once with next and back buttons, the AI generates questions one by one under each other.
    - After finishing the generation of the 5 questions under each other, when I answer one of them, it generates more question.
    - And then the score at the end was `0/0`, which doesn't make since, because they weren't 0 questions, and I did answer some questions right.

## `#navbar`'s Height
- The height of the `#navbar` element at the top of the screen is too much, it should be slim.

## Application
Make the website an installable app.

Online First rules (for users that install the app):
- When the user is only, they always and always pull the code from the host, not the offline cached code. We aren't going to use a service worker version, because I always forget to increament it when updating.
- When the user is offline, the cached code gets displayed with a very tiny offline banner at the bottom of the screen, that has a cancel button.
- When the user is online they always update the cached code.
- Users that didn't instal the app never cache anything at all.