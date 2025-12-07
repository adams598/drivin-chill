import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Calendar } from "./components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Badge } from "./components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import {
  CalendarIcon,
  Clock,
  MapPin,
  Car,
  Radio,
  Popcorn,
  Smartphone,
  Euro,
  CloudRain,
  Mail,
  Phone,
  Star,
  Film,
  Heart,
  Instagram,
  Shield,
  FileText,
  Users,
  Building2,
  Moon,
} from "lucide-react";
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

// Fix pour les icônes Leaflet dans React
let DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Composant pour centrer automatiquement la carte sur les coordonnées
function MapCenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Import new components
import QRCodeGenerator from "./components/QRCodeGenerator";
import AdminDashboard from "./components/AdminDashboard";
import PartnerForm from "./components/PartnerForm";
import LegalPages from "./components/LegalPages";
import PopularMovies from "./components/PopularMovies";
import WeeklyMoviesCarousel from "./components/WeeklyMoviesCarousel";
import EventsDisplay from "./components/EventsDisplay";
import MovieSuggestionModal from "./components/MovieSuggestionModal";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL?.replace(/\/+$/, "") || "";
const API = `${BACKEND_URL}/api`;

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_1be2c036-daad-49d1-9eb2-9bdc5e45809e/artifacts/uflyhq5k_90727A68-3F12-4040-8A8D-A2166EC1096A.png"; // Remplacez par votre logo local dans le dossier public

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1664273240076-f33f88b893a1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxkcml2ZS1pbiUyMGNpbmVtYXxlbnwwfHx8fDE3NTYzNjA3OTJ8MA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1706043911716-e04ac3e36992?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHxkcml2ZS1pbiUyMGNpbmVtYXxlbnwwfHx8fDE3NTYzNjA3OTJ8MA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1627986448232-6a0991295d79?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxjYXJzJTIwbmlnaHR8ZW58MHx8fHwxNzU2MzYwODAxfDA&ixlib=rb-4.1.0&q=85",
];

const DAYS_OF_WEEK = [
  { value: "vendredi", label: "Vendredi" },
  { value: "samedi", label: "Samedi" },
  { value: "dimanche", label: "Dimanche" },
];

const PAYMENT_METHODS = [
  { value: "apple_pay", label: "Apple Pay" },
  { value: "lydia", label: "Lydia" },
  { value: "card", label: "Carte Bancaire" },
  { value: "other", label: "Autre" },
];

