/**
 * Cloudflare Worker pour proxy d'images Canva
 * 
 * Usage: https://votre-worker.votre-subdomain.workers.dev/?url=https://www.canva.com/design/...
 * 
 * Ce worker :
 * 1. Récupère la page Canva
 * 2. Extrait l'URL de l'image depuis le HTML
 * 3. Redirige vers l'image directe
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Vérifier que c'est une requête GET
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Récupérer l'URL Canva depuis les paramètres de requête
  const url = new URL(request.url)
  const canvaUrl = url.searchParams.get('url')

  if (!canvaUrl) {
    return new Response('Missing "url" parameter. Usage: ?url=https://www.canva.com/design/...', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // Vérifier que c'est bien une URL Canva
  if (!canvaUrl.includes('canva.com/design/')) {
    return new Response('Invalid Canva URL', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  try {
    // Récupérer la page Canva avec des headers complets pour éviter les blocages
    const response = await fetch(canvaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.canva.com/',
        'Cache-Control': 'no-cache'
      }
    })

    if (!response.ok) {
      return new Response(`Failed to fetch Canva page: ${response.status} - ${response.statusText}`, { 
        status: response.status,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const html = await response.text()

    // Extraire l'URL de l'image depuis le HTML
    // Canva stocke souvent l'image dans des balises meta ou dans le JSON-LD
    let imageUrl = null
    const designId = canvaUrl.match(/\/design\/([A-Za-z0-9]+)/)?.[1]

    // Méthode 1: Chercher dans les balises meta og:image (priorité haute - image du design)
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    if (ogImageMatch) {
      imageUrl = ogImageMatch[1]
      // Vérifier que l'image correspond au design (contient l'ID du design ou est une image Canva)
      if (designId && !imageUrl.includes(designId) && !imageUrl.includes('canva.com')) {
        // Si l'image og:image ne semble pas correspondre au design, continuer la recherche
        imageUrl = null
      }
    }

    // Méthode 2: Chercher dans les balises meta twitter:image
    if (!imageUrl) {
      const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)
      if (twitterImageMatch) {
        imageUrl = twitterImageMatch[1]
      }
    }

    // Méthode 3: Chercher dans le JSON-LD (peut contenir plusieurs images, prendre la première)
    if (!imageUrl) {
      const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis)
      for (const match of jsonLdMatches) {
        try {
          const jsonLd = JSON.parse(match[1])
          if (jsonLd.image) {
            const img = typeof jsonLd.image === 'string' ? jsonLd.image : jsonLd.image.url
            // Prioriser les images qui contiennent l'ID du design ou sont des images Canva
            if (img && (img.includes('canva.com') || (designId && img.includes(designId)))) {
              imageUrl = img
              break
            } else if (!imageUrl) {
              // Garder en fallback
              imageUrl = img
            }
          }
        } catch (e) {
          // Ignorer les erreurs de parsing JSON
        }
      }
    }

    // Méthode 4: Chercher des URLs d'images Canva CDN spécifiques au design
    if (!imageUrl) {
      // Chercher des URLs qui contiennent l'ID du design
      if (designId) {
        const designImageMatch = html.match(new RegExp(`https?://[^"'\s<>]+\\.(canva|cdn-canva)\\.com/[^"'\s<>]*${designId}[^"'\s<>]*\\.(jpg|jpeg|png|webp)`, 'i'))
        if (designImageMatch) {
          imageUrl = designImageMatch[0]
        }
      }
      
      // Fallback : n'importe quelle image Canva CDN
      if (!imageUrl) {
        const canvaImageMatch = html.match(/https?:\/\/[^"'\s<>]+\.(canva|cdn-canva)\.com\/[^"'\s<>]+\.(jpg|jpeg|png|webp)/i)
        if (canvaImageMatch) {
          imageUrl = canvaImageMatch[0]
        }
      }
    }

    // Méthode 5: Chercher dans les attributs src des images (priorité basse)
    if (!imageUrl) {
      const imgSrcMatches = html.matchAll(/<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|webp))["']/gi)
      for (const match of imgSrcMatches) {
        const src = match[1]
        // Prioriser les images Canva
        if (src.includes('canva.com') || src.includes('cdn-canva.com')) {
          imageUrl = src
          break
        } else if (!imageUrl) {
          // Garder en fallback
          imageUrl = src
        }
      }
    }

    if (!imageUrl) {
      // Retourner un message d'erreur plus détaillé
      return new Response(JSON.stringify({
        error: 'Could not extract image URL from Canva page',
        reasons: [
          'The design might be private',
          'The page structure might have changed',
          'The design might require authentication'
        ],
        canvaUrl: canvaUrl
      }), { 
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Nettoyer l'URL de l'image (enlever les paramètres inutiles si nécessaire)
    let cleanImageUrl = imageUrl;
    // Si l'URL contient des paramètres de taille, on peut les optimiser
    if (cleanImageUrl.includes('?')) {
      // Garder l'URL telle quelle pour l'instant
    }

    // Rediriger vers l'image directe avec CORS headers
    return Response.redirect(cleanImageUrl, 302)

  } catch (error) {
    return new Response(`Error processing request: ${error.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

