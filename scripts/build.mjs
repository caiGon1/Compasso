import fs from "node:fs";
import path from "node:path";
const assets = {};
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else
      assets["/" + path.relative("dist", p).replaceAll("\\", "/")] = {
        body: fs.readFileSync(p, "utf8"),
        type: p.endsWith(".js")
          ? "application/javascript; charset=utf-8"
          : p.endsWith(".css")
            ? "text/css; charset=utf-8"
            : "text/html; charset=utf-8",
      };
  }
}
walk("dist");
let api = fs
  .readFileSync("server/api.js", "utf8")
  .replace(
    "import {lessons,questionsFor,unlocked} from '../src/content.js';",
    "",
  )
  .replace("export async function api", "async function api");
const content = fs
  .readFileSync("src/content.js", "utf8")
  .replaceAll("export ", "");
fs.mkdirSync("dist/server", { recursive: true });
fs.writeFileSync(
  "dist/server/index.js",
  content +
    "\n" +
    api +
    "\nconst assets=" +
    JSON.stringify(assets) +
    `;export default {async fetch(req,env){const p=new URL(req.url).pathname;if(p.startsWith('/api/'))return api(req,env.DB);const a=assets[p]||assets['/index.html'];return new Response(a.body,{headers:{'Content-Type':a.type,'X-Content-Type-Options':'nosniff'}})}};`,
);
console.log("Worker React e API gerados.");
