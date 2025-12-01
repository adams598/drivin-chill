import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, Mail, MapPin, Building } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LegalPages = ({ type, onBack }) => {
  const [addressSettings, setAddressSettings] = useState(null);

  useEffect(() => {
    fetchAddressSettings();
  }, []);

  const fetchAddressSettings = async () => {
    try {
      const response = await axios.get(`${API}/address`);
      setAddressSettings(response.data);
    } catch (error) {
      console.error("Error fetching address settings:", error);
      setAddressSettings(null);
    }
  };
  const renderMentionsLegales = () => (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Building className="mr-2 h-6 w-6 text-blue-400" />
            Éditeur du Site
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 space-y-3">
          <div>
            <strong className="text-white">Nom et prénom de l'éditeur :</strong> Ozturk Semih
          </div>
          <div>
            <strong className="text-white">Statut :</strong> Auto-entrepreneur individuel
          </div>
          <div>
            <strong className="text-white">SIREN :</strong> 941 249 609
          </div>
          <div>
            <strong className="text-white">Nom commercial et officiel :</strong> Drivin And Chill
          </div>
          <div className="flex items-center">
            <Mail className="mr-2 h-4 w-4 text-blue-400" />
            <strong className="text-white">Adresse mail professionnelle :</strong> semih.adresse@gmail.com
          </div>
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4 text-blue-400" />
            <strong className="text-white">Adresse :</strong> {addressSettings?.full_address || "10 rue de dion bouton, 87280 Limoges, France"}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Hébergement</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300">
          <div>
            <strong className="text-white">Hébergeur du site :</strong> À définir
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Propriété Intellectuelle</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300">
          <p>
            Le contenu du site Drivin And Chill est la propriété exclusive de son propriétaire, 
            sauf indication contraire. Toute reproduction est interdite sans autorisation préalable.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Protection des Données</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 space-y-3">
          <p>
            Les données recueillies via le formulaire de contact ou de réservation sont uniquement 
            utilisées pour la gestion des réservations et la communication liée à l'activité.
          </p>
          <p>
            Conformément à la loi "Informatique et Libertés", vous pouvez demander la suppression 
            de vos données à tout moment en nous contactant à : semih.adresse@gmail.com
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Cookies</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300">
          <p>
            Ce site peut utiliser des cookies techniques nécessaires à son fonctionnement. 
            Aucun cookie de traçage publicitaire n'est utilisé sans votre consentement.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderCGV = () => (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Article 1 - Objet</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300">
          <p>
            Les présentes conditions générales de vente régissent la vente de billets d'entrée 
            pour le cinéma drive-in "Drivin And Chill" situé au {addressSettings?.full_address || "10 rue de dion bouton, 87280 Limoges"}.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Article 2 - Prix et Modalités de Paiement</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 space-y-2">
          <p>• Le prix du billet est de 17€ par véhicule, quel que soit le nombre d'occupants.</p>
          <p>• Le paiement s'effectue en ligne par carte bancaire, Apple Pay, ou Lydia.</p>
          <p>• La réservation n'est confirmée qu'après validation du paiement.</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Article 3 - Séances et Horaires</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 space-y-2">
          <p>• Les séances peuvent avoir lieu tous les jours de la semaine.</p>
          <p>• Deux créneaux par soir : 21h15 (diffusion 21h30) et 23h45 (diffusion 00h00).</p>
          <p>• Les clients doivent arriver 15 minutes avant l'heure de diffusion.</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Article 4 - Conditions Météorologiques</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 space-y-2">
          <p>
            En cas de pluie, le film sera diffusé tant que la sécurité le permet. 
            Le son sortant directement des véhicules, les essuie-glaces ne gâchent rien à l'expérience.
          </p>
          <p>
            En cas de météo très problématique, les clients seront prévenus quelques heures 
            à l'avance par email.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Article 5 - Annulation et Remboursement</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 space-y-2">
          <p>• Les réservations peuvent être annulées jusqu'à 8h avant la séance.</p>
          <p>• En cas d'annulation de notre fait (météo exceptionnelle), remboursement intégral.</p>
          <p>• Aucun remboursement en cas de non-présentation du client.</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Article 6 - Responsabilité</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300">
          <p>
            Drivin And Chill décline toute responsabilité en cas de vol, dégradation 
            ou accident concernant les véhicules présents sur le site.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Article 7 - Droit Applicable</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300">
          <p>
            Les présentes CGV sont soumises au droit français. 
            Tout litige sera de la compétence des tribunaux de Limoges.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={onBack}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            {type === 'mentions' ? 'Mentions Légales' : 'Conditions Générales de Vente'}
          </h1>
          <p className="text-gray-400">
            {type === 'mentions' 
              ? 'Informations légales concernant le site Drivin And Chill'
              : 'Conditions régissant l\'achat de billets pour le cinéma drive-in'
            }
          </p>
        </div>

        {type === 'mentions' ? renderMentionsLegales() : renderCGV()}

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalPages;