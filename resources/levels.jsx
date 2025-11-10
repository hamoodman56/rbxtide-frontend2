export const levels = Object.entries({
  "1": 1000,
  "2": 3000,
  "3": 5000,
  "4": 6000,
  "5": 8000,
  "6": 9000,
  "7": 11000,
  "8": 13000,
  "9": 15000,
  "10": 17000,
  "11": 19000,
  "12": 21000,
  "13": 23000,
  "14": 25000,
  "15": 27000,
  "16": 30000,
  "17": 32000,
  "18": 34000,
  "19": 36000,
  "20": 40000,
  "21": 45000,
  "22": 50000,
  "23": 55000,
  "24": 60000,
  "25": 65000,
  "26": 70000,
  "27": 73000,
  "28": 74000,
  "29": 77000,
  "30": 82000,
  "31": 86000,
  "32": 90000,
  "33": 95000,
  "34": 100000,
  "35": 105000,
  "36": 106000,
  "37": 107000,
  "38": 108000,
  "39": 110000,
  "40": 115000,
  "41": 120000,
  "42": 125000,
  "43": 130000,
  "44": 135000,
  "45": 140000,
  "46": 142000,
  "47": 143000,
  "48": 144000,
  "49": 145000,
  "50": 150000,
  "51": 155000,
  "52": 160000,
  "53": 165000,
  "54": 170000,
  "55": 175000,
  "56": 180000,
  "57": 185000,
  "58": 190000,
  "59": 195000,
  "60": 205000,
  "61": 210000,
  "62": 220000,
  "63": 225000,
  "64": 235000,
  "65": 240000,
  "66": 250000,
  "67": 255000,
  "68": 265000,
  "69": 270000,
  "70": 280000,
  "71": 290000,
  "72": 300000,
  "73": 310000,
  "74": 320000,
  "75": 330000,
  "76": 340000,
  "77": 350000,
  "78": 360000,
  "79": 370000,
  "80": 380000,
  "81": 390000,
  "82": 400000,
  "83": 410000,
  "84": 420000,
  "85": 450000,
  "86": 460000,
  "87": 470000,
  "88": 480000,
  "89": 510000,
  "90": 540000,
  "91": 560000,
  "92": 580000,
  "93": 600000,
  "94": 620000,
  "95": 650000,
  "96": 680000,
  "97": 710000,
  "98": 730000,
  "99": 760000,
  "100": 800000,
  "101": 2000000000
}).sort((a, b) => b[1] - a[1])

export function levelToXP(level) {
  let entry = levels.find(lvl => +lvl[0] === level)
  return entry ? entry[1] : 0
}

export function progressToNextLevel(xp) {
  if (typeof xp !== 'number') return 0

  let prevRequired = xpForLevel(xp)
  let xpRequired = getUserNextLevel(xp)
  return (xpRequired - xp) / (xpRequired - prevRequired) * 100
}

export function getUserNextLevel(xp) {
  if (typeof xp !== 'number') return 0
  if (xp > 100000000) { return 1 }

  for (let i = 0; i < levels.length; i++) {
    const [level, xpRequired] = levels[i];
    if (xp >= xpRequired) return levels[i - 1][1] || 0;
  }
  return 100
}

export function xpForLevel(xp) {
  if (typeof xp !== 'number') return xp

  for (let i = 0; i < levels.length; i++) {
    const [level, xpRequired] = levels[i];
    if (xp >= xpRequired) return xpRequired;
  }
  return 0
}

export function getUserLevel(xp) {
  if (typeof xp !== 'number') return xp
  if (xp > 100000000) { return 100 }

  for (let i = 0; i < levels.length; i++) {
    const [level, xpRequired] = levels[i];
    if (xp >= xpRequired) return +level;
  }
  return 0
}
