import React, { useRef } from 'react';
import { AnalysisStatus } from '../types';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  status: AnalysisStatus;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, status }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelected(e.target.files[0]);
    }
  };

  const isDisabled = status === AnalysisStatus.ANALYZING;

  return (
    <div className="w-full">
      <div 
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 ease-in-out ${
          isDisabled ? 'opacity-50 cursor-not-allowed border-slate-300' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
        }`}
        onClick={() => !isDisabled && fileInputRef.current?.click()}
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
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">
              Upload a photo
            </p>
            <p className="text-xs text-slate-500">
              Take a picture of the item or its box
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};