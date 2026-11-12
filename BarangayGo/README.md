# BarangayGo

Online barangay document requests with resident and admin accounts and Purok 1 to 5 selection.

## Run in VS Code
1. File > Open Folder... and choose the `BarangayGo` folder.
2. Install the **Live Server** extension (VS Code will suggest it).
3. Right-click `index.html` > **Open with Live Server**.

You can also just double-click `index.html`.

## Structure
- `index.html` - page shell
- `css/style.css` - all styles (colors are variables at the top)
- `js/app.js` - all app logic (screens, signup/login, requests, admin tools)

## Settings you may want to change (top of `js/app.js`)
- `ADMIN_CODE` - access code needed for admin registration (default `BRGY-ADMIN-2026`)
- `PUROKS` - list of puroks (default 1 to 5)
- `DOCS` - available document types

## Data
Outside claude.ai the app saves accounts and requests in the browser (localStorage), so data stays on that device.
For real use, connect `js/app.js` to a backend (for example Node.js, PHP + MySQL, or Supabase) with real login and role rules.
