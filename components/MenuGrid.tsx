
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
    <div className={`p-3 rounded-lg border flex flex-col gap-3 transition-all duration-300 bg-white
      ${isAvailable ? 'border-slate-200 shadow-sm hover:shadow-md' : 'border-slate-100 opacity-60 grayscale'}`}>
      
      <div className="flex gap-3">
        <div className="w-16 h-16 bg-slate-100 rounded-md overflow-hidden flex-shrink-0 relative">
           <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
           {!isAvailable && (
             <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center">
               <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">SOLD OUT</span>
             </div>
           )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm truncate">{dish.name}</h3>
          <p className="text-xs text-slate-500 font-mono">${dish.price.toFixed(2)}</p>
          
          <div className="mt-1 flex flex-wrap gap-1">
            {dish.recipe.slice(0, 3).map((r, idx) => {
               const ingName = ingredients.find(i => i.id === r.ingredientId)?.name;
               return ingName ? (
                 <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 truncate max-w-[80px]">
                   {ingName}
                 </span>
               ) : null;
            })}
          </div>
          {isAvailable ? (
             <p className="text-[10px] text-emerald-600 font-medium mt-1">{limit} orders left</p>
          ) : (
             <p className="text-[10px] text-red-500 font-medium mt-1">Out of Stock</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-50">
        {isAvailable ? (
          <div className="flex items-center bg-slate-50 rounded border border-slate-200 h-8">
            <button 
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className="px-2 h-full hover:bg-slate-100 text-slate-600 disabled:opacity-30 flex items-center"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-6 text-center text-xs font-semibold text-slate-700">{quantity}</span>
            <button 
              onClick={handleIncrement}
              disabled={quantity >= limit}
              className="px-2 h-full hover:bg-slate-100 text-slate-600 disabled:opacity-30 flex items-center"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ) : (
           <div className="h-8"></div> 
        )}

        <button
          onClick={handleAdd}
          disabled={!isAvailable}
          className={`h-8 px-3 rounded text-xs font-bold transition-all ml-auto
            ${isAvailable 
              ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-sm active:scale-95' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
        >
          {isAvailable ? 'Add' : 'Unavailable'}
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
