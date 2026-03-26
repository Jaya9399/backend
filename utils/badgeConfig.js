// badgeConfig.js — RailTrans Expo 2026
// Layout matches the reference badge image exactly.
//
// Zones top→bottom:
//   [0]   TOP_STRIP       thin colored bar          h=14
//   [14]  HEADER          cream bg, logos+dates      h=150
//   [164] TAGLINE_ROW     white bg + red pill        h=36
//   [200] BODY            light-blue gradient        h=240
//                           trains bg fades in bottom half
//                           white rounded QR card centered
//   [440] NAME_ZONE       name + company + code      h=50
//   [490] FOOTER_ZONE     org logos row              h=80
//   [570] RIBBON          colored label bar          h=58
//   [628] PAGE END
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

// ── Page ─────────────────────────────────────────────────────────────────────
const PAGE = { width: 400, height: 628 };

// ── 1. Top color strip (thin, same color as ribbon) ──────────────────────────
const TOP_STRIP = { y: 0, height: 14 };
// color comes from themeColor at runtime

// ── 2. Cream header ───────────────────────────────────────────────────────────
const HEADER = {
  y: 14, height: 150,
  bgColor: "#FDF5DC",           // warm cream/beige
  borderBottomColor: "#CCCCCC",
};

// RailTrans logo — left ~half of header, vertically centered
const LOGO_RAILTRANS = {
  path: path.join(ASSETS_LOGO, "railtrans_logo_2026.png"),
  x: 8, y: 20,
  width: 178, maxHeight: 130,   // fit: keeps aspect ratio
};

// Thin vertical separator between left and right halves
const HEADER_DIVIDER = {
  x: 196, y1: 22, y2: 158,
  color: "#DDDDDD", lineWidth: 0.5,
};

// Date boxes "03" and "04" — top-right area
const DATE_BOX = {
  w: 42, h: 42,
  bgColor: "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize: 22,
  box03: { x: 202, y: 22 },
  box04: { x: 250, y: 22 },
};

// Bharat Mandapam image — right of date boxes
const MANDAPAM = {
  path: path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x: 300, y: 20,
  width: 94, maxHeight: 48,
};

// "JULY 2026" — large bold below date boxes
const MONTH_TEXT = {
  x: 200, y: 72, width: 196,
  text: "JULY 2026",
  size: 24, font: "Helvetica-Bold", color: "#111111",
  align: "left",
};

// "BHARAT MANDAPAM, NEW DELHI, INDIA"
const VENUE_TEXT = {
  x: 200, y: 102, width: 196,
  text: "BHARAT MANDAPAM, NEW DELHI, INDIA",
  size: 7.5, font: "Helvetica-Bold", color: "#444444",
  align: "left",
};

// ── 3. White row + red pill tagline ──────────────────────────────────────────
const TAGLINE_ROW = {
  y: 164, height: 36,
  bgColor: "#FFFFFF",
};

const TAGLINE_PILL = {
  text: "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  bgColor: "#C8102E",
  textColor: "#FFFFFF",
  fontSize: 7.5,
  font: "Helvetica-Bold",
  padH: 16,       // horizontal padding inside pill
  padV: 6,        // vertical padding inside pill
  radius: 11,
  height: 20,
  // y is centered within TAGLINE_ROW
  get y() { return TAGLINE_ROW.y + (TAGLINE_ROW.height - this.height) / 2; },
};

// ── 4. Body (light-blue gradient + QR card) ───────────────────────────────────
const BODY = {
  y: 200, height: 240,
  bgTop:    "#C8E6F5",   // light sky blue
  bgBottom: "#EEF7FB",   // near-white blue
};

// Trains background image — covers bottom ~60% of body, semi-transparent
const BG_IMAGE = {
  path: path.join(ASSETS_BG, "bg.jpeg"),
  x: 0,
  get y() { return BODY.y + BODY.height * 0.38; },
  width: 400,
  get height() { return BODY.height * 0.62; },
  opacity: 0.60,
};

// White rounded card that holds the QR code — centered in body
const QR_CARD = {
  width: 230, height: 230,
  get x() { return (400 - this.width) / 2; },
  get y() { return BODY.y + (BODY.height - this.height) / 2; },
  radius: 10,
  bgColor: "#FFFFFF",
  borderColor: "#BBBBBB",
  borderWidth: 0.8,
};

// QR code inside card (centered, with small margin)
const QR = {
  size: 200,
  get x() { return QR_CARD.x + (QR_CARD.width - this.size) / 2; },
  get y() { return QR_CARD.y + (QR_CARD.height - this.size) / 2; },
};

// ── 5. Name / company / ticket code — between body and footer ─────────────────
const NAME_ZONE = {
  y: 442,           // just below body
};
// actual text y positions computed in generator relative to NAME_ZONE.y

// ── 6. Footer logos ───────────────────────────────────────────────────────────
// White background strip matching original image
const FOOTER_ZONE = {
  y: 490, height: 80,
  bgColor: "#FFFFFF",
  borderTopColor: "#DDDDDD",
};

// Left column: "ORGANISED BY" pill + Urban Infra logo
const LABEL_ORG = {
  x: 12, y: 494,
  text: "ORGANISED BY",
  fontSize: 7, pillBorder: "#888888",
  textColor: "#444444", radius: 9,
};
const LOGO_URBAN = {
  path: path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  x: 10, y: 508, width: 120, maxHeight: 52,
};

// Right column: "IN ASSOCIATION WITH" pill + Chamber + Railway logos
const LABEL_ASSOC = {
  x: 210, y: 494,
  text: "IN ASSOCIATION WITH",
  fontSize: 7, pillBorder: "#888888",
  textColor: "#444444", radius: 9,
};
const LOGO_CHAMBER = {
  path: path.join(ASSETS_LOGO, "rail_chamber.png"),
  x: 210, y: 508, width: 100, maxHeight: 52,
};
const LOGO_RAILWAY = {
  path: path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  x: 318, y: 508, width: 46, maxHeight: 52,
};

// ── 7. Ribbon ─────────────────────────────────────────────────────────────────
const RIBBON = {
  y: 570, height: 58,
  textSize: 40,
  textColor: "#FFFFFF",
  font: "Helvetica-Bold",
  letterSpacing: 6,
};

module.exports = {
  PAGE, TOP_STRIP,
  HEADER, LOGO_RAILTRANS, HEADER_DIVIDER,
  DATE_BOX, MANDAPAM, MONTH_TEXT, VENUE_TEXT,
  TAGLINE_ROW, TAGLINE_PILL,
  BODY, BG_IMAGE, QR_CARD, QR,
  NAME_ZONE,
  FOOTER_ZONE, LABEL_ORG, LOGO_URBAN, LABEL_ASSOC, LOGO_CHAMBER, LOGO_RAILWAY,
  RIBBON,
  ASSETS_BG, ASSETS_LOGO,
};