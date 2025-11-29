# Configuration DNS Hostinger - Sans Affecter les Autres Sites

## ⚠️ Important : Isolation des Domaines

Chaque domaine dans Hostinger a **sa propre configuration DNS indépendante**. La configuration de `drivinnchill.fr` **n'affectera PAS** vos autres domaines existants.

## 📋 Vérification Préalable

Avant de commencer, vérifiez dans Hostinger :

1. **Allez dans la gestion DNS de `drivinnchill.fr`** (pas les autres domaines)
2. **Vérifiez que c'est bien le bon domaine** dans l'interface
3. **Ne touchez PAS aux autres domaines** dans la liste

## 🔧 Configuration DNS pour drivinnchill.fr uniquement

### Étape 1 : Dans Hostinger

1. Connectez-vous à votre compte Hostinger
2. Allez dans **Domaines** > **Gestion DNS**
3. **Sélectionnez UNIQUEMENT `drivinnchill.fr`** (pas les autres domaines)
4. Vous verrez la liste des enregistrements DNS actuels pour ce domaine

### Étape 2 : Ajouter les Enregistrements pour Vercel

**IMPORTANT** : Ne supprimez PAS les enregistrements existants. Ajoutez seulement les nouveaux si nécessaire.

#### Si drivinnchill.fr n'a PAS encore d'enregistrements A :

Ajoutez un nouvel enregistrement :
```
Type: A
Nom: @
Valeur: 76.76.21.21
TTL: 3600 (ou par défaut)
```

#### Pour le sous-domaine www :

Ajoutez un nouvel enregistrement :
```
Type: CNAME
Nom: www
Valeur: cname.vercel-dns.com
TTL: 3600 (ou par défaut)
```

#### Si vous voulez un sous-domaine API (optionnel) :

```
Type: CNAME
Nom: api
Valeur: cname.vercel-dns.com
TTL: 3600
```

### Étape 3 : Vérifier les Enregistrements Existants

**Si `drivinnchill.fr` a déjà des enregistrements** (par exemple pour l'ancien site Emergent) :

1. **Notez-les** avant de les modifier
2. **Modifiez seulement l'enregistrement A** pour pointer vers `76.76.21.21`
3. **Ou ajoutez un nouveau** si vous voulez garder l'ancien temporairement

### Exemple de Configuration Finale

Votre configuration DNS pour `drivinnchill.fr` devrait ressembler à :

```
Type    Nom      Valeur                    TTL
A       @        76.76.21.21               3600
CNAME   www      cname.vercel-dns.com      3600
```

## ✅ Vérification que les Autres Sites ne sont PAS Affectés

### Test 1 : Vérifier vos autres domaines

1. Allez dans la gestion DNS de **chacun de vos autres domaines**
2. **Vérifiez que leurs enregistrements DNS sont inchangés**
3. Si tout est identique, vos sites continueront de fonctionner normalement

### Test 2 : Tester vos sites existants

1. Visitez vos sites existants
2. Vérifiez qu'ils fonctionnent toujours normalement
3. Si un site ne fonctionne plus, **annulez immédiatement** les modifications sur `drivinnchill.fr`

## 🎯 Configuration dans Vercel

Une fois les DNS configurés dans Hostinger :

1. **Dans Vercel**, allez dans Settings > Domains
2. Ajoutez `drivinnchill.fr` et `www.drivinnchill.fr`
3. Vercel détectera automatiquement les enregistrements DNS
4. Attendez la vérification (peut prendre quelques minutes)

## ⚠️ Ce qu'il NE FAUT PAS Faire

❌ **Ne modifiez PAS les serveurs DNS globaux** (nameservers) si vos autres sites fonctionnent déjà
❌ **Ne touchez PAS aux enregistrements DNS des autres domaines**
❌ **Ne supprimez PAS tous les enregistrements** de drivinnchill.fr d'un coup
❌ **Ne modifiez PAS les DNS au niveau du registrar** si vous n'êtes pas sûr

## ✅ Ce qu'il FAUT Faire

✅ **Modifiez UNIQUEMENT les enregistrements DNS de `drivinnchill.fr`**
✅ **Ajoutez les nouveaux enregistrements** plutôt que de tout supprimer
✅ **Notez les anciens enregistrements** avant de les modifier (au cas où)
✅ **Testez vos autres sites** après chaque modification
✅ **Attendez 24-48h** pour la propagation DNS complète

## 🔍 Vérification DNS

Pour vérifier que vos DNS sont correctement configurés :

### Commande Windows (PowerShell)
```powershell
nslookup drivinnchill.fr
nslookup www.drivinnchill.fr
```

### Commande Linux/Mac
```bash
dig drivinnchill.fr
dig www.drivinnchill.fr
```

### En ligne
- https://dnschecker.org
- https://www.whatsmydns.net

Vous devriez voir que `drivinnchill.fr` pointe vers `76.76.21.21` (ou l'IP de Vercel).

## 📞 En Cas de Problème

Si un de vos autres sites ne fonctionne plus :

1. **Vérifiez immédiatement** la configuration DNS de ce domaine dans Hostinger
2. **Si vous avez modifié quelque chose par erreur**, restaurez les anciens enregistrements
3. **Contactez le support Hostinger** si nécessaire
4. **Vérifiez que vous avez bien modifié le bon domaine** (drivinnchill.fr et pas un autre)

## 🎯 Résumé

- ✅ Chaque domaine = configuration DNS indépendante
- ✅ Modifiez UNIQUEMENT `drivinnchill.fr`
- ✅ Ajoutez les enregistrements A et CNAME pour Vercel
- ✅ Ne touchez PAS aux autres domaines
- ✅ Testez vos sites existants après configuration

