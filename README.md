# MusicalNotes

A math practice site. Students answer questions and earn in-game notes; teachers can see
every answer their students submit, not just a score.

Vanilla HTML/CSS/JS on the frontend, Supabase for auth and data. No build step, no framework.

## Files

- `index.html` – all the views (landing, auth, dashboard, practice, teacher)
- `styles.css` – everything visual
- `supabase.js` – client setup, API calls, the two config constants at the top
- `app.js` – routing, auth, dashboard
- `practice.js` – question flow and answer submission
- `teacher.js` – class roster and answer feed
- `musicalnotes.sql` – schema, RLS policies, RPC functions, seed data

## Setup

1. Open the SQL Editor in the Supabase dashboard, paste the whole of `musicalnotes.sql`,
   and run it. This has to happen before you touch the site — it creates the tables, the
   new-user trigger, and 25 seed questions.
2. Under Authentication → Providers → Email, turn off "Confirm email" while you're testing.
   Otherwise signup creates a user with no session and you get bounced back to the auth
   screen. Turn it back on before letting anyone real use it.
3. `supabase.js` already has the project URL and anon key in it. If you swap projects,
   change the two constants at the top.
4. Serve the folder however you like. `python3 -m http.server 8000` works, so does Live Server
   in VS Code. Just don't open `index.html` from the filesystem — the ES module imports
   won't load over `file://`.

## How the reward logic works

All of it lives in Postgres, in the `submit_answer` RPC, rather than in the browser. That
way a student can't pop open devtools and hand themselves notes.

- Correct answer: notes awarded, chord counter goes up, multiplier climbs at 3, 5, and 7.
- Wrong answer: chord resets to zero, multiplier back to 1. Nothing else is penalized.
- The rhythm (streak) is calculated against `last_practice_date`, so it advances once per
  calendar day regardless of how many questions you answer.

Answer checking is a straight equality against `questions.correct_answer`. For numeric
questions that's a float comparison, which is fine for the seeded integer answers but will
bite you the moment you add something like `1/3`. You'll want a tolerance there.

## Testing the teacher side

Sign up, create a class from the dashboard, note the six-character code. Open an incognito
window, sign up a second account, join with that code, answer a few questions. Refresh the
teacher dashboard in the first window and the answers show up.

Creating a class flips your profile role to `teacher`, which reveals the dashboard button.
There's no way to flip it back in the UI yet.

## Things that aren't done

- No spaced repetition. `get_next_question` just skips questions you've already gotten right
  and picks randomly from the rest.
- No leaderboards, avatars, or cosmetics shop, despite the schema having room for it.
- Attempts are never pruned. At small scale that's fine; the free tier is 500 MB, and
  text-only answer rows are tiny. When it does matter, delete rows older than ~180 days.
- `get_class_recent_attempts` caps at whatever limit the client passes. No pagination.
- Math rendering relies on KaTeX auto-render and only handles `$...$` and `$$...$$`.
- The anon key in `supabase.js` is public by design — RLS is what protects the data, and
  every table has policies. Don't ever put the service_role key in a frontend file.

## If something breaks

`relation "profiles" does not exist` means the SQL didn't run. `new row violates row-level
security` on signup usually means the `handle_new_user` trigger didn't get created, so
re-run just that block. A blank dashboard after a successful signup is almost always the
email confirmation setting.
