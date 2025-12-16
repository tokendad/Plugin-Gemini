import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              N
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">NesVentory</h1>
              <p className="text-xs text-slate-500 font-medium -mt-1">Dept. 56 Identifier Plugin</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              Gemini AI Powered
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};