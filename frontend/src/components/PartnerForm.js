import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Mail, Building, User, MessageCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PartnerForm = ({ onBack }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.contactName || !formData.email || !formData.message) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        company_name: formData.companyName,
        contact_name: formData.contactName,
        email: formData.email,
        phone: formData.phone || null,
        message: formData.message
      };

      await axios.post(`${API}/partners/contact`, submitData);
      
      toast.success('Votre demande a été envoyée avec succès ! Nous vous contacterons bientôt.');
      
      // Reset form
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        message: ''
      });

    } catch (error) {
      console.error('Partner contact error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi de votre demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Espace Partenaire</h1>
          <p className="text-gray-400">Proposez votre publicité au cinéma drive-in Drivin And Chill</p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-xl flex items-center">
              <Building className="mr-2 h-6 w-6 text-blue-400" />
              Demande de Partenariat Publicitaire
            </CardTitle>
            <CardDescription className="text-gray-300">
              Remplissez ce formulaire pour nous proposer un partenariat publicitaire. 
              Nous étudierons votre demande et vous contacterons rapidement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit}>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white flex items-center">
                    <Building className="mr-2 h-4 w-4" />
                    Nom de l'entreprise *
                  </Label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="Votre entreprise"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Nom du contact *
                  </Label>
                  <Input
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    placeholder="Votre nom et prénom"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    Email professionnel *
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="contact@entreprise.com"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white">Téléphone (optionnel)</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white flex items-center">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Votre proposition *
                </Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  placeholder="Décrivez votre proposition publicitaire : type de publicité souhaité, budget approximatif, objectifs, durée envisagée, etc."
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[120px]"
                  required
                />
              </div>

              <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
                <h3 className="text-blue-100 font-semibold mb-2">Opportunités publicitaires disponibles :</h3>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• Affichage sur écran avant/pendant les séances</li>
                  <li>• Stands de produits dans l'espace snacking</li>
                  <li>• Partenariats pour événements spéciaux</li>
                  <li>• Publicité sur notre site web et réseaux sociaux</li>
                  <li>• Sponsoring de séances thématiques</li>
                </ul>
              </div>

              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <p className="text-gray-300 text-sm">
                  <strong>Contact direct :</strong> semih.adresse@gmail.com
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Vos données seront utilisées uniquement pour traiter votre demande de partenariat 
                  et vous contacter dans ce cadre.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  Retour à l'accueil
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerForm;