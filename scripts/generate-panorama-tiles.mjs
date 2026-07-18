import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import sharp from 'sharp';

const SOURCE_FILES = [
  'temp1.jpg',
  'temp1-2.jpg',
  'temp1-3.jpg',
  'temp1-3-1.jpg',
  'temp1-4.jpg',
  'temp1-4-1.jpg',
  'temp1-4.5.jpg',
  'temp1-4.9.jpg',
  'temp1-5.jpg',
  'temp1-5-1.jpg',
  'temp1-5-2.jpg',
  'temp2-1.jpg',
  'temp2-2.jpg',
  'temp2-3.jpg',
  'temp2-4.jpg'
];

const CONFIG = Object.freeze({
  width: 7680,
  height: 3840,
  cols: 8,
  rows: 4,
  tileSize: 960,
  baseWidth: 2048,
  baseHeight: 1024,
  tileQuality: 95,
  baseQuality: 85
});

const projectRoot = resolve(import.meta.dirname, '..');
const imageRoot = join(projectRoot, 'public', 'mainimages');
const outputRoot = join(imageRoot, 'tiles');

async function sha256(filePath) {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

async function generateScene(sourceFile) {
  const sourcePath = join(imageRoot, sourceFile);
  const stem = basename(sourceFile, '.jpg');
  const sceneOutput = join(outputRoot, stem);
  const metadata = await sharp(sourcePath).metadata();

  if (metadata.width !== CONFIG.width || metadata.height !== CONFIG.height) {
    throw new Error(
      `${sourceFile} must be ${CONFIG.width}x${CONFIG.height}, received ${metadata.width}x${metadata.height}`
    );
  }

  await rm(sceneOutput, { recursive: true, force: true });
  await mkdir(sceneOutput, { recursive: true });

  const source = sharp(sourcePath, { sequentialRead: true, limitInputPixels: false });
  await source.clone()
    .resize(CONFIG.baseWidth, CONFIG.baseHeight, { fit: 'fill' })
    .jpeg({ quality: CONFIG.baseQuality, chromaSubsampling: '4:2:0' })
    .toFile(join(sceneOutput, 'base.jpg'));

  const jobs = [];
  for (let row = 0; row < CONFIG.rows; row += 1) {
    for (let col = 0; col < CONFIG.cols; col += 1) {
      jobs.push({ col, row });
    }
  }

  for (let index = 0; index < jobs.length; index += 4) {
    await Promise.all(jobs.slice(index, index + 4).map(({ col, row }) => source.clone()
      .extract({
        left: col * CONFIG.tileSize,
        top: row * CONFIG.tileSize,
        width: CONFIG.tileSize,
        height: CONFIG.tileSize
      })
      .jpeg({ quality: CONFIG.tileQuality, chromaSubsampling: '4:4:4' })
      .toFile(join(sceneOutput, `tile-${col}-${row}.jpg`))));
  }

  return {
    source: sourceFile,
    sourceSha256: await sha256(sourcePath),
    directory: stem,
    base: `${stem}/base.jpg`,
    tilePattern: `${stem}/tile-{col}-{row}.jpg`,
    tileCount: CONFIG.cols * CONFIG.rows
  };
}

await mkdir(outputRoot, { recursive: true });
const scenes = [];
for (const sourceFile of SOURCE_FILES) {
  process.stdout.write(`Generating tiles for ${sourceFile}... `);
  scenes.push(await generateScene(sourceFile));
  process.stdout.write('done\n');
}

const manifest = {
  version: 1,
  config: CONFIG,
  scenes
};

await writeFile(join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`Generated ${scenes.length * CONFIG.cols * CONFIG.rows} tiles and ${scenes.length} base images.\n`);
