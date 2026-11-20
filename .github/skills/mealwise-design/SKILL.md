---
name: mealwise-design
description: Apply Mealwise's recurring design and product practices when changing its interface, analytics, receipt import, or categorization.
---

# Mealwise design and product practices

Use these practices when implementing changes; treat the user's current request as the source of truth when it differs from an earlier design.

## Consistent, minimal interface

- Reuse existing controls, spacing, colors, and interaction patterns across tabs. Match pagination to Item Insights: previous/next arrows and a page indicator. Paginate through all matching results rather than imposing an arbitrary top-item limit.
- Prefer compact icon buttons for familiar actions and toggles. Keep accessible names, keyboard support, visible focus, and descriptive hover titles. Position related controls alongside their filters or section heading.
- Keep search fields consistent with ingredient search; put the meal search directly beneath Meals planned. Avoid redundant headings, subtitles, and explanatory text when the interface already conveys the information.
- Use horizontal spending bars with the amount overlaid, and keep Item Insights and Spending Breakdown visually consistent. Category and supermarket bars should filter Item Insights.

## Mobile and responsive layout

- Keep the mobile navigation and analytics tabs available while scrolling. Place filters below the tabs, fitting two per row where practical. On mobile, show Spending Breakdown before Item Insights.
- Make mobile layouts compact without changing desktop behavior unnecessarily. Keep related titles and controls in the same row when they fit; abbreviate secondary labels rather than wrapping controls. Hide the account name on mobile and put sign-out beside the app title.
- Preserve the existing width of Spending components; enlarge their vertical space on mobile, targeting at least 80% of the viewport height for the Spending panel.
- Use the same minimal receipt dialog on mobile and desktop. Group items by supermarket, show the supermarket and date as the heading, then price and savings, followed by one-line Item, Amount, Price, and Discount rows. Include an accessible red X at the top right. Support multiple supermarkets and unknown supermarket names.

## Analytics and data behavior

- Spending defaults to the current month; calendar dates show shopping activity and use green intensity to reflect spending. Selecting a date opens its receipt dialog and updates the KPIs.
- Insights follows its filter pane, not the month or day selected in Spending. Mappings ignores year and month selections entirely; its purchase counts and spending cover all dates, subject to the other visible filters.
- Round KPIs and chart values to whole currency units, but keep receipt amounts and totals precise. Savings totals include regular and Netto Plus discounts.
- Keep meaningful data available when simplifying a view. Avoid redundant or low-value display elements, such as historical rank labels or separately repeating a date already shown in the calendar.

## Access and automation

- Mealwise is a private, manually provisioned application: do not add a public account-creation flow.
- Regular receipt imports must exclude history emails; history import is a separate operation. Re-imports should avoid duplicate receipt facts, and clearing shopping checks must persist to Supabase, including checks outside the current view.
- Categorization runs in the GitHub workflow using a hosted API, avoiding heavy model downloads in free-tier Actions. Use the existing category vocabulary; instruct the model to leave items uncategorized below its estimated 90% confidence. This self-assessment is not an accuracy guarantee. Preserve existing categories and concurrent manual edits.
- Do not reintroduce local keyword or similar-item category suggestions in Mappings. Leave uncertain items available for manual categorization.

## Validate changes

- Check narrow mobile and desktop layouts, including aligned controls, overflow, pagination, and dialogs. Confirm icon controls still work and expose accessible labels.
- Test affected data behavior, including filter scope, multi-supermarket receipts, persistence, and category updates. Use synthetic data for external API validation; do not send real receipts during tests.
