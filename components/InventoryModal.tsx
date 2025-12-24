import React, { useState } from 'react';
import { Dish, Ingredient } from '../types';
import { X, Plus, Minus } from 'lucide-react';

interface InventoryModalProps {
  dish: Dish;
  ingredients: Ingredient[];
  onClose: () => void;
  onUpdateStock: (ingredientId: string, newStock: number) => void;
}

const InventoryModal: React.FC<InventoryModalProps> = ({
  dish,
  ingredients,
  onClose,
  onUpdateStock
}) => {
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});

  const handleStockChange = (ingredientId: string, change: number) => {
    const currentIngredient = ingredients.find(i => i.id === ingredientId);
    if (!currentIngredient) return;

    const currentStock = stockUpdates[ingredientId] ?? currentIngredient.totalStock;
    const newStock = Math.max(0, currentStock + change);

    setStockUpdates(prev => ({
      ...prev,
      [ingredientId]: newStock
    }));
  };

  const handleSave = () => {
    Object.entries(stockUpdates).forEach(([ingredientId, newStock]) => {
      onUpdateStock(ingredientId, newStock);
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Update Inventory</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">Manage stock for: <strong>{dish.name}</strong></p>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {dish.recipe.map((recipeItem) => {
              const ingredient = ingredients.find(i => i.id === recipeItem.ingredientId);
              if (!ingredient) return null;

              const currentStock = stockUpdates[ingredient.id] ?? ingredient.totalStock;
              const availableStock = currentStock - ingredient.reservedStock;

              return (
                <div key={ingredient.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{ingredient.name}</h3>
                      <p className="text-sm text-gray-500">
                        Needs {recipeItem.quantity} {ingredient.unit} per dish
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Available</p>
                      <p className={`font-bold ${availableStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {availableStock} {ingredient.unit}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStockChange(ingredient.id, -1)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-lg min-w-[60px] text-center">
                        {currentStock}
                      </span>
                      <button
                        onClick={() => handleStockChange(ingredient.id, 1)}
                        className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">{ingredient.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-medium"
            >
              Update Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;