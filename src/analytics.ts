declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

function push(event: Record<string, unknown>) {
  if (!import.meta.env.VITE_GTM_ID) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>,
) {
  push({ event: eventName, ...params });
}

export function trackPageView(pageName: string) {
  push({ event: 'page_view', page_title: pageName });
}
