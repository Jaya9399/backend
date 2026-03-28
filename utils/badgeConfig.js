// badgeConfig.js — RailTrans Expo 2026
"use strict";

const path = require("path");

// Asset paths
const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ─── Page Size ────────────────────────────────────────────────────────────────
const PAGE = { width: 400, height: 550 }; // Reduced from 590 to eliminate white space

// ─── Top Strip ───────────────────────────────────────────────────────────────
const TOP_STRIP = { y: 0, height: 12 };

// ─── Header ──────────────────────────────────────────────────────────────────
const HEADER = {
  y:       12,
  height:  88,
  bgColor: "#F5EFD6",
};

// RailTrans logo — left side
const RAILTRANS_LOGO = {
  path:  path.join(ASSETS_LOGO, "railtranslogo.png"),
  x:     8,
  y:     16,
  width: 148,
};

// Bharat Mandapam logo — top-right
const MANDAPAM = {
  path:  path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x:     PAGE.width - 62,
  y:     14,
  width: 54,
};

// Edition Pill
const EDITION_PILL = {
  text:      "6th EDITION",
  x:         195,
  y:         16,
  bgColor:   "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize:  8,
};

// Date Pills
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
  endY:           462, // Adjusted based on new page height
  bgColor:        "#D8EEF8",
  bgImage:        path.join(ASSETS_BG, "bg.jpeg"),
  overlayOpacity: 185,
};

// ─── QR Card ─────────────────────────────────────────────────────────────────
const QR_CARD = {
  width:       210,
  height:      220, // Increased to accommodate name + company
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           138,
  radius:      10,
  bgColor:     "#FFFFFF",
  borderColor: "#CCCCCC",
  borderWidth: 0.8,
};

const QR = { size: 120 };

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
  labelX:         20,
  labelY:         380, // Moved up
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logoPath:       path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX:          20,
  logoY:          398, // Moved up
  logoWidth:      85,
};

const ASSOCIATION = {
  label:          "IN ASSOCIATION WITH",
  labelX:         235,
  labelY:         380, // Moved up
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logo1Path:      path.join(ASSETS_LOGO, "railchamber_logo.png"),
  logo1X:         205,
  logo1Y:         398, // Moved up
  logo1Width:     40,
  logo2Path:      path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X:         260,
  logo2Y:         396, // Moved up
  logo2Width:     40,
};

const RIBBON = {
  y: 470, // Moved up to eliminate white space
  height: 70, // Reduced height
  textSize: 28, // Slightly smaller text
  borderRadius: 20,
  textColor: "#FFFFFF",
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