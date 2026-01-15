// utils/emailRoleConfig.js

module.exports = {
  visitors: {
    allowUpgrade: true,
    attachBadge: true,
    subjectPrefix: "Your Visitor E-Badge",
  },

  exhibitors: {
    allowUpgrade: false,
    attachBadge: true,
    subjectPrefix: "Your Exhibitor Pass",
  },

  partners: {
    allowUpgrade: false,
    attachBadge: true,
    subjectPrefix: "Your Partner Badge",
  },

  speakers: {
    allowUpgrade: false,
    attachBadge: true,
    subjectPrefix: "Speaker Confirmation & Badge",
  },

  awardees: {
    allowUpgrade: false,
    attachBadge: true,
    subjectPrefix: "Awardee Registration Confirmation",
  },
};
