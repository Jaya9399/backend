// badgeConfig.js — RailTrans Expo 2026
"use strict";

const path = require("path");

// Asset paths
const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ─── Page Size ────────────────────────────────────────────────────────────────
// Match page height to artwork to avoid bottom white gap.
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

// Bharat Mandapam logo — top-right (INCREASED SIZE)
const MANDAPAM = {
  path:  path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  // Drop it slightly to avoid sticking to the top edge
  x:     PAGE.width - 92,
  y:     18,
  width: 82,
};

// REMOVED: EDITION_PILL - No longer showing "6th EDITION"

// Date Pills (03 and 04 with WHITE text on RED background)
const DATE_PILLS = {
  pill1: { 
    text: "03", 
    x: 195, 
    y: 40,
    width: 34, 
    height: 34, 
    bgColor: "#d8031c",
    textColor: "#FFFFFF",
    fontSize: 18 
  },
  pill2: { 
    text: "04", 
    x: 234, 
    y: 40,
    width: 34, 
    height: 34, 
    bgColor: "#0d25c5",
    textColor: "#FFFFFF",
    fontSize: 18 
  },
  // Add breathing room from the Mandapam logo and keep alignment clean
  monthX: 274,
  monthY: 40,
  venueY: 62,
};

// ─── Tagline Bar ─────────────────────────────────────────────────────────────
const TAGLINE = {
  y:               100,
  height:          24,
  bgColor:         "#000000",
  text:            "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  pillBgColor:     "#C8102E",
  pillBorderColor: "#C8102E",
  textColor:       "#FFFFFF",
  fontSize:        7,
};

// ─── Body ────────────────────────────────────────────────────────────────────
const BODY = {
  startY:         124,
  endY:           500, 
  bgColor:        "#D8EEF8",
  bgImage:        path.join(ASSETS_BG, "bg.jpeg"),
  overlayOpacity: 185,
};

// ─── QR Card ─────────────────────────────────────────────────────────────────
const QR_CARD = {
  width:       250, 
  height:      260, 
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           138,
  radius:      10,
  bgColor:     "#FFFFFF",
  borderColor: "#CCCCCC",
  borderWidth: 0.8,
};

const QR = { size: 150 }; 

// ─── Text Areas ──────────────────────────────────────────────────────────────
const TEXT_AREA = {
  nameY:           362,
  companyY:        380,
  nameFontSize:    16, 
  companyFontSize: 12,
};

// ─── Footer Logos with INCREASED SIZES and REDUCED WHITESPACE ─────────────────
const ORGANISED_BY = {
  label:          "ORGANISED BY",
  labelX:         20,
  labelY:         405,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  9,        // INCREASED font size
  logoPath:       path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX:          20,
  logoY:          418,
  logoWidth:      130,      // INCREASED width
};

const ASSOCIATION = {
  label:          "IN ASSOCIATION WITH",
  labelX:         220,      // MOVED to accommodate larger logos
  labelY:         405,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  8,        // INCREASED font size
  logo1Path:      path.join(ASSETS_LOGO, "railchamber_logo.png"),
  logo1X:         195,      // ADJUSTED position
  logo1Y:         416,
  logo1Width:     65,       // INCREASED width
  logo2Path:      path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X:         270,      // ADJUSTED position
  logo2Y:         414,
  logo2Width:     65,       // INCREASED width
  // Used by generator to size both association logos consistently
  logoWidth:      34,
};

// RIBBON - Reduced whitespace below
const RIBBON = {
  y: 500,           // MOVED UP (was 510) - reduces whitespace
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
  // EDITION_PILL removed - not exporting anymore
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