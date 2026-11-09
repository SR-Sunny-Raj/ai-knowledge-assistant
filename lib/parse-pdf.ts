import { PDFParse } from 'pdf-parse';
import type { SourcePage } from './chunk-text';

type ParsedPdf = {
  pages: SourcePage[];
  pageCount: number;
};

export async function parsePdf(data: Uint8Array): Promise<ParsedPdf> {
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();

    return {
      pages: result.pages.map((page) => ({
        num: page.num,
        text: page.text,
      })),
      pageCount: result.total,
    };
  } finally {
    await parser.destroy();
  }
}
