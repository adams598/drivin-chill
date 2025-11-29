import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Users, Euro, Calendar, Clock, Film, Settings, LogOut, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

// Import the new MovieManagement and EventManagement components
import SimpleMovieScheduler from './SimpleMovieScheduler';
import EventManagement from './EventManagement';
import TimeSlotManagement from './TimeSlotManagement';
import MovieSuggestionsManagement from './MovieSuggestionsManagement';
import PromoCodeManagement from './PromoCodeManagement';
import QRScanner from './QRScanner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState(""); // Reset dialog state

  const token = localStorage.getItem('admin_token');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    } else if (activeTab === 'bookings') {
      fetchBookings();
    } else if (activeTab === 'contacts') {
      fetchContacts();
    }
    // Movies tab is handled by SimpleMovieScheduler component
  }, [activeTab]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/dashboard`, { headers: authHeaders });
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/bookings`, { headers: authHeaders });
      setBookings(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/partners/contacts`, { headers: authHeaders });
      setContacts(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  };

  const updateBooking = async (bookingId, updateData) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}`, updateData, { headers: authHeaders });
      toast.success('Réservation mise à jour avec succès');
      fetchBookings();
      setEditingBooking(null);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status, paymentStatus) => {
    if (paymentStatus === 'paid') return <Badge className="bg-green-600">Payé</Badge>;
    if (status === 'cancelled') return <Badge variant="destructive">Annulé</Badge>;
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
      const response = await axios.post(`${API}/admin/reset-data`, {}, { headers: authHeaders });
      
      if (response.data.status === 'success') {
        toast.success(`Données supprimées avec succès ! ${response.data.summary.bookings_deleted} réservations et ${response.data.summary.contacts_deleted} contacts supprimés.`);
        
        // Refresh all data
        fetchDashboard();
        fetchBookings();
        fetchContacts();
      } else {
        toast.error('Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Reset error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la réinitialisation des données');
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Réservations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.statistics?.total_bookings || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData?.statistics?.recent_bookings_7days || 0} cette semaine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'Occupation</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardData?.statistics?.occupancy_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.analytics?.capacity_utilization?.used_spots || 0} / {
                (dashboardData?.analytics?.capacity_utilization?.used_spots || 0) + 
                (dashboardData?.analytics?.capacity_utilization?.available_spots || 0)
              } places
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Total</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dashboardData?.statistics?.total_revenue || 0}€</div>
            <p className="text-xs text-muted-foreground">
              ~{dashboardData?.statistics?.average_revenue_per_day || 0}€ /jour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations Payées</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardData?.statistics?.paid_bookings || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.statistics?.pending_bookings || 0} en attente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.analytics?.bookings_by_day && Object.entries(dashboardData.analytics.bookings_by_day).map(([day, count]) => (
                <div key={day} className="flex items-center justify-between">
                  <span className="capitalize font-medium">{day}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / Math.max(1, dashboardData.statistics.total_bookings)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par Créneau</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.analytics?.bookings_by_slot && Object.entries(dashboardData.analytics.bookings_by_slot).map(([slot, count]) => (
                <div key={slot} className="flex items-center justify-between">
                  <span className="font-medium">{slot === "21h15" ? "1ère séance (21h15)" : "2ème séance (23h45)"}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(count / Math.max(1, dashboardData.statistics.total_bookings)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Movies */}
      {dashboardData?.analytics?.movie_popularity && dashboardData.analytics.movie_popularity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Films les Plus Populaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.analytics.movie_popularity.map((movie, index) => (
                <div key={movie.title} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium">{movie.title}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{movie.bookings} réservations</div>
                    <div className="text-xs text-gray-500">{movie.revenue}€ revenus</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Réservations Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Créneau</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboardData?.recent_bookings?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.first_name} {booking.last_name}</TableCell>
                  <TableCell>{format(new Date(booking.booking_date), 'PP', { locale: fr })}</TableCell>
                  <TableCell>{booking.time_slot}</TableCell>
                  <TableCell>{getStatusBadge(booking.status, booking.payment_status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            Attention : Cette action supprimera définitivement toutes les données de test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-700 mb-2">Ce qui sera supprimé :</h4>
              <ul className="text-sm text-red-600 space-y-1">
                <li>• Toutes les réservations (payées et impayées)</li>
                <li>• Toutes les demandes de partenariat</li>
                <li>• Historique et statistiques</li>
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-700 mb-2">Ce qui sera conservé :</h4>
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
              {loading ? 'Réinitialisation...' : 'Réinitialiser toutes les données de test'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Réservations</CardTitle>
          <CardDescription>
            Gérez toutes les réservations du cinéma drive-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Créneau</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono text-xs">{booking.id.substring(0, 8)}...</TableCell>
                  <TableCell>{booking.first_name} {booking.last_name}</TableCell>
                  <TableCell>{booking.email}</TableCell>
                  <TableCell>{format(new Date(booking.booking_date), 'PP', { locale: fr })}</TableCell>
                  <TableCell>{booking.time_slot}</TableCell>
                  <TableCell>{getStatusBadge(booking.status, booking.payment_status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingBooking(booking)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingBooking && (
        <Card>
          <CardHeader>
            <CardTitle>Modifier la Réservation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prénom</Label>
                <Input
                  value={editingBooking.first_name}
                  onChange={(e) => setEditingBooking({...editingBooking, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Nom</Label>
                <Input
                  value={editingBooking.last_name}
                  onChange={(e) => setEditingBooking({...editingBooking, last_name: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label>Statut</Label>
              <Select
                value={editingBooking.status}
                onValueChange={(value) => setEditingBooking({...editingBooking, status: value})}
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
                onClick={() => updateBooking(editingBooking.id, {
                  first_name: editingBooking.first_name,
                  last_name: editingBooking.last_name,
                  status: editingBooking.status
                })}
              >
                Sauvegarder
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingBooking(null)}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderContacts = () => (
    <Card>
      <CardHeader>
        <CardTitle>Demandes Partenaires</CardTitle>
        <CardDescription>
          Demandes de publicité et partenariats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entreprise</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.company_name}</TableCell>
                <TableCell>{contact.contact_name}</TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell className="max-w-xs truncate">{contact.message}</TableCell>
                <TableCell>{format(new Date(contact.created_at), 'PP', { locale: fr })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold">Administration - Drivin And Chill</h1>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
          
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bookings'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Réservations
            </button>
            <button
              onClick={() => setActiveTab('movies')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'movies'
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Films
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'events'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Événements
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'suggestions'
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Suggestions
            </button>
            <button
              onClick={() => setActiveTab('time-slots')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'time-slots'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Horaires
            </button>
            <button
              onClick={() => setActiveTab('scanner')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scanner'
                  ? 'border-yellow-500 text-yellow-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Scanner QR
            </button>
            <button
              onClick={() => setActiveTab('promo-codes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'promo-codes'
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Codes Promo
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contacts'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              Partenaires
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'bookings' && renderBookings()}
            {activeTab === 'movies' && <SimpleMovieScheduler />}
            {activeTab === 'events' && <EventManagement />}
            {activeTab === 'suggestions' && <MovieSuggestionsManagement />}
            {activeTab === 'time-slots' && <TimeSlotManagement />}
            {activeTab === 'promo-codes' && <PromoCodeManagement />}
            {activeTab === 'scanner' && <QRScanner />}
            {activeTab === 'contacts' && renderContacts()}
          </>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-red-400">⚠️ Confirmation Finale</DialogTitle>
            <DialogDescription className="text-gray-400">
              Pour confirmer définitivement, tapez exactement : <strong className="text-white">RESET</strong>
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
                  if (e.key === 'Enter') {
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