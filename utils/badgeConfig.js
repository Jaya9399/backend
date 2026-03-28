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

const RAILTRANS_LOGO = {
  path:  path.join(ASSETS_LOGO, "railtranslogo.png"),
  x:     8,
  y:     16,
  width: 148,
};

const MANDAPAM = {
  path:  path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x:     PAGE.width - 62,
  y:     14,
  width: 54,
};

const EDITION_PILL = {
  text:      "6th EDITION",
  x:         195,
  y:         16,
  bgColor:   "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize:  8,
};

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
  overlayOpacity: 218,   // very high — bg image barely visible, just a hint
};

// ─── QR Card — wider to fill white space ─────────────────────────────────────
const QR_CARD = {
  width:       260,   // much wider
  height:      260,   // taller too
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           132,
  radius:      12,
  bgColor:     "#FFFFFF",
  borderColor: "#DDDDDD",
  borderWidth: 0.8,
};

const QR = { size: 190 };  // QR fills the card properly

// ─── Text Areas ──────────────────────────────────────────────────────────────
// QR card bottom: 132 + 260 = 392
const TEXT_AREA = {
  nameY:           400,
  companyY:        417,
  nameFontSize:    13,
  companyFontSize: 9,
};

// ─── Footer ───────────────────────────────────────────────────────────────────
// Footer sits between ~434 and ribbon at 490
// Left half: ORGANISED BY pill + Urban Infra logo
// Right half: IN ASSOCIATION WITH pill + two logos side by side

const ORGANISED_BY = {
  label:          "ORGANISED BY",
  labelX:         10,
  labelY:         436,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logoPath:       path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX:          10,
  logoY:          454,
  logoWidth:      100,  // wide so Urban Infra text is legible
};

const ASSOCIATION = {
  label:          "IN ASSOCIATION WITH",
  labelX:         210,
  labelY:         436,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  // Two logos side-by-side, both same height, equal spacing
  logo1Path:      path.join(ASSETS_LOGO, "rail_chamber.png"),
  logo1X:         215,
  logo1Y:         454,
  logo1Width:     56,
  logo2Path:      path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X:         278,
  logo2Y:         454,
  logo2Width:     56,
};

// ─── Ribbon ───────────────────────────────────────────────────────────────────
const RIBBON = {
  y:            490,
  height:       110,   // 490 + 110 = 600
  textSize:     38,
  textColor:    "#FFFFFF",
  font:         "Helvetica-Bold",
  borderRadius: 14,
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