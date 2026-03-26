// badgeConfig.js — RailTrans Expo 2026
const path = require("path");

const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ── Page ──────────────────────────────────────────────────────────────────────
const PAGE = { width: 400, height: 628 };

// ── 1. Top color strip ────────────────────────────────────────────────────────
const TOP_STRIP = { y: 0, height: 14 };

// ── 2. Header with date boxes and logos ───────────────────────────────────────
const HEADER = {
  y: 14, height: 120,
  bgColor: "#FFFFFF",
};

// RailTrans logo - left side
const LOGO_RAILTRANS = {
  path: path.join(ASSETS_LOGO, "railtrans_logo_2026.png"),
  x: 12, y: 20,
  width: 140,
};

// Date box 03 and 04 side by side
const DATE_BOX_03 = {
  x: 180, y: 35,
  w: 45, h: 45,
  text: "03",
  bgColor: "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize: 24,
};

const DATE_BOX_04 = {
  x: 235, y: 35,
  w: 45, h: 45,
  text: "04",
  bgColor: "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize: 24,
};

// "JULY 2026" text
const MONTH_YEAR = {
  x: 185, y: 88,
  text: "JULY 2026",
  fontSize: 14,
  font: "Helvetica-Bold",
  color: "#000000",
};

// "BHARAT MANDAPAM, NEW DELHI, INDIA" text
const VENUE = {
  x: 185, y: 108,
  text: "BHARAT MANDAPAM, NEW DELHI, INDIA",
  fontSize: 7,
  font: "Helvetica",
  color: "#666666",
};

// Bharat Mandapam logo - right side
const MANDAPAM = {
  path: path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x: PAGE.width - 95, y: 20,
  width: 85,
};

// ── 3. Tagline pill ──────────────────────────────────────────────────────────
const TAGLINE = {
  y: 134, height: 36,
  bgColor: "#F5F5F5",
  text: "Asia's Largest Event for Railways, Transportation & Semiconductor Industry",
  pillColor: "#C8102E",
  textColor: "#FFFFFF",
  fontSize: 7.5,
};

// ── 4. Body with QR code ─────────────────────────────────────────────────────
const BODY = {
  startY: 170,
  bgColor: "#EAF4FB",
};

const QR_CARD = {
  width: 220, height: 220,
  get x() { return (PAGE.width - this.width) / 2; },
  y: 185,
  radius: 12,
  bgColor: "#FFFFFF",
  borderColor: "#DDDDDD",
  borderWidth: 1,
};

const QR = { size: 190 };

// ── 5. Name and Company (NO ticket code) ────────────────────────────────────
const TEXT_AREA = {
  nameY: 415,
  companyY: 445,
  nameFontSize: 18,
  companyFontSize: 11,
};

// ── 6. Footer with logos ────────────────────────────────────────────────────
const FOOTER = {
  y: 500, height: 90,
  bgColor: "#FFFFFF",
  borderTopColor: "#EEEEEE",
};

// Left side - Organised By
const ORGANISED_BY = {
  label: "ORGANISED BY",
  labelX: 15, labelY: 505,
  logoPath: path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX: 15, logoY: 520,
  logoWidth: 110,
};

// Right side - In Association With
const ASSOCIATION = {
  label: "IN ASSOCIATION WITH",
  labelX: 235, labelY: 505,
  logo1Path: path.join(ASSETS_LOGO, "rail_chamber.png"),
  logo1X: 235, logo1Y: 520,
  logo1Width: 90,
  logo2Path: path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X: 335, logo2Y: 518,
  logo2Width: 45,
};

// ── 7. Ribbon at bottom ──────────────────────────────────────────────────────
const RIBBON = {
  y: 590, height: 38,
  textSize: 28,
  textColor: "#FFFFFF",
  font: "Helvetica-Bold",
};

module.exports = {
  PAGE, TOP_STRIP,
  HEADER, LOGO_RAILTRANS, MANDAPAM,
  DATE_BOX_03, DATE_BOX_04, MONTH_YEAR, VENUE,
  TAGLINE, BODY, QR_CARD, QR, TEXT_AREA,
  FOOTER, ORGANISED_BY, ASSOCIATION,
  RIBBON,
  ASSETS_BG, ASSETS_LOGO,
};