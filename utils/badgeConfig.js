// badgeConfig.js — RailTrans Expo 2026
"use strict";

const path = require("path");

// Asset paths
const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ─── Page Size ────────────────────────────────────────────────────────────────
const PAGE = { width: 400, height: 600 };

// ─── Top Strip ───────────────────────────────────────────────────────────────
const TOP_STRIP = { y: 0, height: 12 };

// ─── Header ──────────────────────────────────────────────────────────────────
const HEADER = {
  y:       12,
  height:  88,
  bgColor: "#F5EFD6",
};

// RailTrans logo — left side, fills roughly left 40% of header
const RAILTRANS_LOGO = {
  path:  path.join(ASSETS_LOGO, "railtranslogo.png"),
  x:     8,
  y:     16,
  width: 148,
};

// Bharat Mandapam logo — top-right, pulled in so it doesn't clip
const MANDAPAM = {
  path:  path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x:     PAGE.width - 62,   // 338
  y:     14,
  width: 54,
};

// Edition Pill — left of Mandapam
const EDITION_PILL = {
  text:      "6th EDITION",
  x:         195,
  y:         16,
  bgColor:   "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize:  8,
};

// Date Pills + text positions
const DATE_PILLS = {
  pill1: { text: "03", x: 195, y: 40, width: 34, height: 34, bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 18 },
  pill2: { text: "04", x: 234, y: 40, width: 34, height: 34, bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 18 },
  monthX: 274,
  monthY: 40,
  venueY: 62,
};

// ─── Tagline Bar ─────────────────────────────────────────────────────────────
const TAGLINE = {
  y:               100,
  height:          24,
  bgColor:         "#EFEFEF",
  text:            "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  pillBgColor:     "#FFFFFF",
  pillBorderColor: "#C8102E",
  textColor:       "#222222",
  fontSize:        7,
};

// ─── Body ────────────────────────────────────────────────────────────────────
const BODY = {
  startY:         124,
  endY:           490,
  bgColor:        "#D8EEF8",
  bgImage:        path.join(ASSETS_BG, "bg.jpeg"),
  overlayOpacity: 185,   // 0–255; higher = more white = less visible bg image
};

// ─── QR Card ─────────────────────────────────────────────────────────────────
const QR_CARD = {
  width:       210,
  height:      215,
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           138,
  radius:      10,
  bgColor:     "#FFFFFF",
  borderColor: "#CCCCCC",
  borderWidth: 0.8,
};

const QR = { size: 140 };

// ─── Text Areas ──────────────────────────────────────────────────────────────
const TEXT_AREA = {
  nameY:           362,
  companyY:        380,
  nameFontSize:    13,
  companyFontSize: 9,
};

// ─── Footer Logos with Pills ──────────────────────────────────────────────────
const ORGANISED_BY = {
  label:          "ORGANISED BY",
  labelX:         10,
  labelY:         400,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logoPath:       path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX:          10,
  logoY:          418,
  logoWidth:      85,
};

const ASSOCIATION = {
  label:          "IN ASSOCIATION WITH",
  labelX:         235,
  labelY:         400,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logo1Path:      path.join(ASSETS_LOGO, "railchamber_logo.png"),
  logo1X:         205,
  logo1Y:         418,
  logo1Width:     40,
  logo2Path:      path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X:         260,
  logo2Y:         416,
  logo2Width:     40,
};

// ─── Ribbon ───────────────────────────────────────────────────────────────────
const RIBBON = {
  y:            490,
  height:       110,      // 490 + 110 = 600 (fills to bottom exactly)
  textSize:     34,
  textColor:    "#FFFFFF",
  font:         "Helvetica-Bold",
  borderRadius: 14,       // subtle — not a big pill shape
};

module.exports = {
  PAGE,
  TOP_STRIP,
  HEADER,
  RAILTRANS_LOGO,
  MANDAPAM,
  EDITION_PILL,
  DATE_PILLS,
  TAGLINE,
  BODY,
  QR_CARD,
  QR,
  TEXT_AREA,
  ORGANISED_BY,
  ASSOCIATION,
  RIBBON,
  ASSETS_BG,
  ASSETS_LOGO,
};