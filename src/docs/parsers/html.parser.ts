import axios from 'axios';
import {
  BadGatewayException,
  BadRequestException,
  RequestTimeoutException,
} from '@nestjs/common';
import { htmlToSections, type ParsedDocument } from './html-to-sections';

export type { ParsedDocument };

const ALLOWED_HOST = 'docs.riido.io';
const FETCH_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export function parseHtml(raw: string): ParsedDocument {
  return htmlToSections(raw);
}

export async function parseUrl(url: string): Promise<ParsedDocument> {
  assertAllowedRiidoDocsUrl(url);

  try {
    const response = await axios.get<string>(url, {
      responseType: 'text',
      timeout: FETCH_TIMEOUT_MS,
      maxRedirects: 5,
      maxContentLength: MAX_RESPONSE_BYTES,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    assertAllowedRiidoDocsUrl(getFinalResponseUrl(response) ?? url);

    const contentType = String(response.headers?.['content-type'] ?? '').toLowerCase();
    if (!contentType.includes('text/html')) {
      throw new BadRequestException('HTML 문서만 URL 등록할 수 있습니다.');
    }

    const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    if (Buffer.byteLength(html, 'utf-8') > MAX_RESPONSE_BYTES) {
      throw new BadRequestException('URL 문서 크기는 5MB 이하여야 합니다.');
    }

    return parseHtml(html);
  } catch (err: unknown) {
    if (
      err instanceof BadRequestException ||
      err instanceof RequestTimeoutException ||
      err instanceof BadGatewayException
    ) {
      throw err;
    }

    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? (err as { code?: string }).code
        : undefined;
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      throw new RequestTimeoutException('URL 문서 요청 시간이 초과되었습니다.');
    }

    const message =
      typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: string }).message)
        : '';
    if (message.includes('maxContentLength')) {
      throw new BadRequestException('URL 문서 크기는 5MB 이하여야 합니다.');
    }

    throw new BadGatewayException('URL 문서를 가져오지 못했습니다.');
  }
}

function assertAllowedRiidoDocsUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('올바른 URL을 입력하세요.');
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== ALLOWED_HOST) {
    throw new BadRequestException('https://docs.riido.io/ URL만 등록할 수 있습니다.');
  }
}

function getFinalResponseUrl(response: unknown): string | undefined {
  const maybeResponse = response as {
    request?: { res?: { responseUrl?: string } };
  };
  return maybeResponse.request?.res?.responseUrl;
}
