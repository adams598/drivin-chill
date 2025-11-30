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
    // Canva utilise souvent og:image pour l'aperçu du design
    const ogImageMatches = html.matchAll(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/gi)
    for (const match of ogImageMatches) {
      const candidate = match[1]
      // Décoder les entités HTML
      const decoded = candidate.replace(/&amp;/g, '&').replace(/&#39;/g, "'")
      // Prioriser les images Canva CDN
      if (decoded.includes('canva.com') || decoded.includes('cdn-canva.com')) {
        imageUrl = decoded
        break
      } else if (!imageUrl) {
        // Garder en fallback
        imageUrl = decoded
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

    // Méthode 4: Chercher dans les données JSON embarquées (Canva stocke souvent l'image là)
    if (!imageUrl) {
      // Chercher des objets JSON avec des URLs d'images
      const jsonMatches = html.matchAll(/<script[^>]*>([^<]*"image"[^<]*https?:\/\/[^"'\s<>]+\.(canva|cdn-canva)\.com[^"'\s<>]+\.(jpg|jpeg|png|webp)[^"'\s<>]*[^<]*)<\/script>/gi)
      for (const match of jsonMatches) {
        const jsonContent = match[1]
        const imageUrlMatch = jsonContent.match(/https?:\/\/[^"'\s<>]+\.(canva|cdn-canva)\.com\/[^"'\s<>]+\.(jpg|jpeg|png|webp)/i)
        if (imageUrlMatch) {
          imageUrl = imageUrlMatch[0]
          break
        }
      }
    }

    // Méthode 5: Chercher des URLs d'images Canva CDN spécifiques au design
    if (!imageUrl) {
      // Chercher des URLs qui contiennent l'ID du design
      if (designId) {
        const designImageMatch = html.match(new RegExp(`https?://[^"'\s<>]+\\.(canva|cdn-canva)\\.com/[^"'\s<>]*${designId}[^"'\s<>]*\\.(jpg|jpeg|png|webp)`, 'i'))
        if (designImageMatch) {
          imageUrl = designImageMatch[0]
        }
      }
      
      // Fallback : n'importe quelle image Canva CDN (chercher toutes les occurrences)
      if (!imageUrl) {
        const canvaImageMatches = html.matchAll(/https?:\/\/[^"'\s<>]+\.(canva|cdn-canva)\.com\/[^"'\s<>]+\.(jpg|jpeg|png|webp)/gi)
        const candidates = Array.from(canvaImageMatches).map(m => m[0])
        // Prioriser les URLs qui semblent être des images de design (pas des logos, etc.)
        const designImage = candidates.find(url => 
          url.includes('/design/') || 
          url.includes('/templates/') ||
          url.match(/\/[A-Za-z0-9]{10,}\.(jpg|jpeg|png|webp)/i)
        )
        imageUrl = designImage || candidates[0]
      }
    }

    // Méthode 6: Chercher dans les attributs src des images (priorité basse)
    if (!imageUrl) {
      const imgSrcMatches = html.matchAll(/<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|webp))["']/gi)
      for (const match of imgSrcMatches) {
        const src = match[1]
        // Décoder les entités HTML
        const decodedSrc = src.replace(/&amp;/g, '&')
        // Prioriser les images Canva
        if (decodedSrc.includes('canva.com') || decodedSrc.includes('cdn-canva.com')) {
          imageUrl = decodedSrc
          break
        } else if (!imageUrl) {
          // Garder en fallback
          imageUrl = decodedSrc
        }
      }
    }

    // Méthode 7: Chercher dans les attributs data-src (lazy loading)
    if (!imageUrl) {
      const dataSrcMatches = html.matchAll(/<img[^>]+data-src=["']([^"']+\.(jpg|jpeg|png|webp))["']/gi)
      for (const match of dataSrcMatches) {
        const src = match[1]
        const decodedSrc = src.replace(/&amp;/g, '&')
        if (decodedSrc.includes('canva.com') || decodedSrc.includes('cdn-canva.com')) {
          imageUrl = decodedSrc
          break
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
    
    // Décoder les entités HTML si nécessaire
    cleanImageUrl = cleanImageUrl.replace(/&amp;/g, '&');
    cleanImageUrl = cleanImageUrl.replace(/&lt;/g, '<');
    cleanImageUrl = cleanImageUrl.replace(/&gt;/g, '>');
    cleanImageUrl = cleanImageUrl.replace(/&quot;/g, '"');
    cleanImageUrl = cleanImageUrl.replace(/&#39;/g, "'");

    // Au lieu de rediriger, récupérer l'image et la servir directement
    // Cela évite les problèmes de CORS et fonctionne mieux avec les balises <img>
    try {
      const imageResponse = await fetch(cleanImageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.canva.com/',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        }
      })

      if (!imageResponse.ok) {
        // Si l'image ne peut pas être récupérée, rediriger quand même
        return Response.redirect(cleanImageUrl, 302)
      }

      // Récupérer l'image en tant que blob
      const imageBlob = await imageResponse.blob()
      
      // Servir l'image directement avec les bons headers CORS
      return new Response(imageBlob, {
        status: 200,
        headers: {
          'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Cache-Control': 'public, max-age=3600', // Cache pendant 1 heure
          'X-Image-Source': 'canva-proxy',
          'X-Original-URL': canvaUrl
        }
      })
    } catch (imageError) {
      // Si la récupération de l'image échoue, rediriger quand même
      console.error('Erreur lors de la récupération de l\'image:', imageError)
      return Response.redirect(cleanImageUrl, 302)
    }

  } catch (error) {
    return new Response(`Error processing request: ${error.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

