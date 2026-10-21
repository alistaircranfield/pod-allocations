# Review the FGH and SRH rota model: find issues, mock up fixes, change nothing

You are reviewing a working, published web tool. **Do not edit, rebuild, commit, push or publish anything.** Your job is to find problems and propose improvements, with mock-ups the owner can pick from. Write everything you produce into a new folder called `review/` (see Deliverables).

## What the tool is

A single-page model of the critical care resident rota at Salford Royal (SRH) and Fairfield General (FGH), Northern Care Alliance. For any staffing plan it works out a typical year:
- how many of the minimum shifts our own doctors cover at each site
- how many go to locums
- what staff plus locums cost

The owner is a consultant who uses it to argue for or against workforce changes to finance and managers.

- **Live page (public, no login):** https://alistaircranfield.github.io/pod-allocations/rota-model/ (built file at `rota-model/index.html` in the public repo `alistaircranfield/pod-allocations`)
- **Source package:** `rota-model-source.zip`, which should be attached to this session or in the working folder. It contains:
  - `src/page.html`: the page, with placeholders for the CSS, icons and engine
  - `engine/engine.js`: rota lines and contract checks
  - `engine/engine3.js`: the model
  - `build.py`: builds `dist/rota-model.html`
  - `check/now.js`: prints Now's headline numbers
  - `ASSUMPTIONS.md`: every assumption and data source
  - `dist/rota-model.html`: the built page
- **Explainer for finance:** `How the rota model works.pdf` (2 pages), if attached.

If the zip isn't available, review the built live page, and say so in the report.

## How the model works (check that the code really does this)

1. **Posts become paid WTE:** posts × share of time filled × part-time. SCF posts take 4 months to refill. Deanery trainees fill about 86 to 88% of funded posts.
2. **Shifts per person:** count each shift type on the 9-week template ÷ 9. Leave (27 days for SCFs; annual, bank holiday and study leave) comes only from weekday standard days. Sickness 3% and other absence 2% come from every shift.
3. **Annualising:** weekly × 52 ÷ 12 per month, scaled by each month's leave and absence pattern from Allocate. The 12 months are summed.
4. **Minimum shifts:**
   - Fairfield: 1 long day and 1 night every day.
   - Salford: 2 airway doctors every night, plus set day numbers.
5. **Fill order:**
   - Salford is filled first by trainees, ACCPs and others.
   - SCFs fill what is left at Salford, then go to Fairfield, up to 40% of their on-calls. At least 50% of each SCF's work must be at Salford.
   - Deanery trainees don't work Fairfield out of hours.
   - New SCFs are supernumerary at Salford for 3 months and count as non-airway there.
   - Placement replacements work Salford only.
6. **Lumpiness:** a 17.5% allowance for nights where trainee numbers don't line up.
7. **Gaps:** every remaining gap is a locum shift. Nothing is left empty.
8. **Pay (2016 contract, 2026/27 scales):**
   - basic pay, plus hours over 40 at the basic rate
   - 37% supplement on night hours (11.5 h a night)
   - weekend allowance, from the 1 in 3 band and up
   - SCFs on the ST3 point (£67,325); JCFs on ST1
   - specialty doctors by PAs; ACCPs band 8a plus 20% (an estimate)
   - on-costs: 14.38% pension, plus 15% NI above £5,000
9. **Locums:**
   - NHSP £55 on weekdays 07:00 to 19:00, £70 at other times
   - agency £85 and £105 (estimated), at 14% of locum shifts
   - bank on-costs default to 0
10. **Typical year:** 40 random years (vacancies, deanery numbers, sickness). The headline is the median; the range is the 10th to 90th percentile.
11. **Likely range:** each uncertain input is moved low and high, and the swings are combined as the square root of the sum of squares.
12. **Two settings:**
    - Theoretical (the default): the template as written.
    - In practice: hours spread as worked in Allocate.
    - The Fairfield rota data (job planned 12% of nights and weekend long days, 407 locum shifts a year) supports Theoretical. The model gives 16% and 423.
