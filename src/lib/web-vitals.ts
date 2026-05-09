import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';

function send(metric: Metric) {
  try {
    // Default: log to console. Replace with remote endpoint (POST) if desired.
    // Example: navigator.sendBeacon('/analytics/vitals', JSON.stringify(metric));
    // Keep payload small and non-blocking.
    // eslint-disable-next-line no-console
    console.info('[web-vitals]', metric.name, metric.value, metric.delta, metric.id);
  } catch (e) {
    // ignore
  }
}

export function initWebVitals() {
  onCLS(send);
  onINP(send);
  onLCP(send);
  onFCP(send);
  onTTFB(send);
}

export default initWebVitals;
