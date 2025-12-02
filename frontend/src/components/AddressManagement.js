import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { MapPin, Save, RotateCcw, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";

// Nettoyer l'URL du backend (enlever les virgules et slashes en fin)
const getCleanBackendUrl = () => {
  const url = process.env.REACT_APP_BACKEND_URL || "";

  // Si l'URL contient une virgule, on a plusieurs URLs
  if (url.includes(",")) {
    const urls = url
      .split(",")
      .map((u) => u.trim())
      .filter((u) => u);

    // Si on est en développement local (localhost:3000), utiliser localhost:8000
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      const localUrl = urls.find(
        (u) => u.includes("localhost") || u.includes("127.0.0.1")
      );
      if (localUrl) {
        return localUrl.replace(/\/+$/, "");
      }
    }

    // Sinon, prendre la première URL (production)
    return urls[0].replace(/\/+$/, "");
  }

  // URL simple, juste nettoyer
  return url.trim().replace(/\/+$/, "");
};

const BACKEND_URL = getCleanBackendUrl();
const API = `${BACKEND_URL}/api`;

// Log pour débogage
if (process.env.NODE_ENV === "development") {
  console.log("🔧 Configuration Backend:", {
    "REACT_APP_BACKEND_URL (raw)": process.env.REACT_APP_BACKEND_URL,
    "BACKEND_URL (cleaned)": BACKEND_URL,
    API: API,
    "Current hostname": window.location.hostname,
  });
}

