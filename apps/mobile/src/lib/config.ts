import Constants from 'expo-constants';

/** Your OENOD server. Set EXPO_PUBLIC_API_URL when building, or "extra.apiUrl" in app.json. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra?.apiUrl as string) || 'https://app.oenod.com').replace(/\/$/, '');
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
export const EAS_PROJECT_ID = (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId;
