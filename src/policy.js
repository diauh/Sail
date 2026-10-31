require("./config");

function check({ mb, minutes }) {
  const maxMb = Number(process.env.MAX_MB);
  const maxMinutes = Number(process.env.MAX_MINUTES);

  if (!Number.isFinite(maxMb) || maxMb <= 0) {
    return { approved: false, reason: "MAX_MB must be a positive number." };
  }
  if (!Number.isFinite(maxMinutes) || maxMinutes <= 0) {
    return { approved: false, reason: "MAX_MINUTES must be a positive number." };
  }
  if (!Number.isFinite(mb) || mb <= 0) {
    return { approved: false, reason: "MB must be a positive number." };
  }
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return { approved: false, reason: "Minutes must be a positive number." };
  }
  if (mb > maxMb) {
    return { approved: false, reason: `Requested ${mb}MB exceeds the ${maxMb}MB lender cap.` };
  }
  if (minutes > maxMinutes) {
    return { approved: false, reason: `Requested ${minutes} minutes exceeds the ${maxMinutes}-minute lender cap.` };
  }
  return { approved: true, reason: "Approved by lender policy." };
}

module.exports = { check };
