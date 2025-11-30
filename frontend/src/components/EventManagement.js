import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, Plus, Edit, Trash2, Save, X, Star } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EVENT_TYPES = [
  { value: "spectacle", label: "Spectacle" },
  { value: "concert", label: "Concert" },
  { value: "soiree_thematique", label: "Soirée Thématique" },
  { value: "stand_up", label: "Stand-up" },
  { value: "projection_speciale", label: "Projection Spéciale" },
  { value: "autre", label: "Autre" }
];

const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [timeSlotSettings, setTimeSlotSettings] = useState(null);

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    duration_minutes: 120,
    event_type: 'spectacle',
    organizer: '',
    poster_url: '',
    price: 17.0
  });

  const [scheduleForm, setScheduleForm] = useState({
    content_id: '',
    date: null,
    time_slot: '21h15', // Placeholder value (required by backend but not used for events)
    custom_time: '', // Custom time for events (e.g., "19h30")
    capacity: 21
  });

  const token = localStorage.getItem('admin_token');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    fetchEvents();
    fetchSchedules();
    fetchTimeSlotSettings();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/events`, { headers: authHeaders });
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API}/content-schedules`, { headers: authHeaders });
      // Filter only event schedules
      const eventSchedules = response.data.filter(item => item.schedule.content_type === 'event');
      setSchedules(eventSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Erreur lors du chargement de la programmation');
    }
  };

  const fetchTimeSlotSettings = async () => {
    try {
      const response = await axios.get(`${API}/time-slots`);
      setTimeSlotSettings(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de créneaux:', error);
    }
  };

  // Generate dynamic time slots based on admin settings
  const getTimeSlots = () => {
    if (!timeSlotSettings) {
      // Fallback: Return backend-compatible values with Halloween labels
      return [
        { value: "21h15", label: "Entrée : 18h45 • Film : 19h00-21h00" },
        { value: "23h45", label: "Entrée : 21h00 • Film : 21h15-23h15" },
        { value: "01h30", label: "Entrée : 23h15 • Film : 23h30-01h30" }
      ];
    }

    // Use configurable slot values with dynamic display labels
    const slots = [
      { 
        value: timeSlotSettings.first_slot_value || "21h15",  // Configurable value
        label: `Entrée : ${timeSlotSettings.first_slot_entry_time} • Film : ${timeSlotSettings.first_slot_start_time}-${timeSlotSettings.first_slot_end_time || '21h00'}`
      },
      { 
        value: timeSlotSettings.second_slot_value || "23h45",  // Configurable value
        label: `Entrée : ${timeSlotSettings.second_slot_entry_time} • Film : ${timeSlotSettings.second_slot_start_time}-${timeSlotSettings.second_slot_end_time || '23h15'}`
      }
    ];

    // Toujours ajouter le 3ème créneau (avec valeurs par défaut si non définies)
    slots.push({
      value: timeSlotSettings.third_slot_value || "01h30",  // Configurable value
      label: `Entrée : ${timeSlotSettings.third_slot_entry_time || '23h15'} • Film : ${timeSlotSettings.third_slot_start_time || '23h30'}-${timeSlotSettings.third_slot_end_time || '01h30'}`
    });

    return slots;
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Nettoyer les URLs (enlever les espaces)
      const cleanedEventForm = {
        ...eventForm,
        poster_url: eventForm.poster_url ? eventForm.poster_url.trim() : null
      };
      
      if (editingEvent) {
        const response = await axios.put(`${API}/events/${editingEvent.id}`, cleanedEventForm, { headers: authHeaders });
        toast.success('Événement mis à jour avec succès !');
        setEditingEvent(null);
      } else {
        const response = await axios.post(`${API}/events`, cleanedEventForm, { headers: authHeaders });
        toast.success('Événement créé avec succès !');
      }
      
      setShowEventForm(false);
      resetEventForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation de l'horaire personnalisé
    if (scheduleForm.custom_time && !validateCustomTime(scheduleForm.custom_time)) {
      toast.error('Format d\'horaire invalide. Utilisez le format HHhMM (ex: 19h30, 20h00)');
      return;
    }

    if (!scheduleForm.custom_time) {
      toast.error('Veuillez saisir un horaire pour l\'événement');
      return;
    }

    setLoading(true);

    try {
      const scheduleData = {
        ...scheduleForm,
        content_type: 'event',
        date: format(scheduleForm.date, 'yyyy-MM-dd')
      };

      const response = await axios.post(`${API}/content-schedules`, scheduleData, { headers: authHeaders });
      toast.success('Événement programmé avec succès !');
      
      setShowScheduleForm(false);
      resetScheduleForm();
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la programmation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;

    try {
      await axios.delete(`${API}/events/${eventId}`, { headers: authHeaders });
      toast.success('Événement supprimé avec succès !');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette programmation ?')) return;

    try {
      await axios.delete(`${API}/content-schedules/${scheduleId}`, { headers: authHeaders });
      toast.success('Programmation supprimée avec succès !');
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      duration_minutes: 120,
      event_type: 'spectacle',
      organizer: '',
      poster_url: '',
      price: 17.0
    });
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      content_id: '',
      date: null,
      time_slot: '21h15', // Placeholder value
      custom_time: '',
      capacity: 21
    });
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description,
      duration_minutes: event.duration_minutes,
      event_type: event.event_type,
      organizer: event.organizer || '',
      poster_url: event.poster_url || '',
      price: event.price
    });
    setShowEventForm(true);
  };

  const isValidDate = (date) => {
    if (!date) return false;
    // Les événements peuvent être programmés n'importe quel jour de la semaine
    return true;
  };

  const isDateDisabled = (date) => {
    const today = startOfDay(new Date());
    // Seules les dates passées sont désactivées pour les événements
    return isBefore(date, today);
  };

  // Validation pour les horaires personnalisés des événements
  const validateCustomTime = (time) => {
    if (!time) return false;
    // Format accepté: HHhMM (ex: 19h30, 20h00, 21h15)
    const timeRegex = /^([0-1]?[0-9]|2[0-3])h([0-5][0-9])$/;
    return timeRegex.test(time);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestion des Événements</h2>
        <div className="space-x-2">
          <Button
            onClick={() => {
              resetEventForm();
              setEditingEvent(null);
              setShowEventForm(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvel Événement
          </Button>
          <Button
            onClick={() => {
              resetScheduleForm();
              setShowScheduleForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Programmer Événement
          </Button>
        </div>
      </div>

      {/* Event Form */}
      {showEventForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingEvent ? 'Modifier l\'Événement' : 'Nouvel Événement'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Titre *</Label>
                  <Input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Type d'événement *</Label>
                  <Select value={eventForm.event_type} onValueChange={(value) => setEventForm({...eventForm, event_type: value})}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-700">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-white">Description *</Label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  className="w-full p-2 bg-gray-700 border-gray-600 text-white rounded-md border resize-none"
                  rows="4"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-white">Durée (minutes) *</Label>
                  <Input
                    type="number"
                    value={eventForm.duration_minutes}
                    onChange={(e) => setEventForm({...eventForm, duration_minutes: parseInt(e.target.value)})}
                    className="bg-gray-700 border-gray-600 text-white"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Organisateur</Label>
                  <Input
                    type="text"
                    value={eventForm.organizer}
                    onChange={(e) => setEventForm({...eventForm, organizer: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Prix (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={eventForm.price}
                    onChange={(e) => setEventForm({...eventForm, price: parseFloat(e.target.value)})}
                    className="bg-gray-700 border-gray-600 text-white"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">URL de l'affiche</Label>
                <Input
                  type="url"
                  value={eventForm.poster_url}
                  onChange={(e) => setEventForm({...eventForm, poster_url: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="https://example.com/poster.jpg"
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                  <Save className="mr-2 h-4 w-4" />
                  {editingEvent ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEvent(null);
                    resetEventForm();
                  }}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Schedule Form */}
      {showScheduleForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Programmer un Événement</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Événement *</Label>
                  <Select value={scheduleForm.content_id} onValueChange={(value) => setScheduleForm({...scheduleForm, content_id: value})}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Choisir un événement" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id} className="text-white hover:bg-gray-700">
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleForm.date ? format(scheduleForm.date, 'PPP', { locale: fr }) : "Choisir une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleForm.date}
                        onSelect={(date) => setScheduleForm({...scheduleForm, date})}
                        disabled={isDateDisabled}
                        locale={fr}
                        className="rounded-md"
                        fromDate={new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Horaire de l'événement *</Label>
                  <Input
                    type="text"
                    value={scheduleForm.custom_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, custom_time: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Ex: 19h30, 20h00, 22h15"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Format: HHhMM (ex: 19h30 pour 19h30)
                  </p>
                </div>

                <div>
                  <Label className="text-white">Capacité (voitures) *</Label>
                  <Input
                    type="number"
                    value={scheduleForm.capacity}
                    onChange={(e) => setScheduleForm({...scheduleForm, capacity: parseInt(e.target.value) || 21})}
                    className="bg-gray-700 border-gray-600 text-white"
                    min="1"
                    max="50"
                    placeholder="21"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Nombre maximum de voitures pour cette séance (défaut: 21)
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="mr-2 h-4 w-4" />
                  Programmer
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowScheduleForm(false);
                    resetScheduleForm();
                  }}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Liste des Événements</CardTitle>
          <CardDescription className="text-gray-400">
            Gérez vos événements et spectacles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Titre</TableHead>
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Durée</TableHead>
                    <TableHead className="text-gray-300">Organisateur</TableHead>
                    <TableHead className="text-gray-300">Prix</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id} className="border-gray-700">
                      <TableCell className="text-white font-medium">{event.title}</TableCell>
                      <TableCell>
                        <Badge className="bg-purple-600 text-white">
                          {EVENT_TYPES.find(t => t.value === event.event_type)?.label || event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{event.duration_minutes} min</TableCell>
                      <TableCell className="text-gray-300">{event.organizer || 'N/A'}</TableCell>
                      <TableCell className="text-gray-300">{event.price}€</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditEvent(event)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {events.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Aucun événement créé pour le moment
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedules List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Programmation des Événements</CardTitle>
          <CardDescription className="text-gray-400">
            Événements programmés par date et créneau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Événement</TableHead>
                  <TableHead className="text-gray-300">Date</TableHead>
                  <TableHead className="text-gray-300">Créneau</TableHead>
                  <TableHead className="text-gray-300">Capacité</TableHead>
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((item) => (
                  <TableRow key={item.schedule.id} className="border-gray-700">
                    <TableCell className="text-white font-medium">{item.content.title}</TableCell>
                    <TableCell className="text-gray-300">
                      {format(new Date(item.schedule.date), 'PPP', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {item.schedule.custom_time || item.schedule.time_slot}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <Badge className="bg-blue-600 text-white">
                        {item.schedule.capacity || 21} 🚗
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-600 text-white">
                        {EVENT_TYPES.find(t => t.value === item.content.event_type)?.label || item.content.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditEvent(item.content)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDeleteSchedule(item.schedule.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {schedules.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Aucun événement programmé pour le moment
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventManagement;