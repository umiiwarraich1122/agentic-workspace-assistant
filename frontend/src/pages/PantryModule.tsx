import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, Search, AlertTriangle, 
  PackageOpen, Calendar, Box, ShoppingCart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { pantryService } from '../services/api';

interface PantryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  category: string;
  expiry_date: string | null;
  created_at: string;
}

const CATEGORIES = [
  "Grocery", "Dairy", "Vegetables", "Fruits", "Meat", 
  "Spices", "Beverages", "Snacks", "Frozen", "Other"
];

const UNITS = [
  "kg", "gram", "liter", "ml", "pieces", "packet", "bottle", "dozen", "box"
];

export function PantryModule() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStock, setFilterStock] = useState("All");
  const [filterExpiry, setFilterExpiry] = useState("All");
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    item_name: "",
    quantity: 1,
    unit: "pieces",
    category: "Grocery",
    expiry_date: ""
  });

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const data = await pantryService.getItems(user.id);
      setItems(data || []);
    } catch (error) {
      console.error("Failed to fetch pantry items", error);
      showNotification("Failed to load pantry items", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      item_name: "",
      quantity: 1,
      unit: "pieces",
      category: "Grocery",
      expiry_date: ""
    });
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: PantryItem) => {
    setFormData({
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiry_date: item.expiry_date || ""
    });
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const payload = {
        ...formData,
        expiry_date: formData.expiry_date || null
      };

      if (editingItem) {
        await pantryService.updateItem(user.id, editingItem.id, payload);
        showNotification("Item updated successfully", "success");
      } else {
        await pantryService.addItem(user.id, payload);
        showNotification("Item added successfully", "success");
      }
      setIsAddModalOpen(false);
      fetchItems();
    } catch (error) {
      console.error("Failed to save pantry item", error);
      showNotification("Failed to save item", "error");
    }
  };

  const handleDelete = async () => {
    if (!user || !deletingItemId) return;
    try {
      await pantryService.deleteItem(user.id, deletingItemId);
      showNotification("Item removed from pantry", "success");
      setDeletingItemId(null);
      fetchItems();
    } catch (error) {
      console.error("Failed to delete pantry item", error);
      showNotification("Failed to delete item", "error");
    }
  };

  const getExpiryStatus = (dateStr: string | null) => {
    if (!dateStr) return { label: "Normal", color: "text-cyan-400" };
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return { label: "Expired", color: "text-red-400" };
    if (diffDays <= 7) return { label: "Expiring Soon", color: "text-yellow-400" };
    return { label: "Normal", color: "text-cyan-400" };
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filterCategory === "All" || item.category === filterCategory;
      
      let matchesStock = true;
      if (filterStock === "Low Stock") matchesStock = item.quantity <= 1;
      if (filterStock === "Available") matchesStock = item.quantity > 1;

      let matchesExpiry = true;
      const status = getExpiryStatus(item.expiry_date).label;
      if (filterExpiry === "Expiring Soon") matchesExpiry = status === "Expiring Soon";
      if (filterExpiry === "Expired") matchesExpiry = status === "Expired";

      return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
    });
  }, [items, searchQuery, filterCategory, filterStock, filterExpiry]);

  const stats = useMemo(() => {
    const total = items.length;
    const lowStock = items.filter(i => i.quantity <= 1).length;
    const expiring = items.filter(i => getExpiryStatus(i.expiry_date).label !== "Normal").length;
    const categories = new Set(items.map(i => i.category)).size;
    return { total, lowStock, expiring, categories };
  }, [items]);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-mono text-cyan-50 tracking-wider">My Smart Pantry</h1>
          <p className="text-sm text-cyan-400/60 mt-1">Manage your household groceries and let JARVIS keep track of them.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-mono text-sm transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-cyan-400/60 text-xs uppercase tracking-wider mb-1">Total Items</p>
              <h3 className="text-2xl font-bold text-cyan-50">{stats.total}</h3>
            </div>
            <ShoppingCart className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-400/60 text-xs uppercase tracking-wider mb-1">Low Stock</p>
              <h3 className="text-2xl font-bold text-red-400">{stats.lowStock}</h3>
            </div>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
        </div>
        <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-yellow-400/60 text-xs uppercase tracking-wider mb-1">Expiring Soon</p>
              <h3 className="text-2xl font-bold text-yellow-400">{stats.expiring}</h3>
            </div>
            <Calendar className="w-5 h-5 text-yellow-400" />
          </div>
        </div>
        <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-cyan-400/60 text-xs uppercase tracking-wider mb-1">Categories</p>
              <h3 className="text-2xl font-bold text-cyan-50">{stats.categories}</h3>
            </div>
            <Box className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex gap-4 mb-4 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500" />
          <input 
            type="text" 
            placeholder="Search pantry..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-cyan-950/30 border border-cyan-900/50 rounded-lg pl-10 pr-4 py-2 text-sm text-cyan-50 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        
        <select 
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-4 py-2 text-sm text-cyan-50 focus:outline-none focus:border-cyan-500"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        <select 
          value={filterStock}
          onChange={(e) => setFilterStock(e.target.value)}
          className="bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-4 py-2 text-sm text-cyan-50 focus:outline-none focus:border-cyan-500"
        >
          <option value="All">All Stock</option>
          <option value="Available">Available</option>
          <option value="Low Stock">Low Stock</option>
        </select>

        <select 
          value={filterExpiry}
          onChange={(e) => setFilterExpiry(e.target.value)}
          className="bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-4 py-2 text-sm text-cyan-50 focus:outline-none focus:border-cyan-500"
        >
          <option value="All">All Expiry</option>
          <option value="Expiring Soon">Expiring Soon</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="flex-1 bg-cyan-950/20 border border-cyan-900/50 rounded-xl backdrop-blur-sm overflow-hidden flex flex-col">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-cyan-900/50 text-xs font-mono text-cyan-400/60 uppercase tracking-wider bg-cyan-950/40">
          <div className="col-span-2">Item Name</div>
          <div>Quantity</div>
          <div>Category</div>
          <div>Expiry Date</div>
          <div className="text-right">Actions</div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-cyan-500 rounded-full animate-spin border-t-transparent" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-cyan-400/60">
              <PackageOpen className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg text-cyan-50 mb-2">Your pantry is empty</p>
              <p className="text-sm mb-4">Add your household groceries and let JARVIS keep track of them.</p>
              {searchQuery || filterCategory !== "All" || filterStock !== "All" || filterExpiry !== "All" ? (
                <button onClick={() => { setSearchQuery(""); setFilterCategory("All"); setFilterStock("All"); setFilterExpiry("All"); }} className="text-cyan-400 hover:text-cyan-300 text-sm">Clear Filters</button>
              ) : (
                <button onClick={handleOpenAddModal} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  + Add First Item
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-cyan-900/30">
              {filteredItems.map(item => {
                const expiryStatus = getExpiryStatus(item.expiry_date);
                const isLowStock = item.quantity <= 1;
                
                return (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    key={item.id} 
                    className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-cyan-900/20 transition-colors text-sm"
                  >
                    <div className="col-span-2 font-medium text-cyan-50 flex items-center gap-2">
                      {item.item_name}
                      {isLowStock && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" title="Low Stock"></span>}
                    </div>
                    <div className={`font-mono ${isLowStock ? 'text-red-400 font-bold' : 'text-cyan-400'}`}>
                      {item.quantity} {item.unit}
                    </div>
                    <div className="text-cyan-100">
                      <span className="px-2 py-1 rounded bg-cyan-900/30 text-xs border border-cyan-800/30">{item.category}</span>
                    </div>
                    <div className={expiryStatus.color}>
                      {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenEditModal(item)} className="p-2 hover:bg-cyan-800/50 rounded-lg text-cyan-400 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeletingItemId(item.id)} className="p-2 hover:bg-red-900/30 rounded-lg text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-gray-900 border border-cyan-900/50 rounded-xl p-6 w-full max-w-md shadow-[0_0_40px_rgba(6,182,212,0.15)]"
            >
              <h2 className="text-xl font-bold font-mono text-cyan-50 mb-6">
                {editingItem ? 'Edit Item' : 'Add Item to Pantry'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-cyan-400/60 uppercase mb-1">Item Name</label>
                  <input 
                    required type="text" 
                    value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})}
                    className="w-full bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-4 py-2 text-cyan-50 focus:outline-none focus:border-cyan-500" 
                    placeholder="e.g., Basmati Rice"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-cyan-400/60 uppercase mb-1">Quantity</label>
                    <input 
                      required type="number" step="0.01" min="0"
                      value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                      className="w-full bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-4 py-2 text-cyan-50 focus:outline-none focus:border-cyan-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-cyan-400/60 uppercase mb-1">Unit</label>
                    <select 
                      value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                      className="w-full bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-4 py-2 text-cyan-50 focus:outline-none focus:border-cyan-500"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-cyan-400/60 uppercase mb-1">Category</label>
                    <select 
                      value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-4 py-2 text-cyan-50 focus:outline-none focus:border-cyan-500"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-cyan-400/60 uppercase mb-1">Expiry Date (Optional)</label>
                    <input 
                      type="date" 
                      value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})}
                      className="w-full bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-4 py-2 text-cyan-50 focus:outline-none focus:border-cyan-500" 
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-lg text-cyan-400 hover:bg-cyan-900/30 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-colors">
                    {editingItem ? 'Save Changes' : 'Add Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingItemId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-gray-900 border border-red-900/50 rounded-xl p-6 w-full max-w-sm shadow-[0_0_40px_rgba(239,68,68,0.15)] text-center"
            >
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-80" />
              <h2 className="text-xl font-bold text-gray-50 mb-2">Remove Item?</h2>
              <p className="text-gray-400 mb-6 text-sm">Are you sure you want to remove this item from your pantry? This action cannot be undone.</p>
              
              <div className="flex justify-center gap-3">
                <button onClick={() => setDeletingItemId(null)} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors border border-gray-700">
                  Cancel
                </button>
                <button onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
