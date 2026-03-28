// badgeConfig.js — RailTrans Expo 2026
"use strict";

const path = require("path");

// Asset paths
const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ─── Page Size ────────────────────────────────────────────────────────────────
const PAGE = { width: 400, height: 628 };

// ─── Top Strip ───────────────────────────────────────────────────────────────
const TOP_STRIP = { y: 0, height: 10 };

// ─── Header ──────────────────────────────────────────────────────────────────
const HEADER = {
  y:       10,
  height:  112,
  bgColor: "#F5EFD6",
};

const MANDAPAM = {
  path:  path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x:     PAGE.width - 76,
  y:     14,
  width: 66,
};

const HEADER_TEXT = {
  leftX:         10,
  superscriptY:  14,
  lineY:         14,
  railtransY:    30,
  expoLineY:     62,
  dateBoxX1:     248,
  dateBoxX2:     291,
  dateBoxY:      18,
  dateBoxW:      36,
  dateBoxH:      36,
  monthY:        62,
  venueY:        78,
};

// ─── Tagline Bar ─────────────────────────────────────────────────────────────
const TAGLINE = {
  y:               122,
  height:          28,
  bgColor:         "#EFEFEF",
  text:            "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  pillBgColor:     "#FFFFFF",
  pillBorderColor: "#999999",
  textColor:       "#222222",
  fontSize:        6.5,
};

// ─── Body ────────────────────────────────────────────────────────────────────
const BODY = {
  startY:         150,
  endY:           546,
  bgColor:        "#D8EEF8",
  bgImage:        path.join(ASSETS_BG, "bg.jpeg"),
  overlayOpacity: 225,
};

// ─── QR Card ─────────────────────────────────────────────────────────────────
const QR_CARD = {
  width:       200,
  height:      230,
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           162,
  radius:      10,
  bgColor:     "#FFFFFF",
  borderColor: "#CCCCCC",
  borderWidth: 0.8,
};

const QR = { size: 160 };

// ─── Text Areas ──────────────────────────────────────────────────────────────
const TEXT_AREA = {
  nameY:           406,
  companyY:        426,
  nameFontSize:    14,
  companyFontSize: 9,
};

// ─── Footer Logos ────────────────────────────────────────────────────────────
const ORGANISED_BY = {
  label:          "ORGANISED BY",
  labelX:         12,
  labelY:         462,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  logoPath:       path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX:          12,
  logoY:          478,
  logoWidth:      88,
};

const ASSOCIATION = {
  label:          "IN ASSOCIATION WITH",
  labelX:         213,
  labelY:         462,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  logo1Path:      path.join(ASSETS_LOGO, "rail_chamber.png"),
  logo1X:         213,
  logo1Y:         478,
  logo1Width:     60,
  logo2Path:      path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X:         280,
  logo2Y:         476,
  logo2Width:     36,
};

// ─── Ribbon ──────────────────────────────────────────────────────────────────
const RIBBON = {
  y:        546,
  height:   82,
  textSize: 36,
  textColor: "#FFFFFF",
  font:     "Helvetica-Bold",
};

module.exports = {
  PAGE,
  TOP_STRIP,
  HEADER,
  MANDAPAM,
  HEADER_TEXT,
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