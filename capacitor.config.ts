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
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#F43F5E',
    },
  },
};

export default config;
