import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ArrowLeft, Star, Calendar, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GENRES = [
  { value: "all", label: "Tous les genres" },
  { value: "action", label: "Action" },
  { value: "comedy", label: "Comédie" },
  { value: "drama", label: "Drame" },
  { value: "horror", label: "Horreur" },
  { value: "adventure", label: "Aventure" },
  { value: "animation", label: "Animation" },
  { value: "crime", label: "Crime" },
  { value: "documentary", label: "Documentaire" },
  { value: "family", label: "Familial" },
  { value: "fantasy", label: "Fantaisie" },
  { value: "history", label: "Histoire" },
  { value: "music", label: "Musical" },
  { value: "mystery", label: "Mystère" },
  { value: "romance", label: "Romance" },
  { value: "science_fiction", label: "Science-Fiction" },
  { value: "thriller", label: "Thriller" },
  { value: "war", label: "Guerre" },
  { value: "western", label: "Western" }
];

const PopularMovies = ({ onBack }) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [currentGenreLabel, setCurrentGenreLabel] = useState("Tous les genres");

  useEffect(() => {
    fetchPopularMovies();
  }, [selectedGenre]);

  const fetchPopularMovies = async () => {
    setLoading(true);
    try {
      const params = selectedGenre && selectedGenre !== "all" ? { genre: selectedGenre } : {};
      const response = await axios.get(`${API}/popular-movies`, { params });
      
      if (response.data.status === 'success') {
        setMovies(response.data.movies);
        const genreObj = GENRES.find(g => g.value === selectedGenre);
        setCurrentGenreLabel(genreObj ? genreObj.label : "Tous les genres");
      } else {
        toast.error('Erreur lors du chargement des films populaires');
      }
    } catch (error) {
      console.error('Error fetching popular movies:', error);
      toast.error('Erreur lors du chargement des films populaires');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 8.0) return 'bg-green-600';
    if (rating >= 7.0) return 'bg-yellow-600';
    if (rating >= 6.0) return 'bg-orange-600';
    return 'bg-red-600';
  };

  const formatRuntime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={onBack}
            variant="outline"
            className="mb-4 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 font-serif">
              🏆 Films les Plus Cotés de l'Année
            </h1>
            <p className="text-gray-300 text-lg">
              Découvrez les films les mieux notés par genre
            </p>
          </div>
        </div>

        {/* Genre Filter */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Filter className="h-5 w-5 text-gray-400" />
                <span className="text-white font-medium">Filtrer par genre :</span>
              </div>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-64 bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Choisir un genre" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {GENRES.map((genre) => (
                    <SelectItem key={genre.value} value={genre.value} className="text-white hover:bg-gray-700">
                      {genre.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Movies Grid */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            {currentGenreLabel} ({movies.length} films)
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Chargement des films...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {movies.map((movie, index) => (
              <Card key={movie.id} className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-all duration-300 group overflow-hidden">
                <div className="relative">
                  {/* Ranking Badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-blue-600 text-white font-bold text-sm">
                      #{index + 1}
                    </Badge>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className={`${getRatingColor(movie.vote_average)} text-white font-bold`}>
                      <Star className="mr-1 h-3 w-3 fill-current" />
                      {movie.vote_average.toFixed(1)}
                    </Badge>
                  </div>

                  {/* Movie Poster */}
                  <div className="aspect-[2/3] overflow-hidden">
                    <img
                      src={movie.poster_path}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/300x450/374151/9CA3AF?text=Pas+d%27affiche';
                      }}
                    />
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">
                        {movie.title}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(movie.release_date).getFullYear()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatRuntime(movie.runtime)}
                      </div>
                    </div>

                    <div>
                      <Badge className="bg-purple-600 text-white text-xs capitalize">
                        {movie.genre.replace('_', ' ')}
                      </Badge>
                    </div>

                    <p className="text-gray-300 text-sm leading-relaxed">
                      {movie.overview.length > 150 ? movie.overview.substring(0, 150) + '...' : movie.overview}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && movies.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">
              Aucun film trouvé pour ce genre
            </div>
          </div>
        )}

        {/* Footer Info */}
        <Card className="bg-gray-800 border-gray-700 mt-12">
          <CardContent className="p-6 text-center">
            <div className="text-gray-300">
              <p className="mb-2">
                <strong>💡 Le saviez-vous ?</strong>
              </p>
              <p className="text-sm">
                Cette liste présente les films les mieux notés de l'année, classés par note du public.
                Les notes sont basées sur les évaluations de millions de spectateurs dans le monde.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Données mises à jour régulièrement
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PopularMovies;