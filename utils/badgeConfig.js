const path = require("path");

const ASSETS_BG   = path.join(__dirname, "..", "assets", "bg");
const ASSETS_LOGO = path.resolve(__dirname, "../../assets/logos");

const PAGE = { width: 400, height: 628 };

const TOP_STRIP = { y: 0, height: 14 };

const HEADER = {
  y: 14,
  height: 120,
  bgColor: "#FFFFFF",
};

// Logos
const LOGO_RAILTRANS = {
  path: path.join(ASSETS_LOGO, "railtrans_logo_2026.png"),
  x: 12,
  y: 20,
  width: 130,
};

const MANDAPAM = {
  path: path.join(ASSETS_LOGO, "bharat_mandapam.png"),
  x: PAGE.width - 90,
  y: 20,
  width: 80,
};

// Dates
const DATE_BOX_03 = {
  x: 170, y: 35, w: 45, h: 45,
  text: "03",
  bgColor: "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize: 24,
};

const DATE_BOX_04 = {
  x: 225, y: 35, w: 45, h: 45,
  text: "04",
  bgColor: "#1B3A8A",
  textColor: "#FFFFFF",
  fontSize: 24,
};

const MONTH_YEAR = {
  x: 175,
  y: 88,
  text: "JULY 2026",
  fontSize: 14,
  font: "Helvetica-Bold",
  color: "#000000",
};

const VENUE = {
  x: 175,
  y: 108,
  text: "BHARAT MANDAPAM, NEW DELHI, INDIA",
  fontSize: 7,
  font: "Helvetica",
  color: "#666666",
};

// Tagline
const TAGLINE = {
  y: 134,
  height: 36,
  bgColor: "#F5F5F5",
  text: "Asia's Largest Event for Railways, Transportation & Semiconductor Industry",
  pillColor: "#C8102E",
  textColor: "#FFFFFF",
  fontSize: 7.5,
};

// Body
const BODY = {
  startY: 170,
  bgColor: "#EAF4FB",
  bgImage: path.join(ASSETS_BG, "train_bg.png"), // IMPORTANT
};

const QR_CARD = {
  width: 220,
  height: 220,
  get x() { return (PAGE.width - this.width) / 2; },
  y: 185,
  radius: 12,
  bgColor: "#FFFFFF",
  borderColor: "#DDDDDD",
  borderWidth: 1,
};

const QR = { size: 190 };

// Text
const TEXT_AREA = {
  nameY: 415,
  companyY: 445,
  nameFontSize: 18,
  companyFontSize: 11,
};

// Footer
const FOOTER = {
  y: 500,
  height: 90,
  bgColor: "#FFFFFF",
  borderTopColor: "#EEEEEE",
};

// Organised by
const ORGANISED_BY = {
  label: "ORGANISED BY",
  labelX: 15,
  labelY: 505,
  logoPath: path.join(ASSETS_LOGO, "Urban_Infra_Group_Logo-HD.png"),
  logoX: 15,
  logoY: 525,
  logoWidth: 90,
};

// Association
const ASSOCIATION = {
  label: "IN ASSOCIATION WITH",
  labelX: 220,
  labelY: 505,

  logo1Path: path.join(ASSETS_LOGO, "rail_chamber.png"),
  logo1X: 220,
  logo1Y: 525,
  logo1Width: 70,

  logo2Path: path.join(ASSETS_LOGO, "Indian_Railway_Logo_2.png"),
  logo2X: 300,
  logo2Y: 523,
  logo2Width: 40,
};

// Ribbon
const RIBBON = {
  y: 590,
  height: 38,
  textSize: 28,
  textColor: "#FFFFFF",
  font: "Helvetica-Bold",
};

module.exports = {
  PAGE, TOP_STRIP,
  HEADER, LOGO_RAILTRANS, MANDAPAM,
  DATE_BOX_03, DATE_BOX_04, MONTH_YEAR, VENUE,
  TAGLINE, BODY, QR_CARD, QR, TEXT_AREA,
  FOOTER, ORGANISED_BY, ASSOCIATION,
  RIBBON,
  ASSETS_BG, ASSETS_LOGO,
};