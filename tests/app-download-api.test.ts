import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAppDownloadContent } from '@/shared/api/appDownload'

describe('fetchAppDownloadContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads public download data without auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        title: 'دانلود اپلیکیشن',
        subtitle: 'آخرین نسخه را نصب کن.',
        app_icon_url: null,
        version_name: '1.4.0',
        version_code: 42,
        release_date: '2026-03-27',
        file_size: '18.4 MB',
        bazaar_url: 'https://cafebazaar.ir/app/com.encer.offlinesplitwise',
        myket_url: 'https://myket.ir/app/com.encer.offlinesplitwise',
        direct_download_url: 'https://splitwise.ir/files/app.apk',
        release_notes: ['بهبود پایداری همگام‌سازی'],
        primary_badge_text: 'نسخه جدید',
        is_direct_download_enabled: true,
      }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const payload = await fetchAppDownloadContent()

    expect(payload.version_name).toBe('1.4.0')
    expect(payload.release_notes).toEqual(['بهبود پایداری همگام‌سازی'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/app-download')
  })
})
