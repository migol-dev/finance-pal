import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.5d87779d6e13460fbb57c0fa6d4860f8',
  appName: 'Migol Finanzas',
  webDir: 'dist',
  server: {
    url: 'https://5d87779d-6e13-460f-bb57-c0fa6d4860f8.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#F43F5E',
    },
  },
};

export default config;
