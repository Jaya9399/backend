// badgeConfig.js — RailTrans Expo 2026
"use strict";

const path = require("path");

// File lives at:  BACKEND/utils/badgeConfig.js
// Assets live at: BACKEND/assets/bg/   and   BACKEND/assets/logos/
const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ─── Page  400 × 628 pt ──────────────────────────────────────────────────────
const PAGE = { width: 400, height: 628 };

// ─── Layout map (all Y values) ───────────────────────────────────────────────
//
//   0  ┌──────────────────────┐
//      │ TOP_STRIP   (h=10)   │  thin colour bar = ribbon colour
//  10  ├──────────────────────┤
//      │ HEADER      (h=108)  │  cream bg, RailTrans logo + Mandapam logo
// 118  ├──────────────────────┤
//      │ TAGLINE     (h=28)   │  light-grey bar, outline pill text
// 146  ├──────────────────────┤
//      │                      │
//      │ BODY                 │  bg.jpeg (washed out) + QR card
//      │   QR card   y=158    │
//      │   name/co   y=408    │
//      │   logos     y=458    │
// 546  ├──────────────────────┤
//      │ RIBBON      (h=82)   │  bold colour block, entity label
// 628  └──────────────────────┘

// ─── Top strip ───────────────────────────────────────────────────────────────
const TOP_STRIP = { y: 0, height: 10 };

// ─── Header ──────────────────────────────────────────────────────────────────
const HEADER = {
  y:       10,
  height:  108,
  bgColor: "#F5EFD6",   // warm cream matching reference
};

// RailTrans branding logo — the PNG already contains
// "6th · 2026 · RailTrans · RAIL & TRANSIT EXPO · 03 04 JULY 2026 · BHARAT MANDAPAM"
// Width 230 keeps it in the left ~57% of the page width (400px).
const LOGO_RAILTRANS = {
  path:  path.join(ASSETS_LOGO, "railtrans_logo_2026.png"),
  x:     8,
  y:     14,
  width: 230,
};

// Bharat Mandapam logo — top-right corner
const MANDAPAM = {
  path:  path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x:     PAGE.width - 82,
  y:     16,
  width: 72,
};

// Standalone date/month/venue elements — DISABLED because the RailTrans logo
// PNG already includes all of this. Set enabled:true only if you switch to a
// simplified logo that does not contain date info.
const DATE_BOX_03 = { enabled: false, x: 248, y: 22, w: 34, h: 34, text: "03", bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 20 };
const DATE_BOX_04 = { enabled: false, x: 287, y: 22, w: 34, h: 34, text: "04", bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 20 };
const MONTH_YEAR  = { enabled: false, x: 250, y: 62, text: "JULY 2026",                         fontSize: 12, font: "Helvetica-Bold", color: "#000000" };
const VENUE       = { enabled: false, x: 250, y: 78, text: "BHARAT MANDAPAM, NEW DELHI, INDIA", fontSize: 6,  font: "Helvetica",      color: "#555555" };

// ─── Tagline bar ─────────────────────────────────────────────────────────────
const TAGLINE = {
  y:               118,
  height:          28,
  bgColor:         "#EFEFEF",
  text:            "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  pillBgColor:     "#FFFFFF",   // white fill (keeps text readable)
  pillBorderColor: "#999999",   // outline-only pill matching reference
  pillBorderWidth: 0.7,
  textColor:       "#222222",
  fontSize:        6.5,
};

// ─── Body zone ───────────────────────────────────────────────────────────────
// bg.jpeg spans the entire body zone (BODY.startY → RIBBON.y).
// Because PDFKit has no native image opacity, we draw a near-white rectangle
// on top of the image to wash it out (overlayOpacity controls darkness).
//   overlayOpacity 0   = invisible overlay → full-strength image
//   overlayOpacity 210 = heavy white wash  → ~18% image visibility (reference look)
const BODY = {
  startY:         146,
  endY:           546,         // = RIBBON.y
  bgColor:        "#D8EEF8",   // solid fallback when bg.jpeg is missing
  bgImage:        path.join(ASSETS_BG, "bg.jpeg"),
  overlayOpacity: 210,         // 0–255; 210 ≈ very faint, matching reference
};

// ─── QR Card ─────────────────────────────────────────────────────────────────
// Reference: card is ~52% of page width, square-ish, well padded.
const QR_CARD = {
  width:       210,
  height:      240,
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           158,
  radius:      10,
  bgColor:     "#FFFFFF",
  borderColor: "#CCCCCC",
  borderWidth: 0.8,
};

// QR image inside the card — centred with ~20 pt padding each side
const QR = { size: 170 };

// ─── Name & Company ──────────────────────────────────────────────────────────
// Rendered below QR card, overlaid on the body background
const TEXT_AREA = {
  nameY:           408,   // QR_CARD.y + QR_CARD.height + 10 = 158+240+10
  companyY:        428,
  nameFontSize:    15,
  companyFontSize: 9,
};

// ─── Footer logos zone ───────────────────────────────────────────────────────
// Logos sit directly on the body background image — no separate white block.
const FOOTER = {
  y:                455,
  height:           91,   // 546 - 455
  useSeparateBlock: false,
};

// "ORGANISED BY" — blue pill label + Urban Infra Group logo beneath it
const ORGANISED_BY = {
  label:          "ORGANISED BY",
  labelX:         12,
  labelY:         458,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  logoPath:       path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX:          12,
  logoY:          474,
  logoWidth:      90,
};

// "IN ASSOCIATION WITH" — blue pill label + two logos beneath it
const ASSOCIATION = {
  label:          "IN ASSOCIATION WITH",
  labelX:         215,
  labelY:         458,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",

  logo1Path:  path.join(ASSETS_LOGO, "rail_chamber.png"),
  logo1X:     215,
  logo1Y:     474,
  logo1Width: 62,

  logo2Path:  path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X:     285,
  logo2Y:     472,
  logo2Width: 38,
};

// ─── Ribbon ──────────────────────────────────────────────────────────────────
const RIBBON = {
  y:        546,
  height:   82,   // 628 - 546
  textSize: 36,
  textColor: "#FFFFFF",
  font:     "Helvetica-Bold",
};

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = {
  PAGE, TOP_STRIP,
  HEADER, LOGO_RAILTRANS, MANDAPAM,
  DATE_BOX_03, DATE_BOX_04, MONTH_YEAR, VENUE,
  TAGLINE, BODY, QR_CARD, QR, TEXT_AREA,
  FOOTER, ORGANISED_BY, ASSOCIATION,
  RIBBON,
  ASSETS_BG, ASSETS_LOGO,
};