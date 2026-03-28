// badgeConfig.js — RailTrans Expo 2026
"use strict";

const path = require("path");

// Asset paths
const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.join(__dirname, "..", "assets", "logos");

// ─── Page Size ────────────────────────────────────────────────────────────────
const PAGE = { width: 400, height: 628 };

// ─── Top Strip ───────────────────────────────────────────────────────────────
const TOP_STRIP = { y: 0, height: 8 };

// ─── Header Section ──────────────────────────────────────────────────────────
const HEADER = {
  y:       8,
  height:  85,
  bgColor: "#FFFFFF",
};

// Date Pills (03 and 04)
const DATE_PILLS = {
  pill1: { text: "03", x: 145, y: 25, width: 45, height: 45, bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 24 },
  pill2: { text: "04", x: 210, y: 25, width: 45, height: 45, bgColor: "#1B3A8A", textColor: "#FFFFFF", fontSize: 24 },
  monthY: 80,
};

// ─── Tagline ─────────────────────────────────────────────────────────────────
const TAGLINE = {
  y:               93,
  height:          40,
  text:            "Asia's Second Largest Event for Railways, Transportation & Semiconductor Industry",
  fontSize:        7,
  textColor:       "#333333",
};

// ─── Body ────────────────────────────────────────────────────────────────────
const BODY = {
  startY:         133,
  endY:           528,
  bgColor:        "#F5F5F5",
};

// ─── QR Card ─────────────────────────────────────────────────────────────────
const QR_CARD = {
  width:       160,
  height:      160,
  get x()     { return (PAGE.width - this.width) / 2; },
  y:           145,
  bgColor:     "#FFFFFF",
  borderColor: "#DDDDDD",
  borderWidth: 1,
};

const QR = { size: 140 };

// ─── Main Title ──────────────────────────────────────────────────────────────
const MAIN_TITLE = {
  text: "RAILTRANS EXPO",
  y:    325,
  fontSize: 24,
  textColor: "#1B3A8A",
};

// ─── Organizer Section ───────────────────────────────────────────────────────
const ORGANISER = {
  label: "ORGANISED BY",
  labelY: 375,
  labelFontSize: 8,
  labelColor: "#666666",
  logoPath: path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX: (PAGE.width - 100) / 2,
  logoY: 390,
  logoWidth: 100,
};

// ─── Ribbon (Bottom) ─────────────────────────────────────────────────────────
const RIBBON = {
  y:        460,
  height:   168,
  textSize: 48,
  textColor: "#FFFFFF",
  font:     "Helvetica-Bold",
};

module.exports = {
  PAGE,
  TOP_STRIP,
  HEADER,
  DATE_PILLS,
  TAGLINE,
  BODY,
  QR_CARD,
  QR,
  MAIN_TITLE,
  ORGANISER,
  RIBBON,
  ASSETS_BG,
  ASSETS_LOGO,
};