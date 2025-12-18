import React, { useState } from 'react';
import { D56Item, AlternativeItem } from '../types';
import { fetchMarketDetails, MarketDetails, findAlternatives, findAlternativesWithContext, sendFeedback, addToInventory } from '../services/geminiService';

interface ResultCardProps {
  data: D56Item;
  imageData: { base64: string; mimeType: string } | null;
  onUpdateData: (newData: D56Item) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, imageData, onUpdateData }) => {
  const [marketData, setMarketData] = useState<MarketDetails | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  
  // Local state for alternatives only (feedback status is now in data)
  const [alternatives, setAlternatives] = useState<AlternativeItem[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  
  // State for user-provided additional context
  const [userContext, setUserContext] = useState<string>('');
  const [showContextInput, setShowContextInput] = useState(false);

  // Use props for source of truth, default to idle
  const feedbackState = data.feedbackStatus || 'idle';

  // Helper to infer rarity based on dates and item attributes
  const inferRarity = (item: D56Item): string => {
    const { yearIntroduced: intro, yearRetired: retired, isLimitedEdition, isSigned } = item;

    // 1. Explicit Rarity Markers (Highest Priority)
    if (isSigned) return "Artist Signed (High Value)";
    if (isLimitedEdition) return "Limited Edition";

    // 2. Production Run Analysis
    if (!retired) return "Common (Active)";
    
    // Handle unknown intro date
    if (!intro) {
       return retired < 2000 ? "Vintage (Date Unknown)" : "Standard (Retired)";
    }
    
    const yearsActive = retired - intro;

    // 3. Short Run & Vintage Logic
    if (yearsActive <= 1) return "Very High (1 Year Run)";
    if (yearsActive <= 2) return "High (Short Run)";
    
    if (retired < 1990) return "Very Vintage";
    if (retired < 2005) return "Vintage";
    if (yearsActive > 15) return "Common (Long Run)";
    
    return "Standard (Retired)";
  };

  const rarityLabel = inferRarity(data);

  // Validation Logic
  const currentYear = new Date().getFullYear();
  const MIN_YEAR = 1976; // Dept 56 founded
  const MAX_YEAR = currentYear + 1;
  let yearWarning: string | null = null;

  if (data.yearIntroduced && (data.yearIntroduced < MIN_YEAR || data.yearIntroduced > MAX_YEAR)) {
    yearWarning = `Introduced Year (${data.yearIntroduced}) is outside valid range (${MIN_YEAR}-${MAX_YEAR}).`;
  } else if (data.yearRetired && (data.yearRetired < MIN_YEAR || data.yearRetired > MAX_YEAR)) {
    yearWarning = `Retired Year (${data.yearRetired}) is outside valid range (${MIN_YEAR}-${MAX_YEAR}).`;
  } else if (data.yearIntroduced && data.yearRetired && data.yearIntroduced > data.yearRetired) {
    yearWarning = `Invalid Timeline: Introduced (${data.yearIntroduced}) cannot be after Retired (${data.yearRetired}).`;
  }

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
    console.log(`[ResultCard] User accepted: ${data.name}. Adding to inventory and submitting feedback...`);
    // 1. Add to Inventory
    await addToInventory(data);
    // 2. Send Feedback
    await sendFeedback(data, imageData);
    
    onUpdateData({ ...data, feedbackStatus: 'accepted' });
  };

  const handleReject = async () => {
    console.log(`[ResultCard] User rejected: ${data.name}. Fetching alternatives...`);
    onUpdateData({ ...data, feedbackStatus: 'rejected' });
    
    if (imageData) {
      setLoadingAlternatives(true);
      try {
        const alts = await findAlternatives(imageData.base64, imageData.mimeType, data.name);
        setAlternatives(alts);
        // Show context input if no alternatives found
        if (alts.length === 0) {
          setShowContextInput(true);
        }
      } catch (e) {
        console.error("Failed to find alternatives", e);
        // Show context input on error as well
        setShowContextInput(true);
      } finally {
        setLoadingAlternatives(false);
      }
    }
  };

  const handleSearchWithContext = async () => {
    if (!imageData || !userContext.trim()) return;
    
    setLoadingAlternatives(true);
    setShowContextInput(false);
    try {
      const alts = await findAlternativesWithContext(
        imageData.base64, 
        imageData.mimeType, 
        data.name,
        userContext.trim()
      );
      setAlternatives(alts);
      // If still no results, show the input again
      if (alts.length === 0) {
        setShowContextInput(true);
      }
    } catch (e) {
      console.error("Failed to find alternatives with context", e);
      setShowContextInput(true);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleSelectAlternative = async (alt: AlternativeItem) => {
    // Merge the alternative info into the main data structure
    const newData: D56Item = { 
        ...data, 
        name: alt.name, 
        series: alt.series, 
        description: `${alt.reason} (User Corrected)`,
        feedbackStatus: 'accepted' 
    };
    
    // Update local state
    onUpdateData(newData);
    setAlternatives([]); // Clear alternatives
    
    console.log(`[ResultCard] User corrected item to: ${newData.name}. Processing...`);
    await addToInventory(newData);
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
        {/* Warning Section for Data Validation */}
        {yearWarning && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700 font-medium">Data Validation Warning</p>
                <p className="text-sm text-amber-600 mt-1">{yearWarning}</p>
              </div>
            </div>
          </div>
        )}

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

        {/* Item/Model Numbers */}
        {(data.itemNumber || data.modelNumber) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.itemNumber && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Item Number</label>
                <div className="text-sm font-mono text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200">{data.itemNumber}</div>
              </div>
            )}
            {data.modelNumber && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Model Number</label>
                <div className="text-sm font-mono text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200">{data.modelNumber}</div>
              </div>
            )}
          </div>
        )}

        {/* Secondary Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Introduced</label>
            <div className="text-sm font-medium text-slate-900">{data.yearIntroduced || 'N/A'}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Retired</label>
            <div className="text-sm font-medium text-slate-900">
              {data.retiredStatus || (data.yearRetired ? 'Retired' : 'Active')}
            </div>
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
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Condition Assessment</label>
                <div className="text-sm text-slate-700 bg-amber-50 p-2 rounded-md border border-amber-100">
                  {data.estimatedCondition}
                </div>
              </div>
              <div className="space-y-1">
                 <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Special Features</label>
                 <div className="flex gap-2 flex-wrap">
                   {data.isLimitedEdition && (
                     <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">Limited Edition</span>
                   )}
                   {data.isSigned && (
                     <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">Artist Signed</span>
                   )}
                   {!data.isLimitedEdition && !data.isSigned && (
                     <span className="text-sm text-slate-400 italic">None detected</span>
                   )}
                 </div>
              </div>
           </div>

          <div className="space-y-1 pt-2">
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
                Confirm & Add
              </button>
            </div>
          </div>
        )}

        {/* Alternatives Section (triggered on Reject) */}
        {feedbackState === 'rejected' && (
          <div className="pt-4 border-t border-slate-100 animate-in fade-in duration-300">
             <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 block">
               Alternative Matches {alternatives.length > 0 && `(${alternatives.length} found)`}
             </label>
             
             {loadingAlternatives && (
                <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
                  <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching Department 56 catalog...</span>
                </div>
             )}

             <div className="grid gap-3">
               {alternatives.map((alt, idx) => (
                 <div key={idx} className="bg-white border border-slate-200 p-4 rounded-lg hover:border-blue-300 transition-colors shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-900">{alt.name}</div>
                        {alt.confidenceScore && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {alt.confidenceScore}%
                          </span>
                        )}
                      </div>
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
               {!loadingAlternatives && alternatives.length === 0 && !showContextInput && (
                 <div className="text-sm text-slate-500 italic text-center py-2">No alternative matches found via search.</div>
               )}
             </div>

             {/* Context Input Section - shown when no alternatives found */}
             {!loadingAlternatives && showContextInput && (
               <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                 <div className="flex items-start gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0">
                     <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                   </svg>
                   <div className="flex-1">
                     <h4 className="text-sm font-semibold text-amber-900 mb-1">No matches found</h4>
                     <p className="text-xs text-amber-700 mb-3">
                       Help us find the correct item by providing additional details such as:
                     </p>
                     <ul className="text-xs text-amber-600 list-disc list-inside space-y-1 mb-3">
                       <li>Specific features (e.g., "red barn with white trim")</li>
                       <li>Text visible on the box or piece</li>
                       <li>Village series (e.g., "Dickens Village", "North Pole")</li>
                       <li>Approximate year or era</li>
                     </ul>
                   </div>
                 </div>
                 
                 <div className="space-y-2">
                   <textarea
                     value={userContext}
                     onChange={(e) => setUserContext(e.target.value)}
                     placeholder="Example: This is a red brick church with a white steeple from the Dickens Village series..."
                     className="w-full px-3 py-2 text-sm border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                     rows={3}
                   />
                   <div className="flex gap-2">
                     <button
                       onClick={handleSearchWithContext}
                       disabled={!userContext.trim()}
                       className="flex-1 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                         <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                       </svg>
                       Search with Details
                     </button>
                     <button
                       onClick={() => setShowContextInput(false)}
                       className="px-4 py-2 bg-white text-slate-600 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                     >
                       Cancel
                     </button>
                   </div>
                 </div>
               </div>
             )}
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