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
    // Récupérer la page Canva
    const response = await fetch(canvaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      return new Response(`Failed to fetch Canva page: ${response.status}`, { 
        status: response.status 
      })
    }

    const html = await response.text()

    // Extraire l'URL de l'image depuis le HTML
    // Canva stocke souvent l'image dans des balises meta ou dans le JSON-LD
    let imageUrl = null

    // Méthode 1: Chercher dans les balises meta og:image
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    if (ogImageMatch) {
      imageUrl = ogImageMatch[1]
    }

    // Méthode 2: Chercher dans les balises meta twitter:image
    if (!imageUrl) {
      const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)
      if (twitterImageMatch) {
        imageUrl = twitterImageMatch[1]
      }
    }

    // Méthode 3: Chercher dans le JSON-LD
    if (!imageUrl) {
      const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is)
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1])
          if (jsonLd.image) {
            imageUrl = typeof jsonLd.image === 'string' ? jsonLd.image : jsonLd.image.url
          }
        } catch (e) {
          // Ignorer les erreurs de parsing JSON
        }
      }
    }

    // Méthode 4: Chercher des URLs d'images Canva CDN dans le HTML
    if (!imageUrl) {
      const canvaImageMatch = html.match(/https?:\/\/[^"'\s<>]+\.(canva|cdn-canva)\.com\/[^"'\s<>]+\.(jpg|jpeg|png|webp)/i)
      if (canvaImageMatch) {
        imageUrl = canvaImageMatch[0]
      }
    }

    // Méthode 5: Chercher dans les attributs src des images
    if (!imageUrl) {
      const imgSrcMatch = html.match(/<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|webp))["']/i)
      if (imgSrcMatch) {
        imageUrl = imgSrcMatch[1]
      }
    }

    if (!imageUrl) {
      return new Response('Could not extract image URL from Canva page. The design might be private or the page structure has changed.', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // Rediriger vers l'image directe
    return Response.redirect(imageUrl, 302)

  } catch (error) {
    return new Response(`Error processing request: ${error.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

