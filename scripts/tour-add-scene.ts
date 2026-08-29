import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { z } from 'zod';

const sceneIdSchema = z.string().trim().min(2).max(80).regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
const prompt = createInterface({ input, output });
try {
  const id = sceneIdSchema.parse(await prompt.question('Scene ID (ตัวอักษรอังกฤษ): '));
  const panorama = (await prompt.question('Panorama URL หรือ /mainimages/ชื่อไฟล์.jpg: ')).trim();
  const titleTh = (await prompt.question('ชื่อภาษาไทย: ')).trim();
  const titleEn = (await prompt.question('ชื่อภาษาอังกฤษ: ')).trim();
  const scene = {
    id, panorama, title: { th: titleTh, en: titleEn },
    description: { th: 'กรุณากรอกรายละเอียดใน Visual Tour Editor', en: 'Please complete this description in the Visual Tour Editor.' },
    tags: { th: ['ฉากใหม่'], en: ['new scene'] },
    initialView: { yaw: 0, pitch: 0, zoom: 22 }, mapPosition: { x: 0, y: 0 }, hotspots: []
  };
  const outputFile = `tour-scene-${id}.json`;
  await writeFile(outputFile, `${JSON.stringify(scene, null, 2)}\n`, 'utf8');
  console.log(`สร้าง ${outputFile} แล้ว นำเข้าและตรวจตำแหน่งใน Admin → โครงสร้างทัวร์`);
} finally { prompt.close(); }
