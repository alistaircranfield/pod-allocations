# Workforce model: assumptions and starting values

As of 13 Oct 2026, page Version 37. There are two kinds of item here:
- **Built in:** how the model works. These can only be changed in the code.
- **Starting value:** where a slider starts for "Now". Change the slider to test anything else.

Items marked **Check** are not yet confirmed.

## Built in: how the rota works
1. Salford is staffed first. Fairfield gets whoever is left and allowed to work there, and locums fill every remaining minimum shift at either site (no gaps).
2. Weekend nights are Friday to Sunday, worked as one block.
3. A long day can fill a short-day gap.
4. All doctors work the SCO ICU 100% 9-week template. Part-time doctors work the trust's 80, 70, 60 and 50% templates, and every line has part-time versions built the same way.
5. Per 9 people on the template, nights are:

   | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
   |---|---|---|---|---|---|---|
   | 1 | 1 | 2 | 2 | 1 | 1 | 1 |

6. For grades other than SCFs and specialty doctors, spare weekday nights are rostered as standard days. This matches Allocate, which shows about 1.2 airway trainees on both weekday and weekend nights. SCFs' spare weekday nights go to Fairfield, within the on-call limit. **Check:** where trainees' unused weekday nights actually go.
7. Day-to-day spread: the number of trainees on a given night varies around the average. Trainees count only up to the minimum, and SCFs fill the rest. The amount of spread is a tuning value (0.175), set so SCF weekday nights match Allocate, Sep 2025 to Aug 2026:
   - at Salford: 193 in the model, 194 in Allocate
   - at Fairfield: 55 in the model, 55 in Allocate
   - 14.5% of SCF and specialty doctor weekday nights are changed to day shifts at short notice (Allocate: 249 worked against 291 on the template)

   This is a fit to the data, not a known fact.
8. Leave (annual, study, bank holidays, induction) only comes out of weekday standard days. Sickness and other absence can fall on any shift.
9. The monthly teaching day is not taken off the rota. Minimum staffing is met first, and only spare people go to teaching.
10. Deanery numbers are WTE. Part-time changes the head count, not the cover.
11. Who can work where:
    - **Airway:** SCFs, specialty doctors, ICM and anaesthesia trainees, and airway-trained ACCPs. Transfer-trained ACCPs count as airway on Salford short days only.
    - **Fairfield nights and weekends:** signed-off SCFs and specialty doctors only. Trainees never.
    - **Fairfield weekday long days:** also FGH-trained ACCPs, and JCFs and ACCS after their first 3 months.
12. **Teams.** Every SCF and specialty doctor post sits in a Salford team or a Fairfield team.
    - The Fairfield team fills Fairfield first and keeps at least 40% of its on-calls at Salford for competence. Its cost goes to the Fairfield budget.
    - Today every post is in the Salford team.
13. The FGH anaesthetist can cover up to 4 weekday ICU nights a week, at no cost. Today they cover none.
14. Shifts our own staff do on bank are paid as locums, so they don't count as rota cover.
15. Each plan runs 40 simulated years. The page shows the middle one, and the range covers 8 years in 10.

16a. **6-week Fairfield line (option):** the Fairfield team can work a 6-week line with 2 weekends in 6, both on call (a Friday to Sunday night set and a weekend of long days), no weekend short days. Passes the 2016 contract checks at 45.3 hours a week. Pay is taken as the same as the 9-week template.

## Starting values (sliders)
16. **Salford minimums:**
    - nights 5 (2 airway)
    - weekday long days 5 (2 airway) and short days 5 (2 airway)
    - weekend long days 5 (2 airway) and short days 3 (1 airway)
17. **Fairfield:** 1 a night and 1 a long day.
18. **SCFs:**
    - 10 posts, full-time
    - stay 30 months, 4 months to refill
    - 3 months supernumerary, signed off at 6 months, half their weekdays at FGH while signing off
    - supernumerary for the first 3 months: on the rota at Salford, counted as non-airway only
    - 1 on external placement, replaced by someone who works Salford only
    - 100% eventually sign off for FGH
    - at most 40% of on-calls at FGH
19. **Specialty doctors:** none now. Lines at 13 PA and 10 PA keep all the template's on-calls.
20. **Deanery (WTE):**
    - ICM: 2, 7 and 1
    - anaesthesia: 3
    - fill averages 88% (ICM) and 86% (anaesthesia), varying month to month
    - a third part-time at 70%