13. **Parity rule:** every grade must be on the same work schedule. The extra nights template's extra weekday night sets are worked, not swapped to days.

**Expected Now (Theoretical):** £5,463,663 a year:
- wages £3,952,672
- pension and NI £1,124,795
- locums £391,831
- 423 locum shifts
- Fairfield nights and weekends 16.2% by our staff
- Salford 99.5%

One full-time SCF costs £116,429 and saves £50,442 in locums.

## What to do

1. **Run it.** Build to a temp folder, or open the built file, in headless Chromium:
   - at 1440 × 900 and at 390 × 844 (phone, with the bottom tab bar)
   - every plan, every input page, every sheet (cost breakdown, How sure, Salford spare days, One more post, Compare plans, Show the workings) and the guide, all 15 steps
   - screenshot everything
   - run `node check/now.js` and confirm the figures above
2. **Errors and discrepancies:**
   - numbers that disagree between the cards, sheets, plan cards, Compare plans, the workings, the guide text, `ASSUMPTIONS.md` and the PDF
   - code that doesn't do what the list above says
   - stale wording (for example old agency or Allocate figures)
   - rounding inconsistencies, broken i-icons, console errors
   - anything that would embarrass the owner in front of finance
3. **Visual inconsistencies:** spacing, type sizes, card styles, icon weights, colour use, alignment, pills, the dark plan column against the light rest, phone layout.
4. **Workflow:** how many taps to:
   - compare two plans
   - change a staff number and see the effect
   - understand a cost
   - save a plan
   Find dead ends, hidden features and duplicated controls.
5. **Fewer visual features, same function:** what can be merged, hidden behind one tap, or removed without losing any information or ability.
6. **Work schedule selection:** today each grade picks its own work schedule in its own page. Everyone should normally be on the same schedule (the parity rule), with an optional toggle to put SCFs on a slightly different one (for example the 6-week Fairfield line). Propose one clear control for this, and say where it should live.
7. **Four reviewers.** Assess the tool as each of these:
   - **NCA finance manager:** can I trust and reconcile these numbers? What's missing, double counted or unclear (on-costs, agency, gross against net, the annualising, the ranges)?
   - **Apple product developer:** hierarchy, clarity, touch targets, consistency, motion, phone experience, what to cut.
   - **Media representative** (trust communications, or a journalist who gets the link): what could be misread or quoted out of context? Is any personal data, name or sensitive figure exposed? Is the wording neutral and plain?
   - **Rota master** (the person who writes the rota in Allocate): are the rota rules, templates, leave, swaps and fill order realistic? What would they change? Is the work schedule picker usable?

## House style for mock-ups

- Light design: background #f5f5f7, white cards, 16px corner radius, ink #1d1d1f, secondary text #6e6e73.
- SF system font stack. Section labels in 11px letter-spaced capitals. Thin stroke icons (1.7 stroke, rounded caps).
- Salford is blue (#2563a8) and Fairfield is green (#138d74). Locums are pale grey.
- Plans column dark (#161a22). Inputs and results light.
- British English, written the way the owner would say it aloud, not clipped labels.
- No dashes in titles; use a colon or comma. Full numbers (7,820, never 7.8K). £ with commas.
- Give 2 or 3 labelled options (A, B, C) for each suggestion, so the owner can pick. Don't decide for him.
- Show each mock-up on a miniature of the real page, using real figures from the model, not placeholder text.

## Deliverables (all inside `review/`)

1. `review/report.md`, kept short and scannable:
   - a top 10, ranked by impact
   - then sections: errors and discrepancies, visual, workflow, minimisation, work schedule control, the four reviewers
   - each finding gives: where it is (file and line, or screen), what's wrong, why it matters, the suggested fix, and the effort (small, medium or large)
   - mark anything you're not sure of as "to check"
2. `review/mockups/*.html` and matching `.png` screenshots, one file per suggestion, with options side by side.
3. `review/screens/`: the screenshots you took of the current page.

Do not modify any existing file. When you finish, list the top 10 in your final message.
