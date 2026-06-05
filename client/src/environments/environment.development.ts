export const environment = {
  production: false,
  apiUrl: `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:9191/api`,
};
