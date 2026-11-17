# Marvellously Helped by God — website

React (Vite) + Supabase. The design is the original HTML's, unchanged; everything behind it now works.

## Updating a site that is already live (team roles, printing, countdown)

1. Copy the files from the update into your project folder, replacing the old ones.
2. Supabase → SQL Editor: run `supabase/update.sql`. The result should show marvellouslyhelpedbygod@gmail.com as `super_admin`.
3. Vercel → Settings → Environment Variables: add `SUPABASE_SERVICE_ROLE_KEY` (see "Deploy to Vercel").
4. In VS Code: Source Control → Commit → Sync Changes. Vercel redeploys by itself.
5. Sign out of the admin and back in. Set the start time in Admin → Conference.

## What's in it

**Public site:** Home, About, Conference (with registration), Gallery (masonry + lightbox), Testimonies, Share your testimony, Publications, Contact (form + WhatsApp).

**Admin dashboard** (`/admin`):

| Tab | What it does |
|---|---|
| Registrations | Every registration appears **live** as people sign up. Counts for registered, checked in, not yet arrived, tags printed, walk-ins. Search, filter, manual check-in, print tag, export CSV. |
| Check-in | For the registration stand on the day. Scan QR codes with the phone/laptop camera, type voucher codes, or search by name/phone for people without a code. Says clearly if someone is checked in, already checked in, or not found. Walk-in form registers + checks in in one step. Each device chooses whether it prints (see Printing). |
| Tags | Design the sticky slip: label size, what shows (name, category, church, code, QR), heading, colour, optional uploaded background artwork. Live preview and test print. |
| Conference | Title, theme, date, start and end time (drives the home page countdown), venue, description, capacity, open/close registration, check-in method (QR / voucher / both), attendee categories. "Create the next programme" archives the current one. |
| Testimonies | Approve, reject/unpublish, delete. Nothing shows publicly until approved. |
| Gallery | Upload many photos at once (auto-resized for mobile data), add Instagram post/reel links that embed live, captions, delete. |
| Publications | Add/edit with a date, summary, and a link or file. Show/hide. |
| Messages | Contact form inbox, with prayer requests marked; reply by email or WhatsApp. |
| Team | Super admin only. Add people with a role, create their login and password, change roles, reset passwords, remove access or delete accounts. |
| Site settings | WhatsApp number, email, phone, address, social links, hero photo, lead facilitator photo and bio. |

### How the event-day flow works

1. People register on `/conference` and get a QR code + voucher code (e.g. `MH-7K2QPA`). They can download it or send it to their WhatsApp. If they lose it, "Find my code" on the same page recovers it with their phone + name.
2. Registering twice with the same name and phone returns the same code (no duplicates).
3. On the day, staff open **Admin → Check-in** on a phone or laptop, scan or type the code. The person is marked present.
4. Their slip prints on whichever device is set up to print (see Printing); staff paste it onto a pre-made blank tag. Nothing is printed for no-shows.
5. People who didn't register use the walk-in form.

## Setup (about 15 minutes)

### 1. Supabase
1. Create a project at supabase.com.
2. **SQL Editor → New query**, paste all of `supabase/schema.sql`, click **Run**. (Safe to run again later.)
3. New query again: paste all of `supabase/seed.sql`, click **Run**. This loads the real content — the 2027 *Back to Eden* conference, the 17 testimonies from the feedback form, the 19 event photos and 2 Instagram posts, and the contact details. Safe to run more than once; it skips anything already there.
4. **Authentication → Users → Add user**: create the owner login, **marvellouslyhelpedbygod@gmail.com** (email + password, tick "Auto confirm").
5. New query: paste all of `supabase/update.sql`, click **Run**. It adds team roles, shared printing and the countdown fields, and makes that account the **super admin**. The result at the bottom should list it as `super_admin`. (If you ran it before creating the login, just run it again.)
6. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up", so only accounts the super admin creates can sign in.

Everyone else is added from **Admin → Team** on the live site, not in Supabase.

| Role | Can do |
|---|---|
| Super admin | Everything, plus the **Team** tab: add people, create their logins, change roles, reset passwords, remove or delete them |
| Admin | Everything except the Team tab |
| Check-in volunteer | Only the **Check-in** screen: scan, voucher codes, search, walk-ins, printing |