21. **Non-airway:** JCF 4, ACCS 4 (80% filled), IMT 4, FY2 4, ED, neuro, renal and RCF 2. A third part-time. **Check.**
22. **ACCPs:**
    - 14 in total: 12 transfer-trained, 3 FGH-trained, none airway-trained
    - 10-week, 37-hour line, aiming for about one on every Salford night
    - 20% part-time at 60%

    **Check** all of the ACCP figures.
23. **Annual leave**, plus 8 bank holidays for everyone:
    - SCFs: 27 days (assumed first NHS job)
    - specialty doctors, ICM and anaesthesia (ST3+): 32 days
    - other doctors: 27 days
    - ACCPs: 29 days
24. **Study leave:**
    - deanery: what was actually taken in Allocate (airway trainees 15 days, others 7) against an entitlement of 28
    - SCFs, specialty doctors and JCFs: 10 days
    - ACCPs: 5 days
25. **Other non-clinical days off the rota:**
    - trainees: 0 (teaching is not taken off, see item 9)
    - SCFs: 10 development days
    - specialty doctors: 12 SPA days
26. **Other time off and absence:**
    - induction: 2 days per starter
    - acting up: ICM stage 3 do 2 acting-up nights per 9 weeks
    - sickness 3%, other absence 2%
    - the monthly patterns from Allocate are on, and each can be switched off
27. **Locums:** 86% NHSP bank, 14% agency (from the Fairfield rota: agency took 21% of locum shifts from Sep 2025 to Aug 2026 and 9% since July 2026).
    - Bank: NHSP Greater Manchester ST3 to ST5 rates (from 1 May 2025), £55 an hour on weekdays 07:00 to 19:00 and £70 at other times. Nothing on top (slider, default 0%). **Check**
    - Agency: best guess £85 and £105 an hour, including the agency fee. **Check**
28. **Pay:**
    - trainees: 2016 nodal points plus enhancements
    - SCFs: 2016 contract ST3 point (£67,325) plus enhancements, as in Northern Care Alliance SCF adverts
    - JCFs: 2016 contract ST1 point (£55,355) plus enhancements
    - specialty doctors: £73,383 per 10 PA
    - ACCPs: band 8a plus 20% unsocial. **Check**
    - pension 14.38% and NI 15% above £5,000
29. **Now (October 2026), from Allocate:**
    - 11 SCFs
    - 16 airway trainees (14.6 WTE)
    - JCF 5, IMT 4, FY2 4, other 1
    - 14 ACCPs

    **Check:** Allocate's "ST" group is counted as airway.

## Likely ranges (added 14 October 2026)

Each plan is worked out again with the inputs we are least sure of set low and then high, one at a time:

- Locum rates: 10% lower to 25% higher (bank and agency)
- Agency share: 9% to 21% of locum shifts (now 14%)
- Lumpiness: 10% to 25% (now 17.5%)
- Sickness: 2% to 5% (now 3%)
- Bank on-costs: 0% to 10% on top of NHSP rates (now 0%)
- SCF and specialty doctor weekday nights moved to days: 10% to 20% (now 14.5%)

The swings are added as the square root of the sum of squares, on the basis that they won't all go the same way at once. Differences from Now pair each plan with Now worked out the same way. For Now, the likely cost is £5,409,000 to £5,571,000.

## Extra nights template (15 October 2026)

Everyone is on the same work schedule (parity). On the 9-week template with two extra weekday night sets, the extra night sets are worked as nights by every grade, including trainees. Only the base template's spare weekday nights are moved to days, as before. Pay follows the template.

## Fairfield rota data (21 October 2026)

The Fairfield resident rota spreadsheets, April 2025 to 20 October 2026, were fed in (counts only). Green fill or red text is an NHSP or agency booking; black on white is job planned.
- Every shift was filled: none were left empty.
- Sep 2025 to Aug 2026: NHSP or agency covered 85% of Fairfield nights; job-planned staff 15%.
- Agency took 21% of locum shifts over that year, falling to 9% from July 2026. The model now uses 14% (was 12%). The likely range uses 9% to 21%.

## Bank on-costs (21 October 2026)

NHSP bank shifts now cost the NHSP hourly rate plus:
- holiday pay 12.07% (a switch says if it is already in NHSP's rate; off by default)
- employer NI 15%, apprenticeship levy 0.5% and an NHSP fee of about 1%: 16.5% on top of pay and holiday pay
That is 30.6% on top in all. The likely range runs from no NHSP fee to bank work being pensionable (14.38% more). Agency rates are taken as all-in.
