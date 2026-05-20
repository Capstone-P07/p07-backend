import axios from 'axios';
import { BadRequestException, RequestTimeoutException } from '@nestjs/common';
import { parseUrl } from './html.parser';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('parseUrl', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  it('fetches and parses an allowed docs.riido.io HTML page', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: '<html><body><h1>Riido 도움말</h1><p>색인 가능한 본문입니다. '.repeat(3) + '</p></body></html>',
      headers: { 'content-type': 'text/html; charset=utf-8' },
      request: { res: { responseUrl: 'https://docs.riido.io/guide/start' } },
    });

    const parsed = await parseUrl('https://docs.riido.io/guide/start');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://docs.riido.io/guide/start',
      expect.objectContaining({
        maxRedirects: 5,
        responseType: 'text',
        timeout: 5000,
      }),
    );
    expect(parsed.title).toBe('Riido 도움말');
    expect(parsed.sections[0].content).toContain('색인 가능한 본문');
  });

  it('rejects non-allowed hosts before fetching', async () => {
    await expect(parseUrl('https://example.com/guide')).rejects.toThrow(BadRequestException);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('rejects redirected responses outside docs.riido.io', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: '<html><body><h1>Moved</h1><p>본문입니다.</p></body></html>',
      headers: { 'content-type': 'text/html' },
      request: { res: { responseUrl: 'https://evil.example/guide' } },
    });

    await expect(parseUrl('https://docs.riido.io/guide')).rejects.toThrow(BadRequestException);
  });

  it('rejects non-HTML responses', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: '{"ok":true}',
      headers: { 'content-type': 'application/json' },
      request: { res: { responseUrl: 'https://docs.riido.io/api' } },
    });

    await expect(parseUrl('https://docs.riido.io/api')).rejects.toThrow(BadRequestException);
  });

  it('maps axios timeout to RequestTimeoutException', async () => {
    mockedAxios.get.mockRejectedValueOnce({ code: 'ECONNABORTED' });

    await expect(parseUrl('https://docs.riido.io/slow')).rejects.toThrow(RequestTimeoutException);
  });
});
