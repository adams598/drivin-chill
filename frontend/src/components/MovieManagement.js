import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, Film, Plus, Edit, Trash2, Clock, Calendar as CalendarLucide } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GENRES = [
  { value: "action", label: "Action" },
  { value: "comedie", label: "Comédie" },
  { value: "drame", label: "Drame" },
  { value: "horreur", label: "Horreur" },
  { value: "romance", label: "Romance" },
  { value: "thriller", label: "Thriller" },
  { value: "fantastique", label: "Fantastique" },
  { value: "science-fiction", label: "Science-Fiction" },
  { value: "animation", label: "Animation" },
  { value: "documentaire", label: "Documentaire" },
  { value: "aventure", label: "Aventure" }
];

const AGE_RATINGS = [
  { value: "tout_public", label: "Tout Public" },
  { value: "deconseille_moins_10", label: "Déconseillé -10 ans" },
  { value: "deconseille_moins_12", label: "Déconseillé -12 ans" },
  { value: "deconseille_moins_16", label: "Déconseillé -16 ans" },
  { value: "interdit_moins_18", label: "Interdit -18 ans" }
];

const MovieManagement = () => {
  const [movies, setMovies] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState('movies');
  const [loading, setLoading] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeSlotSettings, setTimeSlotSettings] = useState(null);

  const [movieForm, setMovieForm] = useState({
    title: '',
    synopsis: '',
    poster_url: '',
    duration_minutes: '',
    genre: '',
    age_rating: '',
    director: '',
    release_year: '',
    trailer_url: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    movie_id: '',
    date: null,
    time_slot: '',
    capacity: 21
  });

  const token = localStorage.getItem('admin_token');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    fetchTimeSlotSettings();
    if (activeTab === 'movies') {
      fetchMovies();
    } else if (activeTab === 'schedules') {
      fetchSchedules();
    }
  }, [activeTab]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/movies?active_only=false`);
      setMovies(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des films');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/movie-schedules`);
      setSchedules(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des programmations');
    } finally {
      setLoading(false);
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

    // Always return backend enum values but with Halloween display labels
    const slots = [
      { 
        value: "21h15",  // Backend enum value
        label: "Entrée : 18h45 • Film : 19h00-21h00"  // Halloween display
      },
      { 
        value: "23h45",  // Backend enum value
        label: "Entrée : 21h00 • Film : 21h15-23h15"  // Halloween display
      }
    ];

    // Add third slot if available
    if (timeSlotSettings.third_slot_entry_time && timeSlotSettings.third_slot_start_time) {
      slots.push({
        value: "01h30",  // Backend enum value
        label: "Entrée : 23h15 • Film : 23h30-01h30"  // Halloween display
      });
    }

    return slots;
  };

  const handleMovieInputChange = (field, value) => {
    setMovieForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetMovieForm = () => {
    setMovieForm({
      title: '',
      synopsis: '',
      poster_url: '',
      duration_minutes: '',
      genre: '',
      age_rating: '',
      director: '',
      release_year: '',
      trailer_url: ''
    });
    setEditingMovie(null);
  };

  const handleCreateMovie = async () => {
    try {
      const movieData = {
        ...movieForm,
        duration_minutes: parseInt(movieForm.duration_minutes),
        release_year: movieForm.release_year ? parseInt(movieForm.release_year) : null
      };

      if (editingMovie) {
        await axios.put(`${API}/movies/${editingMovie.id}`, movieData, { headers: authHeaders });
        toast.success('Film modifié avec succès');
      } else {
        await axios.post(`${API}/movies`, movieData, { headers: authHeaders });
        toast.success('Film créé avec succès');
      }

      resetMovieForm();
      setIsDialogOpen(false);
      fetchMovies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleEditMovie = (movie) => {
    setMovieForm({
      title: movie.title,
      synopsis: movie.synopsis,
      poster_url: movie.poster_url || '',
      duration_minutes: movie.duration_minutes.toString(),
      genre: movie.genre,
      age_rating: movie.age_rating,
      director: movie.director || '',
      release_year: movie.release_year?.toString() || '',
      trailer_url: movie.trailer_url || ''
    });
    setEditingMovie(movie);
    setIsDialogOpen(true);
  };

  const handleDeleteMovie = async (movieId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce film ?')) {
      try {
        await axios.delete(`${API}/movies/${movieId}`, { headers: authHeaders });
        toast.success('Film supprimé avec succès');
        fetchMovies();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleCreateSchedule = async (e) => {
    // Prevent form submission conflicts
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🎬 PROGRAMMER BUTTON CLICKED - Function called successfully'); // Debug log
    console.log('📋 Form data:', scheduleForm); // Debug log
    
    if (!scheduleForm.movie_id || !scheduleForm.date || !scheduleForm.time_slot) {
      console.log('❌ Validation failed:', scheduleForm); // Debug log
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsSubmittingSchedule(true); // Add loading state
      
      // Format date safely
      const formattedDate = scheduleForm.date instanceof Date ? 
        scheduleForm.date.toISOString().split('T')[0] : 
        scheduleForm.date;
      
      const scheduleData = {
        movie_id: scheduleForm.movie_id,
        date: formattedDate,
        time_slot: scheduleForm.time_slot,
        capacity: scheduleForm.capacity || 21
      };

      console.log('📤 Submitting schedule:', scheduleData); // Debug log
      console.log('📡 API URL:', `${API}/movie-schedules`); // Debug log

      const response = await axios.post(`${API}/movie-schedules`, scheduleData, {
        headers: authHeaders,
        timeout: 10000 // 10 second timeout
      });

      console.log('✅ Schedule created successfully:', response.data); // Debug log

      toast.success('Film programmé avec succès !');
      
      // Reset form with correct data types
      setScheduleForm({
        movie_id: '',
        date: null,  // Use null for date picker
        time_slot: '',
        capacity: 21
      });
      
      // Close dialog and refresh data
      setIsScheduleDialogOpen(false);
      fetchSchedules();
      
    } catch (error) {
      console.error('❌ ERROR in handleCreateSchedule:', error);
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la programmation du film';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingSchedule(false); // Remove loading state
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette programmation ?')) {
      try {
        await axios.delete(`${API}/movie-schedules/${scheduleId}`, { headers: authHeaders });
        toast.success('Programmation supprimée avec succès');
        fetchSchedules();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  // Validation des dates pour les films - tous les jours autorisés maintenant
  const isValidMovieDate = (date) => {
    if (!date) return false;
    // All days are now valid - no more weekend restriction
    return true;
  };

  const isMovieDateDisabled = (date) => {
    const today = startOfDay(new Date());
    return isBefore(date, today) || !isValidMovieDate(date);
  };

  const renderMovieTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestion des Films</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={resetMovieForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Film
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingMovie ? 'Modifier le Film' : 'Nouveau Film'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Ajoutez les informations du film à diffuser au cinéma drive-in.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Titre *</Label>
                <Input
                  value={movieForm.title}
                  onChange={(e) => handleMovieInputChange('title', e.target.value)}
                  placeholder="Titre du film"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">Durée (minutes) *</Label>
                <Input
                  type="number"
                  value={movieForm.duration_minutes}
                  onChange={(e) => handleMovieInputChange('duration_minutes', e.target.value)}
                  placeholder="120"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">Genre *</Label>
                <Select value={movieForm.genre} onValueChange={(value) => handleMovieInputChange('genre', value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Sélectionner un genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {GENRES.map(genre => (
                      <SelectItem key={genre.value} value={genre.value} className="text-white">
                        {genre.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">Classification *</Label>
                <Select value={movieForm.age_rating} onValueChange={(value) => handleMovieInputChange('age_rating', value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {AGE_RATINGS.map(rating => (
                      <SelectItem key={rating.value} value={rating.value} className="text-white">
                        {rating.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">Réalisateur</Label>
                <Input
                  value={movieForm.director}
                  onChange={(e) => handleMovieInputChange('director', e.target.value)}
                  placeholder="Nom du réalisateur"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">Année de sortie</Label>
                <Input
                  type="number"
                  value={movieForm.release_year}
                  onChange={(e) => handleMovieInputChange('release_year', e.target.value)}
                  placeholder="2024"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label className="text-white">URL de l'affiche</Label>
                <Input
                  value={movieForm.poster_url}
                  onChange={(e) => handleMovieInputChange('poster_url', e.target.value)}
                  placeholder="https://example.com/poster.jpg"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label className="text-white">Synopsis *</Label>
                <Textarea
                  value={movieForm.synopsis}
                  onChange={(e) => handleMovieInputChange('synopsis', e.target.value)}
                  placeholder="Résumé du film..."
                  className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label className="text-white">URL de la bande-annonce</Label>
                <Input
                  value={movieForm.trailer_url}
                  onChange={(e) => handleMovieInputChange('trailer_url', e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateMovie} className="bg-blue-600 hover:bg-blue-700">
                {editingMovie ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white">Titre</TableHead>
                <TableHead className="text-white">Genre</TableHead>
                <TableHead className="text-white">Durée</TableHead>
                <TableHead className="text-white">Classification</TableHead>
                <TableHead className="text-white">Statut</TableHead>
                <TableHead className="text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movies.map((movie) => (
                <TableRow key={movie.id}>
                  <TableCell className="text-white font-medium">{movie.title}</TableCell>
                  <TableCell className="text-gray-300">{GENRES.find(g => g.value === movie.genre)?.label}</TableCell>
                  <TableCell className="text-gray-300">{movie.duration_minutes} min</TableCell>
                  <TableCell className="text-gray-300">{AGE_RATINGS.find(r => r.value === movie.age_rating)?.label}</TableCell>
                  <TableCell>
                    <Badge variant={movie.is_active ? "default" : "secondary"}>
                      {movie.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMovie(movie)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMovie(movie.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderScheduleTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Programmation des Films</h2>
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <CalendarLucide className="mr-2 h-4 w-4" />
              Programmer un Film
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Programmer un Film</DialogTitle>
              <DialogDescription className="text-gray-400">
                Assignez un film à un créneau horaire et une date.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Film *</Label>
                <Select value={scheduleForm.movie_id} onValueChange={(value) => setScheduleForm(prev => ({...prev, movie_id: value}))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Sélectionner un film" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {movies.filter(m => m.is_active).map(movie => (
                      <SelectItem key={movie.id} value={movie.id} className="text-white">
                        {movie.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left bg-gray-700 border-gray-600 text-white"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleForm.date ? format(scheduleForm.date, 'PPP', { locale: fr }) : "Choisir une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600">
                    <Calendar
                      mode="single"
                      selected={scheduleForm.date}
                      onSelect={(date) => setScheduleForm(prev => ({...prev, date}))}
                      disabled={isMovieDateDisabled}
                      className="rounded-md"
                      fromDate={new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">Créneau *</Label>
                <Select value={scheduleForm.time_slot} onValueChange={(value) => setScheduleForm(prev => ({...prev, time_slot: value}))}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Sélectionner un créneau" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {getTimeSlots().map(slot => (
                      <SelectItem key={slot.value} value={slot.value} className="text-white">
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Capacité (voitures) *</Label>
                <Input
                  type="number"
                  value={scheduleForm.capacity}
                  onChange={(e) => setScheduleForm(prev => ({...prev, capacity: parseInt(e.target.value) || 21}))}
                  className="bg-gray-700 border-gray-600 text-white"
                  min="1"
                  max="50"
                  placeholder="21"
                />
                <p className="text-xs text-gray-400">
                  Nombre maximum de voitures pour cette séance (défaut: 21)
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                type="button"
                onClick={handleCreateSchedule} 
                className="bg-green-600 hover:bg-green-700"
                disabled={isSubmittingSchedule}
              >
                {isSubmittingSchedule ? 'Programmation...' : 'Programmer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white">Film</TableHead>
                <TableHead className="text-white">Date</TableHead>
                <TableHead className="text-white">Créneau</TableHead>
                <TableHead className="text-white">Durée</TableHead>
                <TableHead className="text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((item) => (
                <TableRow key={item.schedule.id}>
                  <TableCell className="text-white font-medium">{item.movie.title}</TableCell>
                  <TableCell className="text-gray-300">
                    {format(new Date(item.schedule.date), 'PPP', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-gray-300">{item.schedule.time_slot}</TableCell>
                  <TableCell className="text-gray-300">{item.movie.duration_minutes} min</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSchedule(item.schedule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('movies')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'movies'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-300 hover:text-white'
            }`}
          >
            <Film className="inline mr-2 h-4 w-4" />
            Films
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'schedules'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-gray-300 hover:text-white'
            }`}
          >
            <CalendarLucide className="inline mr-2 h-4 w-4" />
            Programmation
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white">Chargement...</div>
      ) : (
        <>
          {activeTab === 'movies' && renderMovieTab()}
          {activeTab === 'schedules' && renderScheduleTab()}
        </>
      )}
    </div>
  );
};

export default MovieManagement;