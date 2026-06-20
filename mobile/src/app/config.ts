export const appConfig = {
  enableDongleMode: process.env.EXPO_PUBLIC_ENABLE_DONGLE_MODE === 'true',
  enableEntities: process.env.EXPO_PUBLIC_ENABLE_ENTITIES !== 'false',
  enableInsights: process.env.EXPO_PUBLIC_ENABLE_INSIGHTS === 'true',
  enableMemoryGraph: process.env.EXPO_PUBLIC_ENABLE_MEMORY_GRAPH === 'true',
  enableDeveloperMode: process.env.EXPO_PUBLIC_ENABLE_DEVELOPER_MODE === 'true',
};