const AddressManagement = () => {
  const [addressSettings, setAddressSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const geocodeTimeoutRef = useRef(null);
  const [formData, setFormData] = useState({
    address_text: "",
    full_address: "",
    latitude: "",
    longitude: "",
  });

  const token = localStorage.getItem("admin_token");
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    fetchAddressSettings();
  }, []);

  const fetchAddressSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/address`, {
        headers: authHeaders,
      });
      setAddressSettings(response.data);
      setFormData({
        address_text: response.data.address_text || "",
        full_address: response.data.full_address || "",
        latitude: response.data.latitude?.toString() || "",
        longitude: response.data.longitude?.toString() || "",
      });
    } catch (error) {
      toast.error("Erreur lors du chargement de l'adresse");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour géocoder une adresse (convertir en coordonnées GPS)
  // Utilise maintenant l'endpoint backend pour éviter les problèmes de User-Agent
  const geocodeAddress = async (address) => {
    if (!address || address.trim() === "") {
      return null;
    }

    setGeocoding(true);
    try {
      // Utiliser l'endpoint backend pour le géocodage
      const response = await axios.get(`${API}/admin/geocode`, {
        params: {
          address: address.trim(),
        },
        headers: authHeaders,
      });

      if (response.data && response.data.success) {
        const { latitude, longitude, display_name } = response.data;
        
        // Vérifier que les coordonnées sont valides
        if (isNaN(latitude) || isNaN(longitude)) {
          console.error("Coordonnées invalides reçues:", response.data);
          return null;
        }
        
        console.log("📍 Géocodage réussi:", {
          address: address.trim(),
          coordinates: { latitude, longitude },
          display_name: display_name,
        });
        
        return {
          latitude: latitude,
          longitude: longitude,
        };
      }
      
      console.warn("Aucun résultat de géocodage pour:", address);
      return null;
    } catch (error) {
      console.error("Erreur lors du géocodage:", error);
      if (error.response) {
        console.error("Réponse d'erreur:", error.response.status, error.response.data);
        const errorMessage = error.response.data?.detail || error.response.data?.message || "Erreur lors du géocodage";
        toast.error(`❌ ${errorMessage}`, { duration: 5000 });
      } else {
        toast.error("❌ Erreur de connexion lors du géocodage", { duration: 5000 });
      }
      return null;
    } finally {
      setGeocoding(false);
    }
  };

  const handleInputChange = async (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Si l'utilisateur modifie l'adresse complète, géocoder automatiquement
    if (field === "full_address" && value.trim() !== "") {
      // Annuler le timer précédent s'il existe
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
      // Attendre 1.5 secondes après la dernière frappe avant de géocoder (debounce)
      geocodeTimeoutRef.current = setTimeout(async () => {
        const coords = await geocodeAddress(value);
        if (coords) {
          setFormData((prev) => ({
            ...prev,
            latitude: coords.latitude.toFixed(6),
            longitude: coords.longitude.toFixed(6),
          }));
          toast.success("📍 Coordonnées GPS trouvées automatiquement !", {
            duration: 3000,
          });
        } else {
          toast.warning(
            "⚠️ Impossible de trouver les coordonnées GPS pour cette adresse. Vous pouvez les saisir manuellement.",
            { duration: 4000 }
          );
        }
      }, 1500);
    }

    // Si l'utilisateur modifie l'adresse affichée et que l'adresse complète est vide, géocoder celle-ci
    if (
      field === "address_text" &&
      value.trim() !== "" &&
      !formData.full_address
    ) {
      // Annuler le timer précédent s'il existe
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
      geocodeTimeoutRef.current = setTimeout(async () => {
        const coords = await geocodeAddress(value);
        if (coords) {
          setFormData((prev) => ({
            ...prev,
            latitude: coords.latitude.toFixed(6),
            longitude: coords.longitude.toFixed(6),
          }));
          toast.success("📍 Coordonnées GPS trouvées automatiquement !", {
            duration: 3000,
          });
        }
      }, 1500);
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.address_text || formData.address_text.trim() === "") {
      errors.push("L'adresse affichée est requise");
    }

    if (!formData.full_address || formData.full_address.trim() === "") {
      errors.push("L'adresse complète est requise");
    }

    // Les coordonnées GPS sont optionnelles mais si elles sont remplies, elles doivent être valides
    if (formData.latitude && formData.latitude.trim() !== "") {
      const lat = parseFloat(formData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push("La latitude doit être un nombre entre -90 et 90");
      }
    }

    if (formData.longitude && formData.longitude.trim() !== "") {
      const lng = parseFloat(formData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push("La longitude doit être un nombre entre -180 et 180");
      }
    }

    // Si les coordonnées ne sont pas remplies, essayer de les géocoder automatiquement
    if (
      (!formData.latitude || formData.latitude.trim() === "") &&
      (!formData.longitude || formData.longitude.trim() === "") &&
      formData.full_address &&
      formData.full_address.trim() !== ""
    ) {
      // Les coordonnées seront géocodées automatiquement, pas d'erreur
    }

    if (errors.length > 0) {
      toast.error(
        `Veuillez corriger les erreurs suivantes :\n${errors.join("\n")}`,
        {
          duration: 6000,
        }
      );
      return false;
    }

    return true;
  };

  const saveAddress = async () => {
    console.log("💾 Tentative de sauvegarde de l'adresse...");
    console.log("Données du formulaire:", formData);

    if (!validateForm()) {
      console.log("❌ Validation échouée");
      return;
    }

    setSaving(true);
    try {
      // Si les coordonnées ne sont pas remplies, essayer de les géocoder avant de sauvegarder
      let latitude = formData.latitude ? parseFloat(formData.latitude) : null;
      let longitude = formData.longitude
        ? parseFloat(formData.longitude)
        : null;

      if ((!latitude || !longitude) && formData.full_address.trim() !== "") {
        toast.info("📍 Recherche des coordonnées GPS...", { duration: 2000 });
        const coords = await geocodeAddress(formData.full_address);
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
          setFormData((prev) => ({
            ...prev,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
          }));
          toast.success("📍 Coordonnées GPS trouvées et ajoutées !", {
            duration: 3000,
          });
        } else {
          // Utiliser les valeurs par défaut si le géocodage échoue
          latitude = latitude || 45.8336;
          longitude = longitude || 1.2611;
          toast.warning(
            "⚠️ Coordonnées GPS non trouvées, utilisation des valeurs par défaut. Vous pouvez les modifier manuellement.",
            { duration: 4000 }
          );
        }
      }

      const updateData = {
        address_text: formData.address_text.trim(),
        full_address: formData.full_address.trim(),
        latitude: latitude || 45.8336, // Valeur par défaut si absente
        longitude: longitude || 1.2611, // Valeur par défaut si absente
      };

      // Vérifier que l'URL est valide
      if (!BACKEND_URL || BACKEND_URL.trim() === "") {
        toast.error(
          "❌ URL du backend non configurée. Vérifiez REACT_APP_BACKEND_URL dans votre fichier .env"
        );
        console.error("BACKEND_URL est vide ou non défini");
        return;
      }

      const apiUrl = `${API}/admin/address`;

      console.log("📤 Envoi des données:", updateData);
      console.log("URL complète:", apiUrl);
      console.log("BACKEND_URL:", BACKEND_URL);
      console.log("Headers:", authHeaders);

      const response = await axios.put(apiUrl, updateData, {
        headers: authHeaders,
      });
      console.log("✅ Réponse reçue:", response.data);

      setAddressSettings(response.data);
      toast.success(
        "✅ Adresse mise à jour avec succès ! Rafraîchissez la page d'accueil pour voir les changements.",
        {
          duration: 5000,
          position: "top-center",
        }
      );
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      console.error("Détails de l'erreur:", error.response?.data);
      toast.error(
        error.response?.data?.detail ||
          error.message ||
          "Erreur lors de la sauvegarde"
      );
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setFormData({
      address_text: "Le petit juillac 87100 Limoges",
      full_address: "10 rue de dion bouton, 87280 Limoges, France",
      latitude: "45.8336",
      longitude: "1.2611",
    });
    toast.info("Adresse réinitialisée aux valeurs par défaut");
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-white">Chargement de l'adresse...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="!bg-gray-800 !border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <MapPin className="mr-2 h-5 w-5" />
            Gestion de l'Adresse du Drive-In
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configurez l'adresse du cinéma drive-in. Cette adresse sera utilisée
            partout sur le site (page d'accueil, carte, mentions légales).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Settings Display
          {addressSettings && (
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-blue-100 font-semibold">
                  ✅ Adresse actuelle en ligne :
                </h3>
                <Button
                  onClick={() => {
                    // Ouvrir le site public dans un nouvel onglet
                    const publicUrl = window.location.origin;
                    window.open(publicUrl, "_blank");
                  }}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Voir sur le site
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-blue-200 font-medium">
                    📍 Adresse affichée (page d'accueil) :
                  </div>
                  <div className="text-blue-100 font-semibold text-base">
                    {addressSettings.address_text}
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 font-medium">
                    📋 Adresse complète (mentions légales) :
                  </div>
                  <div className="text-blue-100">
                    {addressSettings.full_address}
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 font-medium">
                    🌍 Coordonnées GPS (carte) :
                  </div>
                  <div className="text-blue-100">
                    Latitude: {addressSettings.latitude}, Longitude:{" "}
                    {addressSettings.longitude}
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {/* Address Text Configuration */}
          <div className="space-y-4">
            <h3 className="text-white text-lg font-medium flex items-center">
              📍 Adresse affichée sur le site
            </h3>
            <div className="space-y-2">
              <Label className="text-white">Adresse (texte court) *</Label>
              <Input
                value={formData.address_text}
                onChange={(e) =>
                  handleInputChange("address_text", e.target.value)
                }
                placeholder="Le petit juillac 87100 Limoges"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                required
              />
              <p className="text-xs text-gray-400">
                Cette adresse sera affichée sur la page d'accueil et dans la
                section localisation
              </p>
            </div>
          </div>

          {/* Full Address Configuration */}
          <div className="space-y-4">
            <h3 className="text-white text-lg font-medium flex items-center">
              📋 Adresse complète (mentions légales)
            </h3>
            <div className="space-y-2">
              <Label className="text-white">Adresse complète *</Label>
              <Input
                value={formData.full_address}
                onChange={(e) =>
                  handleInputChange("full_address", e.target.value)
                }
                placeholder="10 rue de dion bouton, 87280 Limoges, France"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                required
              />
              <p className="text-xs text-gray-400">
                Cette adresse sera utilisée dans les mentions légales et les CGV
              </p>
            </div>
          </div>

          {/* Information Card */}
          <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
            <h4 className="text-yellow-100 font-semibold mb-2">
              💡 Information importante :
            </h4>
            <ul className="text-yellow-200 text-sm space-y-1">
              <li>
                • L'adresse sera mise à jour sur tout le site (page d'accueil,
                carte, mentions légales, CGV)
              </li>
              <li>• Les changements sont immédiats après sauvegarde</li>
              <li>
                • Assurez-vous que les coordonnées GPS correspondent bien à
                l'adresse
              </li>
              <li>
                • L'adresse affichée peut être plus courte que l'adresse
                complète
              </li>
            </ul>
          </div>

          {/* GPS Coordinates Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-medium flex items-center">
                🌍 Coordonnées GPS (pour la carte)
              </h3>
              <Button
                type="button"
                onClick={async () => {
                  const addressToGeocode = formData.full_address || formData.address_text;
                  if (!addressToGeocode || addressToGeocode.trim() === "") {
                    toast.error("Veuillez d'abord saisir une adresse");
                    return;
                  }
                  toast.info("📍 Recherche des coordonnées GPS...", { duration: 2000 });
                  const coords = await geocodeAddress(addressToGeocode);
                  if (coords) {
                    setFormData((prev) => ({
                      ...prev,
                      latitude: coords.latitude.toFixed(6),
                      longitude: coords.longitude.toFixed(6),
                    }));
                    toast.success(
                      `📍 Coordonnées trouvées : ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
                      { duration: 4000 }
                    );
                  } else {
                    toast.error(
                      "❌ Impossible de trouver les coordonnées. Vérifiez l'adresse ou saisissez-les manuellement.",
                      { duration: 5000 }
                    );
                  }
                }}
                variant="outline"
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                disabled={geocoding}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {geocoding ? "Recherche..." : "Trouver les coordonnées"}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Latitude *</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) =>
                    handleInputChange("latitude", e.target.value)
                  }
                  placeholder="45.8336"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  required
                />
                <p className="text-xs text-gray-400">
                  Coordonnée GPS latitude (ex: 45.8336)
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Longitude *</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) =>
                    handleInputChange("longitude", e.target.value)
                  }
                  placeholder="1.2611"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  required
                />
                <p className="text-xs text-gray-400">
                  Coordonnée GPS longitude (ex: 1.2611)
                </p>
              </div>
            </div>
            {formData.latitude && formData.longitude && (
              <div className="bg-blue-900 border border-blue-600 rounded-lg p-3">
                <p className="text-blue-100 text-sm">
                  📍 Coordonnées actuelles :{" "}
                  <strong>
                    {parseFloat(formData.latitude).toFixed(6)},{" "}
                    {parseFloat(formData.longitude).toFixed(6)}
                  </strong>
                </p>
                <p className="text-blue-200 text-xs mt-1">
                  Vérifiez que ces coordonnées correspondent bien à l'adresse
                  indiquée. Vous pouvez les corriger manuellement si nécessaire.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={resetToDefaults}
              variant="outline"
              className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                saveAddress();
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder l'adresse"}
            </Button>
          </div>

          {/* Info after save */}
          {addressSettings && (
            <div className="bg-green-900 border border-green-700 rounded-lg p-4">
              <h4 className="text-green-100 font-semibold mb-2 flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                Comment voir les changements sur le site ?
              </h4>
              <ul className="text-green-200 text-sm space-y-1">
                <li>
                  • L'adresse est maintenant sauvegardée dans la base de données
                </li>
                <li>
                  • Pour voir les changements sur le site public, rafraîchissez
                  la page d'accueil (F5 ou Ctrl+R)
                </li>
                <li>
                  • L'adresse sera visible sur : la page d'accueil, la carte,
                  les mentions légales et les CGV
                </li>
                <li>
                  • Utilisez le bouton "Voir sur le site" ci-dessus pour ouvrir
                  le site dans un nouvel onglet
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AddressManagement;
