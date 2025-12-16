import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ResultCard } from './components/ResultCard';
import { AnalysisStatus, D56Item } from './types';
import { identifyItem, fileToGenerativePart, sendFeedback, addToInventory } from './services/geminiService';

type SortOption = 'confidence-desc' | 'confidence-asc' | 'name-asc' | 'name-desc';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [results, setResults] = useState<D56Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('confidence-desc');

  const handleImageSelect = async (file: File) => {
    // 1. Show preview
    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    
    // 2. Reset state
    setStatus(AnalysisStatus.ANALYZING);
    setError(null);
    setResults([]);
    setImageData(null);

    try {
      console.log("[App] Processing image selection...");
      // 3. Process image for API
      const base64Data = await fileToGenerativePart(file);
      setImageData({ base64: base64Data, mimeType: file.type });
      
      // 4. Call Gemini
      console.log("[App] Invoking identifyItem service...");
      const data = await identifyItem(base64Data, file.type);
      
      setResults(data);
      setStatus(AnalysisStatus.SUCCESS);
      console.log(`[App] Identification successful. Found ${data.length} items.`);
    } catch (err: any) {
      console.error("[App] Analysis Failed. Full Error Object:", err);
      setStatus(AnalysisStatus.ERROR);
      
      // Extract meaningful error message
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Analysis Error: ${errorMessage}`);
    }
  };

  const reset = () => {
    setImageSrc(null);
    setStatus(AnalysisStatus.IDLE);
    setResults([]);
    setError(null);
    setImageData(null);
    console.log("[App] Reset state.");
  };

  const handleUpdateItem = (index: number, newData: D56Item) => {
    setResults(prevResults => {
      const newResults = [...prevResults];
      newResults[index] = newData;
      return newResults;
    });
  };

  const handleAcceptAll = async () => {
    if (results.length === 0 || !imageData) return;
    
    setIsAcceptingAll(true);
    console.log("[App] Batch accepting all items...");
    
    try {
      // Trigger feedback AND add to inventory for all items that haven't been rejected
      const promises = results
        .filter(item => item.feedbackStatus !== 'rejected')
        .map(async item => {
           await addToInventory(item);
           await sendFeedback(item, imageData);
        });
      
      await Promise.all(promises);

      // Update all items to accepted
      setResults(prev => prev.map(item => 
        item.feedbackStatus === 'rejected' ? item : { ...item, feedbackStatus: 'accepted' }
      ));
      
    } catch (e) {
      console.error("[App] Error in batch accept:", e);
    } finally {
      setIsAcceptingAll(false);
    }
  };

  // Logic to sort results while maintaining correct index references for updates
  const getSortedResultsWithIndices = () => {
    const indexedResults = results.map((item, index) => ({ item, index }));
    
    indexedResults.sort((a, b) => {
      switch (sortOption) {
        case 'confidence-desc':
          return b.item.confidenceScore - a.item.confidenceScore;
        case 'confidence-asc':
          return a.item.confidenceScore - b.item.confidenceScore;
        case 'name-asc':
          return a.item.name.localeCompare(b.item.name);
        case 'name-desc':
          return b.item.name.localeCompare(a.item.name);
        default:
          return 0;
      }
    });
    
    return indexedResults;
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
                      <p className="text-blue-800 font-medium animate-pulse">Scanning for Dept 56 items...</p>
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
                <li>Capture the item(s) clearly on a plain background.</li>
                <li>You can photograph multiple items at once.</li>
                <li>If available, include the original boxes.</li>
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
                <div className="w-full">
                  <h3 className="text-lg font-semibold text-red-900">Analysis Error</h3>
                  <p className="text-red-700 mt-1 break-words font-mono text-sm">{error}</p>
                </div>
              </div>
            )}

            {status === AnalysisStatus.SUCCESS && results.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
                <div className="bg-amber-100 p-2 rounded-full">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-700">
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                   </svg>
                </div>
                <div>
                   <h3 className="text-sm font-medium text-amber-900">No items found</h3>
                   <p className="text-xs text-amber-700 mt-1">We couldn't detect any specific Department 56 items in this image. Try moving closer or improving lighting.</p>
                </div>
              </div>
            )}

            {results.length > 0 && (
               <div className="space-y-6">
                 {/* Header & Controls */}
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
                   <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wide">
                     Found {results.length} Item{results.length !== 1 ? 's' : ''}
                   </h3>
                   
                   <div className="flex items-center gap-3">
                     {/* Sorting Dropdown */}
                     <select 
                       value={sortOption}
                       onChange={(e) => setSortOption(e.target.value as SortOption)}
                       className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                     >
                       <option value="confidence-desc">Sort: Confidence (High-Low)</option>
                       <option value="confidence-asc">Sort: Confidence (Low-High)</option>
                       <option value="name-asc">Sort: Name (A-Z)</option>
                       <option value="name-desc">Sort: Name (Z-A)</option>
                     </select>

                     {/* Accept All Button */}
                     {results.some(item => item.feedbackStatus !== 'accepted') && (
                        <button 
                          onClick={handleAcceptAll}
                          disabled={isAcceptingAll}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                        >
                           {isAcceptingAll ? (
                             <>
                               <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                               Adding...
                             </>
                           ) : (
                             <>
                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                 <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                               </svg>
                               Accept All
                             </>
                           )}
                        </button>
                     )}
                   </div>
                 </div>

                 {/* Results List - Mapped from Sorted List */}
                 {getSortedResultsWithIndices().map(({ item, index }) => (
                   <ResultCard 
                     key={`${index}-${item.name}`} // Using stable ID concept, though index logic here assumes list doesn't shift
                     data={item} 
                     imageData={imageData}
                     onUpdateData={(newData) => handleUpdateItem(index, newData)}
                   />
                 ))}
               </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;