# Meal Plan Planner

A shared meal planner backed by Supabase. Household members see the same ingredients, dishes, weekly plan, and shopping checklist. Shopping-list checks and planner changes sync live between open screens.

## Features

- Manage ingredients and reusable dishes, including dish type, serving count, star ratings, and automatically calculated ingredient costs
- Sort dishes alphabetically, by type, by cost, or by historical ranking
- Plan up to seven meals in one compact weekly view, with searchable dish selection and per-meal ingredient exclusions
- Search for individual ingredients in the weekly planner and manage them in their category buckets
- Generate a categorized shopping list with estimated costs
- View spreadsheet history and live weekly meal rankings
- Share one meal plan with authorized household accounts

## Supabase setup and data import

1. Enable Email sign-in in **Authentication → Providers** and add `http://localhost:8001` to **Authentication → URL Configuration**.
2. Make sure both household accounts have signed up and confirmed their email addresses before the import. The import authorizes all currently confirmed Supabase accounts; accounts created later must be added by an administrator.
3. In the Supabase SQL Editor, run [`supabase/supabase-import.sql`](./supabase/supabase-import.sql). It includes the schema/security updates, replaces existing app data for all accounts, and imports the spreadsheet into one shared plan. It runs in a transaction; if validation fails, the changes roll back. Review the script before running it.

The source's unit column was blank, so imported ingredients use the generic `unit` label. Where a name had conflicting prices, the import uses the highest listed price.

The standalone [`supabase/supabase-schema.sql`](./supabase/supabase-schema.sql) defines the shared household schema for a fresh project. The import script includes these definitions, so you do not need to run both scripts for this project.

If your database is already set up, run the updated [`supabase/supabase-schema.sql`](./supabase/supabase-schema.sql) once to add or update the shared individual shopping-items table, per-meal ingredient exclusions, and access policies. This schema update preserves existing meal-plan data.

Create `supabase/supabase-config.js` using [`supabase/supabase-config.example.js`](./supabase/supabase-config.example.js) as a template, then add your Supabase project URL and publishable key. The app loads this configuration in the browser, so it must contain only the publishable key; never put a service-role key in this file.

After the shared schema exists, run [`supabase/supabase-receipt-schema.sql`](./supabase/supabase-receipt-schema.sql) in the Supabase SQL Editor. It creates the receipt item dimension and receipt line-item fact table, with household-member RLS policies. The dimension stores a nullable category on each canonical item; facts reference it by UUID. Re-run this script on an existing receipt database to add `price_per_unit` and backfill values from existing amounts and prices. Supabase initialization and seed SQL are kept in the [`supabase/`](./supabase/) folder.

## Run locally

Run the local app server:

```bash
python scripts/receipt_server.py
```

Then open http://localhost:8001 and sign in. The app reads and writes meal-plan and receipt analytics data to Supabase. The local server only serves the app and listens on loopback.

## Gmail receipt import setup

The [`scripts/gmail_api.py`](./scripts/gmail_api.py) utility connects to the Gmail account `c2015465@gmail.com` using Google's OAuth 2.0 flow and the read-only Gmail scope. It searches Gmail with `subject:receipt` and writes parsed line items to Supabase. It does not modify or delete emails. Receipt import and local server scripts are kept in the [`scripts/`](./scripts/) folder.

1. In the [Google Cloud Console](https://console.cloud.google.com/), create or select a project, enable the Gmail API, and configure the OAuth consent screen for your account.
2. Create an OAuth client ID with application type **Desktop app**. Download its JSON file into the project root and name it `credentials.json`. Do not commit this file.
3. Install the script dependencies from the project root with `python -m pip install -r requirements.txt`.
4. Run an importer command below. Complete the Gmail browser sign-in as `c2015465@gmail.com` and enter your Supabase household account email and password when prompted. The Supabase password is not saved; the script uses the publishable key and existing RLS policies, never a service-role key. The Gmail OAuth token is saved locally in `token.json`, which is excluded from Git.

For initial setup, run [`supabase/supabase-receipt-item-seed.sql`](./supabase/supabase-receipt-item-seed.sql) in the Supabase SQL Editor after installing the receipt schema. It inserts the existing item list with best-guess categories using the meal planner's existing vocabulary (`Fruit`, `Vegetable`, `Protein`, `Dairy`, `Bakery`, `Pantry`, `Frozen`, and `Other`). The seed uses `ON CONFLICT DO NOTHING`, so it is safe to rerun and does not overwrite existing items or user category edits. The importer no longer reads or depends on `receipt_items.csv`; future items are created without a category and flagged for user review in the Categories tab.

Run `python scripts/gmail_api.py` to import regular receipt emails with either `Receipt` or `Kvittering` in the subject, or `python scripts/gmail_api.py --netto-history` to parse `.eml` attachments from emails whose subjects contain **Netto receipts history** or **Anna receipt history**. The parser stores purchase date, item, amount, total price including bottle/can deposits, calculated `price_per_unit`, owner (`A` when the receipt subject contains `Kvittering`, otherwise `C`), transaction ID, `Rabat` discount, and `Netto Plus rabat` discount. Re-imports are idempotent using a stable key per receipt line and refresh the owner value for previously imported lines.

The Analytics view reads receipt facts joined to the item dimension. It defaults to the current year and lets you select another purchase year. Spending is grouped by shopping date; the selected date's table shows each line's total and calculated price per unit. Top items are ranked by total spend. Use the Categories tab for category spend and the All items tab to edit categories. Uncategorized items are explicitly flagged.

To test a clean history import after installing the receipt schema and seeding the dimension, run `python scripts/gmail_api.py --reset-and-netto-history`. The script parses every attachment from both history emails first, refuses to clear facts if any attachment fails parsing, then asks you to type `DELETE ALL RECEIPT FACTS` before deleting only `receipt_item_facts` and reimporting. Item dimensions and their categories, and Gmail messages, are preserved.
