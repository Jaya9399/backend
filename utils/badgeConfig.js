const path = require("path");

module.exports = {
  PAGE: {
    width: 360,
    height: 520,
  },

  BACKGROUND: {
    path: path.join(__dirname, "../assets/bg/demo_bg.jpg"),
    opacity: 0.18,
  },

  TOP_STRIP: {
    height: 18,
  },

  HEADER: {
    height: 90,
    bgColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },

  LOGOS: {
    railTrans: {
      path: path.join(
        __dirname,
        "../assets/logos/railtrans_logo_2026.png"
      ),
      x: 15,
      y: 25,
      width: 110,
    },

    bharatMandapam: {
      path: path.join(
        __dirname,
        "../assets/logos/bharat_mandapam.png"
      ),
      x: 255,
      y: 22,
      width: 75,
    },

    urbanInfra: {
      path: path.join(
        __dirname,
        "../assets/logos/Urban_Infra_Group_Logo-HD.png"
      ),
      x: 25,
      y: 60,
      width: 70,
    },

    railChamber: {
      path: path.join(
        __dirname,
        "../assets/logos/rail_chamber.png"
      ),
      x: 250,
      y: 60,
      width: 70,
    },

    indianRailways: {
      path: path.join(
        __dirname,
        "../assets/logos/Indian_Railway_Logo_2.png"
      ),
      x: 145,
      y: 60,
      width: 70,
    },
  },

  NAME: {
    y: 155,
    size: 18,
  },

  COMPANY: {
    y: 180,
    size: 11,
  },

  QR: {
    y: 220,
    sizeEmail: 170,
    sizeScan: 200,
  },

  RIBBON: {
    y: 460,
    height: 60,
    fontSize: 26,
  },

  FOOTER: {
    y: 495,
    size: 8,
  },
};
