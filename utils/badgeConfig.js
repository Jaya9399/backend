// badgeConfig.js — RailTrans Expo 2026
"use strict";

const path = require("path");

// Asset paths
const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ─── Page Size ────────────────────────────────────────────────────────────────
const PAGE = { width: 400, height: 560 };

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

// Bharat Mandapam logo — RIGHT SIDE, LARGER, SAME LINE
const MANDAPAM = {
  path:  path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  width: 90,  // INCREASED from 76 to 90
  x:     PAGE.width - 90 - 10,  // Adjusted for new width
  y:     16,  // Moved up to be in same line as RailTrans logo
};

// Bharat Mandapam text - Positioned to the right of date pills
const MANDAPAM_TEXT = {
  line1: "BHARAT MANDAPAM",
  line2: "NEW DELHI, INDIA",
  y: 66,  // Adjusted position
  fontSizeLine1: 8.2,
  fontSizeLine2: 8.2,
  lineGap: 0.5,
  color: "#555555",
};

// Date Pills (03 and 04)
const DATE_PILLS = {
  pill1: { 
    text: "03", 
    x: 175, 
    y: 40,
    width: 34, 
    height: 34, 
    bgColor: "#d8031c",
    textColor: "#FFFFFF",
    fontSize: 18 
  },
  pill2: { 
    text: "04", 
    x: 214, 
    y: 40,
    width: 34, 
    height: 34, 
    bgColor: "#0d25c5",
    textColor: "#FFFFFF",
    fontSize: 18 
  },
  monthX: 255,
  monthY: 40,
  venueY: 70,
};

// ─── Tagline Bar ─────────────────────────────────────────────────────────────
const TAGLINE = {
  y:               100,
  height:          24,
  bgColor:         "#000000",
  text:            "Asia's Largest Event for Railways, Transportation & Semiconductor Industry",
  pillBgColor:     "#C8102E",
  pillBorderColor: "#C8102E",
  textColor:       "#FFFFFF",
  fontSize:        7,
};

// ─── Body ────────────────────────────────────────────────────────────────────
const BODY = {
  startY:         124,
  endY:           475,  // Reduced to minimize whitespace
  bgColor:        "#D8EEF8",
  bgImage:        path.join(ASSETS_BG, "bg.jpeg"),
  overlayOpacity: 185,
};

// ─── QR Card - Reduced height to remove whitespace ────────────────────────────
const QR_CARD = {
  width:       250, 
  height:      230,  // REDUCED from 260 to 230
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           138,
  radius:      10,
  bgColor:     "#FFFFFF",
  borderColor: "#CCCCCC",
  borderWidth: 0.8,
};

// QR code - Slightly smaller to fit better
const QR = { size: 150 };  // REDUCED from 168 to 150

// ─── Text Areas ──────────────────────────────────────────────────────────────
const TEXT_AREA = {
  nameY:           362,
  companyY:        380,
  nameFontSize:    16, 
  companyFontSize: 12,
  gapAfterQr:      15,  // REDUCED from 22 to 15
};

// ─── Footer - Centered Organised By section ──────────────────────────────────
const ORGANISED_BY = {
  label:          "ORGANISED BY",
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  10,  // INCREASED for better visibility
  logoPath:       path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoWidth:      160,  // INCREASED width for centered layout
};

// REMOVED ASSOCIATION SECTION
// const ASSOCIATION = { ... };  // Completely removed

// RIBBON - Adjusted position
const RIBBON = {
  y: 475,  // Adjusted to match new BODY.endY
  height: 60,
  textSize: 28,
  borderRadius: 20,
  textColor: "#FFFFFF",
};

module.exports = {
  PAGE,
  TOP_STRIP,
  HEADER,
  RAILTRANS_LOGO,
  MANDAPAM,
  MANDAPAM_TEXT,
  DATE_PILLS,
  TAGLINE,
  BODY,
  QR_CARD,
  QR,
  TEXT_AREA,
  ORGANISED_BY,
  RIBBON,
  ASSETS_BG,
  ASSETS_LOGO,
};