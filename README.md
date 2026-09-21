# StoreIt

A personal inventory workspace for belongings, storage boxes, and 3D printing filament. Built with Django, SQLite, and a responsive vanilla JavaScript interface.

## Run locally

Requires Python 3.12 or newer.

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python storeit_pr/manage.py migrate
python storeit_pr/manage.py seed_demo  # Optional: editable sample inventory
python storeit_pr/manage.py runserver 127.0.0.1:8000
```

Open http://127.0.0.1:8000. The seed command only populates an empty workspace and never overwrites existing records. Omit it to start fresh.

## Features

- Dashboard with inventory count, boxes, spool weight, estimated value, and stock alerts.
- Create, edit, delete, and favorite items, including quantities, unit values in AUD, and low-stock thresholds.
- Organize items into boxes and locations. Moving a box moves the location of its contents. Occupied boxes and locations cannot be deleted.
- Track individual filament spools with brand, material, color, diameter, full/remaining weight, and low-stock thresholds.
- Log print usage with an optional project name. Usage cannot exceed the spool's remaining balance.
- Search names, notes, materials, labels, brands, and storage locations. Filter and sort inventory in grid or list view.
- Print readable item and box labels. Search an ST code to find an item, or enter a BX code in global search and press Enter to open a box. Labels are text-based, not QR codes.
- Export the full inventory to CSV with spreadsheet formula protection.
- Activity history, accessible native dialogs, keyboard search (Cmd/Ctrl K), and mobile layouts.

## Data and scope

This is a **single-workspace, local application**. Records persist in `storeit_pr/storeit.sqlite3`, not in browser storage. Stop the server before copying this database for backup. CSV export is useful for portability but does not capture the entire database. The original empty `db.sqlite3` placeholder is unused.

The application does not yet implement workspace authentication, multi-user authorization, cloud synchronization, QR/barcode scanning, photo uploads, or import. Keep the server bound to `127.0.0.1`; it is not configured for public deployment. Django's optional admin login does not protect the inventory API. Before hosting publicly, add authentication and workspace access controls, configure production settings, and use a production application server.

Illustrations are local SVGs representing item types, not product photographs. Fonts load from Google Fonts when available and fall back to system sans-serif offline. No JavaScript build step or CDN dependencies are required.

## Development

```sh
python storeit_pr/manage.py test storeit_app
python storeit_pr/manage.py check
node --check storeit_pr/storeit_app/static/storeit_app/app.js
```

Environment options: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG` (defaults to `1` locally), and comma-separated `DJANGO_ALLOWED_HOSTS` (localhost by default). Existing `User` and `UserGroups` model placeholders are preserved; they are not used for authentication.
