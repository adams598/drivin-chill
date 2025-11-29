import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, Plus, Edit, Trash2, Save, X, Gift, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PROMO_TYPES = [
  { value: "reduction_percentage", label: "Réduction en %" },
  { value: "free_benefit", label: "Avantages gratuits" }
];

const PromoCodeManagement = () => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

  const [promoForm, setPromoForm] = useState({
    code: '',
    type: 'reduction_percentage',
    value: '',
    benefit_description: '',
    expiration_date: null,
    usage_limit: ''
  });

  const token = localStorage.getItem('admin_token');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const response = await axios.get(`${API}/admin/promo-codes`, { headers: authHeaders });
      setPromoCodes(response.data);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
    }
  };

  const handlePromoSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const promoData = {
        ...promoForm,
        expiration_date: promoForm.expiration_date ? format(promoForm.expiration_date, 'yyyy-MM-dd') : null,
        value: promoForm.value ? parseFloat(promoForm.value) : null,
        usage_limit: promoForm.usage_limit ? parseInt(promoForm.usage_limit) : null
      };

      if (editingPromo) {
        await axios.put(`${API}/admin/promo-codes/${editingPromo.id}`, promoData, { headers: authHeaders });
        toast.success('Code promo mis à jour avec succès !');
        setEditingPromo(null);
      } else {
        await axios.post(`${API}/admin/promo-codes`, promoData, { headers: authHeaders });
        toast.success('Code promo créé avec succès !');
      }
      
      setShowPromoForm(false);
      resetPromoForm();
      fetchPromoCodes();
    } catch (error) {
      console.error('Error saving promo code:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPromo = (promo) => {
    setEditingPromo(promo);
    setPromoForm({
      code: promo.code,
      type: promo.type,
      value: promo.value || '',
      benefit_description: promo.benefit_description || '',
      expiration_date: promo.expiration_date ? new Date(promo.expiration_date) : null,
      usage_limit: promo.usage_limit || ''
    });
    setShowPromoForm(true);
  };

  const handleDeletePromo = async (promoId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) return;

    try {
      await axios.delete(`${API}/admin/promo-codes/${promoId}`, { headers: authHeaders });
      toast.success('Code promo supprimé avec succès !');
      fetchPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetPromoForm = () => {
    setPromoForm({
      code: '',
      type: 'reduction_percentage',
      value: '',
      benefit_description: '',
      expiration_date: null,
      usage_limit: ''
    });
  };

  const handleCancelEdit = () => {
    setShowPromoForm(false);
    setEditingPromo(null);
    resetPromoForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestion des Codes Promo</h2>
          <p className="text-gray-400">Créez et gérez les codes de réduction et avantages</p>
        </div>
        <Button
          onClick={() => setShowPromoForm(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Code Promo
        </Button>
      </div>

      {/* Promo Code Form */}
      {showPromoForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingPromo ? 'Modifier le Code Promo' : 'Nouveau Code Promo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePromoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Code Promo *</Label>
                  <Input
                    type="text"
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="ex: REDUCTION20"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Type de Code *</Label>
                  <Select value={promoForm.type} onValueChange={(value) => setPromoForm({...promoForm, type: value})}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {PROMO_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-700">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {promoForm.type === 'reduction_percentage' && (
                <div>
                  <Label className="text-white">Pourcentage de Réduction *</Label>
                  <Input
                    type="number"
                    value={promoForm.value}
                    onChange={(e) => setPromoForm({...promoForm, value: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="ex: 20"
                    min="1"
                    max="100"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Entre 1% et 100%
                  </p>
                </div>
              )}

              {promoForm.type === 'free_benefit' && (
                <div>
                  <Label className="text-white">Description des Avantages *</Label>
                  <Textarea
                    value={promoForm.benefit_description}
                    onChange={(e) => setPromoForm({...promoForm, benefit_description: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="ex: Boisson + Popcorn gratuits"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Date d'Expiration (optionnelle)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full bg-gray-700 border-gray-600 text-white justify-start"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {promoForm.expiration_date ? format(promoForm.expiration_date, 'PPP', { locale: fr }) : 'Choisir une date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600">
                      <Calendar
                        mode="single"
                        selected={promoForm.expiration_date}
                        onSelect={(date) => setPromoForm({...promoForm, expiration_date: date})}
                        className="rounded-md"
                        fromDate={new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-white">Limite d'Utilisation (optionnelle)</Label>
                  <Input
                    type="number"
                    value={promoForm.usage_limit}
                    onChange={(e) => setPromoForm({...promoForm, usage_limit: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="ex: 100"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Sauvegarde...' : (editingPromo ? 'Mettre à jour' : 'Créer')}
                </Button>
                <Button
                  type="button"
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Promo Codes List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Gift className="mr-2 h-5 w-5" />
            Codes Promo Actifs
          </CardTitle>
          <CardDescription>
            {promoCodes.length} code{promoCodes.length !== 1 ? 's' : ''} promo{promoCodes.length !== 1 ? 's' : ''} configuré{promoCodes.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {promoCodes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white">Code</TableHead>
                  <TableHead className="text-white">Type</TableHead>
                  <TableHead className="text-white">Valeur/Avantages</TableHead>
                  <TableHead className="text-white">Utilisation</TableHead>
                  <TableHead className="text-white">Expiration</TableHead>
                  <TableHead className="text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="text-white font-mono font-bold">{promo.code}</TableCell>
                    <TableCell>
                      <Badge className={`${promo.type === 'reduction_percentage' ? 'bg-blue-600' : 'bg-purple-600'} text-white`}>
                        {promo.type === 'reduction_percentage' ? (
                          <>
                            <Percent className="mr-1 h-3 w-3" />
                            Réduction
                          </>
                        ) : (
                          <>
                            <Gift className="mr-1 h-3 w-3" />
                            Avantages
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {promo.type === 'reduction_percentage' 
                        ? `${promo.value}%` 
                        : promo.benefit_description}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {promo.current_usage}/{promo.usage_limit || '∞'}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {promo.expiration_date 
                        ? format(new Date(promo.expiration_date), 'PPP', { locale: fr })
                        : 'Aucune'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditPromo(promo)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDeletePromo(promo.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Gift className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-white text-xl font-bold mb-2">Aucun code promo</h3>
              <p>Créez votre premier code promo pour offrir des réductions à vos clients.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PromoCodeManagement;