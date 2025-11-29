import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Clock, Save, RotateCcw, Mail, TestTube } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TimeSlotManagement = () => {
  const [timeSlots, setTimeSlots] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_slot_entry_time: '18h45',  // Halloween schedule
    first_slot_start_time: '19h00',  // FILM 1: 19H00 - 21H00
    second_slot_entry_time: '21h00', // Halloween schedule
    second_slot_start_time: '21h15', // FILM 2: 21H15 - 23H15
    third_slot_entry_time: '23h15',  // Halloween schedule
    third_slot_start_time: '23h30'   // FILM 3: 23H30 - 01H30
  });
  const [testingEmail, setTestingEmail] = useState(false);

  const token = localStorage.getItem('admin_token');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  const fetchTimeSlots = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/time-slots`, { headers: authHeaders });
      setTimeSlots(response.data);
      setFormData({
        first_slot_entry_time: response.data.first_slot_entry_time,
        first_slot_start_time: response.data.first_slot_start_time,
        second_slot_entry_time: response.data.second_slot_entry_time,
        second_slot_start_time: response.data.second_slot_start_time
      });
    } catch (error) {
      toast.error('Erreur lors du chargement des horaires');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Allow empty value or partial input during typing
    if (value === '') {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      return;
    }
    
    // Validate complete time format only if the user has finished typing
    const timeRegex = /^([0-1]?[0-9]|2[0-3])h([0-5][0-9])$/;
    
    // Allow partial input during typing (e.g., "1", "19", "19h", "19h3")
    const partialRegex = /^([0-2]?[0-9]?)h?([0-5]?[0-9]?)?$/;
    
    if (!partialRegex.test(value)) {
      // Only show error for clearly invalid input
      toast.error('Format d\'heure invalide. Utilisez le format: 20h45');
      return;
    }
    
    // Update the state regardless (for partial input)
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Show warning only for complete but incorrect format
    if (value.includes('h') && value.length >= 4 && !timeRegex.test(value)) {
      toast.warning('Format attendu: 20h45 (heures: 00-23, minutes: 00-59)');
    }
  };

  const validateTimes = () => {
    const { first_slot_entry_time, first_slot_start_time, second_slot_entry_time, second_slot_start_time } = formData;
    
    // Validate format for all fields
    const timeRegex = /^([0-1]?[0-9]|2[0-3])h([0-5][0-9])$/;
    const fields = [
      { name: 'Heure d\'entrée première séance', value: first_slot_entry_time },
      { name: 'Heure de début première séance', value: first_slot_start_time },
      { name: 'Heure d\'entrée deuxième séance', value: second_slot_entry_time },
      { name: 'Heure de début deuxième séance', value: second_slot_start_time }
    ];
    
    for (const field of fields) {
      if (!field.value || !timeRegex.test(field.value)) {
        toast.error(`${field.name} : format invalide. Utilisez le format 20h45`);
        return false;
      }
    }
    
    // Convert to minutes for comparison
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split('h').map(Number);
      return hours * 60 + minutes;
    };

    try {
      const firstEntry = timeToMinutes(first_slot_entry_time);
      const firstStart = timeToMinutes(first_slot_start_time);
      const secondEntry = timeToMinutes(second_slot_entry_time);
      const secondStart = timeToMinutes(second_slot_start_time);

      if (firstStart <= firstEntry) {
        toast.error('L\'heure de début de la première séance doit être après l\'heure d\'entrée');
        return false;
      }

      if (secondStart <= secondEntry) {
        toast.error('L\'heure de début de la deuxième séance doit être après l\'heure d\'entrée');
        return false;
      }

      if (secondEntry <= firstStart) {
        toast.error('La deuxième séance doit commencer après la première');
        return false;
      }

      return true;
    } catch (error) {
      toast.error('Erreur de validation des horaires. Vérifiez le format.');
      return false;
    }
  };

  const saveTimeSlots = async () => {
    if (!validateTimes()) return;

    setSaving(true);
    try {
      const response = await axios.put(`${API}/admin/time-slots`, formData, { headers: authHeaders });
      setTimeSlots(response.data);
      toast.success('✅ Horaires mis à jour avec succès ! Les changements sont maintenant visibles sur tout le site.', {
        duration: 4000,
        position: 'top-center'
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setFormData({
      first_slot_entry_time: '20h45',
      first_slot_start_time: '21h00',
      second_slot_entry_time: '23h15',
      second_slot_start_time: '23h30'
    });
    toast.info('Horaires réinitialisés aux valeurs par défaut');
  };

  const testEmailSending = async () => {
    setTestingEmail(true);
    try {
      const response = await axios.post(`${API}/admin/test-email`, {}, { headers: authHeaders });
      
      if (response.data.status === 'success') {
        toast.success(`✅ ${response.data.message} (${response.data.recipient})`, {
          duration: 5000,
          position: 'top-center'
        });
      } else {
        toast.error(`❌ ${response.data.message}. ${response.data.details || ''}`, {
          duration: 5000
        });
      }
    } catch (error) {
      toast.error(`❌ Erreur lors du test d'email: ${error.response?.data?.detail || error.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-white">Chargement des horaires...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Clock className="mr-2 h-5 w-5" />
            Gestion des Horaires du Drive-In
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configurez les horaires d'entrée et de début des séances. Ces horaires s'appliqueront à tout le site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Settings Display */}
          {timeSlots && (
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <h3 className="text-blue-100 font-semibold mb-3">Horaires actuels en ligne :</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-blue-200 font-medium">🌅 Première séance</div>
                  <div className="text-blue-100">Entrée : {timeSlots.first_slot_entry_time}</div>
                  <div className="text-blue-100">Début du film : {timeSlots.first_slot_start_time}</div>
                </div>
                <div>
                  <div className="text-blue-200 font-medium">🌙 Deuxième séance</div>
                  <div className="text-blue-100">Entrée : {timeSlots.second_slot_entry_time}</div>
                  <div className="text-blue-100">Début du film : {timeSlots.second_slot_start_time}</div>
                </div>
              </div>
            </div>
          )}

          {/* First Slot Configuration */}
          <div className="space-y-4">
            <h3 className="text-white text-lg font-medium flex items-center">
              🌅 Première séance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Heure d'entrée</Label>
                <Input
                  value={formData.first_slot_entry_time}
                  onChange={(e) => handleInputChange('first_slot_entry_time', e.target.value)}
                  placeholder="20h45"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 20h45)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Heure de début du film</Label>
                <Input
                  value={formData.first_slot_start_time}
                  onChange={(e) => handleInputChange('first_slot_start_time', e.target.value)}
                  placeholder="21h00"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 21h00)</p>
              </div>
            </div>
          </div>

          {/* Second Slot Configuration */}
          <div className="space-y-4">
            <h3 className="text-white text-lg font-medium flex items-center">
              🌙 Deuxième séance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Heure d'entrée</Label>
                <Input
                  value={formData.second_slot_entry_time}
                  onChange={(e) => handleInputChange('second_slot_entry_time', e.target.value)}
                  placeholder="23h15"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 23h15)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Heure de début du film</Label>
                <Input
                  value={formData.second_slot_start_time}
                  onChange={(e) => handleInputChange('second_slot_start_time', e.target.value)}
                  placeholder="23h30"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 23h30)</p>
              </div>
            </div>
          </div>

          {/* Information Card */}
          <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
            <h4 className="text-yellow-100 font-semibold mb-2">💡 Information importante :</h4>
            <ul className="text-yellow-200 text-sm space-y-1">
              <li>• Les horaires seront mis à jour sur tout le site (page d'accueil, réservations, emails)</li>
              <li>• Assurez-vous de laisser suffisamment de temps entre l'entrée et le début du film</li>
              <li>• Les changements sont immédiats après sauvegarde</li>
              <li>• Ces horaires s'adaptent au cycle du soleil comme souhaité</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={resetToDefaults}
              variant="outline" 
              className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
            <Button
              onClick={saveTimeSlots}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder les horaires'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Testing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Mail className="mr-2 h-5 w-5" />
            Test du Système d'Emails
          </CardTitle>
          <CardDescription className="text-gray-400">
            Testez l'envoi d'emails de confirmation pour vous assurer que le système fonctionne correctement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
            <h4 className="text-blue-100 font-semibold mb-2">🧪 Test d'Email</h4>
            <p className="text-blue-200 text-sm mb-3">
              Ce test envoie un email de confirmation simulé à "test@example.com" pour vérifier que le système d'emails fonctionne correctement.
            </p>
            <Button
              onClick={testEmailSending}
              disabled={testingEmail}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <TestTube className="mr-2 h-4 w-4" />
              {testingEmail ? 'Test en cours...' : 'Tester l\'envoi d\'email'}
            </Button>
          </div>

          <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
            <h4 className="text-yellow-100 font-semibold mb-2">⚙️ Configuration Email</h4>
            <ul className="text-yellow-200 text-sm space-y-1">
              <li>• En mode développement : les emails sont simulés (affichés dans les logs)</li>
              <li>• Pour activer les vrais emails : configurez EMAIL_USERNAME et EMAIL_PASSWORD dans .env</li>
              <li>• Vérifiez les logs du serveur pour les détails d'envoi</li>
              <li>• En cas d'échec : vérifiez la configuration SMTP</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeSlotManagement;