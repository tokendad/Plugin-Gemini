import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ResultCard } from './components/ResultCard';
import { AnalysisStatus, D56Item } from './types';
import { identifyItem, fileToGenerativePart } from './services/geminiService';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<D56Item | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = async (file: File) => {
    // 1. Show preview
    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    
    // 2. Reset state
    setStatus(AnalysisStatus.ANALYZING);
    setError(null);
    setResult(null);

    try {
      // 3. Process image for API
      const base64Data = await fileToGenerativePart(file);
      
      // 4. Call Gemini
      const data = await identifyItem(base64Data, file.type);
      
      setResult(data);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err) {
      console.error(err);
      setStatus(AnalysisStatus.ERROR);
      setError("Failed to analyze image. Please check your API key and try again.");
    }
  };

  const reset = () => {
    setImageSrc(null);
    setStatus(AnalysisStatus.IDLE);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input & Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Item Image</h2>
              
              {!imageSrc ? (
                <ImageUploader onImageSelected={handleImageSelect} status={status} />
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square flex items-center justify-center">
                  <img src={imageSrc} alt="Preview" className="max-w-full max-h-full object-contain" />
                  
                  {status === AnalysisStatus.ANALYZING && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
                      <p className="text-blue-800 font-medium animate-pulse">Analyzing Dept 56 markers...</p>
                    </div>
                  )}

                  {status !== AnalysisStatus.ANALYZING && (
                    <button 
                      onClick={reset}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-600 p-2 rounded-full shadow-sm border border-slate-200 transition-colors"
                      title="Clear Image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Instruction / Help Box */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for best results:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside opacity-80">
                <li>Capture the item clearly on a plain background.</li>
                <li>If available, include the original box in the photo.</li>
                <li>Ensure the bottom stamp is visible if identifying a loose piece.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            {status === AnalysisStatus.IDLE && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p className="text-lg font-medium">Ready to Identify</p>
                <p className="text-sm">Upload an image to extract inventory details.</p>
              </div>
            )}

            {status === AnalysisStatus.ERROR && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Analysis Error</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {result && <ResultCard data={result} />}
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;