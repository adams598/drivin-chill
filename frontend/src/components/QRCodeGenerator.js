import React from 'react';
import { Card, CardContent } from './ui/card';

const QRCodeGenerator = ({ qrCode, bookingData }) => {
  if (!qrCode) return null;

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `drivin-and-chill-${bookingData.id}.png`;
    link.click();
  };

  return (
    <Card className="bg-gray-800 border-gray-700 mt-6">
      <CardContent className="p-6 text-center">
        <h3 className="text-white text-xl font-bold mb-4">Votre QR Code d'entrée</h3>
        <div className="flex justify-center mb-4">
          <img 
            src={qrCode} 
            alt="QR Code de réservation" 
            className="border-4 border-white rounded-lg"
          />
        </div>
        <p className="text-gray-300 text-sm mb-4">
          Présentez ce QR code à l'entrée du cinéma drive-in
        </p>
        <button
          onClick={downloadQR}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-semibold transition-colors"
        >
          Télécharger le QR Code
        </button>
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;