// Helper function to get URL parameters
function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  const results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function App() {
  // Halloween theme configuration
  const isHalloweenPeriod = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const halloweenStart = new Date(currentYear, 9, 5); // October 5 - start now!
    const halloweenEnd = new Date(currentYear, 10, 1); // November 1

    // For testing: force Halloween mode if URL contains ?halloween=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("halloween") === "true") {
      return true;
    }

    return now >= halloweenStart && now <= halloweenEnd;
  };

  const [isHalloween, setIsHalloween] = useState(isHalloweenPeriod());
  const [currentStep, setCurrentStep] = useState("home");

  // Check Halloween period on component mount and set interval
  useEffect(() => {
    const checkHalloween = () => {
      setIsHalloween(isHalloweenPeriod());
    };

    // Check every hour for date changes
    const interval = setInterval(checkHalloween, 3600000);
    return () => clearInterval(interval);
  }, []);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState("");
  const [movieSchedules, setMovieSchedules] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [upcomingMovie, setUpcomingMovie] = useState(null);
  const [timeSlotSettings, setTimeSlotSettings] = useState(null);
  const [addressSettings, setAddressSettings] = useState(null);
  const [isPreFilled, setIsPreFilled] = useState(false);
  const [preFillData, setPreFillData] = useState(null);
  const [availabilityInfo, setAvailabilityInfo] = useState({});
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    paymentMethod: "",
    promoCode: "",
    nbPersonne: "",
    nbPersonneCustom: "",
  });
  const [promoCodeInfo, setPromoCodeInfo] = useState({
    valid: false,
    message: "",
    discount_amount: 0,
    final_price: 0,
    benefit_description: "",
  });
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState(null);
  const [paymentSessionId, setPaymentSessionId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLoginDialog, setShowAdminLoginDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  // Debug: Log when dialog state changes
  useEffect(() => {
    console.log("showAdminLoginDialog state:", showAdminLoginDialog);
  }, [showAdminLoginDialog]);

  // Check for admin token and payment return
  useEffect(() => {
    // Check if returning from payment first (priority)
    const sessionId = getUrlParameter("session_id");
    if (sessionId) {
      setPaymentSessionId(sessionId);
      setCurrentStep("payment-processing");
      checkPaymentStatus(sessionId);
    } else {
      // If not returning from payment, check for admin token
      const token = localStorage.getItem("admin_token");
      if (token === "admin_token_2024") {
        setIsAdmin(true);
        setCurrentStep("admin");
      }
    }

    // Fetch upcoming movie for homepage
    fetchUpcomingMovie();
    fetchTimeSlotSettings();
    fetchAddressSettings();

    // Recharger les horaires toutes les 30 secondes pour avoir les dernières mises à jour
    const interval = setInterval(() => {
      fetchTimeSlotSettings();
    }, 30000);

    return () => clearInterval(interval);
  }, []);
  // Global error handler to prevent [object Object] display
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error("🚨 Unhandled promise rejection:", event.reason);
      event.preventDefault(); // Prevent default browser behavior

      let errorMsg = "Une erreur inattendue s'est produite";
      if (event.reason?.message) {
        errorMsg = event.reason.message;
      } else if (typeof event.reason === "string") {
        errorMsg = event.reason;
      }

      toast.error(`❌ ${errorMsg}`);
    };

    const handleError = (event) => {
      console.error("🚨 Unhandled error:", event.error);
      event.preventDefault();

      let errorMsg = "Erreur JavaScript détectée";
      if (event.error?.message) {
        errorMsg = event.error.message;
      }

      toast.error(`❌ ${errorMsg}`);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  // Fetch featured movie for homepage display (intelligent logic)
  const fetchUpcomingMovie = async () => {
    try {
      const response = await axios.get(`${API}/current-featured-movie`);

      if (response.data && response.data.status === "found") {
        // Structure the data to match the expected format
        setUpcomingMovie({
          schedule: response.data.schedule,
          movie: response.data.movie,
          target_date: response.data.target_date,
          is_today: response.data.is_today,
        });
      } else {
        // No featured movie found
        setUpcomingMovie(null);
      }
    } catch (error) {
      console.error("Error fetching featured movie:", error);
      setUpcomingMovie(null);
    }
  };

  // Validate promo code
  const validatePromoCode = async (code) => {
    if (!code || code.trim() === "") {
      setPromoCodeInfo({
        valid: false,
        message: "",
        discount_amount: 0,
        final_price: getBasePrice(),
        benefit_description: "",
      });
      return;
    }

    setIsValidatingPromo(true);
    try {
      const response = await axios.post(`${API}/validate-promo-code`, {
        code: code.trim(),
        booking_price: getBasePrice(),
      });

      setPromoCodeInfo({
        valid: response.data.valid,
        message: response.data.message,
        discount_amount: response.data.discount_amount || 0,
        final_price:
          response.data.final_price !== undefined
            ? response.data.final_price
            : getBasePrice(),
        benefit_description: response.data.benefit_description || "",
      });

      // Debug logging for 100% promo codes
      if (response.data.discount_amount >= getBasePrice()) {
        console.log("🎯 DEBUG: 100% promo code detected");
        console.log("  Backend final_price:", response.data.final_price);
        console.log(
          "  Frontend final_price will be set to:",
          response.data.final_price !== undefined
            ? response.data.final_price
            : getBasePrice()
        );
        console.log(
          "  Check final_price <= 0:",
          (response.data.final_price !== undefined
            ? response.data.final_price
            : getBasePrice()) <= 0
        );
      }
    } catch (error) {
      setPromoCodeInfo({
        valid: false,
        message: "Erreur lors de la validation du code",
        discount_amount: 0,
        final_price: getBasePrice(),
        benefit_description: "",
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Get base price (17€ for movies, event price for events)
  const getBasePrice = () => {
    // If we're booking an event and have selected an event
    if (
      preFillData &&
      preFillData.isEvent &&
      selectedMovie &&
      selectedMovie.price !== undefined
    ) {
      return selectedMovie.price;
    }

    // If we have a selected movie/event with a price
    if (selectedMovie && selectedMovie.price !== undefined) {
      return selectedMovie.price;
    }

    // Default movie price
    return 17;
  };

  // Handle promo code input change with debouncing
  const handlePromoCodeChange = (code) => {
    setFormData((prev) => ({ ...prev, promoCode: code }));

    // Debounce validation
    if (validatePromoCode.timeout) {
      clearTimeout(validatePromoCode.timeout);
    }

    validatePromoCode.timeout = setTimeout(() => {
      validatePromoCode(code);
    }, 500);
  };

  // Fetch time slot settings
  const fetchTimeSlotSettings = async () => {
    try {
      const response = await axios.get(`${API}/time-slots`);
      console.log("✅ Time slot settings chargés:", response.data);
      setTimeSlotSettings(response.data);
    } catch (error) {
      console.error("❌ Error fetching time slot settings:", error);
      console.error("⚠️ Utilisation des valeurs par défaut");
      setTimeSlotSettings(null);
    }
  };

  // Fetch address settings
  const fetchAddressSettings = async () => {
    try {
      const response = await axios.get(`${API}/address`);
      setAddressSettings(response.data);
    } catch (error) {
      console.error("Error fetching address settings:", error);
      setAddressSettings(null);
    }
  };

  // Map legacy time slots to Halloween schedule
  const mapTimeSlotToHalloween = (timeSlot) => {
    const mapping = {
      "21h15": "19h00", // Old first slot -> Halloween first slot
      "23h45": "21h15", // Old second slot -> Halloween second slot
      "01h30": "23h30", // Old third slot -> Halloween third slot
    };
    return isHalloween ? mapping[timeSlot] || timeSlot : timeSlot;
  };

  // Get display name for time slot
  const getTimeSlotDisplay = (timeSlot) => {
    if (isHalloween) {
      if (timeSlot === "21h15") return "1er Film";
      if (timeSlot === "23h45") return "2ème Film";
      if (timeSlot === "01h30") return "3ème Film";
    } else {
      if (timeSlot === "21h15") return "1ère séance";
      if (timeSlot === "23h45") return "2ème séance";
      if (timeSlot === "01h30") return "3ème séance";
    }
    return timeSlot;
  };

  // Generate dynamic time slots based on settings
  const getTimeSlots = () => {
    if (!timeSlotSettings) {
      // Fallback to Halloween schedule if settings not loaded
      // IMPORTANT: value MUST match backend enum (21h15, 23h45, 01h30)
      // Fallback avec valeurs par défaut (sera remplacé par les valeurs configurables une fois chargées)
      return [
        {
          value: "21h15", // Valeur par défaut
          label: "Entrée : 18h45 • Film : 19h00-21h00",
          display: "1er Film",
          entry: "18h45",
          start: "19h00",
        },
        {
          value: "23h45", // Valeur par défaut
          label: "Entrée : 21h00 • Film : 21h15-23h15",
          display: "2ème Film",
          entry: "21h00",
          start: "21h15",
        },
        {
          value: "01h30", // Valeur par défaut
          label: "Entrée : 23h15 • Film : 23h30-01h30",
          display: "3ème Film",
          entry: "23h15",
          start: "23h30",
        },
      ];
    }

    const slots = [
      {
        value: timeSlotSettings.first_slot_value || "21h15", // Configurable value - First show
        label: `Entrée : ${timeSlotSettings.first_slot_entry_time} • Film : ${
          timeSlotSettings.first_slot_start_time
        }-${timeSlotSettings.first_slot_end_time || "21h00"}`,
        display: "1er Film",
        entry: timeSlotSettings.first_slot_entry_time,
        start: timeSlotSettings.first_slot_start_time,
        end: timeSlotSettings.first_slot_end_time || "21h00",
      },
      {
        value: timeSlotSettings.second_slot_value || "23h45", // Configurable value - Second show
        label: `Entrée : ${timeSlotSettings.second_slot_entry_time} • Film : ${
          timeSlotSettings.second_slot_start_time
        }-${timeSlotSettings.second_slot_end_time || "23h15"}`,
        display: "2ème Film",
        entry: timeSlotSettings.second_slot_entry_time,
        start: timeSlotSettings.second_slot_start_time,
        end: timeSlotSettings.second_slot_end_time || "23h15",
      },
    ];

    // Toujours ajouter le 3ème créneau (avec valeurs par défaut si non définies)
    slots.push({
      value: timeSlotSettings.third_slot_value || "01h30", // Configurable value - Third show
      label: `Entrée : ${
        timeSlotSettings.third_slot_entry_time || "23h15"
      } • Film : ${timeSlotSettings.third_slot_start_time || "23h30"}-${
        timeSlotSettings.third_slot_end_time || "01h30"
      }`,
      display: "3ème Film",
      entry: timeSlotSettings.third_slot_entry_time || "23h15",
      start: timeSlotSettings.third_slot_start_time || "23h30",
      end: timeSlotSettings.third_slot_end_time || "01h30",
    });

    return slots;
  };

  // Handle movie selection from carousel
  const handleMovieFromCarousel = async (bookingData) => {
    // Pre-fill the booking form
    const selectedDateObj = new Date(bookingData.selectedDate);
    setSelectedDate(selectedDateObj);
    setSelectedTimeSlot(bookingData.selectedTimeSlot);
    setSelectedMovie(bookingData.selectedMovie);

    // Debug: log the schedule to see what we're getting
    console.log("Booking data schedule:", bookingData.schedule);
    console.log("Schedule entry_time:", bookingData.schedule?.entry_time);
    console.log("Schedule start_time:", bookingData.schedule?.start_time);
    console.log("Schedule end_time:", bookingData.schedule?.end_time);

    // Set form data
    const dayNames = [
      "dimanche",
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi",
    ];
    const selectedDay =
      selectedDateObj && selectedDateObj instanceof Date
        ? dayNames[selectedDateObj.getDay()]
        : "";

    setFormData((prev) => ({
      ...prev,
      selectedDate: bookingData.selectedDate,
      selectedTimeSlot: bookingData.selectedTimeSlot,
      dayOfWeek: selectedDay,
    }));

    // Set pre-fill state - preserve the schedule object as-is
    setIsPreFilled(true);
    setPreFillData({
      date: bookingData.selectedDate,
      timeSlot: bookingData.selectedTimeSlot,
      movie: bookingData.selectedMovie, // Store the full movie object
      movieTitle: bookingData.selectedMovie.title,
      isEvent: bookingData.isEvent || false,
      schedule: bookingData.schedule || null, // Inclure le schedule complet pour les horaires réels
    });

    // Load schedules for the selected date
    if (bookingData.isEvent) {
      // For events, we don't need to fetch movie schedules
      console.log("Event reservation - skipping movie schedule fetch");
    } else {
      // IMPORTANT: Load movie schedules for the selected date
      await fetchMovieSchedules(bookingData.selectedDate);
    }

    // Navigate to booking step
    setCurrentStep("booking");
  };

  // Check if date is valid (Friday, Saturday, Sunday for movies, any day for events)
  const isValidDate = (date, isEvent = false) => {
    if (!date) return false;
    // Both events and movies can now be on any day
    return true;
  };

  // Check if booking is closed due to 2h rule
  const isBookingClosed = async (date, timeSlot) => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const response = await axios.get(
        `${API}/availability?booking_date=${dateStr}&time_slot=${timeSlot}`
      );
      return !response.data.is_booking_open;
    } catch (error) {
      return false;
    }
  };

  // Disable past dates and non-weekend dates
  const isDateDisabled = (date, isEvent = false) => {
    const today = startOfDay(new Date());
    return isBefore(date, today) || !isValidDate(date, isEvent);
  };

  // Check if date has scheduled movies/events (for calendar styling)
  const hasScheduledContent = (date) => {
    // This would ideally check against a list of dates with scheduled content
    // For now, we'll just check if it's a valid day (weekend for movies, any day for events)
    const isEvent = preFillData && preFillData.isEvent;
    return isValidDate(date, isEvent) && !isDateDisabled(date, isEvent);
  };

  // Filter dates for calendar display with enhanced styling
  const isEvent = preFillData && preFillData.isEvent;
  const modifiers = {
    disabled: (date) => isDateDisabled(date, isEvent),
    scheduled: hasScheduledContent, // Days with scheduled content
    weekend: (date) => {
      if (!date || !(date instanceof Date)) {
        return false;
      }
      const day = date.getDay();
      return day === 5 || day === 6 || day === 0; // Friday, Saturday, Sunday
    },
  };

  const modifiersStyles = {
    scheduled: {
      backgroundColor: "#3B82F6", // Blue background for scheduled days
      color: "white",
      fontWeight: "bold",
    },
    weekend: {
      backgroundColor: "#1E40AF", // Darker blue for weekend days
      color: "white",
    },
  };

  // Get day of week in French
  const getDayOfWeek = (date) => {
    if (!date || !(date instanceof Date)) {
      return "";
    }
    const days = [
      "dimanche",
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi",
    ];
    return days[date.getDay()];
  };

  // Handle date selection with loading state
  const handleDateSelect = async (date) => {
    // Vérifier que date n'est pas undefined (peut arriver lors de la désélection)
    if (!date) {
      setSelectedDate(null);
      setSelectedDayOfWeek("");
      setSelectedTimeSlot("");
      setSelectedMovie(null);
      setMovieSchedules([]);
      return;
    }

    setSelectedDate(date);
    setSelectedDayOfWeek(getDayOfWeek(date));
    setSelectedTimeSlot(""); // Reset time slot selection
    setSelectedMovie(null); // Reset movie selection

    // Show loading state
    setMovieSchedules([]);

    // Determine if this is for an event booking or regular movie booking
    const isEventBooking = preFillData && preFillData.isEvent;

    if (isEventBooking) {
      // For events, fetch event schedules (content schedules)
      await fetchContentSchedules(format(date, "yyyy-MM-dd"));
    } else {
      // For movies, fetch movie schedules
      await fetchMovieSchedules(format(date, "yyyy-MM-dd"));
    }
  };

  // Fetch content schedules (events) for a specific date
  const fetchContentSchedules = async (dateString) => {
    try {
      const response = await axios.get(`${API}/weekly-schedule`);
      // Filter schedules for the specific date
      const schedulesForDate = response.data.filter(
        (item) =>
          item.schedule.date === dateString &&
          item.schedule.content_type === "event"
      );
      setMovieSchedules(schedulesForDate); // Reuse the same state but with event data

      // Also fetch availability info for each time slot (using configurable values)
      const timeSlotValues = timeSlotSettings
        ? [
            timeSlotSettings.first_slot_value || "21h15",
            timeSlotSettings.second_slot_value || "23h45",
          ]
        : ["21h15", "23h45"];
      const availabilityPromises = timeSlotValues.map(async (timeSlot) => {
        try {
          const availResponse = await axios.get(
            `${API}/availability?booking_date=${dateString}&time_slot=${timeSlot}`
          );
          return { timeSlot, data: availResponse.data };
        } catch (error) {
          return { timeSlot, data: null };
        }
      });

      const availabilities = await Promise.all(availabilityPromises);
      const availabilityMap = {};
      availabilities.forEach(({ timeSlot, data }) => {
        availabilityMap[timeSlot] = data;
      });
      setAvailabilityInfo(availabilityMap);
    } catch (error) {
      console.error("Error fetching content schedules:", error);
      setMovieSchedules([]);
      setAvailabilityInfo({});
    }
  };

  // Fetch movie schedules for a specific date with loading state
  const fetchMovieSchedules = async (dateString) => {
    try {
      const response = await axios.get(
        `${API}/movie-schedules/by-date/${dateString}`
      );
      const schedules = response.data || [];

      // If we have pre-filled data and the schedule is not in the fetched schedules,
      // add it to the list so it can be displayed correctly
      if (
        isPreFilled &&
        preFillData &&
        preFillData.schedule &&
        preFillData.movie
      ) {
        const preFilledScheduleExists = schedules.some(
          (s) =>
            s.schedule.time_slot === preFillData.timeSlot &&
            s.movie?.id === preFillData.movie.id
        );

        if (!preFilledScheduleExists && preFillData.schedule) {
          // Debug: log the schedule to see what we have
          console.log("Pre-fill schedule:", preFillData.schedule);
          console.log(
            "Pre-fill schedule entry_time:",
            preFillData.schedule.entry_time
          );
          console.log(
            "Pre-fill schedule start_time:",
            preFillData.schedule.start_time
          );
          console.log(
            "Pre-fill schedule end_time:",
            preFillData.schedule.end_time
          );

          // Create a schedule object in the same format as the API response
          // Preserve ALL properties from the original schedule
          const preFilledSchedule = {
            schedule: {
              id: preFillData.schedule.id || preFillData.timeSlot,
              movie_id: preFillData.movie.id,
              date: preFillData.date,
              time_slot: preFillData.timeSlot,
              capacity: preFillData.schedule.capacity || 21,
              // Preserve the time properties - they might be in the schedule object directly
              entry_time: preFillData.schedule.entry_time,
              start_time: preFillData.schedule.start_time,
              end_time: preFillData.schedule.end_time,
              // Also preserve any other properties that might be in the schedule
              ...(preFillData.schedule.custom_time && {
                custom_time: preFillData.schedule.custom_time,
              }),
              is_active: true,
            },
            movie: preFillData.movie,
          };

          console.log("Created pre-filled schedule:", preFilledSchedule);

          // Add the pre-filled schedule at the beginning of the list
          schedules.unshift(preFilledSchedule);
        }
      }

      setMovieSchedules(schedules);

      // Verify that the currently selected time slot is still valid
      // If selectedTimeSlot is set but not in the fetched schedules, try to find it
      if (selectedTimeSlot && schedules.length > 0) {
        const slotExists = schedules.some(
          (s) => s.schedule.time_slot === selectedTimeSlot
        );
        if (!slotExists) {
          // The selected time slot is not in the list, but we should keep it
          // as it might be from a pre-filled selection
          console.log(
            `Selected time slot ${selectedTimeSlot} not found in schedules, keeping selection`
          );
        }
      }

      // Also fetch availability info for each time slot found in schedules
      const timeSlotValues =
        schedules.length > 0
          ? schedules.map((s) => s.schedule.time_slot).filter(Boolean)
          : timeSlotSettings
          ? [
              timeSlotSettings.first_slot_value || "21h15",
              timeSlotSettings.second_slot_value || "23h45",
            ]
          : ["21h15", "23h45"];

      // Also include selectedTimeSlot in availability check if it's set
      if (selectedTimeSlot && !timeSlotValues.includes(selectedTimeSlot)) {
        timeSlotValues.push(selectedTimeSlot);
      }

      const availabilityPromises = timeSlotValues.map(async (timeSlot) => {
        try {
          const availResponse = await axios.get(
            `${API}/availability?booking_date=${dateString}&time_slot=${timeSlot}`
          );
          return { timeSlot, data: availResponse.data };
        } catch (error) {
          return { timeSlot, data: null };
        }
      });

      const availabilities = await Promise.all(availabilityPromises);
      const availabilityMap = {};
      availabilities.forEach(({ timeSlot, data }) => {
        availabilityMap[timeSlot] = data;
      });
      setAvailabilityInfo(availabilityMap);
    } catch (error) {
      console.error("Error fetching movie schedules:", error);
      setMovieSchedules([]);
      setAvailabilityInfo({});
    }
  };

  // Handle time slot selection with content info (movie or event)
  const handleTimeSlotSelect = async (timeSlot) => {
    console.log("🔄 handleTimeSlotSelect called with timeSlot:", timeSlot);
    console.log("📋 Current movieSchedules:", movieSchedules);
    console.log("🎬 Current selectedMovie:", selectedMovie);
    console.log("📦 Current preFillData:", preFillData);

    setSelectedTimeSlot(timeSlot);

    // First, check if this is the pre-filled time slot
    if (isPreFilled && preFillData && preFillData.timeSlot === timeSlot) {
      console.log(
        "✅ Using pre-filled movie for time slot:",
        preFillData.movie
      );
      setSelectedMovie(preFillData.movie);
      return;
    }

    // Find the schedule for this time slot in movieSchedules
    const scheduleForSlot = movieSchedules.find(
      (schedule) => schedule.schedule.time_slot === timeSlot
    );

    if (scheduleForSlot) {
      // For events, the content is in scheduleForSlot.content
      // For movies, the content is in scheduleForSlot.movie
      const content = scheduleForSlot.content || scheduleForSlot.movie;
      console.log(
        "✅ Found schedule in movieSchedules, setting selectedMovie to:",
        content
      );
      setSelectedMovie(content);
    } else {
      // If not found in current schedules, try to fetch schedules again for the selected date
      if (selectedDate) {
        try {
          const dateString = format(selectedDate, "yyyy-MM-dd");
          console.log("🔄 Fetching schedules for date:", dateString);
          const response = await axios.get(
            `${API}/movie-schedules/by-date/${dateString}`
          );
          const fetchedSchedules = response.data;
          console.log("📋 Fetched schedules:", fetchedSchedules);

          // Update state with fetched schedules
          setMovieSchedules(fetchedSchedules);

          // Try to find in freshly fetched schedules
          const updatedSchedule = fetchedSchedules.find(
            (schedule) => schedule.schedule.time_slot === timeSlot
          );

          if (updatedSchedule) {
            const content = updatedSchedule.content || updatedSchedule.movie;
            console.log(
              "✅ Found schedule after fetch, setting selectedMovie to:",
              content
            );
            setSelectedMovie(content);
          } else {
            console.warn(
              `⚠️ No schedule found for time slot ${timeSlot} on ${dateString}`
            );
            // Don't reset selectedMovie if we have a pre-filled one, as it might be valid
            if (!isPreFilled || preFillData?.timeSlot !== timeSlot) {
              setSelectedMovie(null);
            }
          }
        } catch (error) {
          console.error("❌ Error fetching schedules:", error);
          // Don't reset selectedMovie if we have a pre-filled one
          if (!isPreFilled || preFillData?.timeSlot !== timeSlot) {
            setSelectedMovie(null);
          }
        }
      } else {
        // No date selected, but don't reset if we have pre-filled data
        if (!isPreFilled || preFillData?.timeSlot !== timeSlot) {
          setSelectedMovie(null);
        }
      }
    }
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Submit booking (now creates booking and initiates payment)
  const submitBooking = async () => {
    // Validation des champs obligatoires
    if (
      !selectedDate ||
      !selectedTimeSlot ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.paymentMethod ||
      !formData.nbPersonne
    ) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    // Validation du nombre de personnes si "Plus de 5" est sélectionné
    if (formData.nbPersonne === "more") {
      const customNb = parseInt(formData.nbPersonneCustom);
      if (!formData.nbPersonneCustom || isNaN(customNb) || customNb < 6) {
        toast.error(
          "Veuillez indiquer un nombre de personnes valide (minimum 6)"
        );
        return;
      }
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Veuillez saisir une adresse email valide");
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate number of people
      const nbPersonne =
        formData.nbPersonne === "more"
          ? parseInt(formData.nbPersonneCustom)
          : parseInt(formData.nbPersonne);

      // Get schedule times (entry_time, start_time, end_time) from the selected movie's schedule
      // IMPORTANT: Always use the schedule of the selected movie, never generic time_slot values
      let entry_time = null;
      let start_time = null;
      let end_time = null;

      // Determine which movie is selected
      const currentMovie = selectedMovie || (preFillData && preFillData.movie);
      const currentMovieId = currentMovie ? currentMovie.id : null;

      console.log("🎬 Récupération des horaires pour le film sélectionné:", {
        selectedMovie: selectedMovie?.title,
        preFillDataMovie: preFillData?.movie?.title,
        currentMovieId,
        selectedTimeSlot,
        isPreFilled,
      });

      // Priority 1: Get from preFillData if it matches the selected movie and time slot
      if (
        isPreFilled &&
        preFillData &&
        preFillData.schedule &&
        preFillData.movie &&
        preFillData.movie.id === currentMovieId &&
        preFillData.timeSlot === selectedTimeSlot
      ) {
        entry_time = preFillData.schedule.entry_time || null;
        start_time = preFillData.schedule.start_time || null;
        end_time = preFillData.schedule.end_time || null;
        console.log("✅ Horaires récupérés depuis preFillData:", {
          entry_time,
          start_time,
          end_time,
        });
      } else if (currentMovieId) {
        // Priority 2: Find the schedule in movieSchedules that matches BOTH the movie ID and time slot
        const scheduleForMovie = movieSchedules.find(
          (schedule) =>
            schedule.movie &&
            schedule.movie.id === currentMovieId &&
            schedule.schedule.time_slot === selectedTimeSlot
        );

        if (scheduleForMovie && scheduleForMovie.schedule) {
          entry_time = scheduleForMovie.schedule.entry_time || null;
          start_time = scheduleForMovie.schedule.start_time || null;
          end_time = scheduleForMovie.schedule.end_time || null;
          console.log(
            "✅ Horaires récupérés depuis movieSchedules (par film):",
            {
              entry_time,
              start_time,
              end_time,
              movieTitle: scheduleForMovie.movie?.title,
            }
          );
        } else {
          // Priority 3: Fallback - find by time_slot only (but log a warning)
          const scheduleForSlot = movieSchedules.find(
            (schedule) => schedule.schedule.time_slot === selectedTimeSlot
          );

          if (scheduleForSlot && scheduleForSlot.schedule) {
            entry_time = scheduleForSlot.schedule.entry_time || null;
            start_time = scheduleForSlot.schedule.start_time || null;
            end_time = scheduleForSlot.schedule.end_time || null;
            console.warn(
              "⚠️ Horaires récupérés par time_slot uniquement (film non trouvé):",
              {
                entry_time,
                start_time,
                end_time,
                selectedMovieId: currentMovieId,
                foundMovieId: scheduleForSlot.movie?.id,
              }
            );
          }
        }
      }

      // Final validation: ensure we have the required times
      if (!entry_time || !start_time || !end_time) {
        console.error("❌ ERREUR: Horaires manquants pour la réservation!", {
          entry_time,
          start_time,
          end_time,
          currentMovieId,
          selectedTimeSlot,
          movieSchedulesCount: movieSchedules.length,
        });
        toast.error(
          "Erreur: Impossible de récupérer les horaires du film. Veuillez réessayer."
        );
        setIsSubmitting(false);
        return;
      }

      console.log("✅ Horaires finaux pour la réservation:", {
        entry_time,
        start_time,
        end_time,
        movieTitle: currentMovie?.title,
      });

      // First create the booking
      const bookingData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone ? formData.phone.trim() : null,
        booking_date: format(selectedDate, "yyyy-MM-dd"),
        day_of_week: selectedDayOfWeek,
        time_slot: selectedTimeSlot,
        entry_time: entry_time,
        start_time: start_time,
        end_time: end_time,
        payment_method: formData.paymentMethod,
        promo_code: formData.promoCode
          ? formData.promoCode.trim().toUpperCase()
          : null,
        final_price:
          promoCodeInfo.valid && promoCodeInfo.final_price !== undefined
            ? promoCodeInfo.final_price
            : getBasePrice(),
        nb_personne: nbPersonne,
        // Add content type and ID for backend to distinguish events from movies
        content_type:
          (preFillData && preFillData.isEvent) ||
          (selectedMovie && selectedMovie.event_type)
            ? "event"
            : "movie",
        content_id: selectedMovie
          ? selectedMovie.id
          : preFillData && preFillData.movie
          ? preFillData.movie.id
          : null,
      };

      console.log("📝 Booking data to be sent:", bookingData);

      const bookingResponse = await axios.post(`${API}/bookings`, bookingData);
      console.log("✅ Booking created successfully:", bookingResponse.data);

      if (bookingResponse.status === 201 || bookingResponse.status === 200) {
        // Create payment session
        const paymentData = {
          booking_id: bookingResponse.data.id,
          origin_url: window.location.origin,
        };

        console.log("💳 Payment data to be sent:", paymentData);
        const paymentResponse = await axios.post(
          `${API}/payments/create-checkout`,
          paymentData
        );
        console.log("💳 Payment response received:", paymentResponse.data);

        if (paymentResponse.status === 200) {
          // Check if it's a free booking
          if (paymentResponse.data.is_free) {
            // For free bookings, go directly to success page
            toast.success(
              "🎉 Réservation gratuite confirmée ! Vous allez recevoir votre confirmation par email."
            );
            setPaymentSessionId(paymentResponse.data.session_id);
            setBookingConfirmation({
              ...bookingResponse.data,
              is_free: true,
              final_price: 0,
            });
            setCurrentStep("payment-success");
            return;
          } else {
            // For paid bookings, redirect to Stripe Checkout
            window.location.href = paymentResponse.data.checkout_url;
          }
        }
      }
    } catch (error) {
      console.error("🚨 Booking error - Full details:", {
        error: error,
        message: error?.message,
        response: error?.response,
        responseData: error?.response?.data,
        responseStatus: error?.response?.status,
        stack: error?.stack,
        stringified: JSON.stringify(error, null, 2),
      });

      let errorMessage = "Erreur lors de la réservation. Veuillez réessayer.";

      try {
        if (error?.response?.data?.detail) {
          // Handle both string and array formats for Pydantic validation errors
          if (Array.isArray(error.response.data.detail)) {
            // Format validation errors nicely
            const validationErrors = error.response.data.detail.map((err) => {
              if (err.msg && err.loc) {
                return `${err.loc.join(".")}: ${err.msg}`;
              }
              return err.msg || "Erreur de validation";
            });
            errorMessage = validationErrors.join(", ");
          } else if (typeof error.response.data.detail === "string") {
            errorMessage = error.response.data.detail;
          } else {
            errorMessage = "Erreur de validation des données";
          }
        } else if (error?.response?.data?.message) {
          errorMessage = String(error.response.data.message);
        } else if (error?.message && typeof error.message === "string") {
          errorMessage = error.message;
        } else if (error?.response?.status === 400) {
          errorMessage =
            "Données de réservation invalides. Vérifiez vos informations.";
        } else if (error?.response?.status === 500) {
          errorMessage =
            "Erreur du serveur. Veuillez réessayer dans quelques instants.";
        } else if (error?.response?.status === 422) {
          errorMessage =
            "Données de formulaire invalides. Vérifiez tous les champs obligatoires.";
        } else if (typeof error === "object" && error !== null) {
          // Prevent [object Object] by providing a fallback message
          errorMessage =
            "Erreur technique détectée. Veuillez actualiser la page et réessayer.";
          console.log("🔍 Unhandled object error:", error);
        }
      } catch (parseError) {
        console.error("🚨 Error while parsing error:", parseError);
        errorMessage =
          "Erreur système. Veuillez actualiser la page et réessayer.";
      }

      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check payment status
  const checkPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 3000; // 3 seconds

    if (attempts >= maxAttempts) {
      toast.error(
        "Délai d'attente dépassé. Vérifiez votre email pour confirmation."
      );
      setCurrentStep("home");
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/status/${sessionId}`);
      const data = response.data;

      if (data.payment_status === "paid") {
        toast.success("🎬 Paiement confirmé ! Votre réservation est validée.");

        // Get booking details for display
        try {
          const bookingResponse = await axios.get(
            `${API}/bookings?session_id=${sessionId}`,
            {
              headers: { Authorization: `Bearer admin_token_2024` },
            }
          );
          if (bookingResponse.data && bookingResponse.data.length > 0) {
            const booking = bookingResponse.data[0];
            setBookingConfirmation({
              ...booking,
              is_free: false,
              final_price: booking.final_price || 17,
            });
          }
        } catch (error) {
          console.error("Error fetching booking details:", error);
          // Fallback with basic info
          setBookingConfirmation({
            is_free: false,
            final_price: 17,
          });
        }

        setCurrentStep("payment-success");
        return;
      } else if (data.status === "expired") {
        toast.error("Session de paiement expirée. Veuillez recommencer.");
        setCurrentStep("home");
        return;
      }

      // Continue polling if still pending
      setTimeout(
        () => checkPaymentStatus(sessionId, attempts + 1),
        pollInterval
      );
    } catch (error) {
      console.error("Error checking payment status:", error);
      toast.error("Erreur lors de la vérification du paiement.");
      setTimeout(
        () => checkPaymentStatus(sessionId, attempts + 1),
        pollInterval
      );
    }
  };

  // Admin login
  const handleAdminLogin = (password) => {
    if (password === "admin_token_2024") {
      localStorage.setItem("admin_token", password);
      setIsAdmin(true);
      setCurrentStep("admin");
      setShowAdminLoginDialog(false);
      setAdminPassword("");
      toast.success("Connexion administrateur réussie");
    } else {
      toast.error("Mot de passe incorrect");
      setAdminPassword("");
    }
  };

  // Admin logout
  const handleAdminLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAdmin(false);
    setCurrentStep("home");
    toast.success("Déconnexion réussie");
  };

  // Reset form
  const resetForm = () => {
    setCurrentStep("home");
    setSelectedDate(null);
    setSelectedTimeSlot("");
    setSelectedDayOfWeek("");
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      paymentMethod: "",
    });
    setBookingConfirmation(null);
    setPaymentSessionId(null);
  };

  // Route to different components based on currentStep
  if (currentStep === "admin") {
    return <AdminDashboard onLogout={handleAdminLogout} />;
  }

  if (currentStep === "partners") {
    return <PartnerForm onBack={resetForm} />;
  }

  if (currentStep === "mentions" || currentStep === "cgv") {
    return <LegalPages type={currentStep} onBack={resetForm} />;
  }

  if (currentStep === "popular-movies") {
    return <PopularMovies onBack={resetForm} />;
  }

  if (currentStep === "payment-processing") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Toaster />
        <Card className="bg-gray-800 border-gray-700 max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-white text-xl font-bold mb-2">
              Vérification du paiement...
            </h2>
            <p className="text-gray-400">
              Veuillez patienter pendant que nous confirmons votre paiement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "payment-success") {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <Toaster />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <img
              src={LOGO_URL}
              alt="Drivin And Chill Logo"
              className="mx-auto h-16 w-16 mb-4 object-contain"
            />
            {bookingConfirmation?.is_free ? (
              <>
                <h1 className="text-3xl font-bold text-purple-400 mb-2">
                  🎉 Réservation gratuite !
                </h1>
                <p className="text-gray-400">
                  Votre billet est confirmé sans frais
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-green-400 mb-2">
                  🎉 Paiement confirmé !
                </h1>
                <p className="text-gray-400">Votre réservation est validée</p>
              </>
            )}
          </div>

          <Card
            className={`${
              isHalloween
                ? "bg-gradient-to-br from-orange-900/70 to-purple-900/70 border-orange-600"
                : "bg-gray-800 border-gray-700"
            } transition-all duration-300`}
          >
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center">
                <Heart className="mr-2 h-6 w-6 text-red-400" />
                Votre réservation est confirmée !
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {bookingConfirmation?.is_free ? (
                // Free booking confirmation
                <div className="bg-purple-900 border border-purple-700 rounded-lg p-6 mb-6">
                  <p className="text-purple-100 text-lg mb-2">
                    🎉 Réservation gratuite confirmée
                  </p>
                  <p className="text-purple-200 text-sm">
                    Un email de confirmation vous a été envoyé
                  </p>
                  {bookingConfirmation.promo_code && (
                    <p className="text-purple-300 text-xs mt-2">
                      Code promo appliqué : {bookingConfirmation.promo_code}
                    </p>
                  )}
                </div>
              ) : (
                // Paid booking confirmation
                <div className="bg-green-900 border border-green-700 rounded-lg p-6 mb-6">
                  <p className="text-green-100 text-lg mb-2">
                    ✅ Paiement de {bookingConfirmation?.final_price || "17"}€
                    validé
                  </p>
                  <p className="text-green-200 text-sm">
                    Un email de confirmation vous a été envoyé
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">
                    Informations importantes :
                  </h3>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Arrivez 15 minutes avant le début de la séance</li>
                    <li>• Syntonisez votre radio FM pour le son du film</li>
                    <li>• Snacking disponible sur place via QR code</li>
                    <li>• Présentez votre QR code à l'entrée</li>
                  </ul>
                </div>

                <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
                  <h3 className="text-blue-100 font-semibold mb-2 flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    Adresse du cinéma :
                  </h3>
                  <p className="text-blue-200">
                    {addressSettings?.address_text ||
                      "Le petit juillac 87100 Limoges"}
                  </p>
                </div>
              </div>

              <Button
                onClick={resetForm}
                className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white"
              >
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === "home") {
    return (
      <>
        {/* Admin Login Dialog */}
        <Dialog
          open={showAdminLoginDialog}
          onOpenChange={(open) => {
            console.log("Dialog onOpenChange appelé avec:", open);
            setShowAdminLoginDialog(open);
          }}
        >
          <DialogContent className="bg-gray-800 border-gray-700 z-[9999]">
            <DialogHeader>
              <DialogTitle className="text-white">
                Connexion Administrateur
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Entrez le mot de passe administrateur pour accéder au panneau de
                contrôle
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Mot de passe</Label>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAdminLogin(adminPassword);
                    }
                  }}
                  placeholder="Entrez le mot de passe"
                  className="bg-gray-700 border-gray-600 text-white"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAdminLoginDialog(false);
                    setAdminPassword("");
                  }}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => handleAdminLogin(adminPassword)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Se connecter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div
          className={`min-h-screen ${
            isHalloween
              ? "bg-gradient-to-br from-orange-800 via-red-900 to-black"
              : "bg-gray-900"
          }`}
        >
          {/* Halloween Banner */}
          {isHalloween && (
            <>
              <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 px-4 text-center relative overflow-hidden shadow-lg">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-1 left-4 text-2xl">🎃</div>
                  <div className="absolute top-1 right-4 text-2xl">👻</div>
                  <div className="absolute top-1 left-1/4 text-xl">🦇</div>
                  <div className="absolute top-1 right-1/4 text-xl">🕷️</div>
                </div>
                <div className="relative z-10">
                  <p className="text-lg font-bold mb-1">
                    🎃 Événement Spécial Halloween en collaboration avec
                    Limogesmaville 🎃
                  </p>
                  <p className="text-sm">
                    Du 29 octobre au 1er novembre • Domaine privé, Limoges •
                    <a
                      href="https://maps.app.goo.gl/d4umbiriPyMNnQiy6?g_st=ic"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-200 hover:text-white underline ml-1"
                    >
                      📍 Voir sur Google Maps
                    </a>
                  </p>
                </div>
              </div>

              {/* Halloween Partnership Logos */}
              <div className="bg-gradient-to-r from-black via-purple-900 to-black py-6 px-4">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-8">
                  <div className="flex items-center justify-center">
                    <img
                      src="/logo-halloween-drivinnchill.png"
                      alt="Drivin N Chill Halloween Logo"
                      className="h-20 md:h-24 w-auto object-contain filter drop-shadow-lg"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                  <div className="text-orange-400 text-2xl md:text-3xl font-bold px-4">
                    ✕
                  </div>
                  <div className="flex items-center justify-center">
                    <img
                      src="/logo-limogesmaville.png"
                      alt="Limoges Ma Ville Logo"
                      className="h-20 md:h-24 w-auto object-contain filter drop-shadow-lg"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                </div>
                <p className="text-center text-orange-300 text-sm mt-3 font-medium">
                  Une collaboration exceptionnelle pour Halloween 2024
                </p>
              </div>
            </>
          )}

          <Toaster />

          {/* Hero Section */}
          <div className="relative overflow-hidden">
            {/* Halloween decorative elements */}
            {isHalloween && (
              <>
                {/* Main animated elements */}
                <div className="absolute top-20 left-10 text-6xl animate-bounce opacity-40 z-0 filter drop-shadow-lg">
                  🎃
                </div>
                <div className="absolute top-32 right-20 text-4xl animate-pulse opacity-35 z-0 filter drop-shadow-lg">
                  👻
                </div>
                <div
                  className="absolute top-40 left-1/4 text-3xl animate-bounce opacity-30 z-0"
                  style={{ animationDelay: "1s" }}
                >
                  🦇
                </div>
                <div
                  className="absolute top-60 right-1/3 text-3xl animate-pulse opacity-35 z-0"
                  style={{ animationDelay: "0.5s" }}
                >
                  🕷️
                </div>
                <div
                  className="absolute top-80 left-1/2 text-4xl animate-bounce opacity-30 z-0"
                  style={{ animationDelay: "1.5s" }}
                >
                  🌙
                </div>

                {/* Additional floating elements */}
                <div
                  className="absolute top-100 left-20 text-2xl animate-pulse opacity-25 z-0"
                  style={{ animationDelay: "2s" }}
                >
                  🕸️
                </div>
                <div
                  className="absolute top-120 right-40 text-3xl animate-bounce opacity-30 z-0"
                  style={{ animationDelay: "0.8s" }}
                >
                  🧙‍♀️
                </div>
                <div
                  className="absolute top-150 left-3/4 text-2xl animate-pulse opacity-25 z-0"
                  style={{ animationDelay: "1.2s" }}
                >
                  ⚡
                </div>
                <div
                  className="absolute top-200 right-10 text-2xl animate-bounce opacity-25 z-0"
                  style={{ animationDelay: "1.8s" }}
                >
                  💀
                </div>

                {/* Spider web in corners - enhanced */}
                <div className="absolute top-0 left-0 w-40 h-40 opacity-30">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full text-orange-400"
                  >
                    <path
                      d="M0,0 L50,50 L100,0 M0,20 L50,50 L100,20 M0,40 L50,50 L100,40 M20,0 L50,50 L20,100 M40,0 L50,50 L40,100"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </div>
                <div className="absolute top-0 right-0 w-40 h-40 opacity-30 transform rotate-90">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full text-red-400"
                  >
                    <path
                      d="M0,0 L50,50 L100,0 M0,20 L50,50 L100,20 M0,40 L50,50 L100,40 M20,0 L50,50 L20,100 M40,0 L50,50 L40,100"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-0 w-40 h-40 opacity-25 transform rotate-180">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full text-purple-400"
                  >
                    <path
                      d="M0,0 L50,50 L100,0 M0,20 L50,50 L100,20 M0,40 L50,50 L100,40 M20,0 L50,50 L20,100 M40,0 L50,50 L40,100"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </div>
              </>
            )}

            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url(${HERO_IMAGES[0]})`,
              }}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center">
                <img
                  src={LOGO_URL}
                  alt="Drivin And Chill Logo"
                  className="mx-auto h-32 w-32 mb-8 object-contain"
                />

                <h1 className="text-6xl font-bold text-white mb-6 font-serif tracking-wide">
                  DRIVIN AND CHILL
                </h1>

                <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
                  Vivez une expérience unique à Limoges : un cinéma drive-in en
                  plein air, où vous profiterez du film directement depuis votre
                  voiture !
                </p>

                <Button
                  onClick={() => setCurrentStep("booking")}
                  className={`px-12 py-4 text-lg rounded-full font-semibold shadow-2xl transform hover:scale-105 transition-all duration-300 ${
                    isHalloween
                      ? "bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-700 hover:to-purple-700 text-white border-2 border-orange-400"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <Film className="mr-2 h-6 w-6" />
                  Réserver votre séance
                </Button>
              </div>
            </div>
          </div>

          {/* Événements spéciaux */}
          <div className="py-20 bg-gray-900 border-t-4 border-purple-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <EventsDisplay
                onEventSelect={handleMovieFromCarousel}
                timeSlotSettings={timeSlotSettings}
              />
            </div>
          </div>

          {/* Films à l'affiche - Carrousel hebdomadaire */}
          <div className="py-20 bg-gray-800 border-t-4 border-blue-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <WeeklyMoviesCarousel
                onMovieSelect={handleMovieFromCarousel}
                timeSlotSettings={timeSlotSettings}
              />
            </div>
          </div>

          {/* Features Section */}
          <div className="py-20 bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-4xl font-bold text-center text-white mb-16 font-serif">
                L'expérience Drive-In
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Card className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-all duration-300 group">
                  <CardHeader className="text-center">
                    <Radio className="mx-auto h-12 w-12 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                    <CardTitle className="text-white">Son FM</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-center">
                      📡 Son diffusé via fréquence FM - clarté garantie depuis
                      votre autoradio !
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-all duration-300 group">
                  <CardHeader className="text-center">
                    <Popcorn className="mx-auto h-12 w-12 text-yellow-400 mb-4 group-hover:scale-110 transition-transform" />
                    <CardTitle className="text-white">Snacking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-center">
                      🍿 Snacking sur place : popcorn chaud, boissons
                      fraîches...
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-all duration-300 group">
                  <CardHeader className="text-center">
                    <Smartphone className="mx-auto h-12 w-12 text-green-400 mb-4 group-hover:scale-110 transition-transform" />
                    <CardTitle className="text-white">Commande QR</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-center">
                      📱 Commandes via QR code directement depuis votre voiture.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-all duration-300 group">
                  <CardHeader className="text-center">
                    <Euro className="mx-auto h-12 w-12 text-red-400 mb-4 group-hover:scale-110 transition-transform" />
                    <CardTitle className="text-white">
                      17€ par voiture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-center">
                      💲 Viens à deux, trois ou plus c'est toujours le même prix
                      ! 😼
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="py-20 bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Debug: Afficher les horaires chargés */}
              {process.env.NODE_ENV === "development" && timeSlotSettings && (
                <div className="mb-4 p-2 bg-blue-900 rounded text-xs text-blue-200 text-center">
                  🔧 Debug: Horaires chargés - 1ère:{" "}
                  {timeSlotSettings.first_slot_entry_time}/
                  {timeSlotSettings.first_slot_start_time} | 2ème:{" "}
                  {timeSlotSettings.second_slot_entry_time}/
                  {timeSlotSettings.second_slot_start_time}
                </div>
              )}

              {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-orange-800 border-orange-600 hover:bg-orange-700 transition-all duration-300">
                  <CardHeader className="text-center">
                    <Clock className="mx-auto h-12 w-12 text-orange-200 mb-4" />
                    <CardTitle className="text-white text-2xl">
                      Première séance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-orange-100 text-lg mb-2 font-semibold">
                      Entrée :{" "}
                      {timeSlotSettings?.first_slot_entry_time || "18h45"}
                    </p>
                    <p className="text-orange-100 text-lg font-semibold">
                      Diffusion :{" "}
                      {timeSlotSettings?.first_slot_start_time || "19h00"}
                    </p>
                    {timeSlotSettings?.first_slot_end_time && (
                      <p className="text-orange-200 text-sm mt-2 opacity-75">
                        Fin : {timeSlotSettings.first_slot_end_time}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-purple-800 border-purple-600 hover:bg-purple-700 transition-all duration-300">
                  <CardHeader className="text-center">
                    <Moon className="mx-auto h-12 w-12 text-purple-200 mb-4" />
                    <CardTitle className="text-white text-2xl">
                      Seconde séance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-purple-100 text-lg mb-2 font-semibold">
                      Entrée :{" "}
                      {timeSlotSettings?.second_slot_entry_time || "21h00"}
                    </p>
                    <p className="text-purple-100 text-lg font-semibold">
                      Diffusion :{" "}
                      {timeSlotSettings?.second_slot_start_time || "21h15"}
                    </p>
                    {timeSlotSettings?.second_slot_end_time && (
                      <p className="text-purple-200 text-sm mt-2 opacity-75">
                        Fin : {timeSlotSettings.second_slot_end_time}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>  */}

              <p className="text-center text-gray-300 mt-8 text-lg">
                Les séances peuvent se dérouler{" "}
                <strong>tous les jours de la semaine</strong>
              </p>

              {/* Booking Rules Notice */}
              <div className="bg-blue-900 border border-blue-600 rounded-lg p-6 mt-8 max-w-2xl mx-auto">
                <h4 className="text-blue-100 font-bold text-lg mb-3 text-center flex items-center justify-center">
                  <Clock className="mr-2 h-5 w-5" />⏰ Nouvelle règle de
                  réservation
                </h4>
                <div className="text-center space-y-2">
                  <p className="text-blue-100 text-base font-semibold">
                    🔒 Les réservations ferment automatiquement{" "}
                    <span className="text-yellow-300">
                      {timeSlotSettings?.booking_closing_hours || 2}h avant
                      chaque séance
                    </span>
                  </p>
                  <p className="text-blue-200 text-sm">
                    Cette mesure nous permet de mieux organiser les séances et
                    d'assurer la meilleure expérience possible.
                  </p>
                  <p className="text-blue-300 text-xs">
                    💡 Tarif : 17€ par voiture • La capacité varie selon la
                    séance. Pensez à réserver à l'avance !
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="py-16 bg-gray-800">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <MapPin className="mx-auto h-16 w-16 text-blue-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">
                Notre adresse
              </h3>
              <p className="text-gray-300 text-lg mb-6">
                <strong>
                  {addressSettings?.address_text ||
                    "Le petit juillac 87100 Limoges"}
                </strong>
              </p>
              <div className="mt-8 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-700">
                <MapContainer
                  center={
                    addressSettings
                      ? [addressSettings.latitude, addressSettings.longitude]
                      : [45.8336, 1.2611]
                  }
                  zoom={17}
                  style={{ height: "400px", width: "100%", zIndex: 0 }}
                  scrollWheelZoom={true}
                  whenCreated={(mapInstance) => {
                    // Forcer le centrage immédiatement à la création
                    const center = addressSettings
                      ? [addressSettings.latitude, addressSettings.longitude]
                      : [45.8336, 1.2611];
                    mapInstance.setView(center, 17);
                  }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapCenter
                    center={
                      addressSettings
                        ? [addressSettings.latitude, addressSettings.longitude]
                        : [45.8336, 1.2611]
                    }
                    zoom={17}
                  />
                  <Marker
                    position={
                      addressSettings
                        ? [addressSettings.latitude, addressSettings.longitude]
                        : [45.8336, 1.2611]
                    }
                  >
                    <Popup>
                      <strong>
                        {addressSettings?.address_text || "Le petit juillac"}
                      </strong>
                      <br />
                      {addressSettings?.full_address || "87100 Limoges, France"}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Weather Info */}
          <div className="py-16 bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <CloudRain className="mx-auto h-16 w-16 text-blue-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">
                Politique météo
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                En cas de pluie, le film sera tout de même diffusé tant que la
                sécurité le permet. Le son sortant directement des véhicules,
                les essuie-glaces ne gâchent rien à l'expérience. En cas de
                météo très problématique, vous serez prévenus quelques heures à
                l'avance par mail.
              </p>
            </div>
          </div>

          {/* Contact Section */}
          <div className="py-16 bg-gradient-to-r from-purple-900 to-blue-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <Instagram className="mx-auto h-16 w-16 text-white mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">
                Une question ? Contactez-nous !
              </h3>
              <p className="text-gray-200 text-lg mb-8 leading-relaxed">
                Notre équipe est disponible pour répondre à toutes vos questions
                via Instagram. Réponse rapide garantie !
              </p>
              <div className="space-y-4">
                <a
                  href="https://www.instagram.com/drivinnchill/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <Instagram className="mr-3 h-6 w-6" />
                  Contacter @drivinnchill
                </a>
                <p className="text-gray-300 text-sm">
                  Cliquez pour ouvrir une conversation directe avec
                  @drivinnchill
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="py-20 bg-gray-800">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-4xl font-bold text-white mb-8 font-serif">
                Prêt pour l'aventure ?
              </h2>
              <p className="text-xl text-gray-300 mb-12">
                Réservez dès maintenant votre place pour une soirée cinéma
                inoubliable sous les étoiles !
              </p>
              <Button
                onClick={() => setCurrentStep("booking")}
                className={`px-16 py-6 text-xl rounded-full font-bold shadow-2xl transform hover:scale-110 transition-all duration-300 ${
                  isHalloween
                    ? "bg-gradient-to-r from-orange-600 via-red-600 to-purple-600 hover:from-orange-700 hover:via-red-700 hover:to-purple-700 text-white border-2 border-orange-500"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                <Film className="mr-3 h-7 w-7" />
                Je réserve maintenant !
              </Button>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-gray-900 border-t border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-4">
                  <img
                    src={LOGO_URL}
                    alt="Drivin And Chill Logo"
                    className="h-16 w-16 object-contain"
                  />
                  <h3 className="text-white font-bold text-lg">
                    Drivin And Chill
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Cinéma drive-in unique à Limoges
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Contact</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-400 flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      {addressSettings?.full_address ||
                        "Le petit juillac 87100 Limoges"}
                    </p>
                    <p className="text-gray-400 flex items-center">
                      <Mail className="mr-2 h-4 w-4" />
                      semih.adresse@gmail.com
                    </p>
                    <a
                      href="https://instagram.com/drivinnchill"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white flex items-center transition-colors"
                    >
                      <Instagram className="mr-2 h-4 w-4" />
                      @drivinnchill
                    </a>
                    <a
                      href="https://www.instagram.com/drivinnchill/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center transition-colors text-sm"
                    >
                      💬 DM @drivinnchill
                    </a>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Services</h4>
                  <div className="space-y-2 text-sm">
                    <button
                      onClick={() => setCurrentStep("popular-movies")}
                      className="text-gray-400 hover:text-white transition-colors block"
                    >
                      🏆 Films Populaires
                    </button>
                    <button
                      onClick={() => setIsSuggestionModalOpen(true)}
                      className="text-gray-400 hover:text-yellow-300 transition-colors block"
                    >
                      💡 Suggérer un film
                    </button>
                    <button
                      onClick={() => setCurrentStep("partners")}
                      className="text-gray-400 hover:text-white transition-colors block"
                    >
                      Espace Partenaire
                    </button>
                    <button
                      onClick={() => {
                        console.log("Bouton Administration cliqué");
                        setShowAdminLoginDialog(true);
                        console.log("showAdminLoginDialog devrait être true");
                      }}
                      className="text-gray-400 hover:text-white transition-colors block"
                    >
                      Administration
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Légal</h4>
                  <div className="space-y-2 text-sm">
                    <button
                      onClick={() => setCurrentStep("mentions")}
                      className="text-gray-400 hover:text-white transition-colors block"
                    >
                      Mentions Légales
                    </button>
                    <button
                      onClick={() => setCurrentStep("cgv")}
                      className="text-gray-400 hover:text-white transition-colors block"
                    >
                      Conditions Générales de Vente
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 mt-8 pt-8 text-center">
                <p className="text-gray-400 text-sm">
                  © 2025 Drivin And Chill - Ozturk Semih. Tous droits réservés.
                </p>
              </div>
            </div>
          </footer>

          {/* Movie Suggestion Modal */}
          <MovieSuggestionModal
            isOpen={isSuggestionModalOpen}
            onClose={() => setIsSuggestionModalOpen(false)}
          />
        </div>
      </>
    );
  }

  if (currentStep === "booking") {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <Toaster />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <img
              src={LOGO_URL}
              alt="Drivin And Chill Logo"
              className="mx-auto h-16 w-16 mb-4 object-contain"
            />
            <h1 className="text-3xl font-bold text-white mb-2">Réservation</h1>
            <p className="text-gray-400">
              Complétez votre réservation en quelques étapes
            </p>
          </div>

          {/* Indicateur de pré-remplissage */}
          {selectedDate &&
            selectedTimeSlot &&
            selectedMovie &&
            (() => {
              // Trouver le schedule correspondant pour obtenir les horaires réels
              // Priorité au schedule prérempli qui contient les vraies informations
              const actualSchedule =
                preFillData?.schedule ||
                movieSchedules.find(
                  (schedule) => schedule.schedule.time_slot === selectedTimeSlot
                )?.schedule;

              // Déterminer l'heure à afficher
              let displayTime = selectedTimeSlot;
              if (actualSchedule?.entry_time && actualSchedule?.start_time) {
                displayTime = `Entrée : ${
                  actualSchedule.entry_time
                } • Diffusion : ${actualSchedule.start_time}${
                  actualSchedule.end_time
                    ? ` • Fin : ${actualSchedule.end_time}`
                    : ""
                }`;
              } else if (actualSchedule?.start_time) {
                displayTime = `Diffusion : ${actualSchedule.start_time}${
                  actualSchedule.end_time
                    ? ` • Fin : ${actualSchedule.end_time}`
                    : ""
                }`;
              } else if (actualSchedule?.custom_time) {
                // Pour les événements avec custom_time
                displayTime = `Début : ${actualSchedule.custom_time}`;
              }

              return (
                <Card className="bg-green-900 border-green-700 mb-4">
                  <CardContent className="p-4">
                    <div className="text-center text-green-100">
                      <div className="flex items-center justify-center mb-2">
                        <Film className="mr-2 h-5 w-5" />
                      </div>
                      <p className="text-sm">
                        📅 {format(selectedDate, "EEEE d MMMM", { locale: fr })}{" "}
                        • 🕐 {displayTime} • 🎬 {selectedMovie.title}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

          <Card
            className={`${
              isHalloween
                ? "bg-gradient-to-br from-orange-900/70 to-purple-900/70 border-orange-600"
                : "bg-gray-800 border-gray-700"
            } transition-all duration-300`}
          >
            <CardHeader>
              <CardTitle
                className={`${
                  isHalloween ? "text-orange-200" : "text-white"
                } text-xl`}
              >
                Informations de réservation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Selection */}
              <div className="space-y-2">
                <Label className="text-white">Date de la séance *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "PPP", { locale: fr })
                        : "Choisir une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-gray-800 border-gray-600"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={isDateDisabled}
                      modifiers={modifiers}
                      modifiersStyles={modifiersStyles}
                      locale={fr}
                      className="rounded-md"
                      fromDate={new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-gray-400">
                  {preFillData && preFillData.isEvent
                    ? "Les événements peuvent avoir lieu n'importe quel jour de la semaine"
                    : "Les séances peuvent avoir lieu tous les jours de la semaine"}
                </p>
              </div>

              {/* Time Slot Selection */}
              <div className="space-y-2">
                <Label className="text-white">Créneau horaire *</Label>
                <Select
                  value={selectedTimeSlot}
                  onValueChange={handleTimeSlotSelect}
                  disabled={!selectedDate}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue
                      placeholder={
                        !selectedDate
                          ? "Sélectionnez d'abord une date"
                          : movieSchedules.length === 0 && !isPreFilled
                          ? "Aucun créneau disponible pour cette date"
                          : "Choisir un créneau"
                      }
                    >
                      {/* Display the selected time slot with specific schedule info if available */}
                      {selectedTimeSlot &&
                        (() => {
                          // Try to find the schedule in movieSchedules first
                          const scheduleInList = movieSchedules.find(
                            (s) => s.schedule.time_slot === selectedTimeSlot
                          );
                          // Use preFillData schedule if available, otherwise use the one from the list
                          const schedule =
                            preFillData?.schedule || scheduleInList?.schedule;

                          if (schedule?.entry_time && schedule?.start_time) {
                            return `Entrée: ${schedule.entry_time} • Début: ${
                              schedule.start_time
                            }${
                              schedule.end_time
                                ? ` • Fin: ${schedule.end_time}`
                                : ""
                            }`;
                          } else if (schedule?.start_time) {
                            return `Début: ${schedule.start_time}${
                              schedule.end_time
                                ? ` • Fin: ${schedule.end_time}`
                                : ""
                            }`;
                          } else if (schedule?.custom_time) {
                            return `Début: ${schedule.custom_time}`;
                          }
                          return getTimeSlotDisplay(selectedTimeSlot);
                        })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {movieSchedules.length > 0 || isPreFilled ? (
                      // Show actual schedules if available
                      movieSchedules.length > 0 ? (
                        movieSchedules.map((schedule) => {
                          const availability =
                            availabilityInfo[schedule.schedule.time_slot];
                          const isBookingClosed =
                            availability && !availability.is_booking_open;
                          const closureReason = availability?.closure_reason;

                          // Check if this is the pre-filled schedule
                          const isPreFilledSchedule =
                            isPreFilled &&
                            preFillData &&
                            schedule.schedule.time_slot ===
                              preFillData.timeSlot &&
                            schedule.movie?.id === preFillData.movie?.id;

                          return (
                            <SelectItem
                              key={schedule.schedule.id}
                              value={schedule.schedule.time_slot}
                              className={`text-white hover:bg-gray-700 ${
                                isBookingClosed ? "opacity-50" : ""
                              } ${
                                isPreFilledSchedule ? "bg-green-900/30" : ""
                              }`}
                              disabled={isBookingClosed}
                            >
                              <div>
                                <div className="font-medium">
                                  {schedule.schedule.entry_time &&
                                  schedule.schedule.start_time
                                    ? `Entrée: ${
                                        schedule.schedule.entry_time
                                      } • Début: ${
                                        schedule.schedule.start_time
                                      }${
                                        schedule.schedule.end_time
                                          ? ` • Fin: ${schedule.schedule.end_time}`
                                          : ""
                                      }`
                                    : getTimeSlotDisplay(
                                        schedule.schedule.time_slot
                                      )}
                                </div>
                                <div className="text-sm text-gray-300">
                                  {schedule.schedule.entry_time &&
                                  schedule.schedule.start_time
                                    ? `Film à ${schedule.schedule.start_time}${
                                        schedule.schedule.end_time ? `` : ""
                                      }`
                                    : isHalloween
                                    ? mapTimeSlotToHalloween(
                                        schedule.schedule.time_slot
                                      )
                                    : schedule.schedule.time_slot}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {schedule.schedule.entry_time &&
                                  schedule.schedule.start_time
                                    ? `Capacité: ${
                                        schedule.schedule.capacity || 21
                                      } places${
                                        schedule.movie?.duration_minutes
                                          ? ` • Durée: ${schedule.movie.duration_minutes} min`
                                          : ""
                                      }`
                                    : getTimeSlots().find(
                                        (slot) =>
                                          slot.value ===
                                          schedule.schedule.time_slot
                                      )?.label}
                                </div>
                                <div className="text-sm font-medium text-blue-400 mt-1">
                                  🎬 {schedule.movie.title}
                                </div>
                                {isBookingClosed && (
                                  <div className="text-sm text-red-400 mt-1">
                                    {closureReason === "booking_closed_2h" &&
                                      `🔒 Réservations fermées (moins de ${
                                        timeSlotSettings?.booking_closing_hours ||
                                        2
                                      }h)`}
                                    {closureReason === "show_has_passed" &&
                                      "⏰ Séance terminée"}
                                    {closureReason === "sold_out" &&
                                      "🎫 Complet"}
                                  </div>
                                )}
                                {availability &&
                                  availability.is_booking_open && (
                                    <div className="text-sm text-green-400 mt-1">
                                      ✅ {availability.available_spots} places
                                      disponibles
                                      {availability.hours_until_show >
                                        (timeSlotSettings?.booking_closing_hours ||
                                          2) &&
                                        ` • Fermeture dans ${Math.floor(
                                          availability.hours_until_show -
                                            (timeSlotSettings?.booking_closing_hours ||
                                              2)
                                        )}h`}
                                    </div>
                                  )}
                              </div>
                            </SelectItem>
                          );
                        })
                      ) : // Show pre-filled option
                      isPreFilled && preFillData ? (
                        <SelectItem
                          key={preFillData.timeSlot}
                          value={preFillData.timeSlot}
                          className="text-white hover:bg-gray-700"
                        >
                          <div>
                            {preFillData.isEvent ? (
                              <>
                                <div className="font-medium">
                                  Événement spécial
                                </div>
                                <div className="text-sm text-gray-400">
                                  Début : {preFillData.timeSlot}
                                </div>
                                <div className="text-sm font-medium text-purple-400 mt-1">
                                  ⭐ {preFillData.movieTitle}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium">
                                  {preFillData.schedule?.entry_time &&
                                  preFillData.schedule?.start_time
                                    ? `Entrée: ${
                                        preFillData.schedule.entry_time
                                      } • Début: ${
                                        preFillData.schedule.start_time
                                      }${
                                        preFillData.schedule.end_time
                                          ? ` • Fin: ${preFillData.schedule.end_time}`
                                          : ""
                                      }`
                                    : getTimeSlotDisplay(preFillData.timeSlot)}
                                </div>
                                <div className="text-sm text-gray-300">
                                  {preFillData.schedule?.entry_time &&
                                  preFillData.schedule?.start_time
                                    ? `Film à ${
                                        preFillData.schedule.start_time
                                      }${
                                        preFillData.schedule.end_time
                                          ? ` • Fin: ${preFillData.schedule.end_time}`
                                          : ""
                                      }`
                                    : isHalloween
                                    ? mapTimeSlotToHalloween(
                                        preFillData.timeSlot
                                      )
                                    : preFillData.timeSlot}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {preFillData.schedule?.entry_time &&
                                  preFillData.schedule?.start_time
                                    ? `Capacité: ${
                                        preFillData.schedule.capacity || 21
                                      } places${
                                        preFillData.movie?.duration_minutes
                                          ? ` • Durée: ${preFillData.movie.duration_minutes} min`
                                          : ""
                                      }`
                                    : getTimeSlots().find(
                                        (slot) =>
                                          slot.value === preFillData.timeSlot
                                      )?.label}
                                </div>
                                <div className="text-sm font-medium text-green-400 mt-1">
                                  ✅ {preFillData.movieTitle}
                                </div>
                              </>
                            )}
                          </div>
                        </SelectItem>
                      ) : null
                    ) : selectedDate ? (
                      // Only show generic time slots if a date is selected but no schedules found
                      // This allows users to still make bookings if schedules exist but weren't loaded
                      <div className="p-2 text-center text-gray-400 text-sm">
                        Aucun créneau disponible. Les créneaux apparaîtront ici
                        quand des films seront programmés pour cette date.
                      </div>
                    ) : (
                      // No date selected yet
                      <div className="p-2 text-center text-gray-400 text-sm">
                        Sélectionnez d'abord une date pour voir les créneaux
                        disponibles
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {selectedDate &&
                  movieSchedules.length === 0 &&
                  !isPreFilled && (
                    <p className="text-orange-400 text-sm">
                      ⚠️ Aucun film n'est programmé pour cette date. Contactez
                      l'administration.
                    </p>
                  )}

                {/* Pre-filled booking indicator */}
                {isPreFilled &&
                  preFillData &&
                  (() => {
                    // Déterminer l'heure à afficher pour le créneau
                    // Priorité aux informations spécifiques du schedule
                    let displayTimeSlot = preFillData.timeSlot;
                    let displayCreneau = preFillData.timeSlot;

                    if (preFillData.schedule) {
                      // Utiliser les informations spécifiques du schedule si disponibles
                      if (
                        preFillData.schedule.entry_time &&
                        preFillData.schedule.start_time
                      ) {
                        displayTimeSlot = `Entrée: ${
                          preFillData.schedule.entry_time
                        } • Début: ${preFillData.schedule.start_time}${
                          preFillData.schedule.end_time
                            ? ` • Fin: ${preFillData.schedule.end_time}`
                            : ""
                        }`;
                        displayCreneau = preFillData.schedule.start_time;
                      } else if (preFillData.schedule.start_time) {
                        displayTimeSlot = `Début: ${
                          preFillData.schedule.start_time
                        }${
                          preFillData.schedule.end_time
                            ? ` • Fin: ${preFillData.schedule.end_time}`
                            : ""
                        }`;
                        displayCreneau = preFillData.schedule.start_time;
                      } else if (preFillData.schedule.custom_time) {
                        // Pour les événements avec custom_time
                        displayTimeSlot = `Début: ${preFillData.schedule.custom_time}`;
                        displayCreneau = preFillData.schedule.custom_time;
                      }
                    }

                    return (
                      <div className="bg-green-900 border border-green-600 rounded-lg p-3">
                        <p className="text-green-100 text-sm flex items-center">
                          <Film className="mr-2 h-4 w-4" />✅ Réservation pour{" "}
                          {preFillData.movieTitle}"
                        </p>
                        <p className="text-green-200 text-xs mt-1">
                          Date:{" "}
                          {format(
                            new Date(preFillData.date),
                            "EEEE dd MMMM yyyy",
                            {
                              locale: fr,
                            }
                          )}{" "}
                          • Créneau: {displayCreneau}
                          {preFillData.schedule?.capacity && (
                            <span>
                              {" "}
                              • Capacité: {preFillData.schedule.capacity} places
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })()}

                {/* Booking Rules Information */}
                <div className="bg-blue-900 border border-blue-600 rounded-lg p-3">
                  <h4 className="text-blue-100 font-semibold text-sm mb-2 flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    📋 Règles de réservation
                  </h4>
                  <ul className="text-blue-200 text-xs space-y-1">
                    <li>
                      • <strong>Fermeture automatique :</strong> Les
                      réservations ferment{" "}
                      {timeSlotSettings?.booking_closing_hours || 2}h avant
                      chaque séance
                    </li>
                    <li>
                      • <strong>Jours d'ouverture :</strong> Tous les jours de
                      la semaine
                    </li>
                    <li>
                      • <strong>Capacité :</strong> 21 voitures maximum par
                      séance
                    </li>
                    <li>
                      • <strong>Prix :</strong> 17€ par voiture
                    </li>
                  </ul>
                </div>
              </div>

              {/* Nombre de personnes */}
              <div className="space-y-2">
                <Label className="text-white">Nombre de personnes *</Label>
                <Select
                  value={formData.nbPersonne}
                  onValueChange={(value) => {
                    handleInputChange("nbPersonne", value);
                    if (value !== "more") {
                      handleInputChange("nbPersonneCustom", "");
                    }
                  }}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Sélectionnez le nombre de personnes" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem
                        key={num}
                        value={num.toString()}
                        className="text-white hover:bg-gray-700"
                      >
                        {num} {num === 1 ? "personne" : "personnes"}
                      </SelectItem>
                    ))}
                    <SelectItem
                      value="more"
                      className="text-white hover:bg-gray-700"
                    >
                      Plus de 5 personnes
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.nbPersonne === "more" && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      min="6"
                      value={formData.nbPersonneCustom}
                      onChange={(e) =>
                        handleInputChange("nbPersonneCustom", e.target.value)
                      }
                      placeholder="Indiquez le nombre de personnes"
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                )}
              </div>

              {/* Selected Movie Display */}
              {selectedMovie && (
                <Card className="bg-blue-900 border-blue-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center">
                      <Film className="mr-2 h-5 w-5" />
                      {preFillData && preFillData.isEvent
                        ? "Événement sélectionné"
                        : "Film sélectionné"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {selectedMovie.poster_url ? (
                        <div className="flex justify-center">
                          <img
                            src={(() => {
                              // Convertir automatiquement les URLs Canva via le proxy
                              // Utiliser une fonction inline pour éviter les imports dynamiques
                              const url = selectedMovie.poster_url;
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
                            alt={selectedMovie.title}
                            className="w-32 h-48 object-cover rounded-lg border-2 border-blue-500 shadow-lg"
                            onError={(e) => {
                              const originalUrl = selectedMovie.poster_url;
                              const currentSrc = e.target.src;
                              console.error(
                                "Erreur de chargement de l'image:",
                                {
                                  original: originalUrl,
                                  current: currentSrc,
                                  isCanva:
                                    originalUrl &&
                                    originalUrl.includes("canva.com"),
                                  hasProxy:
                                    !!process.env.REACT_APP_CANVA_PROXY_URL,
                                }
                              );

                              // Si c'est une URL Canva et que le proxy n'est pas configuré, afficher un message
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
                                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFlM2E4YSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BZmZpY2hlIG5vbiBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==";
                              e.target.onerror = null; // Éviter la boucle infinie
                            }}
                            onLoad={() => {
                              console.log(
                                "Image chargée avec succès:",
                                selectedMovie.poster_url
                              );
                            }}
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="flex justify-center items-center w-32 h-48 bg-gray-700 rounded-lg border-2 border-blue-500">
                          <span className="text-gray-400 text-xs text-center px-2">
                            Aucune affiche
                          </span>
                        </div>
                      )}
                      <div
                        className={`${
                          selectedMovie.poster_url &&
                          selectedMovie.poster_url.trim()
                            ? "lg:col-span-2"
                            : "lg:col-span-3"
                        } space-y-4`}
                      >
                        <div>
                          <h3 className="text-white text-2xl font-bold mb-2">
                            {selectedMovie.title}
                          </h3>
                          {preFillData && preFillData.isEvent ? (
                            // Event-specific information
                            <>
                              {selectedMovie.organizer && (
                                <p className="text-blue-200 text-sm mb-2">
                                  Organisé par {selectedMovie.organizer}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 mb-4">
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-700 text-blue-100"
                                >
                                  {selectedMovie.duration_minutes} min
                                </Badge>
                                {selectedMovie.event_type && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-purple-700 text-purple-100"
                                  >
                                    {selectedMovie.event_type.replace("_", " ")}
                                  </Badge>
                                )}
                                {selectedMovie.price && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-green-700 text-green-100"
                                  >
                                    {selectedMovie.price}€
                                  </Badge>
                                )}
                              </div>
                            </>
                          ) : (
                            // Movie-specific information
                            <>
                              {selectedMovie.director && (
                                <p className="text-blue-200 text-sm mb-2">
                                  Réalisé par {selectedMovie.director} (
                                  {selectedMovie.release_year})
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 mb-4">
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-700 text-blue-100"
                                >
                                  {selectedMovie.duration_minutes} min
                                </Badge>
                                {selectedMovie.genre && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-700 text-blue-100"
                                  >
                                    {selectedMovie.genre}
                                  </Badge>
                                )}
                                {selectedMovie.age_rating && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-700 text-blue-100"
                                  >
                                    {selectedMovie.age_rating.replace("_", " ")}
                                  </Badge>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <div>
                          <h4 className="text-blue-100 font-semibold mb-2">
                            {preFillData && preFillData.isEvent
                              ? "Description :"
                              : "Synopsis :"}
                          </h4>
                          <p className="text-blue-100 text-sm leading-relaxed">
                            {preFillData && preFillData.isEvent
                              ? selectedMovie.description
                              : selectedMovie.synopsis}
                          </p>
                        </div>

                        {/* Trailer Section */}
                        {selectedMovie.trailer_url && (
                          <div>
                            <h4 className="text-blue-100 font-semibold mb-3">
                              🎬 Bande-annonce :
                            </h4>
                            <div
                              className="relative w-full"
                              style={{ paddingBottom: "56.25%" }}
                            >
                              <iframe
                                className="absolute top-0 left-0 w-full h-full rounded-lg"
                                src={selectedMovie.trailer_url
                                  .replace("watch?v=", "embed/")
                                  .replace("youtu.be/", "youtube.com/embed/")}
                                title={`Bande-annonce ${selectedMovie.title}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                                allowFullScreen
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Prénom *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    placeholder="Votre prénom"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Nom *</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    placeholder="Votre nom"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Téléphone (optionnel)</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              {/* Promo Code */}
              <div className="space-y-2">
                <Label className="text-white">Code Promo (optionnel)</Label>
                <div className="relative">
                  <Input
                    value={formData.promoCode}
                    onChange={(e) =>
                      handlePromoCodeChange(e.target.value.toUpperCase())
                    }
                    placeholder="Entrez votre code promo"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                  {isValidatingPromo && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* Promo Code Feedback */}
                {formData.promoCode && promoCodeInfo.message && (
                  <div
                    className={`p-3 rounded-lg border ${
                      promoCodeInfo.valid
                        ? "bg-green-900 border-green-600 text-green-100"
                        : "bg-red-900 border-red-600 text-red-100"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {promoCodeInfo.message}
                    </p>

                    {promoCodeInfo.valid &&
                      promoCodeInfo.benefit_description && (
                        <div className="mt-2 p-2 bg-purple-800 rounded border border-purple-600">
                          <p className="text-purple-100 text-sm font-medium">
                            🎁 Avantages inclus :
                          </p>
                          <p className="text-purple-200 text-sm">
                            {promoCodeInfo.benefit_description}
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-white">Méthode de paiement *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) =>
                    handleInputChange("paymentMethod", value)
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Choisir un mode de paiement" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem
                        key={method.value}
                        value={method.value}
                        className="text-white hover:bg-gray-700"
                      >
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Info */}
              <div
                className={`border rounded-lg p-4 ${
                  promoCodeInfo.valid && promoCodeInfo.discount_amount > 0
                    ? promoCodeInfo.final_price <= 0
                      ? "bg-purple-900 border-purple-700"
                      : "bg-blue-900 border-blue-700"
                    : "bg-green-900 border-green-700"
                }`}
              >
                {promoCodeInfo.valid && promoCodeInfo.discount_amount > 0 ? (
                  // With discount
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`${
                          promoCodeInfo.final_price <= 0
                            ? "text-purple-200"
                            : "text-blue-200"
                        }`}
                      >
                        Prix original :
                      </span>
                      <span
                        className={`line-through ${
                          promoCodeInfo.final_price <= 0
                            ? "text-purple-200"
                            : "text-blue-200"
                        }`}
                      >
                        {getBasePrice()}€
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`${
                          promoCodeInfo.final_price <= 0
                            ? "text-purple-200"
                            : "text-blue-200"
                        }`}
                      >
                        Réduction ({formData.promoCode}) :
                      </span>
                      <span
                        className={`${
                          promoCodeInfo.final_price <= 0
                            ? "text-purple-300"
                            : "text-blue-300"
                        }`}
                      >
                        -{promoCodeInfo.discount_amount.toFixed(2)}€
                      </span>
                    </div>
                    <div
                      className={`flex items-center justify-between border-t pt-2 ${
                        promoCodeInfo.final_price <= 0
                          ? "border-purple-600"
                          : "border-blue-600"
                      }`}
                    >
                      <span
                        className={`text-lg font-semibold ${
                          promoCodeInfo.final_price <= 0
                            ? "text-purple-100"
                            : "text-blue-100"
                        }`}
                      >
                        Prix final :
                      </span>
                      <span
                        className={`text-2xl font-bold ${
                          promoCodeInfo.final_price <= 0
                            ? "text-purple-100"
                            : "text-blue-100"
                        }`}
                      >
                        {promoCodeInfo.final_price <= 0
                          ? "GRATUIT"
                          : `${promoCodeInfo.final_price.toFixed(2)}€`}
                      </span>
                    </div>
                    {promoCodeInfo.final_price <= 0 && (
                      <div className="mt-3 p-2 bg-purple-800 rounded border border-purple-600">
                        <p className="text-purple-100 text-sm font-bold text-center">
                          🎉 Réservation entièrement gratuite !
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // No discount
                  <div className="flex items-center justify-between">
                    <span className="text-green-100 text-lg">
                      Prix par voiture :
                    </span>
                    <span className="text-green-100 text-2xl font-bold">
                      {getBasePrice()}€
                    </span>
                  </div>
                )}
                <p
                  className={`text-sm mt-2 ${
                    promoCodeInfo.valid && promoCodeInfo.discount_amount > 0
                      ? promoCodeInfo.final_price <= 0
                        ? "text-purple-200"
                        : "text-blue-200"
                      : "text-green-200"
                  }`}
                >
                  Peu importe le nombre de personnes dans votre voiture !
                </p>
                <p
                  className={`text-xs mt-2 ${
                    promoCodeInfo.valid && promoCodeInfo.discount_amount > 0
                      ? promoCodeInfo.final_price <= 0
                        ? "text-purple-300"
                        : "text-blue-300"
                      : "text-green-300"
                  }`}
                >
                  ⚡ Paiement sécurisé par Stripe
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  Retour
                </Button>
                <Button
                  onClick={submitBooking}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Confirmation en cours..."
                    : promoCodeInfo.valid && promoCodeInfo.final_price <= 0
                    ? "🎉 Réserver gratuitement"
                    : `Payer ${
                        promoCodeInfo.valid && promoCodeInfo.final_price
                          ? promoCodeInfo.final_price.toFixed(2)
                          : getBasePrice()
                      }€ avec Stripe`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === "confirmation" && bookingConfirmation) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <Toaster />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <img
              src={LOGO_URL}
              alt="Drivin And Chill Logo"
              className="mx-auto h-16 w-16 mb-4 object-contain"
            />
            <h1 className="text-3xl font-bold text-green-400 mb-2">
              Réservation confirmée !
            </h1>
            <p className="text-gray-400">Votre place est réservée</p>
          </div>

          <Card
            className={`${
              isHalloween
                ? "bg-gradient-to-br from-orange-900/70 to-purple-900/70 border-orange-600"
                : "bg-gray-800 border-gray-700"
            } transition-all duration-300`}
          >
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center">
                <Heart className="mr-2 h-6 w-6 text-red-400" />
                Détails de votre réservation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Nom complet</Label>
                  <p className="text-white">
                    {bookingConfirmation.first_name}{" "}
                    {bookingConfirmation.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">Email</Label>
                  <p className="text-white">{bookingConfirmation.email}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Date</Label>
                  <p className="text-white">
                    {format(new Date(bookingConfirmation.booking_date), "PPP", {
                      locale: fr,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">Créneau</Label>
                  <p className="text-white">
                    {
                      getTimeSlots().find(
                        (slot) => slot.value === bookingConfirmation.time_slot
                      )?.label
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">Prix</Label>
                  <p className="text-white font-bold">
                    {bookingConfirmation.price}€
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">ID de réservation</Label>
                  <p className="text-white text-sm font-mono">
                    {bookingConfirmation.id}
                  </p>
                </div>
              </div>

              <div
                className={`${
                  isHalloween
                    ? "bg-orange-900/60 border border-orange-600"
                    : "bg-blue-900 border border-blue-700"
                } rounded-lg p-4 mt-6`}
              >
                <h3
                  className={`${
                    isHalloween ? "text-orange-100" : "text-blue-100"
                  } font-semibold mb-2`}
                >
                  Informations importantes :
                </h3>
                <ul
                  className={`${
                    isHalloween ? "text-orange-200" : "text-blue-200"
                  } text-sm space-y-1`}
                >
                  <li>• Arrivez 15 minutes avant le début de la séance</li>
                  <li>• Syntonisez votre radio FM pour le son du film</li>
                  <li>• Snacking disponible sur place via QR code</li>
                  <li>• Un email de confirmation vous a été envoyé</li>
                </ul>
              </div>

              <Button
                onClick={resetForm}
                className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white"
              >
                Faire une nouvelle réservation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Admin Login Dialog */}
      <Dialog
        open={showAdminLoginDialog}
        onOpenChange={setShowAdminLoginDialog}
      >
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Connexion Administrateur
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Entrez le mot de passe administrateur pour accéder au panneau de
              contrôle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Mot de passe</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAdminLogin(adminPassword);
                  }
                }}
                placeholder="Entrez le mot de passe"
                className="bg-gray-700 border-gray-600 text-white"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAdminLoginDialog(false);
                  setAdminPassword("");
                }}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                Annuler
              </Button>
              <Button
                onClick={() => handleAdminLogin(adminPassword)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Se connecter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default App;
