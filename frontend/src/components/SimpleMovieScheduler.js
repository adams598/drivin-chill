import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Film, AlertCircle } from 'lucide-react';
import { isCanvaUrl, isDirectImageUrl, cleanImageUrl, getImageUrlHelpMessage } from '../utils/imageHelpers';

const SimpleMovieScheduler = () => {
  const [movies, setMovies] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMovieForm, setShowMovieForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const [movieFormData, setMovieFormData] = useState({
    title: '',
    synopsis: '',
    duration_minutes: 120,
    genre: 'action',
    age_rating: 'tout_public',
    director: '',
    release_year: new Date().getFullYear(),
    poster_url: '',
    trailer_url: ''
  });
  
  const [scheduleFormData, setScheduleFormData] = useState({
    movie_id: '',
    date: '',
    time_slot: '21h15',
    entry_time: '20h45',
    start_time: '21h00',
    capacity: 21
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL?.replace(/\/+$/, '') || '';
  const API = `${BACKEND_URL}/api`;
  const token = localStorage.getItem('admin_token');
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const genres = [
    { value: 'action', label: 'Action' },
    { value: 'comedie', label: 'Comédie' },
    { value: 'drame', label: 'Drame' },
    { value: 'horreur', label: 'Horreur' },
    { value: 'romance', label: 'Romance' },
    { value: 'thriller', label: 'Thriller' },
    { value: 'fantastique', label: 'Fantastique' },
    { value: 'science-fiction', label: 'Science-Fiction' },
    { value: 'animation', label: 'Animation' },
    { value: 'documentaire', label: 'Documentaire' },
    { value: 'aventure', label: 'Aventure' }
  ];

  const ageRatings = [
    { value: 'tout_public', label: 'Tout Public' },
    { value: 'deconseille_moins_10', label: 'Déconseillé -10 ans' },
    { value: 'deconseille_moins_12', label: 'Déconseillé -12 ans' },
    { value: 'deconseille_moins_16', label: 'Déconseillé -16 ans' },
    { value: 'interdit_moins_18', label: 'Interdit -18 ans' }
  ];

  const [timeSlotSettings, setTimeSlotSettings] = useState(null);

  // Charger les paramètres de créneaux
  useEffect(() => {
    fetchTimeSlotSettings();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const fetchTimeSlotSettings = async () => {
    try {
      const response = await axios.get(`${API}/time-slots`);
      setTimeSlotSettings(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de créneaux:', error);
    }
  };

  // Générer les créneaux dynamiquement basés sur les paramètres admin
  const getTimeSlots = () => {
    if (!timeSlotSettings) {
      // Fallback si les paramètres ne sont pas chargés - toujours 3 créneaux
      return [
        { value: '21h15', label: '1er Film - 19h00 (Entrée 18h45)' },
        { value: '23h45', label: '2ème Film - 21h15 (Entrée 21h00)' },
        { value: '01h30', label: '3ème Film - 23h30 (Entrée 23h15)' }
      ];
    }

    const slots = [
      {
        value: timeSlotSettings.first_slot_value || '21h15',
        label: `Entrée : ${timeSlotSettings.first_slot_entry_time} • Film : ${timeSlotSettings.first_slot_start_time}-${timeSlotSettings.first_slot_end_time || '21h00'}`
      },
      {
        value: timeSlotSettings.second_slot_value || '23h45',
        label: `Entrée : ${timeSlotSettings.second_slot_entry_time} • Film : ${timeSlotSettings.second_slot_start_time}-${timeSlotSettings.second_slot_end_time || '23h15'}`
      }
    ];

    // Toujours ajouter le 3ème créneau (avec valeurs par défaut si non définies)
    slots.push({
      value: timeSlotSettings.third_slot_value || '01h30',
      label: `Entrée : ${timeSlotSettings.third_slot_entry_time || '23h15'} • Film : ${timeSlotSettings.third_slot_start_time || '23h30'}-${timeSlotSettings.third_slot_end_time || '01h30'}`
    });

    return slots;
  };

  const timeSlots = getTimeSlots();

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Chargement des données...');
      console.log('API URL:', API);
      
      // Charger les films
      console.log('📡 GET /api/movies');
      const moviesRes = await axios.get(`${API}/movies`, { headers });
      console.log('✅ Films chargés:', moviesRes.data.length);
      setMovies(moviesRes.data.filter(m => m.is_active)); // Filtrer uniquement les films actifs
      
      // Charger les programmations
      console.log('📡 GET /api/movie-schedules');
      const schedulesRes = await axios.get(`${API}/movie-schedules`, { headers });
      console.log('✅ Programmations chargées:', schedulesRes.data.length);
      setSchedules(schedulesRes.data);
      
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      console.error('Details:', error.response?.data);
      toast.error(`Erreur de chargement: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // === GESTION DES FILMS ===
  
  const handleMovieSubmit = async (e) => {
    e.preventDefault();
    
    if (!movieFormData.title || !movieFormData.synopsis) {
      toast.error('Le titre et le synopsis sont obligatoires');
      return;
    }

    try {
      setLoading(true);
      
      const data = {
        ...movieFormData,
        duration_minutes: parseInt(movieFormData.duration_minutes),
        release_year: parseInt(movieFormData.release_year),
        // Nettoyer les URLs (enlever les espaces)
        poster_url: movieFormData.poster_url ? movieFormData.poster_url.trim() : '',
        trailer_url: movieFormData.trailer_url ? movieFormData.trailer_url.trim() : ''
      };

      console.log('📤 Envoi:', editingMovie ? 'PUT' : 'POST', data);
      
      if (editingMovie) {
        // Mise à jour
        await axios.put(`${API}/movies/${editingMovie.id}`, data, { headers });
        toast.success('✅ Film modifié avec succès !');
      } else {
        // Création
        await axios.post(`${API}/movies`, data, { headers });
        toast.success('✅ Film ajouté avec succès !');
      }
      
      // Reset form
      setMovieFormData({
        title: '',
        synopsis: '',
        duration_minutes: 120,
        genre: 'action',
        age_rating: 'tout_public',
        director: '',
        release_year: new Date().getFullYear(),
        poster_url: '',
        trailer_url: ''
      });
      setEditingMovie(null);
      setShowMovieForm(false);
      
      await loadData();
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error(`Erreur: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editMovie = (movie) => {
    setEditingMovie(movie);
    setMovieFormData({
      title: movie.title,
      synopsis: movie.synopsis,
      duration_minutes: movie.duration_minutes,
      genre: movie.genre,
      age_rating: movie.age_rating,
      director: movie.director || '',
      release_year: movie.release_year || new Date().getFullYear(),
      poster_url: movie.poster_url || '',
      trailer_url: movie.trailer_url || ''
    });
    setShowMovieForm(true);
  };

  const deleteMovie = async (movieId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce film ?')) {
      return;
    }
    
    try {
      console.log('🗑️ Suppression film:', movieId);
      await axios.delete(`${API}/movies/${movieId}`, { headers });
      toast.success('Film supprimé');
      await loadData();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error(error.response?.data?.detail || 'Erreur suppression');
    }
  };

  // === GESTION DES PROGRAMMATIONS ===

  
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    if (!scheduleFormData.movie_id || !scheduleFormData.date || !scheduleFormData.time_slot || !scheduleFormData.entry_time || !scheduleFormData.start_time) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Valider le format des horaires
    const timePattern = /^([0-1]?[0-9]|2[0-3])[h:][0-5][0-9]$/;
    if (!timePattern.test(scheduleFormData.entry_time)) {
      toast.error('Format d\'heure d\'entrée invalide. Utilisez le format 20h45 ou 20:45');
      return;
    }
    if (!timePattern.test(scheduleFormData.start_time)) {
      toast.error('Format d\'heure de début invalide. Utilisez le format 21h00 ou 21:00');
      return;
    }

    try {
      setLoading(true);
      
      const data = {
        movie_id: scheduleFormData.movie_id,
        date: scheduleFormData.date,
        time_slot: scheduleFormData.time_slot,
        entry_time: scheduleFormData.entry_time || null,
        start_time: scheduleFormData.start_time || null,
        capacity: parseInt(scheduleFormData.capacity)
      };

      if (editingSchedule) {
        // Mise à jour
        console.log('📤 Envoi PUT /api/movie-schedules/' + editingSchedule.schedule.id);
        console.log('Données:', data);
        
        await axios.put(`${API}/movie-schedules/${editingSchedule.schedule.id}`, data, { 
          headers,
          timeout: 10000
        });
        
        console.log('✅ Programmation modifiée');
        toast.success('✅ Programmation modifiée avec succès !');
      } else {
        // Création
        console.log('📤 Envoi POST /api/movie-schedules');
        console.log('Données:', data);
        
        await axios.post(`${API}/movie-schedules`, data, { 
          headers,
          timeout: 10000
        });
        
        console.log('✅ Programmation créée');
        toast.success('✅ Film programmé avec succès !');
      }
      
      // Reset
      setScheduleFormData({
        movie_id: '',
        date: '',
        time_slot: '21h15',
        entry_time: '20h45',
        start_time: '21h00',
        capacity: 21
      });
      setEditingSchedule(null);
      
      await loadData();
      
    } catch (error) {
      console.error('❌ Erreur programmation:', error);
      console.error('Details:', error.response?.data);
      
      const errorMsg = error.response?.data?.detail || error.message || 'Erreur inconnue';
      toast.error(`Erreur: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const editSchedule = (schedule) => {
    setEditingSchedule(schedule);
    // Convertir la date au format YYYY-MM-DD pour l'input date
    const scheduleDate = schedule.schedule.date;
    const formattedDate = scheduleDate.includes('T') 
      ? scheduleDate.split('T')[0] 
      : scheduleDate;
    
    setScheduleFormData({
      movie_id: schedule.schedule.movie_id,
      date: formattedDate,
      time_slot: schedule.schedule.time_slot,
      entry_time: schedule.schedule.entry_time || '20h45',
      start_time: schedule.schedule.start_time || '21h00',
      capacity: schedule.schedule.capacity || 21
    });
    
    // Scroller vers le formulaire
    document.getElementById('schedule-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const deleteSchedule = async (scheduleId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette programmation ?')) {
      return;
    }
    
    try {
      console.log('🗑️ Suppression:', scheduleId);
      await axios.delete(`${API}/movie-schedules/${scheduleId}`, { headers });
      toast.success('Programmation supprimée');
      await loadData();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error(error.response?.data?.detail || 'Erreur suppression');
    }
  };

  if (loading && movies.length === 0) {
    return <div className="text-white">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* === SECTION 1: GESTION DES FILMS === */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5" />
                Gestion des Films
              </CardTitle>
              <CardDescription>
                Ajoutez et gérez vos films avant de les programmer
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                setShowMovieForm(!showMovieForm);
                setEditingMovie(null);
                setMovieFormData({
                  title: '',
                  synopsis: '',
                  duration_minutes: 120,
                  genre: 'action',
                  age_rating: 'tout_public',
                  director: '',
                  release_year: new Date().getFullYear(),
                  poster_url: '',
                  trailer_url: ''
                });
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un Film
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showMovieForm && (
            <form onSubmit={handleMovieSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg border-2 border-green-200">
              <h3 className="font-bold text-lg text-gray-800">
                {editingMovie ? '✏️ Modifier le Film' : '➕ Nouveau Film'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Titre */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Titre *</label>
                  <input 
                    type="text"
                    value={movieFormData.title}
                    onChange={(e) => setMovieFormData({...movieFormData, title: e.target.value})}
                    className="w-full p-2 border rounded text-gray-800"
                    required
                    placeholder="Ex: Interstellar"
                  />
                </div>

                {/* Réalisateur */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Réalisateur</label>
                  <input 
                    type="text"
                    value={movieFormData.director}
                    onChange={(e) => setMovieFormData({...movieFormData, director: e.target.value})}
                    className="w-full p-2 border rounded text-gray-800"
                    placeholder="Ex: Christopher Nolan"
                  />
                </div>

                {/* Durée */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Durée (minutes) *</label>
                  <input 
                    type="number"
                    value={movieFormData.duration_minutes}
                    onChange={(e) => setMovieFormData({...movieFormData, duration_minutes: e.target.value})}
                    className="w-full p-2 border rounded text-gray-800"
                    min="1"
                    required
                  />
                </div>

                {/* Année */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Année de sortie</label>
                  <input 
                    type="number"
                    value={movieFormData.release_year}
                    onChange={(e) => setMovieFormData({...movieFormData, release_year: e.target.value})}
                    className="w-full p-2 border rounded text-gray-800"
                    min="1900"
                    max="2030"
                  />
                </div>

                {/* Genre */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Genre *</label>
                  <select 
                    value={movieFormData.genre}
                    onChange={(e) => setMovieFormData({...movieFormData, genre: e.target.value})}
                    className="w-full p-2 border rounded text-gray-800"
                    required
                  >
                    {genres.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                {/* Classification */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Classification *</label>
                  <select 
                    value={movieFormData.age_rating}
                    onChange={(e) => setMovieFormData({...movieFormData, age_rating: e.target.value})}
                    className="w-full p-2 border rounded text-gray-800"
                    required
                  >
                    {ageRatings.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Synopsis */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Synopsis *</label>
                <textarea 
                  value={movieFormData.synopsis}
                  onChange={(e) => setMovieFormData({...movieFormData, synopsis: e.target.value})}
                  className="w-full p-2 border rounded text-gray-800"
                  rows="3"
                  required
                  placeholder="Description du film..."
                />
              </div>

              {/* URL Poster */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">URL de l'affiche (optionnel)</label>
                <input 
                  type="url"
                  value={movieFormData.poster_url}
                  onChange={(e) => {
                    const url = e.target.value;
                    setMovieFormData({...movieFormData, poster_url: url});
                    
                    // Afficher un avertissement si c'est une URL Canva
                    const helpMessage = getImageUrlHelpMessage(url);
                    if (helpMessage && helpMessage.type === 'error') {
                      toast.warning('URL Canva détectée ! Consultez les instructions ci-dessous pour obtenir l\'URL directe de l\'image.', {
                        duration: 5000
                      });
                    }
                  }}
                  className="w-full p-2 border rounded text-gray-800"
                  placeholder="https://example.com/image.jpg"
                />
                {(() => {
                  const helpMessage = getImageUrlHelpMessage(movieFormData.poster_url);
                  if (!helpMessage) return null;
                  
                  if (helpMessage.type === 'info') {
                    return (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-green-800 mb-1">{helpMessage.message}</p>
                            {helpMessage.explanation && (
                              <p className="text-xs text-green-700 mb-1">{helpMessage.explanation}</p>
                            )}
                            {helpMessage.note && (
                              <p className="text-xs text-green-600 font-medium">{helpMessage.note}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (helpMessage.type === 'error') {
                    return (
                      <div className="mt-2 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-red-900 mb-1">{helpMessage.message}</p>
                            {helpMessage.explanation && (
                              <p className="text-xs text-red-700 mb-3 italic">{helpMessage.explanation}</p>
                            )}
                            {helpMessage.quickSolution && (
                              <div className="bg-white p-3 rounded border border-red-200">
                                <p className="text-xs font-bold text-red-800 mb-2">{helpMessage.quickSolution.title}</p>
                                <ol className="text-xs text-red-700 space-y-2">
                                  {helpMessage.quickSolution.steps.map((item, idx) => (
                                    <li key={idx} className="flex flex-col">
                                      <span className="font-semibold">{item.step}</span>
                                      <span className="text-red-600 ml-4">{item.detail}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            {helpMessage.alternatives && (
                              <p className="text-xs text-red-600 mt-3 font-medium">
                                {helpMessage.alternatives[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (helpMessage.type === 'warning') {
                    return (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs font-semibold text-yellow-800 mb-1">{helpMessage.message}</p>
                        {helpMessage.explanation && (
                          <p className="text-xs text-yellow-700">{helpMessage.explanation}</p>
                        )}
                      </div>
                    );
                  }
                  
                  return null;
                })()}
                <p className="text-xs text-gray-500 mt-1">
                  💡 Astuce : Utilisez l'URL directe de l'image (qui se termine par .jpg, .png, etc.). 
                  Pour Canva, vous devez exporter l'image et l'héberger sur un service comme Imgur.
                </p>
              </div>

              {/* URL Trailer */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">URL de la bande-annonce (optionnel)</label>
                <input 
                  type="url"
                  value={movieFormData.trailer_url}
                  onChange={(e) => setMovieFormData({...movieFormData, trailer_url: e.target.value})}
                  className="w-full p-2 border rounded text-gray-800"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? '⏳ Enregistrement...' : editingMovie ? '💾 Modifier' : '➕ Ajouter'}
                </Button>
                <Button 
                  type="button"
                  onClick={() => {
                    setShowMovieForm(false);
                    setEditingMovie(null);
                  }}
                  variant="outline"
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}

          {/* Liste des films */}
          <div>
            <h3 className="font-bold mb-3 text-gray-800">📚 Films disponibles ({movies.length})</h3>
            {movies.length === 0 ? (
              <p className="text-gray-500 italic">Aucun film. Ajoutez-en un pour commencer !</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {movies.map((movie) => (
                  <div key={movie.id} className="flex justify-between items-center p-3 bg-white rounded border hover:border-blue-300 transition-colors">
                    <div className="flex-1">
                      <strong className="text-gray-800">{movie.title}</strong>
                      {movie.director && <span className="text-gray-600"> - {movie.director}</span>}
                      <br />
                      <small className="text-gray-500">
                        {movie.duration_minutes} min • {movie.genre} • {movie.age_rating.replace('_', ' ')}
                        {movie.release_year && ` • ${movie.release_year}`}
                      </small>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => editMovie(movie)}
                        className="bg-blue-600 hover:bg-blue-700 text-sm"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={() => deleteMovie(movie.id)}
                        className="bg-red-600 hover:bg-red-700 text-sm"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* === SECTION 2: PROGRAMMER UN FILM === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Programmer un Film
          </CardTitle>
          <CardDescription>
            Sélectionnez un film de votre liste et choisissez une date/créneau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            {/* Film */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Film *</label>
              <select 
                value={scheduleFormData.movie_id}
                onChange={(e) => setScheduleFormData({...scheduleFormData, movie_id: e.target.value})}
                className="w-full p-2 border rounded text-gray-800"
                required
              >
                <option value="">Choisir un film</option>
                {movies.map(movie => (
                  <option key={movie.id} value={movie.id}>{movie.title}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Date *</label>
              <div className="relative">
                <input 
                  type="date"
                  value={scheduleFormData.date}
                  onChange={(e) => setScheduleFormData({...scheduleFormData, date: e.target.value})}
                  className="w-full p-2 border rounded text-gray-800 pr-10"
                  required
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                  📅
                </span>
              </div>
            </div>

            {/* Heure d'entrée */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-amber-600 rounded"></span>
                Heure d'entrée *
              </label>
              <p className="text-xs text-gray-500 mb-1">Format: 20h45 ou 20:45</p>
              <input 
                type="text"
                value={scheduleFormData.entry_time}
                onChange={(e) => {
                  const value = e.target.value;
                  // Permettre les formats 20h45 ou 20:45
                  if (/^([0-1]?[0-9]|2[0-3])[h:][0-5][0-9]$/.test(value) || value === '') {
                    setScheduleFormData({...scheduleFormData, entry_time: value});
                  }
                }}
                className="w-full p-2 border rounded text-gray-800"
                placeholder="20h45"
                required
                pattern="([0-1]?[0-9]|2[0-3])[h:][0-5][0-9]"
              />
            </div>

            {/* Heure début film */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-2">
                <Film className="h-4 w-4" />
                Heure début film *
              </label>
              <p className="text-xs text-gray-500 mb-1">Format: 21h00 ou 21:00</p>
              <input 
                type="text"
                value={scheduleFormData.start_time}
                onChange={(e) => {
                  const value = e.target.value;
                  // Permettre les formats 21h00 ou 21:00
                  if (/^([0-1]?[0-9]|2[0-3])[h:][0-5][0-9]$/.test(value) || value === '') {
                    setScheduleFormData({...scheduleFormData, start_time: value});
                  }
                }}
                className="w-full p-2 border rounded text-gray-800"
                placeholder="21h00"
                required
                pattern="([0-1]?[0-9]|2[0-3])[h:][0-5][0-9]"
              />
            </div>

            {/* Message d'alerte */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                <strong>Important :</strong> Les horaires doivent être au format 20h45 ou 20:45
              </p>
            </div>

            {/* Créneaux suggérés */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 flex items-center gap-2">
                💡 Créneaux suggérés :
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800"
                  onClick={() => {
                    setScheduleFormData({
                      ...scheduleFormData,
                      entry_time: '18h30',
                      start_time: '19h00',
                      time_slot: timeSlotSettings?.first_slot_value || '21h15'
                    });
                  }}
                >
                  1ère séance (entrée tôt): 18h30 → 19h00
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800"
                  onClick={() => {
                    setScheduleFormData({
                      ...scheduleFormData,
                      entry_time: timeSlotSettings?.first_slot_entry_time || '20h45',
                      start_time: timeSlotSettings?.first_slot_start_time || '21h00',
                      time_slot: timeSlotSettings?.first_slot_value || '21h15'
                    });
                  }}
                >
                  1ère séance (standard): {timeSlotSettings?.first_slot_entry_time || '20h45'} → {timeSlotSettings?.first_slot_start_time || '21h00'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800"
                  onClick={() => {
                    setScheduleFormData({
                      ...scheduleFormData,
                      entry_time: timeSlotSettings?.second_slot_entry_time || '21h00',
                      start_time: timeSlotSettings?.second_slot_start_time || '21h15',
                      time_slot: timeSlotSettings?.second_slot_value || '23h45'
                    });
                  }}
                >
                  2ème séance: {timeSlotSettings?.second_slot_entry_time || '21h00'} → {timeSlotSettings?.second_slot_start_time || '21h15'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800"
                  onClick={() => {
                    setScheduleFormData({
                      ...scheduleFormData,
                      entry_time: timeSlotSettings?.third_slot_entry_time || '23h15',
                      start_time: timeSlotSettings?.third_slot_start_time || '23h30',
                      time_slot: timeSlotSettings?.third_slot_value || '01h30'
                    });
                  }}
                >
                  3ème séance: {timeSlotSettings?.third_slot_entry_time || '23h15'} → {timeSlotSettings?.third_slot_start_time || '23h30'}
                </Button>
              </div>
            </div>

            {/* Capacité */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Capacité *</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newCapacity = Math.max(1, parseInt(scheduleFormData.capacity) - 1);
                    setScheduleFormData({...scheduleFormData, capacity: newCapacity});
                  }}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 font-bold"
                >
                  −
                </button>
                <input 
                  type="number"
                  value={scheduleFormData.capacity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    if (value >= 1 && value <= 50) {
                      setScheduleFormData({...scheduleFormData, capacity: value});
                    }
                  }}
                  className="flex-1 p-2 border rounded text-gray-800 text-center"
                  min="1"
                  max="50"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    const newCapacity = Math.min(50, parseInt(scheduleFormData.capacity) + 1);
                    setScheduleFormData({...scheduleFormData, capacity: newCapacity});
                  }}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={loading || movies.length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2"
              >
                <Film className="h-4 w-4" />
                {loading 
                  ? (editingSchedule ? '⏳ Modification...' : '⏳ Programmation...') 
                  : (editingSchedule ? '💾 Modifier' : 'Programmer')
                }
              </Button>
              {editingSchedule && (
                <Button 
                  type="button"
                  onClick={() => {
                    setEditingSchedule(null);
                    setScheduleFormData({
                      movie_id: '',
                      date: '',
                      time_slot: '21h15',
                      entry_time: '20h45',
                      start_time: '21h00',
                      capacity: 21
                    });
                  }}
                  variant="outline"
                  className="px-4"
                >
                  Annuler
                </Button>
              )}
            </div>
            
            {movies.length === 0 && (
              <p className="text-sm text-yellow-600 italic">⚠️ Ajoutez d'abord un film avant de programmer</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* === SECTION 3: LISTE DES PROGRAMMATIONS === */}
      <Card>
        <CardHeader>
          <CardTitle>📅 Films Programmés ({schedules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-gray-500 italic">Aucune programmation</p>
          ) : (
            <div className="space-y-2">
              {schedules.map((schedule) => (
                <div key={schedule.schedule.id} className="flex justify-between items-center p-3 bg-gray-100 rounded">
                  <div className="flex-1">
                    <strong className="text-gray-800">{schedule.movie.title}</strong> - {schedule.schedule.date} à {schedule.schedule.time_slot}
                    <br />
                    <small className="text-gray-600">
                      Capacité: {schedule.schedule.capacity} places
                      {schedule.schedule.entry_time && schedule.schedule.start_time && (
                        <> • Entrée: {schedule.schedule.entry_time} • Début: {schedule.schedule.start_time}</>
                      )}
                    </small>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => editSchedule(schedule)}
                      className="bg-blue-600 hover:bg-blue-700 text-sm"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => deleteSchedule(schedule.schedule.id)}
                      className="bg-red-600 hover:bg-red-700 text-sm"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleMovieScheduler;