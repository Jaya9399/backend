const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const mongo = require("../utils/mongoClient");
const { generateBadgePDF } = require("../utils/badgeGenerator"); // YOU must export this

async function obtainDb() {
  if (mongo.getDb) return await mongo.getDb();
  return mongo.db;
}

router.get("/:entity/:id", async (req, res) => {
  try {
    const { entity, id } = req.params;
    const db = await obtainDb();

    const allowed = ["visitors", "speakers", "exhibitors", "partners", "awardees"];
    if (!allowed.includes(entity)) {
      return res.status(400).send("Invalid ticket type");
    }

    const collection = db.collection(entity);
    const doc = await collection.findOne({ _id: new ObjectId(id) });

    if (!doc) return res.status(404).send("Ticket not found");

    // 🔥 SERVER-SIDE PDF GENERATION
    const pdfBuffer = await generateBadgePDF(entity, doc);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=RailTrans-${entity}-${doc.ticket_code}.pdf`
    );

    res.send(pdfBuffer);
  } catch (err) {
    console.error("[ticketDownload]", err);
    res.status(500).send("Failed to generate ticket");
  }
});

module.exports = router;
