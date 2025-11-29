import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Lightbulb, Film, Mail, Calendar, User, MessageSquare, Trash2, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MovieSuggestionsManagement = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const token = localStorage.getItem('admin_token');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    fetchSuggestions();
  }, [filter]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get(`${API}/admin/movie-suggestions`, {
        headers: authHeaders,
        params
      });
      setSuggestions(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des suggestions');
    } finally {
      setLoading(false);
    }
  };

  const updateSuggestionStatus = async (suggestionId, status, notes = null) => {
    try {
      const updateData = { status };
      if (notes !== null) {
        updateData.admin_notes = notes;
      }

      await axios.put(`${API}/admin/movie-suggestions/${suggestionId}`, updateData, {
        headers: authHeaders
      });

      // Refresh suggestions
      fetchSuggestions();
      
      const statusMessages = {
        under_review: 'Suggestion mise en révision',
        accepted: 'Suggestion acceptée ✅',
        rejected: 'Suggestion rejetée'
      };
      
      toast.success(statusMessages[status] || 'Statut mis à jour');
      
      if (expandedSuggestion === suggestionId) {
        setExpandedSuggestion(null);
        setAdminNotes('');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteSuggestion = async (suggestionId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette suggestion ?')) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/movie-suggestions/${suggestionId}`, {
        headers: authHeaders
      });

      // Refresh suggestions
      fetchSuggestions();
      toast.success('Suggestion supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600';
      case 'under_review': return 'bg-blue-600';
      case 'accepted': return 'bg-green-600';
      case 'rejected': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'under_review': return 'En révision';
      case 'accepted': return 'Acceptée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-white">Chargement des suggestions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Lightbulb className="mr-2 h-5 w-5 text-yellow-400" />
            Suggestions de Films
          </CardTitle>
          <CardDescription className="text-gray-400">
            Gérez les suggestions de films proposées par les spectateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="mb-6">
            <label className="text-white text-sm font-medium mb-2 block">
              Filtrer par statut :
            </label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-600">
                <SelectItem value="all">Toutes les suggestions</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="under_review">En révision</SelectItem>
                <SelectItem value="accepted">Acceptées</SelectItem>
                <SelectItem value="rejected">Rejetées</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {['pending', 'under_review', 'accepted', 'rejected'].map(status => {
              const count = suggestions.filter(s => s.status === status).length;
              return (
                <div key={status} className="bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{count}</div>
                  <div className="text-sm text-gray-400">{getStatusLabel(status)}</div>
                </div>
              );
            })}
          </div>

          {/* Suggestions List */}
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Lightbulb className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Aucune suggestion trouvée pour ce filtre</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold text-lg flex items-center">
                            <Film className="mr-2 h-5 w-5 text-blue-400" />
                            {suggestion.movie_title}
                          </h3>
                          <Badge className={`${getStatusColor(suggestion.status)} text-white`}>
                            {getStatusLabel(suggestion.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                          <div className="space-y-1">
                            {suggestion.director && (
                              <p className="text-gray-300">
                                <strong>Réalisateur:</strong> {suggestion.director}
                              </p>
                            )}
                            {suggestion.release_year && (
                              <p className="text-gray-300">
                                <strong>Année:</strong> {suggestion.release_year}
                              </p>
                            )}
                            <p className="text-gray-300 flex items-center">
                              <User className="mr-1 h-4 w-4" />
                              <strong>Suggéré par:</strong> {suggestion.suggested_by}
                            </p>
                            {suggestion.email && (
                              <p className="text-gray-300 flex items-center">
                                <Mail className="mr-1 h-4 w-4" />
                                <strong>Email:</strong> {suggestion.email}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-300 flex items-center">
                              <Calendar className="mr-1 h-4 w-4" />
                              <strong>Date:</strong> {format(new Date(suggestion.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>

                        {suggestion.reason && (
                          <div className="mb-3">
                            <p className="text-gray-400 text-sm">
                              <MessageSquare className="inline mr-1 h-4 w-4" />
                              <strong>Raison:</strong>
                            </p>
                            <p className="text-gray-300 text-sm mt-1 bg-gray-800 p-2 rounded">
                              "{suggestion.reason}"
                            </p>
                          </div>
                        )}

                        {suggestion.admin_notes && (
                          <div className="mb-3">
                            <p className="text-yellow-400 text-sm">
                              <strong>Notes admin:</strong>
                            </p>
                            <p className="text-yellow-200 text-sm bg-yellow-900 p-2 rounded mt-1">
                              {suggestion.admin_notes}
                            </p>
                          </div>
                        )}

                        {/* Expanded Actions */}
                        {expandedSuggestion === suggestion.id && (
                          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                            <div className="space-y-3">
                              <div>
                                <label className="text-white text-sm font-medium block mb-2">
                                  Notes administrateur :
                                </label>
                                <Textarea
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Ajoutez vos notes sur cette suggestion..."
                                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateSuggestionStatus(suggestion.id, 'under_review', adminNotes)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  size="sm"
                                >
                                  <Clock className="mr-1 h-4 w-4" />
                                  En révision
                                </Button>
                                <Button
                                  onClick={() => updateSuggestionStatus(suggestion.id, 'accepted', adminNotes)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  size="sm"
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  Accepter
                                </Button>
                                <Button
                                  onClick={() => updateSuggestionStatus(suggestion.id, 'rejected', adminNotes)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  size="sm"
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Rejeter
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 ml-4">
                        {suggestion.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => updateSuggestionStatus(suggestion.id, 'accepted')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => updateSuggestionStatus(suggestion.id, 'rejected')}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              size="sm"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={() => {
                            if (expandedSuggestion === suggestion.id) {
                              setExpandedSuggestion(null);
                              setAdminNotes('');
                            } else {
                              setExpandedSuggestion(suggestion.id);
                              setAdminNotes(suggestion.admin_notes || '');
                            }
                          }}
                          variant="outline"
                          className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                          size="sm"
                        >
                          {expandedSuggestion === suggestion.id ? 'Fermer' : 'Gérer'}
                        </Button>
                        <Button
                          onClick={() => deleteSuggestion(suggestion.id)}
                          variant="outline"
                          className="bg-red-600 border-red-500 text-white hover:bg-red-500"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MovieSuggestionsManagement;