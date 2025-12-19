import React, { useRef, useState, useEffect } from 'react';
import { AnalysisStatus } from '../types';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  status: AnalysisStatus;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, status }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Attach stream to video when camera opens
  useEffect(() => {
    if (isCameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Play error:", e));
    }
  }, [isCameraOpen, stream]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelected(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (status !== AnalysisStatus.ANALYZING) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (status === AnalysisStatus.ANALYZING) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelected(file);
      }
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      // Prefer rear camera on mobile devices
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Could not access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            onImageSelected(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const isDisabled = status === AnalysisStatus.ANALYZING;

  // Camera View
  if (isCameraOpen) {
    return (
      <div className="w-full bg-black rounded-xl overflow-hidden relative aspect-[3/4] sm:aspect-video flex items-center justify-center shadow-lg">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover" 
          muted 
          playsInline 
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 items-center z-10">
          <button 
            onClick={stopCamera}
            className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-full p-3 transition-all transform hover:scale-105"
            title="Cancel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button 
            onClick={capturePhoto}
            className="group relative"
            title="Capture Photo"
          >
             <div className="w-16 h-16 rounded-full border-4 border-white/50 group-active:scale-95 transition-transform"></div>
             <div className="w-12 h-12 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-active:scale-90 transition-transform"></div>
          </button>

           {/* Spacer to balance layout */}
           <div className="w-12"></div>
        </div>
      </div>
    );
  }

  // Standard Upload View
  return (
    <div className="w-full space-y-4">
      <div 
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out relative ${
          isDisabled ? 'opacity-50 cursor-not-allowed border-slate-300' : 
          isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-inner' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isDisabled}
        />
        
        <div className="flex flex-col items-center justify-center gap-3">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors duration-200 ${isDragging ? 'bg-blue-200 text-blue-700' : 'bg-blue-100 text-blue-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">
              {isDragging ? "Drop image here" : "Drag & Drop or Click to Upload"}
            </p>
            <p className="text-xs text-slate-500">
              Compatible with JPG, PNG, WEBP
            </p>
          </div>
          
           {!isDisabled && (
            <button
               onClick={() => fileInputRef.current?.click()}
               className="mt-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Browse Files
            </button>
           )}
        </div>
      </div>

      {!isCameraOpen && !isDisabled && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-50 px-2 text-xs text-slate-400 font-medium">OR USE CAMERA</span>
          </div>
        </div>
      )}

      {!isDisabled && (
        <button
          onClick={startCamera}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:scale-110 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
          Open Camera
        </button>
      )}
      
      {cameraError && (
        <p className="text-xs text-red-600 text-center bg-red-50 p-2 rounded-lg border border-red-100">{cameraError}</p>
      )}
    </div>
  );
};