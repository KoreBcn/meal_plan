# Meal Plan Planner

A shared meal planner backed by Supabase. Household members see the same ingredients, dishes, weekly plan, and shopping checklist. Shopping-list checks and planner changes sync live between open screens.

## Features

- Manage ingredients and reusable dishes
- Plan meals across the week
- Generate a categorized shopping list with estimated costs
- View spreadsheet history and live weekly meal rankings
- Share one meal plan with authorized household accounts

## Supabase setup and data import

1. Enable Email sign-in in **Authentication → Providers** and add `http://localhost:8000` to **Authentication → URL Configuration**.
2. Make sure both household accounts have signed up and confirmed their email addresses before the import. The import authorizes all currently confirmed Supabase accounts; accounts created later must be added by an administrator.
3. In the Supabase SQL Editor, run [`supabase-import.sql`](./supabase-import.sql). It includes the schema/security updates, replaces existing app data for all accounts, and imports the spreadsheet into one shared plan. It runs in a transaction; if validation fails, the changes roll back. Review the script before running it.

The source's unit column was blank, so imported ingredients use the generic `unit` label. Where a name had conflicting prices, the import uses the highest listed price. The analytics page shows both the spreadsheet's `Times` history and the current weekly plan.

The standalone [`supabase-schema.sql`](./supabase-schema.sql) defines the shared household schema for a fresh project. The import script includes these definitions, so you do not need to run both scripts for this project.

The project URL and public publishable key are configured in [`supabase-config.js`](./supabase-config.js). The publishable key is intended for browser use; never put a service-role key in this app.

## Run locally

Serve the files over HTTP (opening `index.html` directly will not work):

```bash
python -m http.server 8000
```

Then open http://localhost:8000 and sign in. The app reads and writes directly to Supabase; it does not use local storage for ongoing data.
