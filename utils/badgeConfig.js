// badgeConfig.js — RailTrans Expo 2026
"use strict";

const path = require("path");

// utils/ is one level inside BACKEND/
// BACKEND/utils/badgeConfig.js  →  __dirname = BACKEND/utils
// BACKEND/assets/bg             →  ../assets/bg
// BACKEND/assets/logos          →  ../assets/logos
const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ─── Page ────────────────────────────────────────────────────────────────────
const PAGE = { width: 400, height: 628 };

// ─── Top colour strip (thin, matches ribbon colour) ──────────────────────────
const TOP_STRIP = { y: 0, height: 14 };

// ─── Header  (cream/beige background, full RailTrans branding logo) ───────────
// The header uses a single pre-composed logo image (railtrans_logo_2026.png)
// that already contains "6th · 2026 · RailTrans · RAIL & TRANSIT EXPO".
// Dates, month/year and venue are part of that image, so we don't draw them
// separately. If you have separate assets keep MONTH_YEAR / VENUE / DATE boxes
// below and set enabled:true.
const HEADER = {
  y: 14,
  height: 118,          // slightly taller to fit the rich logo
  bgColor: "#F5EFD6",   // cream/beige — matches target design
};

// Full RailTrans branding logo (contains "6th 2026 | 03 04 JULY 2026 | BHARAT MANDAPAM …")
const LOGO_RAILTRANS = {
  path: path.join(ASSETS_LOGO, "railtrans_logo_2026.png"),
  x: 8,
  y: 18,
  width: 260,           // wider — let it dominate the left half
};

// Bharat Mandapam / venue logo (top-right corner)
const MANDAPAM = {
  path: path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x: PAGE.width - 88,
  y: 22,
  width: 78,
};

// Date boxes — only used when the logo image does NOT include the dates.
// Set enabled: false if the logo already contains them.
const DATE_BOX_03 = {
  enabled: false,
  x: 210, y: 30, w: 38, h: 38,
  text: "03",
  bgColor: "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize: 22,
};

const DATE_BOX_04 = {
  enabled: false,
  x: 254, y: 30, w: 38, h: 38,
  text: "04",
  bgColor: "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize: 22,
};

const MONTH_YEAR = {
  enabled: false,
  x: 215, y: 76,
  text: "JULY 2026",
  fontSize: 13,
  font: "Helvetica-Bold",
  color: "#000000",
};

const VENUE = {
  enabled: false,
  x: 215, y: 94,
  text: "BHARAT MANDAPAM, NEW DELHI, INDIA",
  fontSize: 6.5,
  font: "Helvetica",
  color: "#555555",
};

// ─── Tagline bar (sits just below header) ────────────────────────────────────
// Target design: light-grey bar, text inside a thin outlined pill (not filled).
const TAGLINE = {
  y: 132,               // immediately below header
  height: 30,
  bgColor: "#F0F0F0",   // light grey strip
  text: "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  // Pill style — outline only (no fill), dark grey border
  pillBgColor: "transparent",
  pillBorderColor: "#888888",
  pillBorderWidth: 0.8,
  pillColor: "transparent",   // kept for backward compat — not used
  textColor: "#333333",
  fontSize: 6.5,
};

// ─── Body  (railway-track background image fills this entire zone) ────────────
// The background image should cover from BODY.startY all the way to the bottom
// of the footer zone (RIBBON.y), so the logos appear to "sit on the tracks".
const BODY = {
  startY: 162,          // just below tagline bar
  bgColor: "#D6EAF8",   // fallback if image missing
  bgImage: path.join(ASSETS_BG, "bg.jpeg"),
};

// ─── QR Card ─────────────────────────────────────────────────────────────────
// In the target design the card is tall, centred, and sits in the upper portion
// of the body. The railway image is visible above, to the sides, and below.
const QR_CARD = {
  width: 230,
  height: 300,          // taller card (target shows a lot of vertical space)
  get x() { return (PAGE.width - this.width) / 2; },
  y: 172,               // start near the top of the body zone
  radius: 10,
  bgColor: "#FFFFFF",
  borderColor: "#CCCCCC",
  borderWidth: 0.8,
};

// QR image fits inside the card with padding
const QR = { size: 200 };

// ─── Name & Company (below the QR card, overlaid on background) ──────────────
const TEXT_AREA = {
  nameY: 482,           // just below the QR card bottom (172+300+10)
  companyY: 506,
  nameFontSize: 16,
  companyFontSize: 10,
};

// ─── Footer (logos overlaid directly on the body background image) ───────────
// There is NO separate white footer block in the target design.
// Logos are placed on top of the railway background image.
const FOOTER = {
  y: 530,               // where logos start — still on the bg image
  height: 60,
  bgColor: "transparent",  // no white block
  borderTopColor: "transparent",
  useSeparateBlock: false,  // generator should check this flag
};

// ─── Organised By ────────────────────────────────────────────────────────────
const ORGANISED_BY = {
  label: "ORGANISED BY",
  labelX: 12,
  labelY: 532,
  labelBgColor: "#1B3A8A",  // dark-blue pill background (target design)
  labelTextColor: "#FFFFFF",
  labelPadX: 6,
  labelPadY: 3,
  logoPath: path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX: 12,
  logoY: 548,
  logoWidth: 88,
};

// ─── In Association With ─────────────────────────────────────────────────────
const ASSOCIATION = {
  label: "IN ASSOCIATION WITH",
  labelX: 218,
  labelY: 532,
  labelBgColor: "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelPadX: 6,
  labelPadY: 3,

  logo1Path: path.join(ASSETS_LOGO, "rail_chamber.png"),
  logo1X: 218,
  logo1Y: 548,
  logo1Width: 65,

  logo2Path: path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X: 292,
  logo2Y: 546,
  logo2Width: 38,
};

// ─── Ribbon  (large block at very bottom, entity label in big bold text) ──────
// Target: ~80 px tall, full width, colour = theme colour, white text ~32 px
const RIBBON = {
  y: 546,               // starts after the logos zone
  height: 82,           // tall, prominent
  textSize: 34,         // large bold label
  textColor: "#FFFFFF",
  font: "Helvetica-Bold",
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