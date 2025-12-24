
import React, { useState, useEffect } from 'react';
import { Dish, Ingredient } from '../types';
import { Plus, Minus } from 'lucide-react';

interface MenuGridProps {
  menu: Dish[];
  ingredients: Ingredient[];
  onAddToOrder: (dish: Dish, qty: number) => void;
}

const MenuItem: React.FC<{
  dish: Dish;
  ingredients: Ingredient[];
  onAddToOrder: (dish: Dish, qty: number) => void;
}> = ({ dish, ingredients, onAddToOrder }) => {
  const [quantity, setQuantity] = useState(1);

  // Calculate the maximum number of dishes we can make with current stock
  const maxAvailable = dish.recipe.reduce((acc, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return 0;
    const availableStock = Math.max(0, ingredient.totalStock - ingredient.reservedStock);
    const maxPossible = Math.floor(availableStock / item.quantity);
    return Math.min(acc, maxPossible);
  }, Infinity);

  const limit = maxAvailable === Infinity ? 0 : maxAvailable;
  const isAvailable = limit > 0;

  useEffect(() => {
    if (limit > 0 && quantity > limit) {
      setQuantity(limit);
    } else if (limit === 0) {
      setQuantity(1); 
    }
  }, [limit, quantity]);

  const handleIncrement = () => {
    if (quantity < limit) setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  const handleAdd = () => {
    if (isAvailable && quantity <= limit) {
      onAddToOrder(dish, quantity);
      setQuantity(1); 
    }
  };

  return (
    <div className={`card group hover:border-indigo-200 transition-all duration-300 cursor-pointer ${
      isAvailable ? 'hover:shadow-lg hover:-translate-y-1' : 'border-slate-100 opacity-60 grayscale'
    }`}>
      
      <div className="flex gap-4">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden flex-shrink-0 relative shadow-sm">
           <img src={dish.image} alt={dish.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
           {!isAvailable && (
             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
               <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">SOLD OUT</span>
             </div>
           )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-base truncate mb-1">{dish.name}</h3>
          <p className="text-sm text-indigo-600 font-semibold">${dish.price.toFixed(2)}</p>
          
          <div className="mt-2 flex flex-wrap gap-1">
            {dish.recipe.slice(0, 3).map((r, idx) => {
               const ingName = ingredients.find(i => i.id === r.ingredientId)?.name;
               return ingName ? (
                 <span key={idx} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200 font-medium">
                   {ingName}
                 </span>
               ) : null;
            })}
          </div>
          {isAvailable ? (
             <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
               <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
               {limit} available
             </p>
          ) : (
             <p className="text-xs text-red-500 font-medium mt-2 flex items-center gap-1">
               <span className="w-2 h-2 bg-red-500 rounded-full"></span>
               Out of stock
             </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-4">
        {isAvailable ? (
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 h-10 overflow-hidden">
            <button 
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className="px-3 h-full hover:bg-slate-200 text-slate-600 disabled:opacity-30 flex items-center transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-slate-700 bg-white">{quantity}</span>
            <button 
              onClick={handleIncrement}
              disabled={quantity >= limit}
              className="px-3 h-full hover:bg-slate-200 text-slate-600 disabled:opacity-30 flex items-center transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
           <div className="h-10"></div> 
        )}

        <button
          onClick={handleAdd}
          disabled={!isAvailable}
          className={`h-10 px-4 rounded-lg text-sm font-bold transition-all duration-200 ml-auto shadow-sm active:scale-95 ${
            isAvailable 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isAvailable ? 'Add to Cart' : 'Unavailable'}
        </button>
      </div>
    </div>
  );
};

export const MenuGrid: React.FC<MenuGridProps> = ({ menu, ingredients, onAddToOrder }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
      {menu.map((dish) => (
        <MenuItem 
          key={dish.id} 
          dish={dish} 
          ingredients={ingredients} 
          onAddToOrder={onAddToOrder} 
        />
      ))}
    </div>
  );
};
