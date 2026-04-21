import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { ProgressBar } from '@/app/components/ProgressBar';
import { useSkinCare } from '@/app/context/SkinCareContext';
import { Upload, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';

export const UploadScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setUploadedImage } = useSkinCare();
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        setUploadedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleAnalyze = () => {
    navigate('/analyzing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 sm:py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl mb-2 sm:mb-3 text-slate-800">Upload Your Photo</h1>
          <p className="text-sm sm:text-base text-slate-600">Let's analyze your skin condition</p>
        </div>

        <ProgressBar currentStep={2} totalSteps={4} />

        <Card className="border-none shadow-lg bg-white/90 backdrop-blur mb-4 sm:mb-6">
          <CardContent className="p-4 sm:p-8">
            <div className="mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg mb-3 sm:mb-4 text-slate-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-600" />
                Photo Guidelines
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {[
                  'Ensure your face is clean and free of makeup',
                  'Take the photo in natural lighting',
                  'Face the camera directly',
                  'Remove glasses and accessories',
                  'Hair should be pulled back from face',
                ].map((guideline, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base text-slate-600"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{guideline}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-6 sm:p-12 transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-50'
                  : preview
                  ? 'border-green-400 bg-green-50'
                  : 'border-slate-300 bg-slate-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {preview ? (
                <div className="space-y-4">
                  <motion.img
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={preview}
                    alt="Preview"
                    className="w-full max-w-md mx-auto rounded-lg shadow-md"
                  />
                  <div className="text-center">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="rounded-full text-sm sm:text-base px-4 sm:px-6"
                    >
                      Choose Different Photo
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Upload className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-slate-400" />
                  </motion.div>
                  <h3 className="text-lg sm:text-xl mb-2 text-slate-700">Drop your photo here</h3>
                  <p className="text-sm sm:text-base text-slate-500 mb-3 sm:mb-4">or</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full px-6 sm:px-8 text-sm sm:text-base"
                  >
                    Browse Files
                  </Button>
                  <p className="text-xs sm:text-sm text-slate-400 mt-3 sm:mt-4">Supports: JPG, PNG, HEIC</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg flex items-start gap-2 sm:gap-3"
            >
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-blue-900">
                <p className="font-medium mb-1">Privacy Notice</p>
                <p className="text-blue-700">
                  Your photo is processed securely and is not stored on our servers. This is for
                  demonstration purposes only.
                </p>
              </div>
            </motion.div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 rounded-full text-sm sm:text-base"
          >
            Back
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={!preview}
            className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Analyze My Skin
          </Button>
        </div>
      </motion.div>
    </div>
  );
};