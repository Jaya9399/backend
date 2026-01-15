// backend/utils/badgeTheme.js

module.exports = function getBadgeTheme({ entity, isPaid }) {
  if (entity === "visitors") {
    return isPaid
      ? { ribbon: "DELEGATE", color: "#C8102E" } // Red
      : { ribbon: "VISITOR", color: "#1E40AF" }; // Blue
  }

  if (["exhibitors", "partners", "speakers"].includes(entity)) {
    return {
      ribbon: entity.slice(0, -1).toUpperCase(),
      color: "#C8102E", // Red
    };
  }

  if (entity === "awardees") {
    return { ribbon: "AWARDEE", color: "#B8860B" }; // Dark Golden
  }

  return { ribbon: "ATTENDEE", color: "#374151" };
};
