import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.financepal.com',
  appName: 'Finance Pal',
  webDir: 'dist',
  server: {
    cleartext: false
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#3B82F6',
    },
  },
};

export default config;
