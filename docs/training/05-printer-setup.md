# Receipt Printer Setup — Xprinter XP-58IID

This is a one-time setup per till computer, not something cashiers need to do daily. Do this before go-live at each branch.

## What this printer is

The Xprinter XP-58IID is a 58mm thermal receipt printer with Bluetooth and USB connectivity. The system's receipt screen is already formatted to fit its 58mm paper.

## How printing works in this system

The **Print Receipt** button opens your browser/operating system's normal print dialog — the same one you'd see printing any document. It does **not** talk to the printer directly over Bluetooth from inside the web page. This means: once the printer is installed as a system printer (steps below), printing "just works" through the browser like any other printer — no extra software per sale, no special app.

*(Why not a direct one-tap connection? Cheap Bluetooth thermal printers like this one typically use "classic" Bluetooth (the kind used for pairing a phone to a car stereo), which web browsers cannot talk to directly for security reasons — only newer "Bluetooth Low Energy" devices support that, and this printer isn't one. Going through the printer driver, like this guide does, is the standard, reliable way to handle it.)*

## One-time setup (per till computer)

### 1. Install the printer driver
Download the Xprinter driver/utility for your operating system (Windows, Mac, or Linux) from the manufacturer or the retailer you purchased from. Install it before connecting the printer.

### 2. Connect the printer

**Option A — USB (simplest, recommended for a fixed till):**
1. Plug the printer into a USB port on the till computer.
2. Turn the printer on.
3. Your OS should detect it automatically once the driver is installed.

**Option B — Bluetooth (for a till that needs to move around):**
1. Turn the printer on and put it into pairing mode (check the printer's manual — usually a button combination or automatic on power-up).
2. On the till computer, open Bluetooth settings and pair with the printer (it should show up as "XP-58IID" or similar).
3. Once paired, it should appear as an available printer, the same as a USB one.

### 3. Confirm it shows up as a system printer
- **Windows:** Settings → Bluetooth & devices → Printers & scanners — the Xprinter should be listed.
- **Mac:** System Settings → Printers & Scanners — the Xprinter should be listed.

If it's not listed, the driver install or pairing didn't complete — retry before moving on.

### 4. Do a test print from the system
1. Open the app and go to any past sale's receipt (**POS → Sales History → View Receipt** on any entry, or complete a small test sale).
2. Click **Print Receipt**.
3. In the print dialog that opens, choose the Xprinter as the destination.
4. Print, and check the output — it should be a narrow receipt, not a full sheet of paper cut short.

**If it prints on the wrong paper size or looks cut off:** in the print dialog, check for a paper size / more settings option and make sure margins are set to "None" and the paper size matches 58mm if your OS's print dialog offers a custom size option. Most thermal printer drivers set this automatically once selected as the destination, but it's worth checking the first time.

## Known limitation

This setup requires a print dialog click for every receipt — there's no fully silent, one-tap printing in this version. Building that would require either a small companion program running on the till computer or a different (non-Bluetooth-classic) printer model — worth discussing as a future enhancement if the extra click becomes a real workflow problem, but it isn't required for go-live.
