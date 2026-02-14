import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiCamera, FiUpload, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (file: File) => Promise<void>;
  isSearching: boolean;
}

export default function ImageSearchModal({ isOpen, onClose, onSearch, isSearching }: ImageSearchModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup camera stream when modal closes or camera closes
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Stop camera when modal closes
  useEffect(() => {
    if (!isOpen && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraOpen(false);
    }
  }, [isOpen, stream]);

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });
      
      setStream(mediaStream);
      setIsCameraOpen(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      toast.success('Camera opened! Click "Capture Photo" to take a picture');
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setImageFile(file);
        setPreview(canvas.toDataURL('image/jpeg'));
        closeCamera();
        toast.success('Photo captured!');
      }
    }, 'image/jpeg', 0.9);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSearch = async () => {
    if (!imageFile) {
      toast.error('Please upload or capture an image first');
      return;
    }

    await onSearch(imageFile);
  };

  const handleClose = () => {
    closeCamera();
    setPreview(null);
    setImageFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl shadow-lg relative max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold dark:text-white">Search by Image</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Camera/Upload Options */}
          {!preview && !isCameraOpen && (
            <div className="flex flex-col gap-3">
              <button
                onClick={openCamera}
                className="flex items-center justify-center gap-2 px-4 py-3 text-white transition-all rounded-lg bg-blue-600 hover:bg-blue-700"
              >
                <FiCamera className="w-5 h-5" />
                Open Camera
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 text-white transition-all rounded-lg bg-green-600 hover:bg-green-700"
              >
                <FiUpload className="w-5 h-5" />
                Upload Image
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Camera View */}
          {isCameraOpen && (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="flex gap-2">
                <button
                  onClick={capturePhoto}
                  className="flex-1 px-4 py-2 text-white transition-all rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  Capture Photo
                </button>
                <button
                  onClick={closeCamera}
                  className="px-4 py-2 text-gray-700 transition-all bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              <img
                src={preview}
                alt="Preview"
                className="w-full rounded-lg"
              />
              
              <div className="flex gap-2">
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white transition-all rounded-lg bg-coffee-600 hover:bg-coffee-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <FiSearch />
                      Search Similar Products
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setPreview(null);
                    setImageFile(null);
                  }}
                  className="px-4 py-2 text-gray-700 transition-all bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  Retake
                </button>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Take a photo or upload an image to find similar products in your inventory
          </p>
        </div>
      </div>
    </div>
  );
}
