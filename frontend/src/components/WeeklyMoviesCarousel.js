import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock, Film, Play } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WeeklyMoviesCarousel = ({ onMovieSelect, timeSlotSettings }) => {
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    fetchWeeklySchedule();
  }, []);

  // Auto-play functionality - change film every 5 seconds
  useEffect(() => {
    if (!autoPlay || weeklySchedule.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => 
        prevIndex === weeklySchedule.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [autoPlay, weeklySchedule.length]);

  const fetchWeeklySchedule = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/weekly-schedule`);
      // Filter only movies
      const movieSchedules = response.data.filter(item => 
        item.schedule.content_type === 'movie'
      );
      console.log('🎬 Movies found from API:', movieSchedules.length); // Debug log
      console.log('📽️ Movie data:', movieSchedules); // Debug log
      setWeeklySchedule(movieSchedules);
    } catch (error) {
      console.error('Error fetching weekly schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setAutoPlay(false); // Stop auto-play when user manually navigates
    setCurrentIndex(prevIndex => 
      prevIndex === 0 ? weeklySchedule.length - 1 : prevIndex - 1
    );
    // Resume auto-play after 10 seconds
    setTimeout(() => setAutoPlay(true), 10000);
  };

  const handleNext = () => {
    setAutoPlay(false); // Stop auto-play when user manually navigates
    setCurrentIndex(prevIndex => 
      prevIndex === weeklySchedule.length - 1 ? 0 : prevIndex + 1
    );
    // Resume auto-play after 10 seconds
    setTimeout(() => setAutoPlay(true), 10000);
  };

  const handleMovieClick = (scheduleItem) => {
    if (onMovieSelect) {
      // Pre-fill booking data
      const bookingData = {
        selectedDate: scheduleItem.schedule.date,
        selectedTimeSlot: scheduleItem.schedule.time_slot,
        selectedMovie: scheduleItem.content,
        schedule: scheduleItem.schedule
      };
      onMovieSelect(bookingData);
    }
  };

  const getDisplayTime = (timeSlot) => {
    if (!timeSlotSettings) return timeSlot;
    
    if (timeSlot === '21h15') {
      return `Entrée: ${timeSlotSettings.first_slot_entry_time} • Film: ${timeSlotSettings.first_slot_start_time}`;
    } else {
      return `Entrée: ${timeSlotSettings.second_slot_entry_time} • Film: ${timeSlotSettings.second_slot_start_time}`;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-white text-lg">Chargement de la programmation...</div>
      </div>
    );
  }

  if (weeklySchedule.length === 0) {
    return (
      <div className="text-center py-12">
        <Film className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-white text-xl font-bold mb-2">Aucun film programmé</h3>
        <p className="text-gray-300">La programmation de films sera bientôt disponible.</p>
      </div>
    );
  }

  const currentItem = weeklySchedule[currentIndex];

  return (
    <div className="relative">
      {/* Main Content */}
      <Card className="bg-gradient-to-br from-blue-900 to-purple-900 border-blue-600 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-2">
            <Calendar className="mr-2 h-6 w-6 text-blue-300" />
            <CardTitle className="text-white text-2xl font-bold">
              🎬 Films à l'Affiche - Semaine du {format(new Date(weeklySchedule[0]?.schedule.date), 'dd MMMM', { locale: fr })}
            </CardTitle>
          </div>
          <p className="text-blue-200">
            {weeklySchedule.length} {weeklySchedule.length > 1 ? 'films programmés' : 'film programmé'} • Défilement automatique
          </p>
        </CardHeader>
        
        <CardContent className="p-6">
          {currentItem && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Movie Poster */}
              {currentItem.content.poster_url && (
                <div className="flex justify-center lg:justify-start">
                  <img 
                    src={currentItem.content.poster_url} 
                    alt={currentItem.content.title}
                    className="w-48 h-72 object-cover rounded-lg border-4 border-blue-400 shadow-xl transition-transform hover:scale-105"
                    onError={(e) => {e.target.style.display = 'none'}}
                  />
                </div>
              )}
              
              {/* Movie Details */}
              <div className={`${currentItem.content.poster_url ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
                <div>
                  <h3 className="text-white text-3xl font-bold mb-2">{currentItem.content.title}</h3>
                  {currentItem.content.director && (
                    <p className="text-blue-200 text-lg mb-3">
                      Réalisé par {currentItem.content.director} ({currentItem.content.release_year})
                    </p>
                  )}
                  
                  {/* Movie Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="bg-blue-600 text-blue-100 text-sm px-3 py-1">
                      {currentItem.content.duration_minutes} min
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-600 text-purple-100 text-sm px-3 py-1">
                      {currentItem.content.genre}
                    </Badge>
                    <Badge variant="secondary" className="bg-green-600 text-green-100 text-sm px-3 py-1">
                      {currentItem.content.age_rating?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                {/* Synopsis */}
                <div>
                  <h4 className="text-blue-100 font-semibold mb-2 text-lg">
                    Synopsis :
                  </h4>
                  <p className="text-blue-100 text-base leading-relaxed">
                    {currentItem.content.synopsis}
                  </p>
                </div>

                {/* Schedule Info */}
                <div className="bg-gradient-to-r from-green-800 to-teal-800 rounded-lg p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-green-100 font-semibold text-lg">
                        📅 {format(new Date(currentItem.schedule.date), 'EEEE dd MMMM yyyy', { locale: fr })}
                      </div>
                      <div className="text-green-200 text-base">
                        🕐 {getDisplayTime(currentItem.schedule.time_slot)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-100 font-semibold text-lg">
                        {currentItem.schedule.time_slot === '21h15' ? 'Première séance' : 'Deuxième séance'}
                      </div>
                      <div className="text-green-200 text-sm">
                        Capacité : {currentItem.schedule.capacity || 21} voitures
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trailer Section */}
                {currentItem.content.trailer_url && (
                  <div>
                    <h4 className="text-blue-100 font-semibold mb-3 text-lg flex items-center">
                      <Play className="mr-2 h-5 w-5" />
                      Bande-annonce :
                    </h4>
                    <div className="relative w-full" style={{paddingBottom: '56.25%'}}>
                      <iframe
                        className="absolute top-0 left-0 w-full h-full rounded-lg"
                        src={currentItem.content.trailer_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        title={`Bande-annonce ${currentItem.content.title}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* Booking Button */}
                <Button
                  onClick={() => handleMovieClick(currentItem)}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white text-lg py-3 transition-all duration-300 transform hover:scale-105"
                >
                  🎫 Réserver pour ce film
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Controls */}
      {weeklySchedule.length > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-4">
          <Button
            onClick={handlePrevious}
            variant="outline"
            size="sm"
            className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            {weeklySchedule.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setAutoPlay(false);
                  setTimeout(() => setAutoPlay(true), 10000);
                }}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-blue-500' : 'bg-gray-400'
                }`}
              />
            ))}
          </div>
          
          <Button
            onClick={handleNext}
            variant="outline"
            size="sm"
            className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Auto-play indicator */}
      <div className="flex justify-center mt-3">
        <button
          onClick={() => setAutoPlay(!autoPlay)}
          className={`text-sm px-3 py-1 rounded-full transition-all duration-300 ${
            autoPlay 
              ? 'bg-green-600 text-green-100' 
              : 'bg-gray-600 text-gray-300'
          }`}
        >
          {autoPlay ? '⏸️ Pause auto' : '▶️ Lecture auto'}
        </button>
      </div>
    </div>
  );
};

export default WeeklyMoviesCarousel;