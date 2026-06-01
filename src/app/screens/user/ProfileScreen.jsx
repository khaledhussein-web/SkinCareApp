
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Separator } from '@/app/components/ui/separator';
import { useAuth } from '@/app/context/AuthContext';
import { User, Mail, Calendar, Shield, Camera, Save } from 'lucide-react';
import { toast } from 'sonner';
import { fetchUserProfilePhoto, uploadUserProfilePhoto } from '@/app/services/skincareApi';

export const ProfileScreen: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfilePhoto = async () => {
      try {
        const response = await fetchUserProfilePhoto();
        if (isMounted) {
          setProfilePhotoUrl(response?.photoUrl || null);
        }
      } catch (_error) {
        // Keep UI functional even if photo fetch fails.
      }
    };

    loadProfilePhoto();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = () => {
    toast.success('Profile updated successfully');
    setIsEditing(false);
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

  const handleCameraClick = () => {
    if (isUploadingPhoto) return;
    fileInputRef.current?.click();
  };

  const handlePhotoSelection = async (event) => {
    const file = event.target?.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (Number(file.size || 0) > maxSizeBytes) {
      toast.error('Image is too large. Maximum size is 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const response = await uploadUserProfilePhoto(dataUrl);
      setProfilePhotoUrl(response?.photoUrl || dataUrl);
      toast.success('Profile photo updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload profile photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl mb-2 text-slate-800">My Profile</h1>
          <p className="text-slate-600">Manage your account settings and preferences</p>
        </motion.div>

        <div className="space-y-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-none shadow-lg bg-white/90 backdrop-blur">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-500">
                      {profilePhotoUrl ? (
                        <AvatarImage src={profilePhotoUrl} alt={`${user?.name || 'User'} profile photo`} />
                      ) : null}
                      <AvatarFallback className="text-3xl text-white">
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={handleCameraClick}
                      disabled={isUploadingPhoto}
                      className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-4 h-4 text-purple-600" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoSelection}
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl mb-1 text-slate-800">{user?.name}</h2>
                    <p className="text-slate-600">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {user?.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative mt-2">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          disabled={!isEditing}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative mt-2">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          disabled={!isEditing}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span className="text-sm text-slate-600">
                      Member since {new Date(user?.createdAt || '').toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-end gap-3">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSave}>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

