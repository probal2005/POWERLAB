const formula = /^[\t\r\n ]*[=+\-@]|^[\t\r\n]/;

export function exportTranslationCsv(rows: [string, string, string][]) {
  const quote = (value: string) => '"' + (formula.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
  return ['key,source,translation', ...rows.map((row) => row.map(quote).join(','))].join('\r\n');
}

export function parseTranslationCsv(source: string): [string, string][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let closed = false;
  const finishField = () => { row.push(field); field = ''; closed = false; };
  const finishRow = () => {
    finishField();
    if (row.some(Boolean)) rows.push(row);
    row = [];
  };

  const input = source.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char !== '"') field += char;
      else if (input[i + 1] === '"') { field += '"'; i++; }
      else { quoted = false; closed = true; }
    } else if (char === ',') finishField();
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      finishRow();
    } else if (char === '"' && !field && !closed) quoted = true;
    else if (char === '"' || closed) throw new Error('Invalid CSV quoting.');
    else field += char;
  }
  if (quoted) throw new Error('The CSV ends inside a quoted field.');
  finishRow();
  const header = rows.shift();
  const hasSource = header?.join(',') === 'key,source,translation';
  const validHeader = hasSource || header?.join(',') === 'key,translation';
  if (!validHeader || rows.some((entry) => entry.length !== (hasSource ? 3 : 2))) {
    throw new Error('Use the exported CSV template with key, source and translation columns.');
  }

  return rows.map((row) => {
    const value = row[hasSource ? 2 : 1];
    return [row[0], value.startsWith("'") && formula.test(value.slice(1)) ? value.slice(1) : value];
  });
}
