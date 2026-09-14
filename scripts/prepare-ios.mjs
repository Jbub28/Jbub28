import { writeFileSync } from "node:fs";

const url = (process.env.CAPACITOR_SERVER_URL || process.env.APP_ORIGIN || "").replace(/\/$/, "");
writeFileSync("native-web/server-default.json", `${JSON.stringify({ url }, null, 2)}\n`);
console.log(`iOS shell default server: ${url || "(testers will type a URL)"}`);
