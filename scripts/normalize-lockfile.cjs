const fs = require("node:fs");
const path = require("node:path");
const file = path.join(__dirname, "../package-lock.json");
const lock = JSON.parse(fs.readFileSync(file, "utf8"));
for (const [key, value] of Object.entries(lock.packages)) {
  if (/^[A-Za-z]:\//.test(key) && value.extraneous) delete lock.packages[key];
}
fs.writeFileSync(file, JSON.stringify(lock, null, 2) + "\n");
