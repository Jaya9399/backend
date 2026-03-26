// badgeConfig.js — RailTrans Expo 2026
// Layout matches the reference badge image exactly.
//
// Asset paths (relative to project root):
//   assets/bg/bg.jpeg
//   assets/logos/railtrans_logo_2026.png
//   assets/logos/bharat_mandapam.png
//   assets/logos/Urban_Infra_Group_Logo-HD.png
//   assets/logos/rail_chamber.png
//   assets/logos/Indian_Railway_Logo_2.png

const path = require("path");

const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ── Page ──────────────────────────────────────────────────────────────────────
const PAGE = { width: 400, height: 628 };

// ── 1. Top color strip ────────────────────────────────────────────────────────
const TOP_STRIP = { y: 0, height: 14 };
// color = themeColor at runtime

// ── 2. Cream header ───────────────────────────────────────────────────────────
const HEADER = {
  y: 14, height: 152,
  bgColor: "#FDF5DC",
  borderBottomColor: "#CCCCCC",
};

// RailTrans logo — left half, width ONLY (no height — PDFKit auto-scales)
const LOGO_RAILTRANS = {
  path: path.join(ASSETS_LOGO, "railtrans_logo_2026.png"),
  x: 8, y: 18,
  width: 182,
};

// Subtle divider between left and right header halves
const HEADER_DIVIDER = {
  x: 196, y1: 20, y2: 160,
  color: "#DDDDDD", lineWidth: 0.5,
};

// Date boxes
const DATE_BOX = {
  w: 44, h: 44,
  bgColor: "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize: 22,
  box03: { x: 202, y: 20 },
  box04: { x: 252, y: 20 },
};

// Bharat Mandapam image — right of date boxes, width only
const MANDAPAM = {
  path: path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x: 304, y: 18,
  width: 90,
};

// "JULY 2026"
const MONTH_TEXT = {
  x: 200, y: 72, width: 196,
  text: "JULY 2026",
  size: 24, font: "Helvetica-Bold", color: "#111111",
};

// "BHARAT MANDAPAM, NEW DELHI, INDIA"
const VENUE_TEXT = {
  x: 200, y: 102, width: 196,
  text: "BHARAT MANDAPAM, NEW DELHI, INDIA",
  size: 7.5, font: "Helvetica-Bold", color: "#444444",
};

// ── 3. White row + red pill tagline ──────────────────────────────────────────
const TAGLINE_ROW = { y: 166, height: 36, bgColor: "#FFFFFF" };

const TAGLINE_PILL = {
  text: "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  bgColor: "#C8102E",
  textColor: "#FFFFFF",
  fontSize: 7.5,
  font: "Helvetica-Bold",
  padH: 16, padV: 6,
  radius: 11, height: 20,
  get y() { return TAGLINE_ROW.y + (TAGLINE_ROW.height - this.height) / 2; },
};

// ── 4. Body (light-blue gradient) ─────────────────────────────────────────────
const BODY = {
  // y is computed dynamically as TAGLINE_ROW.y + TAGLINE_ROW.height
  bgTop:    "#C6E4F5",
  bgBottom: "#EAF4FB",
};

// Trains background image — lower portion of body, behind QR card
const BG_IMAGE = {
  path: path.join(ASSETS_BG, "bg.jpeg"),
  opacity: 0.58,
  // x, y, width, height computed dynamically in generator
};

// White rounded QR card — centered in body
const QR_CARD = {
  width: 230, height: 230,
  get x() { return (PAGE.width - this.width) / 2; },
  get y() { 
    const bodyY = TAGLINE_ROW.y + TAGLINE_ROW.height; // Where body starts (202)
    return bodyY + 25; // 25px from top of body
  },
  radius: 10,
  bgColor: "#FFFFFF",
  borderColor: "#BBBBBB",
  borderWidth: 0.8,
};

// QR code inside card
const QR = { size: 200 };

// ── 5. Footer logos — white strip ─────────────────────────────────────────────
const FOOTER_ZONE = {
  y: 518, height: 82,
  bgColor: "#FFFFFF",
  borderTopColor: "#DDDDDD",
};

// Left: ORGANISED BY
const LABEL_ORG = {
  x: 12, y: 522,
  text: "ORGANISED BY",
  fontSize: 7, pillBorder: "#888888", textColor: "#444444", radius: 9,
};
const LOGO_URBAN = {
  path: path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  x: 10, y: 536, width: 116,
};

// Right: IN ASSOCIATION WITH
const LABEL_ASSOC = {
  x: 210, y: 522,
  text: "IN ASSOCIATION WITH",
  fontSize: 7, pillBorder: "#888888", textColor: "#444444", radius: 9,
};
const LOGO_CHAMBER = {
  path: path.join(ASSETS_LOGO, "rail_chamber.png"),
  x: 210, y: 536, width: 98,
};
const LOGO_RAILWAY = {
  path: path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  x: 316, y: 534, width: 46,
};

// ── 6. Ribbon ─────────────────────────────────────────────────────────────────
const RIBBON = {
  y: 600, height: 28,
  textSize: 40, textColor: "#FFFFFF",
  font: "Helvetica-Bold", letterSpacing: 6,
};

module.exports = {
  PAGE, TOP_STRIP,
  HEADER, LOGO_RAILTRANS, HEADER_DIVIDER,
  DATE_BOX, MANDAPAM, MONTH_TEXT, VENUE_TEXT,
  TAGLINE_ROW, TAGLINE_PILL,
  BODY, BG_IMAGE, QR_CARD, QR,
  FOOTER_ZONE, LABEL_ORG, LOGO_URBAN, LABEL_ASSOC, LOGO_CHAMBER, LOGO_RAILWAY,
  RIBBON,
  ASSETS_BG, ASSETS_LOGO,
};