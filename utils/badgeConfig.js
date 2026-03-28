// badgeConfig.js — RailTrans Expo 2026
"use strict";

const path = require("path");

// Asset paths
const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ─── Page Size ────────────────────────────────────────────────────────────────
const PAGE = { width: 400, height: 600 };

// ─── Top Strip ───────────────────────────────────────────────────────────────
// Reference shows a thick ~28px colour strip at the very top
const TOP_STRIP = { y: 0, height: 28 };

// ─── Header ──────────────────────────────────────────────────────────────────
// Header starts right after the top strip
const HEADER = {
  y:       28,
  height:  95,   // taller to fit logo + dates + venue text like the reference
  bgColor: "#F5EFD6",
};

// RailTrans logo — large, left-aligned, vertically centred in header
// Reference: logo spans roughly the left 40% of the header, tall
const RAILTRANS_LOGO = {
  path:  path.join(ASSETS_LOGO, "railtranslogo.png"),
  x:     8,
  y:     30,    // just below top strip
  width: 155,   // wider so it fills the left column like reference
};

// Bharat Mandapam logo — top-right corner, inside header
// Reference: small logo at very top-right, above the date pills
const MANDAPAM = {
  path:  path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x:     PAGE.width - 72,  // flush to right edge
  y:     30,               // same top as RailTrans logo
  width: 65,
};

// Edition Pill — sits just left of Mandapam logo, top area
// Reference: small "6th EDITION" blue pill at top-centre-right
const EDITION_PILL = {
  text:      "6th EDITION",
  x:         210,   // roughly centre of right half
  y:         32,
  bgColor:   "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize:  8,
};

// Date Pills — "03" and "04" blue squares, below edition pill
// Reference: large date squares side by side, centre-right of header
const DATE_PILLS = {
  pill1: { text: "03", x: 210, y: 52, width: 38, height: 38, bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 20 },
  pill2: { text: "04", x: 255, y: 52, width: 38, height: 38, bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 20 },
  // "JULY 2026" sits to the right of the date squares, same vertical centre
  monthX: 300,
  monthY: 52,    // top of date squares
  venueY: 75,   // below JULY 2026
};

// ─── Tagline Bar ─────────────────────────────────────────────────────────────
// Starts right after the header (28 + 95 = 123)
const TAGLINE = {
  y:               123,
  height:          28,
  bgColor:         "#EFEFEF",
  text:            "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  pillBgColor:     "#FFFFFF",
  pillBorderColor: "#C8102E",
  textColor:       "#222222",
  fontSize:        7,
};

// ─── Body ────────────────────────────────────────────────────────────────────
// Starts after tagline (123 + 28 = 151)
const BODY = {
  startY:         151,
  endY:           510,
  bgColor:        "#D8EEF8",
  bgImage:        path.join(ASSETS_BG, "bg.jpeg"),
  overlayOpacity: 120,
};

// ─── QR Card ─────────────────────────────────────────────────────────────────
const QR_CARD = {
  width:       220,
  height:      220,
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           165,
  radius:      10,
  bgColor:     "#FFFFFF",
  borderColor: "#CCCCCC",
  borderWidth: 0.8,
};

const QR = { size: 145 };

// ─── Text Areas ──────────────────────────────────────────────────────────────
// Name + company sit below QR card (165 + 220 = 385)
const TEXT_AREA = {
  nameY:           395,
  companyY:        414,
  nameFontSize:    14,
  companyFontSize: 9,
};

// ─── Footer Logos with Pills ──────────────────────────────────────────────────
// Footer must fit between body end (~430) and ribbon start (510)
// Reference: "ORGANISED BY" pill + Urban Infra logo on the left
//            "IN ASSOCIATION WITH" pill + two logos on the right
const ORGANISED_BY = {
  label:          "ORGANISED BY",
  labelX:         10,
  labelY:         432,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logoPath:       path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX:          10,
  logoY:          450,   // pill height ~15, so logo 3px below pill
  logoWidth:      90,    // wider so Urban Infra text is readable
};

const ASSOCIATION = {
  label:          "IN ASSOCIATION WITH",
  labelX:         210,
  labelY:         432,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logo1Path:      path.join(ASSETS_LOGO, "rail_chamber.png"),
  logo1X:         215,
  logo1Y:         450,
  logo1Width:     55,    // slightly bigger circular logo
  logo2Path:      path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X:         278,
  logo2Y:         448,
  logo2Width:     55,    // match size with rail_chamber
};

// ─── Ribbon (Full-width pill) ─────────────────────────────────────────────────
// Reference: thick full-width coloured ribbon at very bottom
const RIBBON = {
  y:            510,
  height:       90,
  textSize:     36,
  textColor:    "#FFFFFF",
  font:         "Helvetica-Bold",
  borderRadius: 30,
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