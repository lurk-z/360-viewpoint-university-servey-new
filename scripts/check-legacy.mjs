import { readFile } from 'node:fs/promises';

const filename = new URL('../360-tour-offline.html', import.meta.url);
const html = await readFile(filename, 'utf8');

if (!/<\/script>\s*<\/body>\s*<\/html>\s*$/i.test(html)) {
  throw new Error('360-tour-offline.html is incomplete');
}

const start = html.lastIndexOf('<script>');
const end = html.indexOf('</script>', start);
if (start < 0 || end < 0) {
  throw new Error('Legacy application script was not found');
}

const applicationScript = html.slice(start + '<script>'.length, end);
new Function(applicationScript);
console.log('Legacy offline HTML syntax OK');
