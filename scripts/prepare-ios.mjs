import { writeFileSync } from "node:fs";

const DEFAULT_SERVER_URL = "https://jbub28-production.up.railway.app";
const url = (process.env.CAPACITOR_SERVER_URL || process.env.APP_ORIGIN || DEFAULT_SERVER_URL).replace(
  /\/$/,
  "",
);
writeFileSync("native-web/server-default.json", `${JSON.stringify({ url }, null, 2)}\n`);
console.log(`iOS shell default server: ${url}`);
