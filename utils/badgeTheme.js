module.exports = function getBadgeTheme({ entity, isPaid }) {
  if (entity === "visitors") {
    return isPaid
      ? { ribbon: "DELEGATE", color: "#C8102E" } // Red
      : { ribbon: "VISITOR", color: "#1E40AF" }; // Blue
  }

  if (entity === "exhibitors") {
    return { ribbon: "EXHIBITOR", color: "#2E7D32" };
  }

  if (entity === "partners") {
    return { ribbon: "PARTNER", color: "#1565C0" };
  }

  if (entity === "speakers") {
    return { ribbon: "SPEAKER", color: "#6A1B9A" };
  }

  if (entity === "awardees") {
    return { ribbon: "AWARDEE", color: "#EF6C00" };
  }

  throw new Error(`Invalid badge entity: ${entity}`);
};
