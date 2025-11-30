import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock, Star, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EventsDisplay = ({ onEventSelect, timeSlotSettings }) => {
  const [events, setEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Auto-play functionality for events
  useEffect(() => {
    if (!autoPlay || events.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => 
        prevIndex === events.length - 1 ? 0 : prevIndex + 1
      );
    }, 6000); // 6 seconds for events

    return () => clearInterval(interval);
  }, [autoPlay, events.length]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/weekly-schedule`);
      // Filter only events
      const eventSchedules = response.data.filter(item => item.schedule.content_type === 'event');
      setEvents(eventSchedules);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setAutoPlay(false);
    setCurrentIndex(prevIndex => 
      prevIndex === 0 ? events.length - 1 : prevIndex - 1
    );
    // Resume auto-play after 10 seconds
    setTimeout(() => setAutoPlay(true), 10000);
  };

  const handleNext = () => {
    setAutoPlay(false);
    setCurrentIndex(prevIndex => 
      prevIndex === events.length - 1 ? 0 : prevIndex + 1
    );
    // Resume auto-play after 10 seconds
    setTimeout(() => setAutoPlay(true), 10000);
  };

  const handleEventClick = (eventItem) => {
    if (onEventSelect) {
      const bookingData = {
        selectedDate: eventItem.schedule.date,
        selectedTimeSlot: eventItem.schedule.custom_time || eventItem.schedule.time_slot, // Use custom time if available
        selectedMovie: eventItem.content, // Keep same structure for booking compatibility
        schedule: eventItem.schedule,
        isEvent: true // Flag to indicate this is an event reservation
      };
      onEventSelect(bookingData);
    }
  };

  const getDisplayTime = (schedule) => {
    // For events with custom time, display the custom time
    if (schedule.custom_time) {
      return `Début: ${schedule.custom_time}`;
    }
    
    // Fallback to standard time slots for legacy events
    if (!timeSlotSettings) return schedule.time_slot;
    
    if (schedule.time_slot === '21h15') {
      return `Entrée: ${timeSlotSettings.first_slot_entry_time} • Début: ${timeSlotSettings.first_slot_start_time}`;
    } else {
      return `Entrée: ${timeSlotSettings.second_slot_entry_time} • Début: ${timeSlotSettings.second_slot_start_time}`;
    }
  };

  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'concert': return '🎵';
      case 'spectacle': return '🎭';
      case 'stand_up': return '🎤';
      case 'soiree_thematique': return '🎉';
      case 'projection_speciale': return '🎬';
      default: return '⭐';
    }
  };

  const getEventTypeLabel = (eventType) => {
    const types = {
      'spectacle': 'Spectacle',
      'concert': 'Concert',
      'soiree_thematique': 'Soirée Thématique',
      'stand_up': 'Stand-up',
      'projection_speciale': 'Projection Spéciale',
      'autre': 'Autre'
    };
    return types[eventType] || eventType;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-white text-lg">Chargement des événements...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return null; // Don't show anything if no events
  }

  const currentEvent = events[currentIndex];

  return (
    <div className="mb-12">
      <Card className="bg-gradient-to-br from-purple-900 to-pink-900 border-purple-600 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-2">
            <Star className="mr-2 h-6 w-6 text-purple-300" />
            <CardTitle className="text-white text-2xl font-bold">
              ⭐ Événements Spéciaux
            </CardTitle>
          </div>
          <p className="text-purple-200">
            {events.length} {events.length > 1 ? 'événements programmés' : 'événement programmé'} • Défilement automatique
          </p>
        </CardHeader>
        
        <CardContent className="p-6">
          {currentEvent && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event Poster */}
              {currentEvent.content.poster_url ? (
                <div className="flex justify-center lg:justify-start">
                  <img 
                    src={(() => {
                      const url = currentEvent.content.poster_url;
                      if (url && url.includes('canva.com/design/')) {
                        const proxyUrl = process.env.REACT_APP_CANVA_PROXY_URL;
                        if (proxyUrl) {
                          const proxyEndpoint = proxyUrl.endsWith('/') ? proxyUrl.slice(0, -1) : proxyUrl;
                          return `${proxyEndpoint}/?url=${encodeURIComponent(url)}`;
                        }
                      }
                      return url;
                    })()}
                    alt={currentEvent.content.title}
                    className="w-48 h-72 object-cover rounded-lg border-4 border-purple-400 shadow-xl transition-transform hover:scale-105"
                    onError={(e) => {
                      console.error('Erreur de chargement de l\'image:', currentEvent.content.poster_url);
                      // Remplacer par un placeholder SVG inline
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzdjM2FlZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BZmZpY2hlIG5vbiBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
                      e.target.onerror = null; // Éviter la boucle infinie
                    }}
                    onLoad={() => {
                      console.log('Image chargée avec succès:', currentEvent.content.poster_url);
                    }}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex justify-center lg:justify-start items-center w-48 h-72 bg-gray-700 rounded-lg border-4 border-purple-400">
                  <span className="text-gray-400 text-xs text-center px-2">Aucune affiche</span>
                </div>
              )}
              
              {/* Event Details */}
              <div className={`${currentEvent.content.poster_url ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
                <div>
                  <div className="flex items-center mb-2">
                    <span className="text-3xl mr-2">{getEventTypeIcon(currentEvent.content.event_type)}</span>
                    <h3 className="text-white text-3xl font-bold">{currentEvent.content.title}</h3>
                  </div>
                  
                  {currentEvent.content.organizer && (
                    <p className="text-purple-200 text-lg mb-3 flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      Organisé par {currentEvent.content.organizer}
                    </p>
                  )}
                  
                  {/* Event Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="bg-orange-600 text-orange-100 text-sm px-3 py-1">
                      {currentEvent.content.duration_minutes} min
                    </Badge>
                    <Badge variant="secondary" className="bg-red-600 text-red-100 text-sm px-3 py-1">
                      {getEventTypeLabel(currentEvent.content.event_type)}
                    </Badge>
                    <Badge variant="secondary" className="bg-green-600 text-green-100 text-sm px-3 py-1">
                      {currentEvent.content.price}€
                    </Badge>
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <h4 className="text-purple-100 font-semibold mb-2 text-lg">
                    Description :
                  </h4>
                  <p className="text-purple-100 text-base leading-relaxed">
                    {currentEvent.content.description}
                  </p>
                </div>

                {/* Schedule Info */}
                <div className="bg-gradient-to-r from-purple-800 to-pink-800 rounded-lg p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-purple-100 font-semibold text-lg">
                        📅 {format(new Date(currentEvent.schedule.date), 'EEEE dd MMMM yyyy', { locale: fr })}
                      </div>
                      <div className="text-purple-200 text-base">
                        🕐 {getDisplayTime(currentEvent.schedule)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-purple-100 font-semibold text-lg">
                        {currentEvent.schedule.custom_time ? 'Événement spécial' : 
                         (currentEvent.schedule.time_slot === '21h15' ? 'Première séance' : 'Deuxième séance')}
                      </div>
                      <div className="text-purple-200 text-sm">
                        Capacité : {currentEvent.schedule.capacity || 21} voitures
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Button */}
                <Button
                  onClick={() => handleEventClick(currentEvent)}
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-lg py-3 transition-all duration-300 transform hover:scale-105"
                >
                  🎫 Réserver pour cet événement
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Controls */}
      {events.length > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-4">
          <Button
            onClick={handlePrevious}
            variant="outline"
            size="sm"
            className="bg-purple-800 border-purple-600 text-purple-100 hover:bg-purple-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex space-x-1">
            {events.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setAutoPlay(false);
                  setTimeout(() => setAutoPlay(true), 10000);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-purple-400' : 'bg-purple-700'
                }`}
              />
            ))}
          </div>
          
          <Button
            onClick={handleNext}
            variant="outline"
            size="sm"
            className="bg-purple-800 border-purple-600 text-purple-100 hover:bg-purple-700"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default EventsDisplay;