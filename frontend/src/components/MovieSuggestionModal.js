import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Film, X, Lightbulb, Send } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MovieSuggestionModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    movie_title: '',
    director: '',
    release_year: '',
    reason: '',
    suggested_by: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.movie_title.trim() || !formData.suggested_by.trim()) {
      toast.error('Le titre du film et votre nom sont obligatoires');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData = {
        ...formData,
        release_year: formData.release_year ? parseInt(formData.release_year) : null
      };

      // Remove empty fields
      Object.keys(submitData).forEach(key => {
        if (!submitData[key] || submitData[key] === '') {
          delete submitData[key];
        }
      });

      await axios.post(`${API}/movie-suggestions`, submitData);
      
      toast.success('🎬 Merci pour votre suggestion ! Elle sera examinée par notre équipe.', {
        duration: 5000,
        position: 'top-center'
      });
      
      // Reset form
      setFormData({
        movie_title: '',
        director: '',
        release_year: '',
        reason: '',
        suggested_by: '',
        email: ''
      });
      
      onClose();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi de la suggestion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="bg-gray-800 border-gray-600 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <CardTitle className="flex items-center text-white">
            <Lightbulb className="mr-2 h-6 w-6 text-yellow-400" />
            Suggérer un film
          </CardTitle>
          <CardDescription className="text-gray-400">
            Partagez avec nous les films que vous aimeriez voir dans notre drive-in !
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Movie Title - Required */}
            <div className="space-y-2">
              <Label className="text-white flex items-center">
                <Film className="mr-1 h-4 w-4" />
                Titre du film <span className="text-red-400">*</span>
              </Label>
              <Input
                value={formData.movie_title}
                onChange={(e) => handleInputChange('movie_title', e.target.value)}
                placeholder="Ex: Blade Runner 2049"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                maxLength={200}
                required
              />
            </div>

            {/* Director - Optional */}
            <div className="space-y-2">
              <Label className="text-white">Réalisateur (optionnel)</Label>
              <Input
                value={formData.director}
                onChange={(e) => handleInputChange('director', e.target.value)}
                placeholder="Ex: Denis Villeneuve"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                maxLength={100}
              />
            </div>

            {/* Release Year - Optional */}
            <div className="space-y-2">
              <Label className="text-white">Année de sortie (optionnel)</Label>
              <Input
                type="number"
                value={formData.release_year}
                onChange={(e) => handleInputChange('release_year', e.target.value)}
                placeholder="Ex: 2017"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                min="1900"
                max="2030"
              />
            </div>

            {/* Reason - Optional */}
            <div className="space-y-2">
              <Label className="text-white">Pourquoi ce film ? (optionnel)</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="Ex: Ce film a une bande sonore extraordinaire qui serait parfaite en drive-in..."
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500">
                {formData.reason.length}/500 caractères
              </p>
            </div>

            {/* Suggested By - Required */}
            <div className="space-y-2">
              <Label className="text-white">
                Votre nom <span className="text-red-400">*</span>
              </Label>
              <Input
                value={formData.suggested_by}
                onChange={(e) => handleInputChange('suggested_by', e.target.value)}
                placeholder="Ex: Marie Dubois"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                maxLength={100}
                required
              />
            </div>

            {/* Email - Optional */}
            <div className="space-y-2">
              <Label className="text-white">Email de contact (optionnel)</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Ex: marie@example.com"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <p className="text-xs text-gray-500">
                Pour vous tenir informé si votre suggestion est retenue
              </p>
            </div>

            {/* Info */}
            <div className="bg-blue-900 border border-blue-600 rounded-lg p-3">
              <p className="text-blue-200 text-sm">
                💡 <strong>Bon à savoir :</strong> Notre équipe examine toutes les suggestions. 
                Les films les plus demandés ont plus de chances d'être programmés !
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Envoi...' : 'Envoyer la suggestion'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MovieSuggestionModal;