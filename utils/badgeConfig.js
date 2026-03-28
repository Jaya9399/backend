// badgeConfig.js — RailTrans Expo 2026
"use strict";

const path = require("path");

const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

const PAGE = { width: 400, height: 600 };

const TOP_STRIP = { y: 0, height: 12 };

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
  x:     344,   // 400 - 56, safely inside page
  y:     14,
  width: 52,
};

const EDITION_PILL = {
  text:      "6th EDITION",
  x:         192,
  y:         16,
  bgColor:   "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize:  8,
};

// Date squares start at x:192, each 34px wide + 5px gap
// "JULY 2026" starts immediately after pill2 (192+34+5+34+8 = 273)
// but Mandapam is at x:344, so JULY 2026 has width = 344-273-4 = 67px — too tight for 20px font
// Solution: shrink font or move things. We move monthX to 275, use fontSize 17, single line guaranteed.
const DATE_PILLS = {
  pill1:  { text: "03", x: 192, y: 40, width: 34, height: 34, bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 18 },
  pill2:  { text: "04", x: 231, y: 40, width: 34, height: 34, bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 18 },
  monthX: 272,
  monthY: 38,
  venueX: 272,
  venueY: 60,   // well below JULY 2026 (38 + ~18px font height + 4)
};

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

const BODY = {
  startY:         124,
  endY:           490,
  bgColor:        "#D8EEF8",
  bgImage:        path.join(ASSETS_BG, "bg.jpeg"),
  overlayOpacity: 215,
};

const QR_CARD = {
  width:       255,
  height:      255,
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           132,
  radius:      12,
  bgColor:     "#FFFFFF",
  borderColor: "#DDDDDD",
  borderWidth: 0.8,
};

const QR = { size: 185 };

// QR card bottom: 132 + 255 = 387
const TEXT_AREA = {
  nameY:           395,
  companyY:        412,
  nameFontSize:    13,
  companyFontSize: 9,
};

// Footer: pill at 430, logos at 448, logos are 40px tall max → bottom at 488
// Ribbon starts at 490 — clean 2px gap
const ORGANISED_BY = {
  label:          "ORGANISED BY",
  labelX:         10,
  labelY:         430,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logoPath:       path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX:          10,
  logoY:          448,
  logoWidth:      95,
};

const ASSOCIATION = {
  label:          "IN ASSOCIATION WITH",
  labelX:         205,
  labelY:         430,
  labelBgColor:   "#1B3A8A",
  labelTextColor: "#FFFFFF",
  labelFontSize:  7,
  logo1Path:      path.join(ASSETS_LOGO, "rail_chamber.png"),
  logo1X:         210,
  logo1Y:         448,
  logo1Width:     40,
  logo2Path:      path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X:         258,
  logo2Y:         448,
  logo2Width:     40,
};

// Ribbon: auto-sizes to text — height is set in drawRibbon based on font+padding
const RIBBON = {
  y:            490,
  height:       110,          // fills to page bottom (490+110=600)
  textSize:     42,
  textColor:    "#FFFFFF",
  font:         "Helvetica-Bold",
  borderRadius: 12,
  paddingTop:   22,           // vertical padding above/below text inside ribbon
};

module.exports = {
  PAGE, TOP_STRIP, HEADER,
  RAILTRANS_LOGO, MANDAPAM, EDITION_PILL, DATE_PILLS,
  TAGLINE, BODY, QR_CARD, QR, TEXT_AREA,
  ORGANISED_BY, ASSOCIATION, RIBBON,
  ASSETS_BG, ASSETS_LOGO,
};