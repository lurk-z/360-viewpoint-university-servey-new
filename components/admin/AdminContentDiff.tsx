function flatten(value: unknown, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`).forEach((text, key) => result.set(key, text)));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key).forEach((text, path) => result.set(path, text)));
  } else {
    result.set(prefix || 'value', value === undefined ? '' : String(value));
  }
  return result;
}

export default function AdminContentDiff({ draft, published }: {
  readonly draft: Record<string, unknown>;
  readonly published: Record<string, unknown>;
}) {
  const before = flatten(published);
  const after = flatten(draft);
  const keys = [...new Set([...before.keys(), ...after.keys()])].filter((key) => before.get(key) !== after.get(key));
  if (!keys.length) return <p className="admin-editor-note">ฉบับร่างตรงกับข้อมูลที่เผยแพร่อยู่</p>;
  return <div className="admin-content-diff"><p>พบการเปลี่ยนแปลง {keys.length} ช่อง</p>{keys.slice(0, 80).map((key) => <article key={key}><code>{key}</code><div><span>เผยแพร่อยู่</span><p>{before.get(key) || '—'}</p></div><div><span>ฉบับร่าง</span><p>{after.get(key) || '—'}</p></div></article>)}</div>;
}
