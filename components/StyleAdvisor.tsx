
import React, { useState } from 'react';
import { getGarmentDetails, generateGarmentRecommendations } from '../services/geminiService';
import type { RecommendationItem } from '../types';
import Spinner from './common/Spinner';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { getFriendlyErrorMessage, FriendlyError } from './common/errorHandler';

const PrimaryButton = ({ children, onClick, type = 'button', disabled = false, isLoading = false }: { children?: React.ReactNode, onClick?: (e: React.FormEvent) => void, type?: 'button' | 'submit', disabled?: boolean, isLoading?: boolean }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled || isLoading}
        className="inline-flex items-center justify-center px-8 py-3 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 focus:ring-4 focus:outline-none focus:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
    >
        <div className="flex items-center justify-center gap-2">
            {isLoading ? <><Spinner /> Advising...</> : children}
        </div>
    </button>
);

const StyleAdvisor: React.FC = () => {
  const [preferences, setPreferences] = useState({
    gender: 'Female',
    style: 'Casual',
    colors: 'Neutral Tones',
    occasion: 'Weekend Outing',
  });
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FriendlyError | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRecommendations([]);
    setGeneratedImages([]);

    try {
      const { gender, ...stylePrefs } = preferences;
      const [textResults, imageResults] = await Promise.all([
        getGarmentDetails(stylePrefs, gender),
        generateGarmentRecommendations(stylePrefs, '1:1', gender),
      ]);
      setRecommendations(textResults);
      setGeneratedImages(imageResults);
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  const PreferenceInput: React.FC<{ label: string; name: string; value: string; children: React.ReactNode; }> = 
    ({ label, name, value, children }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={handleInputChange}
        className="w-full bg-gray-800 border-gray-700 rounded-md shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white p-2.5"
      >
        {children}
      </select>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="p-6 bg-black/20 border border-white/10 rounded-lg space-y-6 mb-8">
        <h2 className="text-2xl font-bold text-center mb-4 text-amber-400">Find Your Perfect Style</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PreferenceInput label="Gender Style" name="gender" value={preferences.gender}>
            <option>Female</option><option>Male</option>
          </PreferenceInput>
          <PreferenceInput label="Preferred Style" name="style" value={preferences.style}>
            <option>Casual</option><option>Formal</option><option>Streetwear</option><option>Bohemian</option><option>Minimalist</option><option>Athleisure</option><option>Vintage</option><option>Preppy</option><option>Grunge</option><option>Artsy</option>
          </PreferenceInput>
          <PreferenceInput label="Color Palette" name="colors" value={preferences.colors}>
            <option>Neutral Tones</option><option>Pastels</option><option>Earthy Tones</option><option>Bright & Bold</option><option>Jewel Tones</option><option>Monochromatic</option><option>Cool Tones</option><option>Warm Tones</option><option>Muted Tones</option><option>Bold neons</option><option>Metallic hues</option><option>Pastel gradients</option>
          </PreferenceInput>
          <PreferenceInput label="Occasion" name="occasion" value={preferences.occasion}>
            <option>Weekend Outing</option><option>Office / Work</option><option>Formal Event</option><option>Date Night</option><option>Workout / Gym</option><option>Beach Vacation</option><option>Casual Hangout</option><option>Music Festival</option><option>Wedding Guest</option><option>Travel</option>
          </PreferenceInput>
        </div>
        <div className="text-center pt-2">
           <PrimaryButton type="submit" isLoading={isLoading} disabled={isLoading}>
                <Sparkles className="w-5 h-5" /> Advise Me
           </PrimaryButton>
        </div>
      </form>

      {error && (
        <div className="mb-8 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-left flex items-start gap-3">
            <div className="flex-shrink-0 pt-1">
                <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
                <h4 className="font-bold text-white">{error.title}</h4>
                <p className="text-sm">{error.message}</p>
            </div>
        </div>
      )}

      {recommendations.length > 0 && generatedImages.length > 0 && (
        <div className="fade-in">
          <h3 className="text-2xl font-bold text-center mb-6 text-amber-400">Your Style Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {recommendations.map((item, index) => (
              <div 
                key={index} 
                className="bg-black/20 backdrop-blur-md border border-white/10 rounded-lg shadow-lg flex flex-col group transition-all duration-300 hover:border-amber-400/50 hover:shadow-amber-500/10 hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms`, opacity: 0, animation: 'fadeIn 0.5s ease-out forwards' }}
              >
                <div className="relative overflow-hidden rounded-t-lg">
                    <img src={`data:image/png;base64,${generatedImages[index]}`} alt={item.itemName} className="w-full h-80 object-cover rounded-t-md transition-transform duration-500 group-hover:scale-110"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-0 p-4">
                        <h4 className="text-xl font-bold text-white drop-shadow-lg">{item.itemName}</h4>
                        <p className="text-amber-300 text-sm font-semibold">{item.styleCategory}</p>
                    </div>
                </div>
                <div className="p-4 flex-grow flex flex-col">
                    <p className="text-gray-300 flex-grow text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleAdvisor;
