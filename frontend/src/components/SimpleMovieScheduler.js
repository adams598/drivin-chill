import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Film } from 'lucide-react';

const SimpleMovieScheduler = () => {
  const [movies, setMovies] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMovieForm, setShowMovieForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  
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
    capacity: 21
  });

  const API = process.env.REACT_APP_BACKEND_URL || '';
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

  // Créneaux Halloween fixes - simples
  const timeSlots = [
    { value: '21h15', label: '1er Film - 19h00 (Entrée 18h45)' },
    { value: '23h45', label: '2ème Film - 21h15 (Entrée 21h00)' },
    { value: '01h30', label: '3ème Film - 23h30 (Entrée 23h15)' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Chargement des données...');
      console.log('API URL:', API);
      
      // Charger les films
      console.log('📡 GET /api/movies');
      const moviesRes = await axios.get(`${API}/api/movies`, { headers });
      console.log('✅ Films chargés:', moviesRes.data.length);
      setMovies(moviesRes.data.filter(m => m.is_active)); // Filtrer uniquement les films actifs
      
      // Charger les programmations
      console.log('📡 GET /api/movie-schedules');
      const schedulesRes = await axios.get(`${API}/api/movie-schedules`, { headers });
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
        release_year: parseInt(movieFormData.release_year)
      };

      console.log('📤 Envoi:', editingMovie ? 'PUT' : 'POST', data);
      
      if (editingMovie) {
        // Mise à jour
        await axios.put(`${API}/api/movies/${editingMovie.id}`, data, { headers });
        toast.success('✅ Film modifié avec succès !');
      } else {
        // Création
        await axios.post(`${API}/api/movies`, data, { headers });
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
      await axios.delete(`${API}/api/movies/${movieId}`, { headers });
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
    
    if (!scheduleFormData.movie_id || !scheduleFormData.date || !scheduleFormData.time_slot) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      setLoading(true);
      
      const data = {
        movie_id: scheduleFormData.movie_id,
        date: scheduleFormData.date,
        time_slot: scheduleFormData.time_slot,
        capacity: parseInt(scheduleFormData.capacity)
      };

      console.log('📤 Envoi POST /api/movie-schedules');
      console.log('Données:', data);
      
      await axios.post(`${API}/api/movie-schedules`, data, { 
        headers,
        timeout: 10000
      });
      
      console.log('✅ Programmation créée');
      toast.success('✅ Film programmé avec succès !');
      
      // Reset
      setScheduleFormData({
        movie_id: '',
        date: '',
        time_slot: '21h15',
        capacity: 21
      });
      
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

  const deleteSchedule = async (scheduleId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette programmation ?')) {
      return;
    }
    
    try {
      console.log('🗑️ Suppression:', scheduleId);
      await axios.delete(`${API}/api/movie-schedules/${scheduleId}`, { headers });
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
                  onChange={(e) => setMovieFormData({...movieFormData, poster_url: e.target.value})}
                  className="w-full p-2 border rounded text-gray-800"
                  placeholder="https://..."
                />
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
          <CardTitle>🎬 Programmer un Film</CardTitle>
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
              <input 
                type="date"
                value={scheduleFormData.date}
                onChange={(e) => setScheduleFormData({...scheduleFormData, date: e.target.value})}
                className="w-full p-2 border rounded text-gray-800"
                required
              />
            </div>

            {/* Créneau */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Créneau *</label>
              <select 
                value={scheduleFormData.time_slot}
                onChange={(e) => setScheduleFormData({...scheduleFormData, time_slot: e.target.value})}
                className="w-full p-2 border rounded text-gray-800"
                required
              >
                {timeSlots.map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>

            {/* Capacité */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Capacité *</label>
              <input 
                type="number"
                value={scheduleFormData.capacity}
                onChange={(e) => setScheduleFormData({...scheduleFormData, capacity: e.target.value})}
                className="w-full p-2 border rounded text-gray-800"
                min="1"
                max="50"
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading || movies.length === 0}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {loading ? '⏳ Programmation...' : '🎃 Programmer'}
            </Button>
            
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
                  <div>
                    <strong className="text-gray-800">{schedule.movie.title}</strong> - {schedule.schedule.date} à {schedule.schedule.time_slot}
                    <br />
                    <small className="text-gray-600">Capacité: {schedule.schedule.capacity} places</small>
                  </div>
                  <Button 
                    onClick={() => deleteSchedule(schedule.schedule.id)}
                    className="bg-red-600 hover:bg-red-700 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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