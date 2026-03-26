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

// ── 2. Header with event title ───────────────────────────────────────────────
const HEADER = {
  y: 14, height: 140,
  bgColor: "#FFFFFF",
  borderBottomColor: "#CCCCCC",
};

// Main Event Title
const EVENT_TITLE = {
  text: "RAIL & TRANSIT EXPO",
  fontSize: 32,
  font: "Helvetica-Bold",
  color: "#1B3A8A",
  y: 45,
};

// Date and Venue line
const DATE_VENUE = {
  text: "03-04 JULY 2026 | BHARAT MANDAPAM, NEW DELHI, INDIA",
  fontSize: 10,
  font: "Helvetica",
  color: "#666666",
  y: 95,
};

// RailTrans logo - top left
const LOGO_RAILTRANS = {
  path: path.join(ASSETS_LOGO, "railtrans_logo_2026.png"),
  x: 12, y: 18,
  width: 140,
};

// Bharat Mandapam logo - top right
const MANDAPAM = {
  path: path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x: PAGE.width - 102, y: 18,
  width: 90,
};

// ── 3. White row + tagline ──────────────────────────────────────────
const TAGLINE_ROW = { y: 154, height: 36, bgColor: "#F5F5F5" };

const TAGLINE_PILL = {
  text: "Asia's Largest Event for Railways, Transportation & Semiconductor Industry",
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
  bgTop:    "#C6E4F5",
  bgBottom: "#EAF4FB",
};

// Trains background image — lower portion of body, behind QR card
const BG_IMAGE = {
  path: path.join(ASSETS_BG, "bg.jpeg"),
  opacity: 0.58,
};

// White rounded QR card — centered in body
const QR_CARD = {
  width: 230, height: 230,
  get x() { return (PAGE.width - this.width) / 2; },
  get y() { 
    const bodyY = TAGLINE_ROW.y + TAGLINE_ROW.height;
    return bodyY + 25;
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
  textSize: 32, textColor: "#FFFFFF",
  font: "Helvetica-Bold", letterSpacing: 2,
};

module.exports = {
  PAGE, TOP_STRIP,
  HEADER, LOGO_RAILTRANS, MANDAPAM, EVENT_TITLE, DATE_VENUE,
  TAGLINE_ROW, TAGLINE_PILL,
  BODY, BG_IMAGE, QR_CARD, QR,
  FOOTER_ZONE, LABEL_ORG, LOGO_URBAN, LABEL_ASSOC, LOGO_CHAMBER, LOGO_RAILWAY,
  RIBBON,
  ASSETS_BG, ASSETS_LOGO,
};