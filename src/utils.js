export const AVATAR_COLORS = [
  "#e07090","#f0c040","#60c0b0","#9080e0",
  "#f07050","#50b0e0","#80d060","#e09040",
];

export function getAvatarColor(initials) {
  let hash = 0;
  for (const c of initials) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export function getInitials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return "ora";
  if (diff < 3600)  return `${Math.floor(diff / 60)} min fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ore fa`;
  return `${Math.floor(diff / 86400)} gg fa`;
}
