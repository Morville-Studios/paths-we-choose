const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const publication = JSON.parse(read('publication.json'));
const html = read('index.html');
const sitemap = read('public/sitemap.xml');
const robots = read('public/robots.txt');
const manifest = JSON.parse(read('public/manifest.webmanifest'));
const headers = read('public/_headers');
const canonical = publication.canonicalUrl;
const route = publication.route;

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function tagValue(tagName, keyAttribute, keyValue, valueAttribute) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'g')) ?? [];
  const tag = tags.find(candidate => attribute(candidate, keyAttribute) === keyValue);
  assert.ok(tag, `Missing ${tagName} ${keyAttribute}="${keyValue}"`);
  const value = attribute(tag, valueAttribute);
  assert.ok(value, `Missing ${valueAttribute} on ${tagName} ${keyValue}`);
  return value;
}

assert.equal(route, '/', 'Standalone game must use the subdomain root');
assert.equal(new URL(canonical).pathname, route, 'Publication URL and route differ');
assert.equal(tagValue('link', 'rel', 'canonical', 'href'), canonical);
assert.equal(tagValue('meta', 'property', 'og:url', 'content'), canonical);

const pageTitle = html.match(/<title>([^<]+)<\/title>/)?.[1];
assert.ok(pageTitle?.startsWith(publication.publicName), 'Page title must start with the public game name');
const description = tagValue('meta', 'name', 'description', 'content');
assert.ok(description.includes(publication.publicName) && description.includes('card game'), 'Description must identify the game and genre');
assert.ok(!/<meta\s+name="keywords"/i.test(html), 'Do not add an ignored meta keywords tag');
const initialApp = html.match(/<div id="app">([\s\S]*?)<\/div>/)?.[1];
assert.ok(initialApp && new RegExp(`<h1\\b[^>]*>${publication.publicName}<\\/h1>`).test(initialApp), 'Initial HTML must expose the game title before JavaScript');

const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
assert.ok(jsonLd, 'Missing JSON-LD');
const graph = JSON.parse(jsonLd)['@graph'];
const game = graph.find(node => node['@type'] === 'VideoGame');
assert.ok(game, 'Missing VideoGame structured data');
assert.equal(game.name, publication.publicName);
assert.equal(game.url, canonical);
assert.equal(game.offers?.price, 0);
assert.ok(!game.aggregateRating && !game.review, 'Ratings require real player reviews');
const breadcrumb = graph.find(node => node['@type'] === 'BreadcrumbList');
assert.equal(breadcrumb?.itemListElement?.at(-1)?.item, canonical);

const share = tagValue('meta', 'property', 'og:image', 'content');
assert.equal(tagValue('meta', 'name', 'twitter:image', 'content'), share);
assert.equal(game.image, share);
assert.ok(share.startsWith(canonical), 'Share image must use the canonical route');
for (const image of [share, ...Array.from(sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g), match => match[1])]) {
  assert.ok(image.startsWith(canonical), `Image uses another route: ${image}`);
  const relative = image.slice(canonical.length);
  assert.ok(fs.existsSync(path.join(root, 'public', relative)), `Missing public image: ${relative}`);
}

assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), 'Sitemap must list the canonical URL');
assert.ok(robots.includes(`Sitemap: ${canonical}sitemap.xml`), 'Robots file must point to the game sitemap');
assert.ok(manifest.name.startsWith(publication.publicName), 'Manifest has another game name');
assert.ok(headers.includes(route), 'Cache headers must cover the canonical route');
console.log('SEO metadata, structured data, sitemap, and public assets are aligned.');
