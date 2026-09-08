import { mkdir, readFile, writeFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source = await readFile(new URL("../js/projects.js", import.meta.url), "utf8");
const context = { window: {} };
runInNewContext(source, context);
const projects = context.window.RTLC_PROJECTS;
const outputRoot = new URL("../assets/boosty/", import.meta.url);
await mkdir(outputRoot, { recursive: true });

const results = [];
for (const project of projects) {
  const response = await fetch(project.boosty);
  if (!response.ok) throw new Error(`${project.id}: Boosty returned ${response.status}`);
  const html = await response.text();
  const stateMatch = html.match(/<script type="text\/plain" id="initial-state">([\s\S]*?)<\/script>/);
  if (!stateMatch) throw new Error(`${project.id}: initial-state was not found`);

  const state = JSON.parse(stateMatch[1]);
  const post = state.posts.postsList.data.posts.find((item) => item.id && project.boosty.includes(item.id));
  if (!post) throw new Error(`${project.id}: post data was not found`);
  const images = post.data.filter((item) => item.type === "image" && item.url);
  const selected = images.slice(0, 5);

  for (const [index, image] of selected.entries()) {
    const suffix = index === 0 ? "banner" : `example-${index}`;
    const width = index === 0 ? 920 : 1400;
    const separator = image.url.includes("?") ? "&" : "?";
    const imageResponse = await fetch(`${image.url}${separator}mw=${width}`);
    if (!imageResponse.ok) throw new Error(`${project.id}/${suffix}: image returned ${imageResponse.status}`);
    await writeFile(new URL(`${project.id}-${suffix}.jpg`, outputRoot), Buffer.from(await imageResponse.arrayBuffer()));
  }

  results.push({ id: project.id, available: images.length, imported: selected.length });
  process.stdout.write(`${project.id}: ${selected.length}/${images.length}\n`);
}

await writeFile(new URL("manifest.json", outputRoot), `${JSON.stringify(results, null, 2)}\n`);
