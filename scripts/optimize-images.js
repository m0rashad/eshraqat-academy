const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'img');

sharp.cache(false);

function outPath(name) {
  return path.join(OUT, name);
}

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

// { src, base, widths: [{w, suffix}], format: 'jpeg'|'png', quality, fit }
const jobs = [
  // Hero banner — full-bleed, largest asset on the page
  { src: 'ESHRAQAT_Banner_clean.png', base: 'hero-banner', widths: [1920, 960], format: 'png', quality: 82 },

  // Circular portraits — max display 360px, 2x retina = 720
  { src: 'vision_girl_arabic.jpg', base: 'vision-girl', widths: [720, 360], format: 'jpeg', quality: 80 },
  { src: 'Founder.png', base: 'founder', widths: [720, 360], format: 'jpeg', quality: 82 },
  { src: 'Our_Team.png', base: 'our-team', widths: [720, 360], format: 'jpeg', quality: 82 },

  // SABIQAT logo — transparent PNG, max-width 420, 2x = 840
  { src: 'SABIQAT_logo.png', base: 'sabiqat-logo', widths: [840], format: 'png', quality: 90 },

  // Nav logo mark — 84px circle, 2x = 168
  { src: 'logo.png', base: 'logo', widths: [168], format: 'png', quality: 90 },

  // Course topic images (card + modal use) — card ~460px, 2x = 920
  { src: 'Quran.png', base: 'course-quran', widths: [920], format: 'jpeg', quality: 80 },
  { src: 'Hadith.png', base: 'course-hadith', widths: [920], format: 'jpeg', quality: 80 },
  { src: 'Aqeedah.png', base: 'course-aqeedah', widths: [920], format: 'jpeg', quality: 80 },
  { src: 'Fiqh.png', base: 'course-fiqh', widths: [920], format: 'jpeg', quality: 80 },
  { src: 'Seerah.png', base: 'course-seerah', widths: [920], format: 'jpeg', quality: 80 },
  { src: 'Manners.png', base: 'course-manners', widths: [920], format: 'jpeg', quality: 80 },
  { src: 'Pearls_from_the_sahaba.jpeg', base: 'pearls-sahaba', widths: [920], format: 'jpeg', quality: 80 },
  { src: 'Surat_Alkahf.jpeg', base: 'surat-alkahf', widths: [920], format: 'jpeg', quality: 80 },
];

const galleryDirs = [
  { dir: 'Gallery/Eid Cookies', prefix: 'eid-cookies' },
  { dir: 'Gallery/BBQ FIeld Trip', prefix: 'bbq' },
  { dir: 'Gallery/Pickleball Event', prefix: 'pickleball' },
  { dir: 'Gallery/Misc', prefix: 'misc' },
];

async function processJob(job) {
  const srcPath = path.join(ROOT, job.src);
  for (const w of job.widths) {
    const suffix = w === job.widths[0] ? '' : `-${w}`;
    const pipeline = () => sharp(srcPath).resize({ width: w, withoutEnlargement: true });

    const webpOut = outPath(`${job.base}${suffix}.webp`);
    await pipeline().webp({ quality: job.quality }).toFile(webpOut);

    const fallbackExt = job.format === 'png' ? 'png' : 'jpg';
    const fallbackOut = outPath(`${job.base}${suffix}.${fallbackExt}`);
    if (job.format === 'png') {
      await pipeline().png({ quality: job.quality, compressionLevel: 9 }).toFile(fallbackOut);
    } else {
      await pipeline().flatten({ background: '#ece5d6' }).jpeg({ quality: job.quality, mozjpeg: true }).toFile(fallbackOut);
    }
    console.log('done', job.base + suffix);
  }
}

async function processGallery() {
  const galleryOut = path.join(OUT, 'gallery');
  await ensureDir(galleryOut);
  const manifest = {};

  for (const { dir, prefix } of galleryDirs) {
    const full = path.join(ROOT, dir);
    const files = (await fs.promises.readdir(full)).filter(f => /\.(jpe?g|png)$/i.test(f));
    files.sort();
    let i = 1;
    for (const file of files) {
      const srcPath = path.join(full, file);
      const name = `${prefix}-${i}`;
      i++;

      // Thumbnail for grid (720w, 2x of a ~360px tile)
      await sharp(srcPath).rotate().resize({ width: 720, withoutEnlargement: true })
        .webp({ quality: 78 }).toFile(path.join(galleryOut, `${name}-thumb.webp`));
      await sharp(srcPath).rotate().resize({ width: 720, withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(galleryOut, `${name}-thumb.jpg`));

      // Full size for lightbox (1600w cap — plenty for 90vw viewing, far below 5184px original)
      await sharp(srcPath).rotate().resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82 }).toFile(path.join(galleryOut, `${name}-full.webp`));
      await sharp(srcPath).rotate().resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(galleryOut, `${name}-full.jpg`));

      manifest[`${dir}/${file}`] = name;
      console.log('gallery done', dir, file, '->', name);
    }
  }
  await fs.promises.writeFile(path.join(OUT, 'gallery-manifest.json'), JSON.stringify(manifest, null, 2));
}

(async () => {
  await ensureDir(OUT);
  for (const job of jobs) {
    await processJob(job);
  }
  await processGallery();
  console.log('ALL DONE');
})().catch(e => { console.error(e); process.exit(1); });
