// badgeTheme.js — RailTrans Expo 2026
"use strict";

module.exports = function getBadgeTheme({ entity, isPaid }) {
  const normalized = (entity || "").toLowerCase();

  if (["visitor", "visitors"].includes(normalized)) {
    return isPaid
      ? { ribbon: "DELEGATE", color: "#C8102E" }
      : { ribbon: "VISITOR", color: "#1E40AF" };
  }

  if (normalized === "exhibitor" || normalized === "exhibitors")
    return { ribbon: "EXHIBITOR", color: "#2E7D32" };

  if (normalized === "partner" || normalized === "partners")
    return { ribbon: "PARTNER", color: "#1565C0" };

  if (normalized === "speaker" || normalized === "speakers")
    return { ribbon: "SPEAKER", color: "#6A1B9A" };

  if (normalized === "awardee" || normalized === "awardees")
    return { ribbon: "AWARDEE", color: "#EF6C00" };

  throw new Error(`Invalid badge entity: ${entity}`);
};