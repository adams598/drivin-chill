import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import {
  Users,
  Euro,
  Calendar,
  Clock,
  Film,
  Settings,
  LogOut,
  AlertTriangle,
  Trash2,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

// Import the new MovieManagement and EventManagement components
import SimpleMovieScheduler from "./SimpleMovieScheduler";
import EventManagement from "./EventManagement";
import TimeSlotManagement from "./TimeSlotManagement";
import AddressManagement from "./AddressManagement";
import MovieSuggestionsManagement from "./MovieSuggestionsManagement";
import PromoCodeManagement from "./PromoCodeManagement";
import QRScanner from "./QRScanner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardData, setDashboardData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState(""); // Reset dialog state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile menu state

  const token = localStorage.getItem("admin_token");
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboard();
    } else if (activeTab === "bookings") {
      // Utiliser fetchDashboard pour avoir movie_title et entry_time
      fetchDashboard();
    } else if (activeTab === "contacts") {
      fetchContacts();
    }
    // Movies tab is handled by SimpleMovieScheduler component
  }, [activeTab]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/dashboard`, {
        headers: authHeaders,
      });
      console.log("📊 Dashboard reçu:", response.data);
      // Log pour les réservations récentes
      if (
        response.data?.recent_bookings &&
        response.data.recent_bookings.length > 0
      ) {
        console.log("🔍 Réservations récentes:", response.data.recent_bookings);
        response.data.recent_bookings.forEach((booking, index) => {
          console.log(`📋 Réservation ${index + 1}:`, {
            id: booking.id,
            client: `${booking.first_name} ${booking.last_name}`,
            movie_title: booking.movie_title,
            entry_time: booking.entry_time,
            end_time: booking.end_time,
            content_id: booking.content_id,
            content_type: booking.content_type,
          });
        });
      }
      setDashboardData(response.data);
    } catch (error) {
      console.error("❌ Erreur lors du chargement du dashboard:", error);
      toast.error("Erreur lors du chargement du dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/bookings`, {
        headers: authHeaders,
      });
      console.log("📋 Réservations reçues:", response.data);
      // Log pour la dernière réservation (celle de Tchatchoua ADAMS)
      if (response.data && response.data.length > 0) {
        const lastBooking = response.data[response.data.length - 1];
        console.log("🔍 Dernière réservation:", {
          id: lastBooking.id,
          client: `${lastBooking.first_name} ${lastBooking.last_name}`,
          date: lastBooking.booking_date,
          time_slot: lastBooking.time_slot,
          movie_title: lastBooking.movie_title,
          content_id: lastBooking.content_id,
          content_type: lastBooking.content_type,
          entry_time: lastBooking.entry_time,
        });
      }
      setBookings(response.data);
    } catch (error) {
      console.error("❌ Erreur lors du chargement des réservations:", error);
      toast.error("Erreur lors du chargement des réservations");
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/partners/contacts`, {
        headers: authHeaders,
      });
      setContacts(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des contacts");
    } finally {
      setLoading(false);
    }
  };

  const updateBooking = async (bookingId, updateData) => {
    try {
      const response = await axios.put(
        `${API}/bookings/${bookingId}`,
        updateData,
        { headers: authHeaders }
      );
      toast.success("Réservation mise à jour avec succès");
      // Refresh bookings list to get updated data
      await fetchBookings();
      setEditingBooking(null);
    } catch (error) {
      console.error("Update booking error:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Erreur lors de la mise à jour";
      toast.error(`Erreur: ${errorMessage}`);
    }
  };

  const getStatusBadge = (status, paymentStatus) => {
    if (status === "cancelled")
      return <Badge variant="destructive">Annulé</Badge>;
    if (paymentStatus === "paid")
      return <Badge className="bg-green-600">Payé</Badge>;
    if (status === "confirmed")
      return <Badge className="bg-blue-600">Confirmé</Badge>;
    if (status === "paid") return <Badge className="bg-green-600">Payé</Badge>;
    return <Badge variant="secondary">En attente</Badge>;
  };

  const handleDataReset = async () => {
    // Double confirmation for safety
    const firstConfirm = window.confirm(
      "⚠️ ATTENTION ! Cette action supprimera définitivement TOUTES les réservations et données de test.\n\nÊtes-vous absolument certain de vouloir continuer ?"
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "🚨 DERNIÈRE CONFIRMATION !\n\nCette action est IRRÉVERSIBLE !\n\nToutes les réservations, statistiques et contacts seront perdus définitivement.\n\nCliquez sur OK pour continuer :"
    );

    if (!secondConfirm) return;

    // Ouvrir le dialog pour la confirmation finale
    setShowResetDialog(true);
  };

  const confirmReset = async () => {
    if (resetConfirmation !== "RESET") {
      toast.error("Réinitialisation annulée - mot de confirmation incorrect");
      setResetConfirmation("");
      return;
    }

    setShowResetDialog(false);
    setResetConfirmation("");

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/admin/reset-data`,
        {},
        { headers: authHeaders }
      );

      if (response.data.status === "success") {
        toast.success(
          `Données supprimées avec succès ! ${response.data.summary.bookings_deleted} réservations et ${response.data.summary.contacts_deleted} contacts supprimés.`
        );

        // Refresh all data
        fetchDashboard();
        fetchBookings();
        fetchContacts();
      } else {
        toast.error("Erreur lors de la réinitialisation");
      }
    } catch (error) {
      console.error("Reset error:", error);
      toast.error(
        error.response?.data?.detail ||
          "Erreur lors de la réinitialisation des données"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Réservations
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.statistics?.total_bookings || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData?.statistics?.recent_bookings_7days || 0} cette
              semaine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taux d'Occupation
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData?.statistics?.occupancy_rate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.analytics?.capacity_utilization?.used_spots || 0}{" "}
              /{" "}
              {(dashboardData?.analytics?.capacity_utilization?.used_spots ||
                0) +
                (dashboardData?.analytics?.capacity_utilization
                  ?.available_spots || 0)}{" "}
              places
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Total</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardData?.statistics?.total_revenue || 0}€
            </div>
            <p className="text-xs text-muted-foreground">
              ~{dashboardData?.statistics?.average_revenue_per_day || 0}€ /jour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Réservations Payées
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData?.statistics?.paid_bookings || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.statistics?.pending_bookings || 0} en attente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.analytics?.bookings_by_day &&
                Object.entries(dashboardData.analytics.bookings_by_day).map(
                  ([day, count]) => (
                    <div
                      key={day}
                      className="flex items-center justify-between"
                    >
                      <span className="capitalize font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${
                                (count /
                                  Math.max(
                                    1,
                                    dashboardData.statistics.total_bookings
                                  )) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  )
                )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par Créneau</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.analytics?.bookings_by_slot &&
                Object.entries(dashboardData.analytics.bookings_by_slot).map(
                  ([slot, count]) => (
                    <div
                      key={slot}
                      className="flex items-center justify-between"
                    >
                      <span className="font-medium">
                        {slot === "21h15"
                          ? "1ère séance (21h15)"
                          : "2ème séance (23h45)"}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${
                                (count /
                                  Math.max(
                                    1,
                                    dashboardData.statistics.total_bookings
                                  )) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  )
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Movies */}
      {dashboardData?.analytics?.movie_popularity &&
        dashboardData.analytics.movie_popularity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Films les Plus Populaires</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.analytics.movie_popularity.map(
                  (movie, index) => (
                    <div
                      key={movie.title}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="font-medium">{movie.title}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {movie.bookings} réservations
                        </div>
                        <div className="text-xs text-gray-500">
                          {movie.revenue}€ revenus
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

      <Card>
        <CardHeader>
          <CardTitle>Réservations Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Client</TableHead>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[150px]">Film</TableHead>
                  <TableHead className="min-w-[80px]">Créneau</TableHead>
                  <TableHead className="min-w-[100px]">Nb. personnes</TableHead>
                  <TableHead className="min-w-[100px]">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData?.recent_bookings?.map((booking) => {
                  // Formater l'affichage du créneau : entry_time → time_slot ou juste time_slot
                  const formatTimeSlot = () => {
                    if (booking.entry_time && booking.time_slot) {
                      if (booking.entry_time !== booking.time_slot) {
                        return `${booking.entry_time} → ${booking.time_slot}`;
                      }
                      return booking.entry_time;
                    }
                    return booking.entry_time || booking.time_slot || "N/A";
                  };

                  // Formater l'affichage du film
                  const formatMovie = () => {
                    // Log pour déboguer
                    if (
                      !booking.movie_title &&
                      booking.content_type === "movie"
                    ) {
                      console.warn("⚠️ Pas de movie_title pour booking:", {
                        id: booking.id,
                        content_id: booking.content_id,
                        content_type: booking.content_type,
                        booking_keys: Object.keys(booking),
                      });
                    }
                    if (booking.movie_title) {
                      return booking.movie_title;
                    }
                    if (booking.content_type === "event") {
                      return "Événement";
                    }
                    if (booking.content_type === "movie") {
                      return "Film (titre non trouvé)";
                    }
                    return "N/A";
                  };

                  return (
                    <TableRow key={booking.id}>
                      <TableCell>
                        {booking.first_name} {booking.last_name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(booking.booking_date), "PP", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatMovie()}
                      </TableCell>
                      <TableCell>{formatTimeSlot()}</TableCell>
                      <TableCell className="font-medium">
                        {booking.nb_personne || 1}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(booking.status, booking.payment_status)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Data Reset Section */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Zone de Réinitialisation
          </CardTitle>
          <CardDescription className="text-red-600">
            Attention : Cette action supprimera définitivement toutes les
            données de test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-700 mb-2">
                Ce qui sera supprimé :
              </h4>
              <ul className="text-sm text-red-600 space-y-1">
                <li>• Toutes les réservations (payées et impayées)</li>
                <li>• Toutes les demandes de partenariat</li>
                <li>• Historique et statistiques</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-700 mb-2">
                Ce qui sera conservé :
              </h4>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• Films et événements créés</li>
                <li>• Programmations des séances</li>
                <li>• Configuration administrative</li>
              </ul>
            </div>

            <Button
              onClick={handleDataReset}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {loading
                ? "Réinitialisation..."
                : "Réinitialiser toutes les données de test"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-4 sm:space-y-6 w-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            Gestion des Réservations
          </CardTitle>
          <CardDescription className="text-sm">
            Gérez toutes les réservations du cinéma drive-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">ID</TableHead>
                  <TableHead className="min-w-[120px]">Client</TableHead>
                  <TableHead className="min-w-[150px] hidden sm:table-cell">
                    Email
                  </TableHead>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[150px]">Film</TableHead>
                  <TableHead className="min-w-[80px]">Créneau</TableHead>
                  <TableHead className="min-w-[100px]">Nb. personnes</TableHead>
                  <TableHead className="min-w-[100px]">Statut</TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dashboardData?.recent_bookings || bookings).map((booking) => {
                  // Formater l'affichage du créneau : entry_time → time_slot ou juste time_slot
                  const formatTimeSlot = () => {
                    if (booking.entry_time && booking.time_slot) {
                      // Si on a les deux, afficher entry_time → time_slot
                      if (booking.entry_time !== booking.time_slot) {
                        return `${booking.entry_time} → ${booking.time_slot}`;
                      }
                      return booking.entry_time;
                    }
                    // Sinon, afficher au moins le time_slot
                    return booking.entry_time || booking.time_slot || "N/A";
                  };

                  // Formater l'affichage du film
                  const formatMovie = () => {
                    // Log pour déboguer
                    if (
                      !booking.movie_title &&
                      booking.content_type === "movie"
                    ) {
                      console.warn("⚠️ Pas de movie_title pour booking:", {
                        id: booking.id,
                        content_id: booking.content_id,
                        content_type: booking.content_type,
                        booking_keys: Object.keys(booking),
                      });
                    }
                    if (booking.movie_title) {
                      return booking.movie_title;
                    }
                    // Si pas de titre mais on a un content_type, indiquer le type
                    if (booking.content_type === "event") {
                      return "Événement";
                    }
                    if (booking.content_type === "movie") {
                      return "Film (titre non trouvé)";
                    }
                    return "N/A";
                  };

                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-xs">
                        {booking.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {booking.first_name} {booking.last_name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {booking.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(booking.booking_date), "PP", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatMovie()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTimeSlot()}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {booking.nb_personne || 1}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(booking.status, booking.payment_status)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingBooking(booking)}
                          className="w-full sm:w-auto"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingBooking && (
        <Card>
          <CardHeader>
            <CardTitle>Modifier la Réservation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Prénom</Label>
                <Input
                  value={editingBooking.first_name}
                  onChange={(e) =>
                    setEditingBooking({
                      ...editingBooking,
                      first_name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Nom</Label>
                <Input
                  value={editingBooking.last_name}
                  onChange={(e) =>
                    setEditingBooking({
                      ...editingBooking,
                      last_name: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Statut</Label>
              <Select
                value={editingBooking.status}
                onValueChange={(value) =>
                  setEditingBooking({ ...editingBooking, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="confirmed">Confirmé</SelectItem>
                  <SelectItem value="paid">Payé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() =>
                  updateBooking(editingBooking.id, {
                    first_name: editingBooking.first_name,
                    last_name: editingBooking.last_name,
                    status: editingBooking.status,
                  })
                }
              >
                Sauvegarder
              </Button>
              <Button variant="outline" onClick={() => setEditingBooking(null)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const menuItems = [
    { id: "dashboard", label: "Dashboard", color: "blue" },
    { id: "bookings", label: "Réservations", color: "blue" },
    { id: "movies", label: "Films", color: "green" },
    { id: "events", label: "Événements", color: "orange" },
    { id: "suggestions", label: "Suggestions", color: "yellow" },
    { id: "time-slots", label: "Horaires", color: "indigo" },
    { id: "address", label: "Adresse", color: "blue" },
    { id: "scanner", label: "Scanner QR", color: "yellow" },
    { id: "promo-codes", label: "Codes Promo", color: "pink" },
    { id: "contacts", label: "Partenaires", color: "purple" },
  ];

  const getTabColor = (tabId) => {
    const item = menuItems.find((m) => m.id === tabId);
    return item ? item.color : "blue";
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const renderContacts = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">
          Demandes Partenaires
        </CardTitle>
        <CardDescription className="text-sm">
          Demandes de publicité et partenariats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Entreprise</TableHead>
                <TableHead className="min-w-[120px] hidden md:table-cell">
                  Contact
                </TableHead>
                <TableHead className="min-w-[150px]">Email</TableHead>
                <TableHead className="min-w-[200px] hidden lg:table-cell">
                  Message
                </TableHead>
                <TableHead className="min-w-[100px]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    {contact.company_name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {contact.contact_name}
                  </TableCell>
                  <TableCell className="text-sm break-all">
                    {contact.email}
                  </TableCell>
                  <TableCell className="max-w-xs truncate hidden lg:table-cell">
                    {contact.message}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(contact.created_at), "PP", { locale: fr })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 sticky top-0 z-50 bg-gray-900">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-white hover:bg-gray-800"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
              <h1 className="text-base sm:text-lg lg:text-2xl font-bold">
                Administration
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={onLogout}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <LogOut className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-1 pb-2">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              const colorClasses = {
                blue: isActive
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-300 hover:text-white",
                green: isActive
                  ? "border-green-500 text-green-400"
                  : "border-transparent text-gray-300 hover:text-white",
                orange: isActive
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-gray-300 hover:text-white",
                yellow: isActive
                  ? "border-yellow-500 text-yellow-400"
                  : "border-transparent text-gray-300 hover:text-white",
                indigo: isActive
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-gray-300 hover:text-white",
                pink: isActive
                  ? "border-pink-500 text-pink-400"
                  : "border-transparent text-gray-300 hover:text-white",
                purple: isActive
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-300 hover:text-white",
              };

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`py-2 px-3 border-b-2 font-medium text-sm transition-colors ${
                    colorClasses[item.color]
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Menu */}
      <div
        className={`
        fixed top-0 left-0 h-full w-64 bg-gray-800 border-r border-gray-700 z-50 transform transition-transform duration-300 ease-in-out lg:hidden
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Menu</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <nav className="flex flex-col p-2">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const colorClasses = {
              blue: isActive
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white",
              green: isActive
                ? "bg-green-600 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white",
              orange: isActive
                ? "bg-orange-600 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white",
              yellow: isActive
                ? "bg-yellow-600 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white",
              indigo: isActive
                ? "bg-indigo-600 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white",
              pink: isActive
                ? "bg-pink-600 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white",
              purple: isActive
                ? "bg-purple-600 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white",
            };

            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`text-left py-3 px-4 rounded-lg mb-1 font-medium transition-colors ${
                  colorClasses[item.color]
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Tab Indicator */}
      <div className="lg:hidden border-b border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          {(() => {
            const color = getTabColor(activeTab);
            const colorMap = {
              blue: "bg-blue-500",
              green: "bg-green-500",
              orange: "bg-orange-500",
              yellow: "bg-yellow-500",
              indigo: "bg-indigo-500",
              pink: "bg-pink-500",
              purple: "bg-purple-500",
            };
            return (
              <div
                className={`w-2 h-2 rounded-full ${
                  colorMap[color] || "bg-blue-500"
                }`}
              />
            );
          })()}
          <span className="text-sm font-medium text-gray-300">
            {menuItems.find((m) => m.id === activeTab)?.label || "Dashboard"}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 w-full">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2 text-gray-400">Chargement...</p>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "bookings" && renderBookings()}
            {activeTab === "movies" && <SimpleMovieScheduler />}
            {activeTab === "events" && <EventManagement />}
            {activeTab === "suggestions" && <MovieSuggestionsManagement />}
            {activeTab === "time-slots" && <TimeSlotManagement />}
            {activeTab === "address" && <AddressManagement />}
            {activeTab === "promo-codes" && <PromoCodeManagement />}
            {activeTab === "scanner" && <QRScanner />}
            {activeTab === "contacts" && renderContacts()}
          </>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-red-400">
              ⚠️ Confirmation Finale
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Pour confirmer définitivement, tapez exactement :{" "}
              <strong className="text-white">RESET</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Confirmation</Label>
              <Input
                type="text"
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    confirmReset();
                  }
                }}
                placeholder="Tapez RESET"
                className="bg-gray-700 border-gray-600 text-white"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResetDialog(false);
                  setResetConfirmation("");
                }}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                Annuler
              </Button>
              <Button
                onClick={confirmReset}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirmer la suppression
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
