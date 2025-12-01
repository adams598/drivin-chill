/**
 * Normalise l'URL du backend pour éviter les doubles slashes
 * @param {string} baseUrl - URL de base du backend
 * @param {string} path - Chemin de l'API (ex: '/api/movies')
 * @returns {string} URL normalisée
 */
export const getApiUrl = (baseUrl, path) => {
  // Enlever les slashes en fin de baseUrl
  const cleanBase = baseUrl?.replace(/\/+$/, '') || '';
  // Enlever les slashes en début de path
  const cleanPath = path?.replace(/^\/+/, '') || '';
  // Combiner avec un seul slash
  return `${cleanBase}/${cleanPath}`;
};

/**
 * Récupère l'URL de base du backend depuis les variables d'environnement
 * @returns {string} URL de base du backend
 */
export const getBackendUrl = () => {
  return process.env.REACT_APP_BACKEND_URL || '';
};

/**
 * Récupère l'URL complète de l'API
 * @param {string} endpoint - Endpoint de l'API (ex: 'movies', 'bookings')
 * @returns {string} URL complète
 */
export const getApiEndpoint = (endpoint) => {
  const baseUrl = getBackendUrl();
  return getApiUrl(baseUrl, `api/${endpoint}`);
};



