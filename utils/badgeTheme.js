

module.exports = function getBadgeTheme({ entity, isPaid }) {
  // Visitors:  DELEGATE (red) if paid, VISITOR (blue) if free
  if (entity === "visitors") {
    return isPaid
      ? { ribbon: "DELEGATE", color:  "#C8102E" } // Red
      : { ribbon: "VISITOR", color: "#1E40AF" }; // Blue
  }

  // Exhibitors: Green
  if (entity === "exhibitors") {
    return { ribbon: "EXHIBITOR", color: "#2E7D32" }; // Green
  }

  // Partners:  Blue
  if (entity === "partners") {
    return { ribbon: "PARTNER", color: "#1565C0" }; // Blue
  }

  // Speakers:  Purple
  if (entity === "speakers") {
    return { ribbon: "SPEAKER", color: "#6A1B9A" }; // Purple
  }

  // Awardees: Orange
  if (entity === "awardees") {
    return { ribbon:  "AWARDEE", color:  "#EF6C00" }; // Orange
  }

  // Fallback for unknown entities
  return { ribbon:  "ATTENDEE", color: "#374151" }; // Gray
};