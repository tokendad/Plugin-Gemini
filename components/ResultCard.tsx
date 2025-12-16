import React, { useState } from 'react';
import { D56Item, AlternativeItem } from '../types';
import { fetchMarketDetails, MarketDetails, findAlternatives, sendFeedback } from '../services/geminiService';

interface ResultCardProps {
  data: D56Item;
  imageData: { base64: string; mimeType: string } | null;
  onUpdateData: (newData: D56Item) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, imageData, onUpdateData }) => {
  const [marketData, setMarketData] = useState<MarketDetails | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  
  const [feedbackState, setFeedbackState] = useState<'idle' | 'accepted' | 'rejected'>('idle');
  const [alternatives, setAlternatives] = useState<AlternativeItem[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  // Helper to infer rarity based on dates
  const inferRarity = (intro: number | null, retired: number | null): string => {
    if (!retired) return "Common (Active)";
    // If we don't know when it was introduced, but it is retired, we assume standard unless very old
    if (!intro && retired) return retired < 2000 ? "Vintage" : "Standard";
    if (!intro) return "Unknown";
    
    const yearsActive = retired - intro;
    
    if (yearsActive <= 2) return "High (Short Run)";
    if (retired < 1990) return "Very Vintage";
    if (retired < 2005) return "Vintage";
    if (yearsActive > 15) return "Common (Long Run)";
    return "Standard (Retired)";
  };

  const rarityLabel = inferRarity(data.yearIntroduced, data.yearRetired);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert("JSON data copied to clipboard!");
  };

  const handleFetchMarket = async () => {
    setLoadingMarket(true);
    setMarketError(null);
    console.log("[ResultCard] Initiating market data fetch...");
    try {
      const details = await fetchMarketDetails(data.name, data.series);
      setMarketData(details);
    } catch (err: any) {
      console.error("[ResultCard] Market Data Fetch Failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setMarketError(`Error: ${errorMessage}`);
    } finally {
      setLoadingMarket(false);
    }
  };

  const handleAccept = async () => {
    setFeedbackState('accepted');
    console.log(`[ResultCard] User accepted: ${data.name}. Submitting to training endpoint...`);
    // Send valid data to backend for training
    await sendFeedback(data, imageData);
  };

  const handleReject = async () => {
    setFeedbackState('rejected');
    console.log(`[ResultCard] User rejected: ${data.name}. Fetching alternatives...`);
    
    if (imageData) {
      setLoadingAlternatives(true);
      try {
        const alts = await findAlternatives(imageData.base64, imageData.mimeType);
        setAlternatives(alts);
      } catch (e) {
        console.error("Failed to find alternatives", e);
      } finally {
        setLoadingAlternatives(false);
      }
    }
  };

  const handleSelectAlternative = async (alt: AlternativeItem) => {
    // Merge the alternative info into the main data structure
    const newData = { ...data, name: alt.name, series: alt.series, description: `${alt.reason} (User Corrected)` };
    
    // Update local state
    onUpdateData(newData);
    setFeedbackState('accepted'); // Auto-accept after correction
    setAlternatives([]); // Clear alternatives
    
    console.log(`[ResultCard] User corrected item to: ${newData.name}. Submitting correction...`);
    // Send corrected data to backend for training
    await sendFeedback(newData, imageData);
  };

  if (!data.isDepartment56) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Not Recognized as Department 56</h3>
        <p className="text-red-600 text-sm">
          The AI analyzed the image but did not identify confident Department 56 characteristics. 
          Please try a clearer image or ensure the item is visible.
        </p>
        <p className="mt-2 text-xs text-red-500">Confidence: {data.confidenceScore}%</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Identification Result</h2>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Match: {data.confidenceScore}%
          </span>
          {feedbackState === 'accepted' && (
             <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Primary Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Item Name</label>
            <div className="text-lg font-semibold text-slate-900">{data.name}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Series</label>
            <div className="text-base text-blue-600 font-medium">{data.series}</div>
          </div>
        </div>

        {/* Secondary Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Introduced</label>
            <div className="text-sm font-medium text-slate-900">{data.yearIntroduced || 'N/A'}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Retired</label>
            <div className="text-sm font-medium text-slate-900">{data.yearRetired || 'Active'}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Rarity</label>
            <div className="text-sm font-medium text-purple-600 truncate" title={rarityLabel}>{rarityLabel}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Est. Value</label>
            <div className="text-sm font-medium text-emerald-600">{data.estimatedValueRange}</div>
          </div>
        </div>

        {/* Description & Condition */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
           <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Condition Assessment</label>
            <div className="text-sm text-slate-700 bg-amber-50 p-2 rounded-md border border-amber-100">
              {data.estimatedCondition}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Description</label>
            <p className="text-sm text-slate-600 leading-relaxed">
              {data.description}
            </p>
          </div>
        </div>

        {/* Feedback Section - Only show if not yet interacted */}
        {feedbackState === 'idle' && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600 font-medium">Is this identification correct?</div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={handleReject}
                className="flex-1 sm:flex-none px-4 py-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
              <button 
                onClick={handleAccept}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Confirm
              </button>
            </div>
          </div>
        )}

        {/* Alternatives Section (triggered on Reject) */}
        {feedbackState === 'rejected' && (
          <div className="pt-4 border-t border-slate-100 animate-in fade-in duration-300">
             <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 block">Alternative Matches (Search Results)</label>
             
             {loadingAlternatives && (
                <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
                  <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching Department 56 catalog...</span>
                </div>
             )}

             <div className="grid gap-3">
               {alternatives.map((alt, idx) => (
                 <div key={idx} className="bg-white border border-slate-200 p-4 rounded-lg hover:border-blue-300 transition-colors shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900">{alt.name}</div>
                      <div className="text-xs text-blue-600 font-medium">{alt.series}</div>
                      <div className="text-xs text-slate-500">{alt.reason}</div>
                    </div>
                    <button 
                      onClick={() => handleSelectAlternative(alt)}
                      className="shrink-0 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-100 transition-colors"
                    >
                      Select Match
                    </button>
                 </div>
               ))}
               {!loadingAlternatives && alternatives.length === 0 && (
                 <div className="text-sm text-slate-500 italic text-center py-2">No alternative matches found via search.</div>
               )}
             </div>
          </div>
        )}

        {/* Market Data Section (Dynamic) */}
        {(marketData || loadingMarket || marketError) && (
           <div className="pt-4 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 0 0 1.075.676L10 15.082l5.925 2.844A.75.75 0 0 0 17 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0 0 10 2Z" clipRule="evenodd" />
                </svg>
                Market Intelligence
              </label>
              
              {loadingMarket && (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Searching current listings and historical archives...
                </div>
              )}

              {marketError && (
                 <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                    {marketError}
                 </div>
              )}

              {marketData && (
                <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                  <p className="text-sm text-slate-700 mb-3">{marketData.summary}</p>
                  
                  {marketData.sources.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">Sources:</p>
                      <ul className="space-y-1">
                        {marketData.sources.slice(0, 3).map((source, idx) => (
                          <li key={idx}>
                            <a 
                              href={source.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate"
                            >
                              <span className="truncate max-w-[300px]">{source.title}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 18h-8.5A2.25 2.25 0 0 1 2 15.75v-8.5A2.25 2.25 0 0 1 4.25 5h4a.75.75 0 0 1 0 1.5h-4Z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.81l-9.29 8.357a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                              </svg>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
           </div>
        )}

        {/* Action Buttons */}
        <div className="pt-6 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleCopyJSON}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
            Copy JSON
          </button>
          
          <button 
            onClick={handleFetchMarket}
            disabled={loadingMarket}
            className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            Find Market Data
          </button>
        </div>
        
        <div className="text-center">
            <p className="text-xs text-slate-400">
                Data provided by Gemini 2.5. Verify all details before importing to NesVentory.
            </p>
        </div>
      </div>
    </div>
  );
};