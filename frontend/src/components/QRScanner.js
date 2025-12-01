import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { QrCode, CheckCircle, XCircle, AlertCircle, User, Calendar, Clock, Film, Camera, CameraOff } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL?.replace(/\/+$/, '') || '';
const API = `${BACKEND_URL}/api`;

const QRScanner = () => {
  const [bookingId, setBookingId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);
  const scannerId = 'qr-reader';

  const token = localStorage.getItem('admin_token');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const extractBookingIdFromQR = (qrText) => {
    // Extract booking ID from QR code text
    // Format: "DRIVIN_AND_CHILL\nRéservation: booking-id\n..."
    const lines = qrText.split('\n');
    for (const line of lines) {
      if (line.startsWith('Réservation: ')) {
        return line.replace('Réservation: ', '').trim();
      }
    }
    return qrText; // Fallback: assume the whole text is the ID
  };

  const validateQRCode = async () => {
    if (!bookingId.trim()) {
      toast.error('Veuillez entrer un ID de réservation');
      return;
    }

    setIsLoading(true);
    setValidationResult(null);
    
    try {
      const cleanBookingId = extractBookingIdFromQR(bookingId.trim());
      const response = await axios.get(`${API}/validate-qr/${cleanBookingId}`);
      setValidationResult(response.data);
      
      if (response.data.status === 'valid') {
        toast.success('QR Code valide !');
      } else {
        toast.error(response.data.message || 'QR Code invalide');
      }
    } catch (error) {
      toast.error('Erreur lors de la validation');
      setValidationResult({ status: 'error', message: 'Erreur de validation' });
    } finally {
      setIsLoading(false);
    }
  };

  const scanEntry = async () => {
    if (!validationResult || validationResult.status !== 'valid') {
      toast.error('Validez d\'abord le QR code');
      return;
    }

    setIsLoading(true);
    
    try {
      const cleanBookingId = extractBookingIdFromQR(bookingId.trim());
      const response = await axios.post(`${API}/scan-qr/${cleanBookingId}`, {}, { headers: authHeaders });
      setScanResult(response.data);
      
      if (response.data.status === 'success') {
        toast.success('Entrée autorisée !');
      } else if (response.data.status === 'already_checked_in') {
        toast.warning('Déjà scanné');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Erreur lors du scan');
      setScanResult({ status: 'error', message: 'Erreur de scan' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetScanner = () => {
    setBookingId('');
    setScanResult(null);
    setValidationResult(null);
    stopCamera();
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, // Utilise la caméra arrière
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // QR code détecté
          handleQRCodeScanned(decodedText);
        },
        (errorMessage) => {
          // Erreur de scan (normal, continue à scanner)
        }
      );
      setIsScanning(true);
      toast.success('Caméra activée - Scannez un QR code');
    } catch (err) {
      console.error('Erreur caméra:', err);
      setCameraError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      toast.error('Erreur d\'accès à la caméra');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
      setIsScanning(false);
      setCameraError(null);
    } catch (err) {
      console.error('Erreur arrêt caméra:', err);
    }
  };

  const handleQRCodeScanned = async (qrText) => {
    // Arrêter la caméra après scan
    await stopCamera();
    
    // Extraire l'ID de réservation
    const extractedId = extractBookingIdFromQR(qrText);
    setBookingId(extractedId);
    
    // Valider automatiquement
    toast.info('QR Code détecté, validation en cours...');
    await validateQRCodeFromId(extractedId);
  };

  const validateQRCodeFromId = async (id) => {
    if (!id.trim()) {
      toast.error('ID de réservation invalide');
      return;
    }

    setIsLoading(true);
    setValidationResult(null);
    
    try {
      const response = await axios.get(`${API}/validate-qr/${id}`);
      setValidationResult(response.data);
      
      if (response.data.status === 'valid') {
        toast.success('QR Code valide !');
      } else {
        toast.error(response.data.message || 'QR Code invalide');
      }
    } catch (error) {
      toast.error('Erreur lors de la validation');
      setValidationResult({ status: 'error', message: 'Erreur de validation' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Nettoyer la caméra au démontage
    return () => {
      stopCamera();
    };
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
      case 'valid':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'already_checked_in':
      case 'not_paid':
      case 'cancelled':
        return <XCircle className="h-12 w-12 text-red-500" />;
      case 'error':
      case 'invalid':
        return <AlertCircle className="h-12 w-12 text-orange-500" />;
      default:
        return <QrCode className="h-12 w-12 text-gray-400" />;
    }
  };

  const getStatusColor = (paymentStatus, isCheckedIn, isCancelled) => {
    if (isCancelled) return 'bg-red-100 text-red-800';
    if (isCheckedIn) return 'bg-green-100 text-green-800';
    if (paymentStatus === 'paid') return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <QrCode className="mr-2 h-6 w-6 text-blue-400" />
            Scanner QR Code d'Entrée
          </CardTitle>
          <CardDescription className="text-gray-300">
            Scannez ou saisissez le QR code des clients pour valider leur entrée au cinéma drive-in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Camera Scanner Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-white text-lg font-semibold">Scanner avec la caméra</Label>
              <div className="flex gap-2">
                {!isScanning ? (
                  <Button 
                    onClick={startCamera}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Activer la caméra
                  </Button>
                ) : (
                  <Button 
                    onClick={stopCamera}
                    variant="outline"
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                  >
                    <CameraOff className="mr-2 h-4 w-4" />
                    Arrêter la caméra
                  </Button>
                )}
              </div>
            </div>
            
            {isScanning && (
              <div className="relative">
                <div id={scannerId} className="w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-blue-500"></div>
                <p className="text-center text-gray-300 mt-2 text-sm">Pointez la caméra vers le QR code</p>
              </div>
            )}

            {cameraError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p className="text-sm">{cameraError}</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">OU</span>
            </div>
          </div>
          
          {/* QR Input Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Saisie manuelle - QR Code ou ID de réservation</Label>
              <div className="flex gap-2">
                <Input
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="Tapez l'ID de réservation..."
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && validateQRCode()}
                />
                <Button 
                  onClick={validateQRCode}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? 'Validation...' : 'Valider'}
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={resetScanner}
                variant="outline"
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                Nouveau Scan
              </Button>
            </div>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <Card className={`border-2 ${
              validationResult.status === 'valid' ? 'border-green-500 bg-green-50' :
              validationResult.status === 'invalid' ? 'border-red-500 bg-red-50' :
              'border-orange-500 bg-orange-50'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(validationResult.status)}
                    <div>
                      <h3 className="text-lg font-bold">
                        {validationResult.status === 'valid' ? 'QR Code Valide' : 
                         validationResult.status === 'invalid' ? 'QR Code Invalide' : 'Erreur'}
                      </h3>
                      <p className="text-sm text-gray-600">{validationResult.message}</p>
                    </div>
                  </div>
                </div>

                {validationResult.status === 'valid' && validationResult.booking && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Client</Label>
                        <p className="font-semibold flex items-center">
                          <User className="mr-1 h-4 w-4" />
                          {validationResult.booking.name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Date</Label>
                        <p className="font-semibold flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          {format(new Date(validationResult.booking.date), 'PP', { locale: fr })}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Créneau</Label>
                        <p className="font-semibold flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          {validationResult.booking.time_slot}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Statut</Label>
                        <Badge className={getStatusColor(
                          validationResult.booking.payment_status,
                          validationResult.booking.is_checked_in,
                          validationResult.booking.is_cancelled
                        )}>
                          {validationResult.booking.is_cancelled ? 'Annulé' :
                           validationResult.booking.is_checked_in ? 'Déjà entré' :
                           validationResult.booking.payment_status === 'paid' ? 'Payé' : 'En attente'}
                        </Badge>
                      </div>
                    </div>

                    {validationResult.movie && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-medium flex items-center text-blue-800">
                          <Film className="mr-2 h-4 w-4" />
                          {validationResult.movie.title} ({validationResult.movie.duration} min)
                        </p>
                      </div>
                    )}

                    {/* Scan Entry Button */}
                    {validationResult.booking.payment_status === 'paid' && 
                     !validationResult.booking.is_cancelled && 
                     !validationResult.booking.is_checked_in && (
                      <Button 
                        onClick={scanEntry}
                        disabled={isLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
                      >
                        ✅ AUTORISER L'ENTRÉE
                      </Button>
                    )}

                    {validationResult.booking.is_checked_in && (
                      <div className="bg-orange-100 p-4 rounded-lg text-center">
                        <p className="text-orange-800 font-medium">⚠️ Ce client est déjà entré</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Scan Result */}
          {scanResult && (
            <Card className={`border-2 ${
              scanResult.status === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  {getStatusIcon(scanResult.status)}
                  <div>
                    <h3 className="text-lg font-bold">
                      {scanResult.status === 'success' ? 'Entrée Autorisée !' : 'Accès Refusé'}
                    </h3>
                    <p className="text-sm">{scanResult.message}</p>
                  </div>
                </div>
                
                {scanResult.status === 'success' && (
                  <div className="bg-green-100 p-4 rounded-lg text-center">
                    <p className="text-green-800 text-lg font-semibold">
                      🎬 Bonne séance au drive-in !
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-gray-700 border-gray-600">
        <CardHeader>
          <CardTitle className="text-white text-lg">Instructions d'utilisation</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 space-y-2">
          <p>• <strong>Méthode 1 (Recommandée) :</strong> Cliquez sur "Activer la caméra" et pointez vers le QR code du client</p>
          <p>• <strong>Méthode 2 :</strong> Saisissez manuellement l'ID de réservation</p>
          <p>• <strong>Étape 3 :</strong> Vérifiez les informations affichées (nom, date, créneau)</p>
          <p>• <strong>Étape 4 :</strong> Cliquez "Autoriser l'entrée" si tout est correct</p>
          <p>• <strong>Statuts :</strong> Vert = Autorisé, Rouge = Refusé, Orange = Déjà entré</p>
          <p className="text-yellow-400 mt-2">⚠️ <strong>Note :</strong> La caméra nécessite l'autorisation de votre navigateur</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;