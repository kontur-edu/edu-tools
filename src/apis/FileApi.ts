import * as fs from 'fs';

export interface Row {
  columns: string[];
}

export class FileApi {
  readFromCsv(
    filePath: string,
    skipHeader = false,
    separator = ';'
  ): Row[] {
    const text = stripBOM(fs.readFileSync(filePath, 'utf8'));
    const lines = text.split('\r\n');
  
    const result: Row[] = [];
    let needSkip = skipHeader;
    for (const line of lines) {
      if (needSkip) {
        needSkip = false;
        continue;
      }
  
      if (line) {
        const parts = line.split(separator);
        result.push({
          columns: parts,
        });
      }
    }
    return result;
  }
}

function stripBOM(content: string) {
  // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
  // because the buffer-to-string conversion in `fs.readFileSync()`
  // translates it to FEFF, the UTF-16 BOM.
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  return content;
}
