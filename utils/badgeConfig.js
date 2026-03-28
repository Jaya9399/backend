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
  height:  95,
  bgColor: "#F5EFD6",
};

const RAILTRANS_LOGO = {
  path:  path.join(ASSETS_LOGO, "railtranslogo.png"),
  x:     12,
  y:     18,
  width: 130,
};

const MANDAPAM = {
  path:  path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x:     PAGE.width - 70,
  y:     16,
  width: 60,
};

// Edition Pill (6th EDITION)
const EDITION_PILL = {
  text: "6th EDITION",
  x:    275,
  y:    18,
  bgColor: "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize: 8,
};

// Date Pills
const DATE_PILLS = {
  pill1: { text: "03", x: 245, y: 55, width: 34, height: 34, bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 18 },
  pill2: { text: "04", x: 286, y: 55, width: 34, height: 34, bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 18 },
  monthY: 96,
  venueY: 112,
};

// ─── Tagline Bar ─────────────────────────────────────────────────────────────
const TAGLINE = {
  y:               105,
  height:          30,
  bgColor:         "#EFEFEF",
  text:            "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  pillBgColor:     "#FFFFFF",
  pillBorderColor: "#C8102E",
  textColor:       "#222222",
  fontSize:        6.5,
};

// ─── Body ────────────────────────────────────────────────────────────────────
const BODY = {
  startY:         135,
  endY:           525,
  bgColor:        "#D8EEF8",
  bgImage:        path.join(ASSETS_BG, "bg.jpeg"),
  overlayOpacity: 225,
};

// ─── QR Card ─────────────────────────────────────────────────────────────────
const QR_CARD = {
  width:       190,
  height:      200,
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           147,
  radius:      10,
  bgColor:     "#FFFFFF",
  borderColor: "#CCCCCC",
  borderWidth: 0.8,
};

const QR = { size: 145 };

// ─── Text Areas ──────────────────────────────────────────────────────────────
const TEXT_AREA = {
  nameY:           357,
  companyY:        377,
  nameFontSize:    14,
  companyFontSize: 9,
};

// ─── Footer Logos with Pills ─────────────────────────────────────────────────
const ORGANISED_BY = {
  label:          "ORGANISED BY",
  labelX:         12,
  labelY:         397,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logoPath:       path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX:          12,
  logoY:          413,
  logoWidth:      85,
};

const ASSOCIATION = {
  label:          "IN ASSOCIATION WITH",
  labelX:         220,
  labelY:         397,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logo1Path:      path.join(ASSETS_LOGO, "rail_chamber.png"),
  logo1X:         220,
  logo1Y:         413,
  logo1Width:     55,
  logo2Path:      path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X:         285,
  logo2Y:         411,
  logo2Width:     32,
};

// ─── Ribbon (Full-width pill) ──────────────────────────────────────────────────
const RIBBON = {
  y:        525,
  height:   103,
  textSize: 36,
  textColor: "#FFFFFF",
  font:     "Helvetica-Bold",
  borderRadius: 20,
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