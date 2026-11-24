const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const rawDir = path.join(root, 'assets', 'raw', 'audio');
const publicDir = path.join(root, 'public', 'audio');
const bitrate = 128000;

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw new Error(`${command} is required: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function inspect(file) {
  return JSON.parse(run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration,bit_rate:stream=codec_type,bit_rate',
    '-of', 'json', file,
  ]));
}

function main() {
  const check = process.argv.includes('--check');
  if (!fs.existsSync(rawDir)) throw new Error('Missing assets/raw/audio; restore the original music sources.');

  const names = fs.readdirSync(rawDir).filter((name) => name.endsWith('.mp3')).sort();
  if (names.length === 0) throw new Error('No raw music tracks found.');
  let sourceBytes = 0;
  let publishedBytes = 0;
  for (const name of names) {
    const source = path.join(rawDir, name);
    const published = path.join(publicDir, name);
    if (!check) {
      run('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', source,
        '-map', '0:a:0', '-vn', '-map_metadata', '-1',
        '-c:a', 'libmp3lame', '-b:a', '128k', published,
      ]);
    }
    if (!fs.existsSync(published)) throw new Error(`Missing public audio: ${name}`);
    const original = inspect(source);
    const output = inspect(published);
    const audio = output.streams.filter((stream) => stream.codec_type === 'audio');
    const durationDifference = Math.abs(Number(original.format.duration) - Number(output.format.duration));
    if (audio.length !== 1 || output.streams.length !== 1 ||
        Number(audio[0].bit_rate) > bitrate || durationDifference > 0.1) {
      throw new Error(`Public audio does not match the optimized profile: ${name}`);
    }
    const before = fs.statSync(source).size;
    const after = fs.statSync(published).size;
    if (after >= before) throw new Error(`Public audio is not smaller than its source: ${name}`);
    sourceBytes += before;
    publishedBytes += after;
  }
  const publicNames = fs.readdirSync(publicDir).filter((name) => name.endsWith('.mp3')).sort();
  if (publicNames.join() !== names.join()) throw new Error('Public and raw music track lists differ.');
  console.log(`${check ? 'Verified' : 'Optimized'} public audio: ${(sourceBytes / 1048576).toFixed(2)} MiB raw → ${(publishedBytes / 1048576).toFixed(2)} MiB public`);
}

try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
