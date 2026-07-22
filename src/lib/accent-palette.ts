export type AccentColor = "blue" | "violet" | "emerald" | "rose" | "amber";

export interface AccentPalette {
  hue: number;
  saturation: string;
  lightness: string;
  primary: string;
  ring: string;
  primaryMuted: string;
  primaryGlow: string;
  secondary: string;
  secondaryMuted: string;
  accent: string;
  accentMuted: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  destructive: string;
  destructiveMuted: string;
  gradients: {
    primary: string;
    success: string;
    warning: string;
    destructive: string;
    secondary: string;
    sunset: string;
    ocean: string;
  };
}

export const ACCENT_PALETTES: Record<"light" | "dark", Record<AccentColor, AccentPalette>> = {
  light: {
    blue: {
      hue: 210, saturation: "100%", lightness: "50%",
      primary: "210 100% 50%", ring: "210 100% 50%",
      primaryMuted: "210 100% 95%", primaryGlow: "195 100% 60%",
      secondary: "230 80% 55%", secondaryMuted: "230 80% 95%",
      accent: "190 90% 48%", accentMuted: "190 90% 94%",
      success: "165 75% 42%", successMuted: "165 75% 92%",
      warning: "38 95% 50%", warningMuted: "38 95% 92%",
      destructive: "350 80% 56%", destructiveMuted: "350 80% 93%",
      gradients: {
        primary: "linear-gradient(135deg, hsl(210 100% 50%), hsl(195 100% 55%))",
        success: "linear-gradient(135deg, hsl(165 75% 42%), hsl(190 90% 48%))",
        warning: "linear-gradient(135deg, hsl(38 95% 50%), hsl(30 90% 52%))",
        destructive: "linear-gradient(135deg, hsl(350 80% 56%), hsl(0 80% 58%))",
        secondary: "linear-gradient(135deg, hsl(230 80% 55%), hsl(260 75% 60%))",
        sunset: "linear-gradient(135deg, hsl(210 100% 50%) 0%, hsl(230 80% 55%) 50%, hsl(260 75% 55%) 100%)",
        ocean: "linear-gradient(135deg, hsl(195 100% 45%), hsl(220 100% 50%))",
      },
    },
    violet: {
      hue: 260, saturation: "80%", lightness: "55%",
      primary: "260 80% 55%", ring: "260 80% 55%",
      primaryMuted: "260 80% 94%", primaryGlow: "270 100% 65%",
      secondary: "280 70% 50%", secondaryMuted: "280 70% 94%",
      accent: "240 80% 52%", accentMuted: "240 80% 94%",
      success: "200 75% 42%", successMuted: "200 75% 92%",
      warning: "45 95% 50%", warningMuted: "45 95% 92%",
      destructive: "350 80% 56%", destructiveMuted: "350 80% 93%",
      gradients: {
        primary: "linear-gradient(135deg, hsl(260 80% 55%), hsl(270 85% 60%))",
        success: "linear-gradient(135deg, hsl(200 75% 42%), hsl(220 80% 48%))",
        warning: "linear-gradient(135deg, hsl(45 95% 50%), hsl(35 90% 52%))",
        destructive: "linear-gradient(135deg, hsl(350 80% 56%), hsl(0 80% 58%))",
        secondary: "linear-gradient(135deg, hsl(280 70% 50%), hsl(300 65% 55%))",
        sunset: "linear-gradient(135deg, hsl(260 80% 55%) 0%, hsl(280 70% 50%) 50%, hsl(300 65% 55%) 100%)",
        ocean: "linear-gradient(135deg, hsl(250 85% 48%), hsl(270 80% 52%))",
      },
    },
    emerald: {
      hue: 160, saturation: "80%", lightness: "42%",
      primary: "160 80% 42%", ring: "160 80% 42%",
      primaryMuted: "160 80% 93%", primaryGlow: "150 100% 50%",
      secondary: "190 70% 48%", secondaryMuted: "190 70% 93%",
      accent: "130 80% 45%", accentMuted: "130 80% 93%",
      success: "170 75% 40%", successMuted: "170 75% 92%",
      warning: "40 95% 50%", warningMuted: "40 95% 92%",
      destructive: "350 80% 56%", destructiveMuted: "350 80% 93%",
      gradients: {
        primary: "linear-gradient(135deg, hsl(160 80% 42%), hsl(150 85% 48%))",
        success: "linear-gradient(135deg, hsl(170 75% 40%), hsl(185 80% 46%))",
        warning: "linear-gradient(135deg, hsl(40 95% 50%), hsl(30 90% 52%))",
        destructive: "linear-gradient(135deg, hsl(350 80% 56%), hsl(0 80% 58%))",
        secondary: "linear-gradient(135deg, hsl(190 70% 48%), hsl(210 65% 52%))",
        sunset: "linear-gradient(135deg, hsl(160 80% 42%) 0%, hsl(180 70% 46%) 50%, hsl(200 65% 50%) 100%)",
        ocean: "linear-gradient(135deg, hsl(150 85% 40%), hsl(170 80% 45%))",
      },
    },
    rose: {
      hue: 340, saturation: "85%", lightness: "55%",
      primary: "340 85% 55%", ring: "340 85% 55%",
      primaryMuted: "340 85% 94%", primaryGlow: "350 100% 65%",
      secondary: "10 75% 52%", secondaryMuted: "10 75% 94%",
      accent: "320 80% 50%", accentMuted: "320 80% 94%",
      success: "160 75% 42%", successMuted: "160 75% 92%",
      warning: "38 95% 50%", warningMuted: "38 95% 92%",
      destructive: "355 80% 56%", destructiveMuted: "355 80% 93%",
      gradients: {
        primary: "linear-gradient(135deg, hsl(340 85% 55%), hsl(350 90% 60%))",
        success: "linear-gradient(135deg, hsl(160 75% 42%), hsl(180 80% 48%))",
        warning: "linear-gradient(135deg, hsl(38 95% 50%), hsl(28 90% 52%))",
        destructive: "linear-gradient(135deg, hsl(355 80% 56%), hsl(5 80% 58%))",
        secondary: "linear-gradient(135deg, hsl(10 75% 52%), hsl(20 70% 56%))",
        sunset: "linear-gradient(135deg, hsl(340 85% 55%) 0%, hsl(355 75% 52%) 50%, hsl(10 70% 56%) 100%)",
        ocean: "linear-gradient(135deg, hsl(330 90% 48%), hsl(350 85% 52%))",
      },
    },
    amber: {
      hue: 38, saturation: "95%", lightness: "50%",
      primary: "38 95% 50%", ring: "38 95% 50%",
      primaryMuted: "38 95% 92%", primaryGlow: "45 100% 55%",
      secondary: "15 85% 50%", secondaryMuted: "15 85% 94%",
      accent: "55 85% 48%", accentMuted: "55 85% 94%",
      success: "165 75% 42%", successMuted: "165 75% 92%",
      warning: "10 85% 50%", warningMuted: "10 85% 92%",
      destructive: "350 80% 56%", destructiveMuted: "350 80% 93%",
      gradients: {
        primary: "linear-gradient(135deg, hsl(38 95% 50%), hsl(48 100% 55%))",
        success: "linear-gradient(135deg, hsl(165 75% 42%), hsl(180 80% 48%))",
        warning: "linear-gradient(135deg, hsl(10 85% 50%), hsl(0 80% 52%))",
        destructive: "linear-gradient(135deg, hsl(350 80% 56%), hsl(0 80% 58%))",
        secondary: "linear-gradient(135deg, hsl(15 85% 50%), hsl(25 80% 54%))",
        sunset: "linear-gradient(135deg, hsl(38 95% 50%) 0%, hsl(20 85% 48%) 50%, hsl(10 80% 52%) 100%)",
        ocean: "linear-gradient(135deg, hsl(30 90% 45%), hsl(50 85% 50%))",
      },
    },
  },
  dark: {
    blue: {
      hue: 210, saturation: "100%", lightness: "55%",
      primary: "210 100% 55%", ring: "210 100% 55%",
      primaryMuted: "210 50% 15%", primaryGlow: "195 100% 60%",
      secondary: "230 80% 60%", secondaryMuted: "230 50% 15%",
      accent: "190 90% 52%", accentMuted: "190 50% 14%",
      success: "165 75% 48%", successMuted: "165 40% 14%",
      warning: "38 95% 55%", warningMuted: "38 40% 14%",
      destructive: "350 80% 58%", destructiveMuted: "350 40% 14%",
      gradients: {
        primary: "linear-gradient(135deg, hsl(210 100% 55%), hsl(195 100% 60%))",
        success: "linear-gradient(135deg, hsl(165 75% 48%), hsl(190 90% 52%))",
        warning: "linear-gradient(135deg, hsl(38 95% 55%), hsl(30 90% 57%))",
        destructive: "linear-gradient(135deg, hsl(350 80% 58%), hsl(0 80% 60%))",
        secondary: "linear-gradient(135deg, hsl(230 80% 60%), hsl(260 75% 62%))",
        sunset: "linear-gradient(135deg, hsl(210 100% 55%) 0%, hsl(230 80% 60%) 50%, hsl(260 75% 60%) 100%)",
        ocean: "linear-gradient(135deg, hsl(195 100% 50%), hsl(220 100% 52%))",
      },
    },
    violet: {
      hue: 260, saturation: "80%", lightness: "60%",
      primary: "260 80% 60%", ring: "260 80% 60%",
      primaryMuted: "260 50% 16%", primaryGlow: "270 100% 65%",
      secondary: "280 70% 55%", secondaryMuted: "280 40% 15%",
      accent: "240 80% 55%", accentMuted: "240 40% 14%",
      success: "200 75% 48%", successMuted: "200 40% 14%",
      warning: "45 95% 55%", warningMuted: "45 40% 14%",
      destructive: "350 80% 58%", destructiveMuted: "350 40% 14%",
      gradients: {
        primary: "linear-gradient(135deg, hsl(260 80% 60%), hsl(270 85% 65%))",
        success: "linear-gradient(135deg, hsl(200 75% 48%), hsl(220 80% 52%))",
        warning: "linear-gradient(135deg, hsl(45 95% 55%), hsl(35 90% 57%))",
        destructive: "linear-gradient(135deg, hsl(350 80% 58%), hsl(0 80% 60%))",
        secondary: "linear-gradient(135deg, hsl(280 70% 55%), hsl(300 65% 58%))",
        sunset: "linear-gradient(135deg, hsl(260 80% 60%) 0%, hsl(280 70% 55%) 50%, hsl(300 65% 58%) 100%)",
        ocean: "linear-gradient(135deg, hsl(250 85% 52%), hsl(270 80% 55%))",
      },
    },
    emerald: {
      hue: 160, saturation: "80%", lightness: "48%",
      primary: "160 80% 48%", ring: "160 80% 48%",
      primaryMuted: "160 40% 14%", primaryGlow: "150 100% 50%",
      secondary: "190 70% 52%", secondaryMuted: "190 40% 14%",
      accent: "130 80% 50%", accentMuted: "130 40% 14%",
      success: "170 75% 46%", successMuted: "170 40% 14%",
      warning: "40 95% 55%", warningMuted: "40 40% 14%",
      destructive: "350 80% 58%", destructiveMuted: "350 40% 14%",
      gradients: {
        primary: "linear-gradient(135deg, hsl(160 80% 48%), hsl(150 85% 52%))",
        success: "linear-gradient(135deg, hsl(170 75% 46%), hsl(185 80% 50%))",
        warning: "linear-gradient(135deg, hsl(40 95% 55%), hsl(30 90% 57%))",
        destructive: "linear-gradient(135deg, hsl(350 80% 58%), hsl(0 80% 60%))",
        secondary: "linear-gradient(135deg, hsl(190 70% 52%), hsl(210 65% 55%))",
        sunset: "linear-gradient(135deg, hsl(160 80% 48%) 0%, hsl(180 70% 50%) 50%, hsl(200 65% 52%) 100%)",
        ocean: "linear-gradient(135deg, hsl(150 85% 44%), hsl(170 80% 48%))",
      },
    },
    rose: {
      hue: 340, saturation: "85%", lightness: "60%",
      primary: "340 85% 60%", ring: "340 85% 60%",
      primaryMuted: "340 50% 16%", primaryGlow: "350 100% 65%",
      secondary: "10 75% 56%", secondaryMuted: "10 40% 15%",
      accent: "320 80% 54%", accentMuted: "320 40% 14%",
      success: "160 75% 48%", successMuted: "160 40% 14%",
      warning: "38 95% 55%", warningMuted: "38 40% 14%",
      destructive: "355 80% 58%", destructiveMuted: "355 40% 14%",
      gradients: {
        primary: "linear-gradient(135deg, hsl(340 85% 60%), hsl(350 90% 63%))",
        success: "linear-gradient(135deg, hsl(160 75% 48%), hsl(180 80% 52%))",
        warning: "linear-gradient(135deg, hsl(38 95% 55%), hsl(28 90% 57%))",
        destructive: "linear-gradient(135deg, hsl(355 80% 58%), hsl(5 80% 60%))",
        secondary: "linear-gradient(135deg, hsl(10 75% 56%), hsl(20 70% 58%))",
        sunset: "linear-gradient(135deg, hsl(340 85% 60%) 0%, hsl(355 75% 56%) 50%, hsl(10 70% 58%) 100%)",
        ocean: "linear-gradient(135deg, hsl(330 90% 52%), hsl(350 85% 55%))",
      },
    },
    amber: {
      hue: 38, saturation: "95%", lightness: "55%",
      primary: "38 95% 55%", ring: "38 95% 55%",
      primaryMuted: "38 40% 16%", primaryGlow: "45 100% 55%",
      secondary: "15 85% 54%", secondaryMuted: "15 40% 15%",
      accent: "55 85% 52%", accentMuted: "55 40% 14%",
      success: "165 75% 48%", successMuted: "165 40% 14%",
      warning: "10 85% 54%", warningMuted: "10 40% 14%",
      destructive: "350 80% 58%", destructiveMuted: "350 40% 14%",
      gradients: {
        primary: "linear-gradient(135deg, hsl(38 95% 55%), hsl(48 100% 58%))",
        success: "linear-gradient(135deg, hsl(165 75% 48%), hsl(180 80% 52%))",
        warning: "linear-gradient(135deg, hsl(10 85% 54%), hsl(0 80% 56%))",
        destructive: "linear-gradient(135deg, hsl(350 80% 58%), hsl(0 80% 60%))",
        secondary: "linear-gradient(135deg, hsl(15 85% 54%), hsl(25 80% 56%))",
        sunset: "linear-gradient(135deg, hsl(38 95% 55%) 0%, hsl(20 85% 52%) 50%, hsl(10 80% 54%) 100%)",
        ocean: "linear-gradient(135deg, hsl(30 90% 48%), hsl(50 85% 52%))",
      },
    },
  },
};
