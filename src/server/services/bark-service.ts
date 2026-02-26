/**
 * Bark Notification Service - Send push notifications to iOS
 */

// 配置项 - 通过环境变量配置
const BARK_KEY = process.env.BARK_KEY || '';
const BARK_API = process.env.BARK_API || 'https://api.day.app';
const STAFF_URL_BASE = process.env.STAFF_URL_BASE || 'http://localhost:3010/staff';

// 调试：打印配置
console.log('[Bark] Config loaded:', {
  hasKey: !!BARK_KEY,
  keyLength: BARK_KEY?.length || 0,
  api: BARK_API,
  staffUrl: STAFF_URL_BASE,
});

/**
 * Check if Bark is configured
 */
export function isBarkConfigured(): boolean {
  return !!BARK_KEY && BARK_KEY.length > 0;
}

/**
 * Send notification via Bark
 */
export async function sendBarkNotification(
  title: string,
  body: string,
  options?: {
    sound?: string;
    url?: string;
    group?: string;
  }
): Promise<void> {
  // 如果没有配置 Bark Key，跳过通知
  if (!isBarkConfigured()) {
    console.log('[Bark] Skipped - BARK_KEY not configured');
    return;
  }

  const { sound = 'minuet', url, group = 'chat' } = options || {};

  try {
    const params = new URLSearchParams();
    params.set('sound', sound);
    params.set('group', group);
    if (url) params.set('url', url);

    const encodedTitle = encodeURIComponent(title);
    const encodedBody = encodeURIComponent(body);
    const barkUrl = `${BARK_API}/${BARK_KEY}/${encodedTitle}/${encodedBody}?${params.toString()}`;

    // 使用 fetch 发送通知（不阻塞主流程）
    fetch(barkUrl).catch((err) => {
      console.error('[Bark] Notification failed:', err.message);
    });

    console.log('[Bark] Notification sent:', title);
  } catch (error) {
    // 不要让通知失败影响主流程
    console.error('[Bark] Error:', error);
  }
}

/**
 * Notify when visitor sends a message
 */
export async function notifyVisitorMessage(
  sessionId: string,
  visitorName: string,
  content: string,
  contentType: string
): Promise<void> {
  // 如果没有配置 Bark Key，跳过通知
  if (!isBarkConfigured()) {
    return;
  }

  // 截取消息内容前50个字符
  let preview = content;
  if (contentType === 'text') {
    preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
  } else if (contentType === 'image') {
    preview = '[图片]';
  } else if (contentType === 'video') {
    preview = '[视频]';
  } else if (contentType === 'file') {
    preview = '[文件]';
  }

  // 客服端链接 - 使用环境变量配置的地址
  const staffUrl = `${STAFF_URL_BASE}?s=${sessionId}`;

  await sendBarkNotification(
    `💬 ${visitorName}`,
    preview,
    {
      sound: 'minuet',
      url: staffUrl,
      group: 'chat-message',
    }
  );
}
