import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Film,
  Play,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
      setCurrentIndex((prevIndex) =>
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
      const movieSchedules = response.data.filter(
        (item) => item.schedule.content_type === "movie"
      );

      // Trier par date (de la plus proche à la plus éloignée)
      const sortedMovies = movieSchedules.sort((a, b) => {
        const dateA = new Date(a.schedule.date);
        const dateB = new Date(b.schedule.date);
        // Si même date, trier par heure de début si disponible
        if (dateA.getTime() === dateB.getTime()) {
          const timeA = a.schedule.start_time || a.schedule.time_slot || "";
          const timeB = b.schedule.start_time || b.schedule.time_slot || "";
          return timeA.localeCompare(timeB);
        }
        return dateA.getTime() - dateB.getTime();
      });

      console.log("🎬 Movies found from API:", sortedMovies.length); // Debug log
      console.log("📽️ Movie data (sorted by date):", sortedMovies); // Debug log
      setWeeklySchedule(sortedMovies);
    } catch (error) {
      console.error("Error fetching weekly schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setAutoPlay(false); // Stop auto-play when user manually navigates
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? weeklySchedule.length - 1 : prevIndex - 1
    );
    // Resume auto-play after 10 seconds
    setTimeout(() => setAutoPlay(true), 10000);
  };

  const handleNext = () => {
    setAutoPlay(false); // Stop auto-play when user manually navigates
    setCurrentIndex((prevIndex) =>
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
        schedule: scheduleItem.schedule,
      };
      onMovieSelect(bookingData);
    }
  };

  // Fonction pour convertir les minutes en format HH:mm
  const formatDuration = (minutes) => {
    if (!minutes) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins.toString().padStart(2, "0")}`;
    }
    return `${mins}min`;
  };

  // Fonction pour normaliser le format d'heure en HH:mm
  const formatTimeToHHmm = (timeStr) => {
    if (!timeStr) return "";
    // Normaliser les formats "20h45" ou "20:45" vers "HH:mm"
    const normalized = timeStr.replace("h", ":");
    // S'assurer qu'il y a deux chiffres pour les minutes
    const parts = normalized.split(":");
    if (parts.length === 2) {
      const hours = parts[0].padStart(2, "0");
      const minutes = parts[1].padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    return normalized;
  };

  const getDisplayTime = (schedule) => {
    // Priorité aux horaires réels si disponibles
    if (schedule.entry_time && schedule.start_time) {
      return `Entrée: ${formatTimeToHHmm(
        schedule.entry_time
      )} • Film: ${formatTimeToHHmm(schedule.start_time)}${
        schedule.end_time
          ? ` • Fin: ${formatTimeToHHmm(schedule.end_time)}`
          : ""
      }`;
    }

    // Sinon, utiliser les paramètres de créneaux
    if (!timeSlotSettings) return schedule.time_slot;

    if (
      schedule.time_slot === "21h15" ||
      schedule.time_slot === timeSlotSettings.first_slot_value
    ) {
      return `Entrée: ${timeSlotSettings.first_slot_entry_time} • Film: ${timeSlotSettings.first_slot_start_time}`;
    } else if (
      schedule.time_slot === "23h45" ||
      schedule.time_slot === timeSlotSettings.second_slot_value
    ) {
      return `Entrée: ${timeSlotSettings.second_slot_entry_time} • Film: ${timeSlotSettings.second_slot_start_time}`;
    } else {
      return `Entrée: ${
        timeSlotSettings.third_slot_entry_time || "N/A"
      } • Film: ${timeSlotSettings.third_slot_start_time || "N/A"}`;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-white text-lg">
          Chargement de la programmation...
        </div>
      </div>
    );
  }

  if (weeklySchedule.length === 0) {
    return (
      <div className="text-center py-12">
        <Film className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-white text-xl font-bold mb-2">
          Aucun film programmé
        </h3>
        <p className="text-gray-300">
          La programmation de films sera bientôt disponible.
        </p>
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
              🎬 Films à l'Affiche - Semaine du{" "}
              {format(new Date(weeklySchedule[0]?.schedule.date), "dd MMMM", {
                locale: fr,
              })}
            </CardTitle>
          </div>
          <p className="text-blue-200">
            {weeklySchedule.length}{" "}
            {weeklySchedule.length > 1 ? "films programmés" : "film programmé"}{" "}
          </p>
        </CardHeader>

        <CardContent className="p-6">
          {currentItem && (
            <div className="space-y-6">
              {/* Movie Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-white text-3xl font-bold mb-2">
                    {currentItem.content.title}
                  </h3>
                  {currentItem.content.director && (
                    <p className="text-blue-200 text-lg mb-3">
                      Réalisé par {currentItem.content.director} (
                      {currentItem.content.release_year})
                    </p>
                  )}

                  {/* Movie Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge
                      variant="secondary"
                      className="bg-blue-600 text-blue-100 text-sm px-3 py-1"
                    >
                      {formatDuration(currentItem.content.duration_minutes)}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-purple-600 text-purple-100 text-sm px-3 py-1"
                    >
                      {currentItem.content.genre}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-green-600 text-green-100 text-sm px-3 py-1"
                    >
                      {currentItem.content.age_rating?.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {/* Movie Poster */}
                {currentItem.content.poster_url ? (
                  <div className="flex justify-center">
                    <img
                      src={(() => {
                        const url = currentItem.content.poster_url;
                        if (url && url.includes("canva.com/design/")) {
                          const proxyUrl =
                            process.env.REACT_APP_CANVA_PROXY_URL;
                          if (proxyUrl) {
                            // Nettoyer l'URL du proxy (enlever les paramètres existants)
                            let cleanProxyUrl = proxyUrl.split("?")[0]; // Enlever tout ce qui suit le ?
                            cleanProxyUrl = cleanProxyUrl.endsWith("/")
                              ? cleanProxyUrl.slice(0, -1)
                              : cleanProxyUrl;
                            return `${cleanProxyUrl}/?url=${encodeURIComponent(
                              url
                            )}`;
                          }
                        }
                        return url;
                      })()}
                      alt={currentItem.content.title}
                      className="w-48 h-72 object-cover rounded-lg border-4 border-blue-400 shadow-xl transition-transform hover:scale-105"
                      onError={(e) => {
                        const originalUrl = currentItem.content.poster_url;
                        const currentSrc = e.target.src;
                        console.error("Erreur de chargement de l'image:", {
                          original: originalUrl,
                          current: currentSrc,
                          isCanva:
                            originalUrl && originalUrl.includes("canva.com"),
                          hasProxy: !!process.env.REACT_APP_CANVA_PROXY_URL,
                        });

                        // Si c'est une URL Canva et que le proxy n'est pas configuré
                        if (
                          originalUrl &&
                          originalUrl.includes("canva.com") &&
                          !process.env.REACT_APP_CANVA_PROXY_URL
                        ) {
                          console.warn(
                            "⚠️ URL Canva détectée mais REACT_APP_CANVA_PROXY_URL n'est pas configuré dans .env"
                          );
                        }

                        // Remplacer par un placeholder SVG inline
                        e.target.src =
                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzFlM2E4YSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BZmZpY2hlIG5vbiBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==";
                        e.target.onerror = null; // Éviter la boucle infinie
                      }}
                      onLoad={() => {
                        console.log(
                          "Image chargée avec succès:",
                          currentItem.content.poster_url
                        );
                      }}
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex justify-center items-center w-48 h-72 bg-gray-700 rounded-lg border-4 border-blue-400 mx-auto">
                    <span className="text-gray-400 text-xs text-center px-2">
                      Aucune affiche
                    </span>
                  </div>
                )}

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
                        📅{" "}
                        {format(
                          new Date(currentItem.schedule.date),
                          "EEEE dd MMMM yyyy",
                          { locale: fr }
                        )}
                      </div>
                      <div className="text-green-200 text-base">
                        🕐 {getDisplayTime(currentItem.schedule)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-100 font-semibold text-lg">
                        {currentItem.schedule.start_time
                          ? `Film à ${formatTimeToHHmm(
                              currentItem.schedule.start_time
                            )}${currentItem.schedule.end_time ? `` : ""}`
                          : currentItem.schedule.time_slot === "21h15" ||
                            currentItem.schedule.time_slot ===
                              (timeSlotSettings?.first_slot_value || "21h15")
                          ? "Première séance"
                          : currentItem.schedule.time_slot === "23h45" ||
                            currentItem.schedule.time_slot ===
                              (timeSlotSettings?.second_slot_value || "23h45")
                          ? "Deuxième séance"
                          : "Troisième séance"}
                      </div>
                      <div className="text-green-200 text-sm">
                        Capacité : {currentItem.schedule.capacity || 21}{" "}
                        voitures
                        {currentItem.content?.duration_minutes
                          ? ` • Durée: ${formatDuration(
                              currentItem.content.duration_minutes
                            )}`
                          : ""}
                        {currentItem.schedule.end_time
                          ? ` • Fin: ${formatTimeToHHmm(
                              currentItem.schedule.end_time
                            )}`
                          : ""}
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
                    <div
                      className="relative w-full"
                      style={{ paddingBottom: "56.25%" }}
                    >
                      <iframe
                        className="absolute top-0 left-0 w-full h-full rounded-lg"
                        src={currentItem.content.trailer_url
                          .replace("watch?v=", "embed/")
                          .replace("youtu.be/", "youtube.com/embed/")}
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
                  index === currentIndex ? "bg-blue-500" : "bg-gray-400"
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
              ? "bg-green-600 text-green-100"
              : "bg-gray-600 text-gray-300"
          }`}
        >
          {autoPlay ? "⏸️ Pause auto" : "▶️ Lecture auto"}
        </button>
      </div>
    </div>
  );
};

export default WeeklyMoviesCarousel;
