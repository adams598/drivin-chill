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
    // Valeurs des créneaux (identifiants configurables)
    first_slot_value: '21h15',      // Identifiant du premier créneau
    second_slot_value: '23h45',     // Identifiant du deuxième créneau
    third_slot_value: '01h30',      // Identifiant du troisième créneau
    // Horaires du premier créneau
    first_slot_entry_time: '18h45',  // Halloween schedule
    first_slot_start_time: '19h00',  // FILM 1: 19H00 - 21H00
    first_slot_end_time: '21h00',    // Fin de la première séance
    // Horaires du deuxième créneau
    second_slot_entry_time: '21h00', // Halloween schedule
    second_slot_start_time: '21h15', // FILM 2: 21H15 - 23H15
    second_slot_end_time: '23h15',   // Fin de la deuxième séance
    // Horaires du troisième créneau
    third_slot_entry_time: '23h15',  // Halloween schedule
    third_slot_start_time: '23h30',  // FILM 3: 23H30 - 01H30
    third_slot_end_time: '01h30'     // Fin de la troisième séance
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
        first_slot_value: response.data.first_slot_value || '21h15',
        second_slot_value: response.data.second_slot_value || '23h45',
        third_slot_value: response.data.third_slot_value || '01h30',
        first_slot_entry_time: response.data.first_slot_entry_time || '18h45',
        first_slot_start_time: response.data.first_slot_start_time || '19h00',
        first_slot_end_time: response.data.first_slot_end_time || '21h00',
        second_slot_entry_time: response.data.second_slot_entry_time || '21h00',
        second_slot_start_time: response.data.second_slot_start_time || '21h15',
        second_slot_end_time: response.data.second_slot_end_time || '23h15',
        third_slot_entry_time: response.data.third_slot_entry_time || '23h15',
        third_slot_start_time: response.data.third_slot_start_time || '23h30',
        third_slot_end_time: response.data.third_slot_end_time || '01h30'
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
    const { 
      first_slot_entry_time, first_slot_start_time, first_slot_end_time,
      second_slot_entry_time, second_slot_start_time, second_slot_end_time,
      third_slot_entry_time, third_slot_start_time, third_slot_end_time
    } = formData;
    
    // Validate format for all fields
    const timeRegex = /^([0-1]?[0-9]|2[0-3])h([0-5][0-9])$/;
    const fields = [
      { name: 'Heure d\'entrée première séance', value: first_slot_entry_time },
      { name: 'Heure de début première séance', value: first_slot_start_time },
      { name: 'Heure de fin première séance', value: first_slot_end_time },
      { name: 'Heure d\'entrée deuxième séance', value: second_slot_entry_time },
      { name: 'Heure de début deuxième séance', value: second_slot_start_time },
      { name: 'Heure de fin deuxième séance', value: second_slot_end_time },
      { name: 'Heure d\'entrée troisième séance', value: third_slot_entry_time },
      { name: 'Heure de début troisième séance', value: third_slot_start_time },
      { name: 'Heure de fin troisième séance', value: third_slot_end_time }
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
      const firstEnd = timeToMinutes(first_slot_end_time);
      const secondEntry = timeToMinutes(second_slot_entry_time);
      const secondStart = timeToMinutes(second_slot_start_time);
      const secondEnd = timeToMinutes(second_slot_end_time);
      const thirdEntry = timeToMinutes(third_slot_entry_time);
      const thirdStart = timeToMinutes(third_slot_start_time);
      const thirdEnd = timeToMinutes(third_slot_end_time);

      // Validation première séance
      if (firstStart <= firstEntry) {
        toast.error('L\'heure de début de la première séance doit être après l\'heure d\'entrée');
        return false;
      }
      if (firstEnd <= firstStart) {
        toast.error('L\'heure de fin de la première séance doit être après l\'heure de début');
        return false;
      }

      // Validation deuxième séance
      if (secondStart <= secondEntry) {
        toast.error('L\'heure de début de la deuxième séance doit être après l\'heure d\'entrée');
        return false;
      }
      if (secondEnd <= secondStart) {
        toast.error('L\'heure de fin de la deuxième séance doit être après l\'heure de début');
        return false;
      }
      if (secondEntry <= firstEnd) {
        toast.error('La deuxième séance doit commencer après la fin de la première');
        return false;
      }

      // Validation troisième séance
      if (thirdStart <= thirdEntry) {
        toast.error('L\'heure de début de la troisième séance doit être après l\'heure d\'entrée');
        return false;
      }
      if (thirdEnd <= thirdStart) {
        toast.error('L\'heure de fin de la troisième séance doit être après l\'heure de début');
        return false;
      }
      if (thirdEntry <= secondEnd) {
        toast.error('La troisième séance doit commencer après la fin de la deuxième');
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
      first_slot_value: '21h15',
      second_slot_value: '23h45',
      third_slot_value: '01h30',
      first_slot_entry_time: '18h45',
      first_slot_start_time: '19h00',
      first_slot_end_time: '21h00',
      second_slot_entry_time: '21h00',
      second_slot_start_time: '21h15',
      second_slot_end_time: '23h15',
      third_slot_entry_time: '23h15',
      third_slot_start_time: '23h30',
      third_slot_end_time: '01h30'
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
            Configurez les identifiants des créneaux et les horaires d'entrée, de début et de fin des séances. Ces paramètres s'appliqueront à tout le site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Settings Display */}
          {timeSlots && (
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <h3 className="text-blue-100 font-semibold mb-3">Horaires actuels en ligne :</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-blue-200 font-medium">🌅 Première séance</div>
                  <div className="text-blue-100">Identifiant : {timeSlots.first_slot_value || '21h15'}</div>
                  <div className="text-blue-100">Entrée : {timeSlots.first_slot_entry_time}</div>
                  <div className="text-blue-100">Début : {timeSlots.first_slot_start_time}</div>
                  <div className="text-blue-100">Fin : {timeSlots.first_slot_end_time || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-blue-200 font-medium">🌙 Deuxième séance</div>
                  <div className="text-blue-100">Identifiant : {timeSlots.second_slot_value || '23h45'}</div>
                  <div className="text-blue-100">Entrée : {timeSlots.second_slot_entry_time}</div>
                  <div className="text-blue-100">Début : {timeSlots.second_slot_start_time}</div>
                  <div className="text-blue-100">Fin : {timeSlots.second_slot_end_time || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-blue-200 font-medium">🌃 Troisième séance</div>
                  <div className="text-blue-100">Identifiant : {timeSlots.third_slot_value || '01h30'}</div>
                  <div className="text-blue-100">Entrée : {timeSlots.third_slot_entry_time || 'N/A'}</div>
                  <div className="text-blue-100">Début : {timeSlots.third_slot_start_time || 'N/A'}</div>
                  <div className="text-blue-100">Fin : {timeSlots.third_slot_end_time || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          {/* First Slot Configuration */}
          <div className="space-y-4">
            <h3 className="text-white text-lg font-medium flex items-center">
              🌅 Première séance
            </h3>
            <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-3 mb-4">
              <Label className="text-yellow-100 font-semibold">Identifiant du créneau (utilisé dans le système)</Label>
              <Input
                value={formData.first_slot_value}
                onChange={(e) => handleInputChange('first_slot_value', e.target.value)}
                placeholder="21h15"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-2"
              />
              <p className="text-xs text-yellow-200 mt-1">Cet identifiant est utilisé pour identifier ce créneau dans le système (ex: 21h15, 20h00, etc.)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Heure d'entrée</Label>
                <Input
                  value={formData.first_slot_entry_time}
                  onChange={(e) => handleInputChange('first_slot_entry_time', e.target.value)}
                  placeholder="18h45"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 18h45)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Heure de début du film</Label>
                <Input
                  value={formData.first_slot_start_time}
                  onChange={(e) => handleInputChange('first_slot_start_time', e.target.value)}
                  placeholder="19h00"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 19h00)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Heure de fin du film</Label>
                <Input
                  value={formData.first_slot_end_time}
                  onChange={(e) => handleInputChange('first_slot_end_time', e.target.value)}
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
            <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-3 mb-4">
              <Label className="text-yellow-100 font-semibold">Identifiant du créneau (utilisé dans le système)</Label>
              <Input
                value={formData.second_slot_value}
                onChange={(e) => handleInputChange('second_slot_value', e.target.value)}
                placeholder="23h45"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-2"
              />
              <p className="text-xs text-yellow-200 mt-1">Cet identifiant est utilisé pour identifier ce créneau dans le système (ex: 23h45, 22h00, etc.)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Heure d'entrée</Label>
                <Input
                  value={formData.second_slot_entry_time}
                  onChange={(e) => handleInputChange('second_slot_entry_time', e.target.value)}
                  placeholder="21h00"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 21h00)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Heure de début du film</Label>
                <Input
                  value={formData.second_slot_start_time}
                  onChange={(e) => handleInputChange('second_slot_start_time', e.target.value)}
                  placeholder="21h15"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 21h15)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Heure de fin du film</Label>
                <Input
                  value={formData.second_slot_end_time}
                  onChange={(e) => handleInputChange('second_slot_end_time', e.target.value)}
                  placeholder="23h15"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 23h15)</p>
              </div>
            </div>
          </div>

          {/* Third Slot Configuration */}
          <div className="space-y-4">
            <h3 className="text-white text-lg font-medium flex items-center">
              🌃 Troisième séance
            </h3>
            <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-3 mb-4">
              <Label className="text-yellow-100 font-semibold">Identifiant du créneau (utilisé dans le système)</Label>
              <Input
                value={formData.third_slot_value}
                onChange={(e) => handleInputChange('third_slot_value', e.target.value)}
                placeholder="01h30"
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-2"
              />
              <p className="text-xs text-yellow-200 mt-1">Cet identifiant est utilisé pour identifier ce créneau dans le système (ex: 01h30, 00h00, etc.)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Heure d'entrée</Label>
                <Input
                  value={formData.third_slot_entry_time}
                  onChange={(e) => handleInputChange('third_slot_entry_time', e.target.value)}
                  placeholder="23h15"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 23h15)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Heure de début du film</Label>
                <Input
                  value={formData.third_slot_start_time}
                  onChange={(e) => handleInputChange('third_slot_start_time', e.target.value)}
                  placeholder="23h30"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 23h30)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Heure de fin du film</Label>
                <Input
                  value={formData.third_slot_end_time}
                  onChange={(e) => handleInputChange('third_slot_end_time', e.target.value)}
                  placeholder="01h30"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-400">Format: XXhXX (ex: 01h30)</p>
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