There must always be at least one super admin; the system won't let the last one be removed or demoted.

### 2. Run locally
```bash
npm install
cp .env.example .env    # then paste your Project URL and anon key from Project Settings → API
npm run dev
```
On Windows PowerShell use `copy .env.example .env`.

### 3. Images
The event photos, the hero photo and Modupe Bakare's photo are already in `public/images` (taken from the original HTML and compressed from about 1.9 MB of embedded data to small files). To change the hero or founder photo later, upload a new one in **Admin → Site settings**.

### Still to fill in
- **Conference start time** — Admin → Conference → Starts at (the original had a placeholder; this also sets the countdown).
- **Location** on the Contact page — Admin → Site settings → Location (also a placeholder in the original).

### 4. Deploy to Vercel
1. Import the repo in Vercel and add the two `VITE_SUPABASE_…` environment variables.
2. Add a third one for the Team tab: `SUPABASE_SERVICE_ROLE_KEY`, from Supabase → Project Settings → API Keys (the **service_role** or **secret** key). Do **not** give it a `VITE_` prefix and never put it in `src/`: it stays on the server, where `api/staff.js` uses it to create and delete logins.
3. Deploy (or **Redeploy** if the site was already live). `vercel.json` handles page refreshes on deep links. Then add your domain.

On localhost there is no server function, so creating logins and resetting passwords only work on the live site. Changing roles and removing access work everywhere.

## Countdown on the home page

The home page counts down to the active programme's **date and start time** (Admin → Conference → Date, Starts at). Times are Nigeria time, and visitors abroad see the correct time left.

- Create the next programme (Admin → Conference → **Create the next programme**) and the countdown switches to it straight away.
- During the programme it shows "Happening now"; after it ends, the countdown disappears until the next programme is created.
- With no start time set, it counts down to the start of that day.

## Printing tags

Each phone or laptop picks its own printing setting on the **Check-in** screen, under **Printing on this device**:

| Setting | Use it on |
|---|---|
| Don't print on this device | Phones used only for scanning |
| Print here when I check someone in | Any phone or laptop that can print to a printer itself |
| Print station | The laptop next to the printer: it prints the slip for everyone checked in on **any** device |

Each person's slip prints exactly once, even if several devices are set to print. "Print tag here" / "Reprint here" always prints on the device you tap it on.

**Can a phone print?** Yes, if the printer is on the same Wi-Fi and supports phone printing (AirPrint for iPhone, Mopria for Android). A printer plugged into a laptop by USB can only print from that laptop. Easiest setup: a Wi-Fi label printer such as the Brother QL-820NWB or QL-810W (AirPrint and Mopria), so any device on the venue Wi-Fi or hotspot can print.

**Print dialog:** browsers ask before every print. On the print-station laptop you can skip the dialog with Chrome's kiosk printing: make a copy of the Chrome shortcut, open Properties, add ` --kiosk-printing` to the end of **Target**, close all Chrome windows, then open Chrome from that shortcut. Set the label printer as the default printer first.

**Print settings:** choose the label printer, margins **None**, scale **100%**, paper size matching the label. Do a **Test print** from the Tags tab before the event.

**Recommended stand setup:** one laptop as the Print station next to the printer, and volunteers' phones on "Don't print" doing the scanning.

## Before the event
- Test the full flow with 2–3 fake registrations, then delete them.
- Camera scanning needs HTTPS (fine on Vercel) and camera permission.
- Have a mobile hotspot as backup internet at the venue.

## Project layout
```
supabase/schema.sql      database, security rules, storage, functions
supabase/seed.sql        the real MHBG content (conference, testimonies, gallery, contacts)
supabase/update.sql      team roles, super admin, shared printing, countdown fields
api/staff.js             server function for creating/deleting logins (Vercel)
public/images/           hero, founder and event photos
src/pages/               public pages
src/pages/admin/         admin tabs
src/lib/tags.js          tag slip layout + printing
src/components/Countdown.jsx   home page countdown
src/styles.css           the original design + styles for new features
```
