// badgeConfig.js — RailTrans Expo 2026
// All units in PDFKit points. Layout mirrors the badge design image exactly.
//
// Expected asset structure (relative to project root):
//   assets/bg/bg.jpeg
//   assets/logos/railtrans_logo_2026.png
//   assets/logos/bharat_mandapam.png
//   assets/logos/Urban_Infra_Group_Logo-HD.png
//   assets/logos/rail_chamber.png
//   assets/logos/Indian_Railway_Logo_2.png

const path = require("path");

const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// PAGE
const PAGE = { width: 400, height: 580 };

// 1. TOP DARK RED STRIP
const TOP_STRIP = { y: 0, height: 16, color: "#8B0000" };

// 2. CREAM HEADER
const HEADER = {
  y: 16, height: 138,
  bgColor: "#FDF6E3",
  borderBottomColor: "#CCCCCC",
  borderBottomWidth: 1,
};

const LOGO_RAILTRANS = {
  path: path.join(ASSETS_LOGO, "railtrans_logo_2026.png"),
  x: 10, y: 22, width: 175,
};

const HEADER_DIVIDER = { x: 192, y1: 24, y2: 148, color: "#DDDDDD", width: 0.5 };

const DATE_BOX = {
  w: 38, h: 38,
  bgColor: "#1E3A8A",
  textColor: "#FFFFFF",
  fontSize: 20,
  box03: { x: 200, y: 24 },
  box04: { x: 244, y: 24 },
};

const MANDAPAM = {
  path: path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x: 292, y: 22, width: 100,
};

const MONTH_TEXT = {
  x: 196, y: 68, width: 200,
  text: "JULY 2026",
  size: 22, font: "Helvetica-Bold", color: "#111111",
};

const VENUE_TEXT = {
  x: 196, y: 96, width: 200,
  text: "BHARAT MANDAPAM, NEW DELHI, INDIA",
  size: 8, font: "Helvetica-Bold", color: "#333333",
};

// 3. TAGLINE ROW (white bg with red pill)
const TAGLINE_ROW = { y: 154, height: 34, bgColor: "#FFFFFF" };

const TAGLINE_PILL = {
  bgColor: "#C8102E",
  textColor: "#FFFFFF",
  text: "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  fontSize: 7.5,
  font: "Helvetica-Bold",
  paddingH: 14,
  paddingV: 6,
  borderRadius: 10,
  y: 160,
  height: 16,
};

// 4. BODY
const BODY = {
  y: 188, height: 258,
  bgColorTop: "#D6EEF8",
  bgColorBottom: "#FFFFFF",
};

const BG_IMAGE = {
  path: path.join(ASSETS_BG, "bg.jpeg"),
  x: 0, y: 330,
  width: 400, height: 116,
  opacity: 0.55,
};

const QR_CARD = {
  x: 90, y: 200,
  width: 220, height: 220,
  borderRadius: 8,
  borderColor: "#CCCCCC",
  borderWidth: 1,
  bgColor: "#FFFFFF",
};

const QR = { size: 190 };

// 5. FOOTER
const FOOTER = { y: 446, height: 90 };

const LABEL_ORG = {
  x: 14, y: 450,
  text: "ORGANISED BY",
  fontSize: 7,
  pillBorder: "#888888", textColor: "#555555", borderRadius: 8,
};

const LOGO_URBAN = {
  path: path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  x: 12, y: 464, width: 110,
};

const LABEL_ASSOC = {
  x: 214, y: 450,
  text: "IN ASSOCIATION WITH",
  fontSize: 7,
  pillBorder: "#888888", textColor: "#555555", borderRadius: 8,
};

const LOGO_CHAMBER = {
  path: path.join(ASSETS_LOGO, "rail_chamber.png"),
  x: 214, y: 464, width: 86,
};

const LOGO_RAILWAY = {
  path: path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  x: 308, y: 462, width: 44,
};

// 6. RIBBON
const RIBBON = {
  y: 536, height: 44,
  textSize: 36, textColor: "#FFFFFF",
  font: "Helvetica-Bold", letterSpacing: 5,
};

const FOOTER_NOTE = { y: 569, size: 6.5, color: "#9CA3AF" };

module.exports = {
  PAGE, TOP_STRIP,
  HEADER, LOGO_RAILTRANS, HEADER_DIVIDER,
  DATE_BOX, MANDAPAM, MONTH_TEXT, VENUE_TEXT,
  TAGLINE_ROW, TAGLINE_PILL,
  BODY, BG_IMAGE, QR_CARD, QR,
  FOOTER, LABEL_ORG, LOGO_URBAN, LABEL_ASSOC, LOGO_CHAMBER, LOGO_RAILWAY,
  RIBBON, FOOTER_NOTE,
  ASSETS_BG, ASSETS_LOGO,
};