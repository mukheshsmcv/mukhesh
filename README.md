# Mukhesh

Build a complete, polished NEET PG 2027 Study Command Center web app. Use a minimal dark interface, responsive for desktop and mobile, with LOCAL-ONLY persistence (localStorage; no Supabase, no cloud database, no authentication). Create one consolidated daily schedule, not multiple separate schedules. Preload the user's existing 205-day schedule from Oct 12, 2026 through May 4, 2027:
- Oct 12–19: OBG days 1/8 through 8/8.
- Oct 20–Nov 1: 13 exam-preparation / exam-day entries.
- First pass Nov 2–Jan 24: 80 subject study days plus four GTs, in this exact sequence: Anatomy 7 days, Physiology 5, Biochemistry 3, GT 1; Pathology 4, Pharmacology 7, Microbiology 6, GT 2; PSM 6, FMT 3, ENT 2, Ophthalmology 4, GT 3; Medicine 8, Surgery 8, Pediatrics 6, Orthopedics 3, Dermatology 2, Psychiatry 2, Radiology 2, Anesthesia 2, GT 4.
- Revision 1 Jan 25–Mar 9: 40 revision days and four separate GT days, approximately every 10 revision days.
- Revision 2 Mar 10–Apr 10: 28 revision days and four separate GT days, approximately every 7 revision days.
- Revision 3 Apr 11–May 4: 20 revision days and four separate GT days, approximately every 5 revision days.
- Total exactly 205 scheduled calendar entries, with 16 GTs total. Include every date, including all 13 exam-preparation dates, in the overall denominator (205).
Each schedule row should have: Date, Subject / Day, Accuracy %, Completed checkbox, Actual Hours, Topic, MCQs Attempted, MCQs Correct, Phase, and whether it counts as a scheduled day. Provide inline editing, search/filter by phase/subject/completion, date ascending sort, and a compact table layout. Add automatic dashboard summary at top: overall progress bar completed / 205 and percentage; completed days count must derive from checkbox state and persist. Add subject-wise progress, phase-wise progress, total MCQs, overall MCQ accuracy (correct/attempted with safe zero handling), total study hours, and grand test tracking for GT 1–GT 16 with completion status and notes/score. Provide a single consolidated daily schedule view; use tabs or small filter controls rather than separate schedules. Data must persist across refreshes via localStorage. Add export/import JSON backup and CSV export so the user can protect their local data. Include reset only behind a clear confirmation. No fabricated user completion data: all rows start incomplete and metrics start at zero. Use robust date handling, accessible controls, no external services needed at runtime. Implement the app, not just a mockup, and verify all 205 rows and calculations.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0f0d9429-0652-440c-ab66-24073c200dd6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
