# Badge PDF assets (required for full badge design)

The badge generator (`utils/badgeGenerator.js` + `utils/badgeConfig.js`) expects these files **in the deployed image** (e.g. Koyeb). If they are missing, PDFs still generate but **logos/background are skipped** (see server logs for `[badgeGenerator] Missing asset`).

## Layout

- `bg/demo_bg.jpg` — background watermark
- `logos/railtrans_logo_2026.png`
- `logos/bharat_mandapam.png`
- `logos/Urban_Infra_Group_Logo-HD.png`
- `logos/rail_chamber.png`
- `logos/Indian_Railway_Logo_2.png`

Copy your production PNG/JPG files into these paths, commit, and redeploy.
