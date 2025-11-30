/**
 * Détecte si une URL est une URL Canva (page de design)
 * @param {string} url - URL à vérifier
 * @returns {boolean} true si c'est une URL Canva
 */
export const isCanvaUrl = (url) => {
  if (!url) return false;
  return url.includes("canva.com/design/") || url.includes("canva.com/");
};

/**
 * Valide si une URL est une URL d'image directe
 * @param {string} url - URL à valider
 * @returns {boolean} true si c'est une URL d'image directe
 */
export const isDirectImageUrl = (url) => {
  if (!url) return false;

  // Extensions d'images communes
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
  ];
  const lowerUrl = url.toLowerCase();

  // Vérifier si l'URL se termine par une extension d'image
  const hasImageExtension = imageExtensions.some((ext) =>
    lowerUrl.includes(ext)
  );

  // Vérifier si c'est une data URL (base64)
  const isDataUrl = url.startsWith("data:image/");

  // Vérifier si c'est une URL d'image hébergée (imgur, cloudinary, etc.)
  const isImageHosting =
    /\.(imgur|cloudinary|unsplash|pexels|pixabay)\.com/.test(lowerUrl);

  return hasImageExtension || isDataUrl || isImageHosting;
};

/**
 * Nettoie une URL (enlève les espaces, etc.)
 * @param {string} url - URL à nettoyer
 * @returns {string} URL nettoyée
 */
export const cleanImageUrl = (url) => {
  if (!url) return "";
  return url.trim();
};

/**
 * Convertit une URL Canva en URL d'image via le proxy Cloudflare Worker
 * @param {string} canvaUrl - URL Canva
 * @returns {string} URL du proxy ou URL originale si ce n'est pas Canva
 */
export const convertCanvaUrlToImage = (canvaUrl) => {
  if (!canvaUrl || !isCanvaUrl(canvaUrl)) {
    return canvaUrl;
  }

  const proxyUrl = process.env.REACT_APP_CANVA_PROXY_URL;
  if (!proxyUrl) {
    console.warn(
      "REACT_APP_CANVA_PROXY_URL n'est pas configuré. Les URLs Canva ne seront pas converties automatiquement."
    );
    return canvaUrl;
  }

  // Construire l'URL du proxy
  // Nettoyer l'URL du proxy (enlever les paramètres existants comme ?url=...)
  let cleanProxyUrl = proxyUrl.split("?")[0]; // Enlever tout ce qui suit le ?
  cleanProxyUrl = cleanProxyUrl.endsWith("/")
    ? cleanProxyUrl.slice(0, -1)
    : cleanProxyUrl;
  return `${cleanProxyUrl}/?url=${encodeURIComponent(canvaUrl)}`;
};

/**
 * Tente d'extraire l'ID du design depuis une URL Canva
 * @param {string} url - URL Canva
 * @returns {string|null} ID du design ou null
 */
export const extractCanvaDesignId = (url) => {
  if (!isCanvaUrl(url)) return null;

  // Format: canva.com/design/DAG6HlIb8R4/...
  const match = url.match(/canva\.com\/design\/([A-Za-z0-9]+)/);
  return match ? match[1] : null;
};

/**
 * Obtient un message d'aide selon le type d'URL
 * @param {string} url - URL à analyser
 * @returns {string|null} Message d'aide ou null
 */
export const getImageUrlHelpMessage = (url) => {
  if (!url) return null;

  const cleanedUrl = cleanImageUrl(url);

//   if (isCanvaUrl(cleanedUrl)) {
//     const proxyUrl = process.env.REACT_APP_CANVA_PROXY_URL;

//     // if (proxyUrl) {
//     //   return {
//     //     type: "info",
//     //     message: "✅ URL Canva détectée - Conversion automatique activée !",
//     //     explanation:
//     //       "Votre URL Canva sera automatiquement convertie en image via le proxy Cloudflare Worker.",
//     //     note: "L'image s'affichera automatiquement. Aucune action requise de votre part !",
//     //   };
//     // }

//     return {
//       type: "error",
//       message:
//         "❌ Cette URL Canva ne peut PAS être utilisée directement comme image.",
//       explanation:
//         "Les URLs Canva pointent vers une page web, pas vers une image. Le navigateur ne peut pas afficher une page web comme une image.",
//       quickSolution: {
//         title: "🚀 Solution rapide (2 minutes) :",
//         steps: [
//           {
//             step: "1. Ouvrez votre design Canva",
//             detail: "Cliquez sur le lien que vous avez collé",
//           },
//           {
//             step: "2. Téléchargez l'image",
//             detail:
//               'Cliquez sur "Partager" → "Télécharger" → Choisissez JPG ou PNG',
//           },
//           {
//             step: "3. Uploadez sur Imgur",
//             detail:
//               'Allez sur imgur.com → "New post" → Glissez votre image → Copiez l\'URL directe',
//           },
//           {
//             step: "4. Collez la nouvelle URL",
//             detail:
//               "L'URL Imgur se termine par .jpg ou .png et fonctionnera parfaitement !",
//           },
//         ],
//       },
//       alternatives: [
//         "💡 Alternative : Configurez un Cloudflare Worker pour conversion automatique (voir README)",
//       ],
//     };
//   }

  if (!isDirectImageUrl(cleanedUrl) && cleanedUrl.startsWith("http")) {
    return {
      type: "warning",
      message: "⚠️ Cette URL ne semble pas être une URL d'image directe.",
      explanation:
        "Les URLs d'images directes se terminent généralement par .jpg, .png, .gif, .webp, etc.",
    };
  }

  return null;
};
