import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FaHome, FaBoxOpen, FaUtensils, FaTrophy, FaShoppingCart, 
  FaCamera, FaPlus, FaEdit, FaTrash, FaShare, FaHeart,
  FaClock, FaExclamationTriangle, FaCheckCircle, FaFireAlt,
  FaLeaf, FaRecycle, FaGift, FaStar, FaChevronRight,
  FaBarcode, FaCalendarAlt, FaChartPie, FaUser, FaBell,
  FaSearch, FaFilter, FaSort, FaTag, FaStore, FaPercent
} from 'react-icons/fa';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [deals, setDeals] = useState([]);
  const [wasteItems, setWasteItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({ name: 'Kitchen Master', points: 0 });
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  
  // Camera state
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  
  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    quantity: 1,
    unit: 'pieces',
    category: 'other',
    expiry_date: '',
    barcode: ''
  });
  
  const [wasteForm, setWasteForm] = useState({
    item_id: '',
    quantity: 1,
    reason: 'expired'
  });

  // API functions
  const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  const fetchInventory = async () => {
    try {
      const response = await api.get('/api/inventory');
      setInventory(response.data);
    } catch (error) {
      toast.error('Failed to fetch inventory');
    }
  };

  const fetchRecipes = async () => {
    try {
      const response = await api.get('/api/recipes');
      setRecipes(response.data);
    } catch (error) {
      toast.error('Failed to fetch recipes');
    }
  };

  const fetchExpiringRecipes = async () => {
    try {
      const response = await api.get('/api/recipes/expiring');
      return response.data;
    } catch (error) {
      toast.error('Failed to fetch expiring recipes');
      return [];
    }
  };

  const fetchChallenges = async () => {
    try {
      const response = await api.get('/api/challenges');
      setChallenges(response.data);
    } catch (error) {
      toast.error('Failed to fetch challenges');
    }
  };

  const fetchDeals = async () => {
    try {
      const response = await api.get('/api/deals');
      setDeals(response.data);
    } catch (error) {
      toast.error('Failed to fetch deals');
    }
  };

  const fetchWasteItems = async () => {
    try {
      const response = await api.get('/api/waste');
      setWasteItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch waste items');
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications/expiring');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  const lookupBarcode = async (barcode) => {
    try {
      const response = await api.get(`/api/barcode/${barcode}`);
      return response.data;
    } catch (error) {
      toast.error('Failed to lookup barcode');
      return null;
    }
  };

  const addInventoryItem = async (item) => {
    try {
      await api.post('/api/inventory', item);
      toast.success('Item added successfully!');
      fetchInventory();
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const updateInventoryItem = async (itemId, item) => {
    try {
      await api.put(`/api/inventory/${itemId}`, item);
      toast.success('Item updated successfully!');
      fetchInventory();
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const deleteInventoryItem = async (itemId) => {
    try {
      await api.delete(`/api/inventory/${itemId}`);
      toast.success('Item deleted successfully!');
      fetchInventory();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const addWasteItem = async (wasteItem) => {
    try {
      await api.post('/api/waste', wasteItem);
      toast.success('Waste item logged successfully!');
      fetchWasteItems();
    } catch (error) {
      toast.error('Failed to log waste item');
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast.error('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const simulateBarcodeScan = () => {
    // Simulate barcode scanning with mock barcodes
    const mockBarcodes = ['123456789', '987654321', '456789123'];
    const randomBarcode = mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)];
    setScannedBarcode(randomBarcode);
    handleBarcodeScanned(randomBarcode);
  };

  const handleBarcodeScanned = async (barcode) => {
    setLoading(true);
    const productInfo = await lookupBarcode(barcode);
    if (productInfo) {
      setItemForm(prev => ({
        ...prev,
        name: productInfo.name,
        category: productInfo.category || 'other',
        barcode: barcode
      }));
      toast.success(`Product found: ${productInfo.name}`);
    }
    setLoading(false);
    setShowCameraModal(false);
    setShowAddModal(true);
    stopCamera();
  };

  // Utility functions
  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (expiryDate) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days === null) return 'none';
    if (days <= 0) return 'expired';
    if (days <= 3) return 'expiring';
    return 'fresh';
  };

  const shareItem = async (item) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SmartKitchen - Surplus Item',
          text: `I have surplus ${item.name} available! Expires in ${getDaysUntilExpiry(item.expiry_date)} days.`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback for browsers without native sharing
      navigator.clipboard.writeText(
        `I have surplus ${item.name} available! Expires in ${getDaysUntilExpiry(item.expiry_date)} days. Check out SmartKitchen app!`
      );
      toast.success('Share text copied to clipboard!');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      toast.error('Please enter item name');
      return;
    }
    
    const newItem = {
      ...itemForm,
      quantity: parseInt(itemForm.quantity),
      added_date: new Date().toISOString(),
      user_id: 'default'
    };
    
    if (selectedItem) {
      await updateInventoryItem(selectedItem.id, newItem);
    } else {
      await addInventoryItem(newItem);
    }
    
    setShowAddModal(false);
    resetForm();
  };

  const handleAddWaste = async (e) => {
    e.preventDefault();
    const wasteItem = {
      ...wasteForm,
      quantity: parseInt(wasteForm.quantity),
      item_name: inventory.find(item => item.id === wasteForm.item_id)?.name || 'Unknown',
      date_discarded: new Date().toISOString(),
      user_id: 'default'
    };
    
    await addWasteItem(wasteItem);
    setShowWasteModal(false);
    setWasteForm({ item_id: '', quantity: 1, reason: 'expired' });
  };

  const resetForm = () => {
    setItemForm({
      name: '',
      quantity: 1,
      unit: 'pieces',
      category: 'other',
      expiry_date: '',
      barcode: ''
    });
    setSelectedItem(null);
    setScannedBarcode('');
  };

  // Load data on component mount
  useEffect(() => {
    fetchInventory();
    fetchRecipes();
    fetchChallenges();
    fetchDeals();
    fetchWasteItems();
    fetchNotifications();
    
    // Set up periodic notifications check
    const interval = setInterval(fetchNotifications, 300000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Sample data initialization
  useEffect(() => {
    const initializeSampleData = async () => {
      // Add sample recipes
      const sampleRecipes = [
        {
          name: "Quick Vegetable Stir Fry",
          ingredients: ["vegetables", "oil", "garlic", "soy sauce"],
          instructions: ["Heat oil in pan", "Add garlic", "Add vegetables", "Stir fry for 5 minutes", "Add soy sauce"],
          prep_time: 15,
          difficulty: "easy",
          category: "main",
          affiliate_links: {
            "soy sauce": "https://amazon.com/soy-sauce",
            "oil": "https://amazon.com/cooking-oil"
          }
        },
        {
          name: "Banana Smoothie",
          ingredients: ["bananas", "milk", "honey"],
          instructions: ["Peel bananas", "Add to blender with milk", "Add honey", "Blend until smooth"],
          prep_time: 5,
          difficulty: "easy",
          category: "drink",
          affiliate_links: {
            "honey": "https://amazon.com/honey"
          }
        }
      ];

      // Add sample challenges
      const sampleChallenges = [
        {
          title: "Zero Waste Week",
          description: "Don't throw away any food for 7 days",
          points: 100,
          type: "weekly",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          title: "Use 5 Vegetables",
          description: "Cook with 5 different vegetables this week",
          points: 50,
          type: "weekly",
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          title: "Scan 3 Items",
          description: "Add 3 items using barcode scanner",
          points: 30,
          type: "daily",
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      // Add sample deals
      const sampleDeals = [
        {
          title: "50% Off Organic Vegetables",
          description: "Fresh organic vegetables at half price",
          discount: "50%",
          store_name: "Fresh Market",
          expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          sponsored: true
        },
        {
          title: "Buy 2 Get 1 Free - Dairy",
          description: "Milk, cheese, yogurt - buy 2 get 1 free",
          discount: "33%",
          store_name: "Dairy Farm Store",
          expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          sponsored: false
        }
      ];

      // Only add if collections are empty
      if (recipes.length === 0) {
        for (const recipe of sampleRecipes) {
          try {
            await api.post('/api/recipes', recipe);
          } catch (error) {
            console.error('Failed to add sample recipe:', error);
          }
        }
      }

      if (challenges.length === 0) {
        for (const challenge of sampleChallenges) {
          try {
            await api.post('/api/challenges', challenge);
          } catch (error) {
            console.error('Failed to add sample challenge:', error);
          }
        }
      }

      if (deals.length === 0) {
        for (const deal of sampleDeals) {
          try {
            await api.post('/api/deals', deal);
          } catch (error) {
            console.error('Failed to add sample deal:', error);
          }
        }
      }

      // Refresh data after adding samples
      setTimeout(() => {
        fetchRecipes();
        fetchChallenges();
        fetchDeals();
      }, 1000);
    };

    initializeSampleData();
  }, []);

  // Components
  const BottomNavigation = () => (
    <div className="bottom-nav">
      <div className="flex justify-around">
        <button
          onClick={() => setCurrentTab('home')}
          className={`bottom-nav-item ${currentTab === 'home' ? 'active' : 'inactive'}`}
        >
          <FaHome className="text-xl mb-1" />
          <span>Home</span>
        </button>
        <button
          onClick={() => setCurrentTab('inventory')}
          className={`bottom-nav-item ${currentTab === 'inventory' ? 'active' : 'inactive'}`}
        >
          <FaBoxOpen className="text-xl mb-1" />
          <span>Inventory</span>
        </button>
        <button
          onClick={() => setCurrentTab('recipes')}
          className={`bottom-nav-item ${currentTab === 'recipes' ? 'active' : 'inactive'}`}
        >
          <FaUtensils className="text-xl mb-1" />
          <span>Recipes</span>
        </button>
        <button
          onClick={() => setCurrentTab('challenges')}
          className={`bottom-nav-item ${currentTab === 'challenges' ? 'active' : 'inactive'}`}
        >
          <FaTrophy className="text-xl mb-1" />
          <span>Challenges</span>
        </button>
        <button
          onClick={() => setCurrentTab('deals')}
          className={`bottom-nav-item ${currentTab === 'deals' ? 'active' : 'inactive'}`}
        >
          <FaShoppingCart className="text-xl mb-1" />
          <span>Deals</span>
        </button>
      </div>
    </div>
  );

  const NotificationBell = () => (
    <div className="relative">
      <FaBell className="text-2xl text-gray-600" />
      {notifications.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-danger-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
          {notifications.length}
        </span>
      )}
    </div>
  );

  const ExpiryBadge = ({ expiryDate }) => {
    const status = getExpiryStatus(expiryDate);
    const days = getDaysUntilExpiry(expiryDate);

    if (status === 'none') return null;

    const badgeConfig = {
      expired: { class: 'badge-danger', icon: FaExclamationTriangle, text: 'Expired' },
      expiring: { class: 'badge-warning', icon: FaFireAlt, text: `${days} days left` },
      fresh: { class: 'badge-success', icon: FaCheckCircle, text: `${days} days left` }
    };

    const config = badgeConfig[status];
    const IconComponent = config.icon;

    return (
      <span className={`badge ${config.class} flex items-center space-x-1`}>
        <IconComponent className="text-xs" />
        <span>{config.text}</span>
      </span>
    );
  };

  const InventoryCard = ({ item }) => (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="text-gray-600 text-sm">{item.quantity} {item.unit}</p>
          <p className="text-xs text-gray-500 mt-1">
            <FaTag className="inline mr-1" />
            {item.category}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <ExpiryBadge expiryDate={item.expiry_date} />
          <div className="flex space-x-2">
            <button
              onClick={() => shareItem(item)}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded-full"
            >
              <FaShare />
            </button>
            <button
              onClick={() => {
                setSelectedItem(item);
                setItemForm({
                  name: item.name,
                  quantity: item.quantity,
                  unit: item.unit,
                  category: item.category,
                  expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
                  barcode: item.barcode || ''
                });
                setShowAddModal(true);
              }}
              className="p-2 text-warning-600 hover:bg-warning-50 rounded-full"
            >
              <FaEdit />
            </button>
            <button
              onClick={() => deleteInventoryItem(item.id)}
              className="p-2 text-danger-600 hover:bg-danger-50 rounded-full"
            >
              <FaTrash />
            </button>
          </div>
        </div>
      </div>
      {item.expiry_date && (
        <div className="text-xs text-gray-500 flex items-center">
          <FaCalendarAlt className="mr-1" />
          Expires: {new Date(item.expiry_date).toLocaleDateString()}
        </div>
      )}
    </div>
  );

  const RecipeCard = ({ recipe }) => (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{recipe.name}</h3>
          <p className="text-gray-600 text-sm flex items-center">
            <FaClock className="mr-1" />
            {recipe.prep_time} min
          </p>
          <p className="text-xs text-gray-500 mt-1">
            <FaTag className="inline mr-1" />
            {recipe.difficulty} • {recipe.category}
          </p>
        </div>
        <button
          onClick={() => setSelectedRecipe(recipe)}
          className="btn btn-primary"
        >
          View Recipe
        </button>
      </div>
      <div className="text-sm text-gray-600 mb-3">
        <strong>Ingredients:</strong> {recipe.ingredients.join(', ')}
      </div>
      {recipe.expiring_ingredients && recipe.expiring_ingredients.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
          <p className="text-warning-800 text-sm font-medium flex items-center">
            <FaFireAlt className="mr-1" />
            Uses expiring ingredients: {recipe.expiring_ingredients.join(', ')}
          </p>
        </div>
      )}
    </div>
  );

  const ChallengeCard = ({ challenge }) => (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{challenge.title}</h3>
          <p className="text-gray-600 text-sm">{challenge.description}</p>
          <div className="flex items-center space-x-4 mt-2">
            <span className="text-sm text-primary-600 font-medium flex items-center">
              <FaStar className="mr-1" />
              {challenge.points} points
            </span>
            <span className="text-xs text-gray-500">
              {challenge.type}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="badge badge-primary">{challenge.status}</span>
          <FaTrophy className="text-warning-500" />
        </div>
      </div>
      {challenge.deadline && (
        <div className="text-xs text-gray-500 flex items-center">
          <FaCalendarAlt className="mr-1" />
          Deadline: {new Date(challenge.deadline).toLocaleDateString()}
        </div>
      )}
    </div>
  );

  const DealCard = ({ deal }) => (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{deal.title}</h3>
          <p className="text-gray-600 text-sm">{deal.description}</p>
          <div className="flex items-center space-x-4 mt-2">
            <span className="text-lg font-bold text-success-600 flex items-center">
              <FaPercent className="mr-1" />
              {deal.discount}
            </span>
            <span className="text-sm text-gray-600 flex items-center">
              <FaStore className="mr-1" />
              {deal.store_name}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          {deal.sponsored && (
            <span className="badge badge-warning">Sponsored</span>
          )}
          <FaGift className="text-primary-500" />
        </div>
      </div>
      {deal.expiry_date && (
        <div className="text-xs text-gray-500 flex items-center">
          <FaCalendarAlt className="mr-1" />
          Valid until: {new Date(deal.expiry_date).toLocaleDateString()}
        </div>
      )}
    </div>
  );

  // Main render function
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">SmartKitchen</h1>
            <p className="text-sm text-gray-600">Hello, {user.name}!</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FaStar className="text-warning-500" />
              <span className="font-medium">{user.points}</span>
            </div>
            <NotificationBell />
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <FaUser className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 pb-20">
        {/* Home Tab */}
        {currentTab === 'home' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card text-center">
                <div className="text-2xl font-bold text-primary-600">{inventory.length}</div>
                <div className="text-sm text-gray-600">Items in Stock</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-warning-600">{notifications.length}</div>
                <div className="text-sm text-gray-600">Expiring Soon</div>
              </div>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaBell className="mr-2" />
                  Expiry Alerts
                </h2>
                {notifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className={`p-4 rounded-lg border ${
                    notification.urgency === 'high' ? 'bg-danger-50 border-danger-200' : 'bg-warning-50 border-warning-200'
                  }`}>
                    <p className="text-sm font-medium">{notification.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowCameraModal(true)}
                  className="btn btn-primary flex items-center justify-center space-x-2"
                >
                  <FaCamera />
                  <span>Scan Barcode</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-secondary flex items-center justify-center space-x-2"
                >
                  <FaPlus />
                  <span>Add Item</span>
                </button>
                <button
                  onClick={() => setShowWasteModal(true)}
                  className="btn btn-warning flex items-center justify-center space-x-2"
                >
                  <FaRecycle />
                  <span>Log Waste</span>
                </button>
                <button
                  onClick={() => setCurrentTab('recipes')}
                  className="btn btn-success flex items-center justify-center space-x-2"
                >
                  <FaUtensils />
                  <span>Find Recipes</span>
                </button>
              </div>
            </div>

            {/* Recent Items */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Recent Items</h2>
              {inventory.slice(0, 3).map((item) => (
                <InventoryCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {currentTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">My Inventory</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowCameraModal(true)}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <FaCamera />
                  <span>Scan</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <FaPlus />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Inventory List */}
            <div className="space-y-4">
              {inventory.map((item) => (
                <InventoryCard key={item.id} item={item} />
              ))}
              {inventory.length === 0 && (
                <div className="text-center py-8">
                  <FaBoxOpen className="text-4xl text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No items in inventory</p>
                  <p className="text-sm text-gray-500">Add items to get started!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recipes Tab */}
        {currentTab === 'recipes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recipes</h2>
              <button
                onClick={async () => {
                  const expiringRecipes = await fetchExpiringRecipes();
                  setRecipes(expiringRecipes);
                }}
                className="btn btn-warning flex items-center space-x-2"
              >
                <FaFireAlt />
                <span>Rescue Recipes</span>
              </button>
            </div>

            {/* Recipe List */}
            <div className="space-y-4">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
              {recipes.length === 0 && (
                <div className="text-center py-8">
                  <FaUtensils className="text-4xl text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recipes available</p>
                  <p className="text-sm text-gray-500">Check back later for new recipes!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Challenges Tab */}
        {currentTab === 'challenges' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Challenges</h2>
              <div className="flex items-center space-x-2">
                <FaStar className="text-warning-500" />
                <span className="font-medium">{user.points} points</span>
              </div>
            </div>

            {/* Challenge List */}
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
              {challenges.length === 0 && (
                <div className="text-center py-8">
                  <FaTrophy className="text-4xl text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No challenges available</p>
                  <p className="text-sm text-gray-500">Check back later for new challenges!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deals Tab */}
        {currentTab === 'deals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Deals & Offers</h2>
              <span className="badge badge-success">
                {deals.filter(deal => deal.sponsored).length} Sponsored
              </span>
            </div>

            {/* Deal List */}
            <div className="space-y-4">
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
              {deals.length === 0 && (
                <div className="text-center py-8">
                  <FaShoppingCart className="text-4xl text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No deals available</p>
                  <p className="text-sm text-gray-500">Check back later for new deals!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Add/Edit Item Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">
                {selectedItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddItem} className="modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                  className="input"
                  placeholder="Enter item name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({...itemForm, quantity: e.target.value})}
                    className="input"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({...itemForm, unit: e.target.value})}
                    className="input"
                  >
                    <option value="pieces">Pieces</option>
                    <option value="kg">Kg</option>
                    <option value="liters">Liters</option>
                    <option value="packages">Packages</option>
                    <option value="bottles">Bottles</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={itemForm.category}
                  onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                  className="input"
                >
                  <option value="fruits">Fruits</option>
                  <option value="vegetables">Vegetables</option>
                  <option value="dairy">Dairy</option>
                  <option value="meat">Meat</option>
                  <option value="bakery">Bakery</option>
                  <option value="pantry">Pantry</option>
                  <option value="frozen">Frozen</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={itemForm.expiry_date}
                  onChange={(e) => setItemForm({...itemForm, expiry_date: e.target.value})}
                  className="input"
                />
              </div>
              {scannedBarcode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={scannedBarcode}
                    disabled
                    className="input bg-gray-100"
                  />
                </div>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {selectedItem ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Scan Barcode</h3>
              <button
                onClick={() => {
                  setShowCameraModal(false);
                  stopCamera();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-64 bg-gray-200 rounded-lg"
                />
                {!isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
                    <button
                      onClick={startCamera}
                      className="btn btn-primary flex items-center space-x-2"
                    >
                      <FaCamera />
                      <span>Start Camera</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Position the barcode in the frame and it will be detected automatically
                </p>
                <button
                  onClick={simulateBarcodeScan}
                  className="btn btn-success flex items-center space-x-2 mx-auto"
                >
                  <FaBarcode />
                  <span>Simulate Scan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waste Modal */}
      {showWasteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Log Waste Item</h3>
              <button
                onClick={() => setShowWasteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddWaste} className="modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Item *
                </label>
                <select
                  value={wasteForm.item_id}
                  onChange={(e) => setWasteForm({...wasteForm, item_id: e.target.value})}
                  className="input"
                  required
                >
                  <option value="">Choose an item...</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Wasted *
                </label>
                <input
                  type="number"
                  value={wasteForm.quantity}
                  onChange={(e) => setWasteForm({...wasteForm, quantity: e.target.value})}
                  className="input"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={wasteForm.reason}
                  onChange={(e) => setWasteForm({...wasteForm, reason: e.target.value})}
                  className="input"
                >
                  <option value="expired">Expired</option>
                  <option value="spoiled">Spoiled</option>
                  <option value="damaged">Damaged</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowWasteModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                >
                  Log Waste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {selectedRecipe && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">{selectedRecipe.name}</h3>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <FaClock className="mr-1" />
                  {selectedRecipe.prep_time} min
                </span>
                <span className="flex items-center">
                  <FaTag className="mr-1" />
                  {selectedRecipe.difficulty}
                </span>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Ingredients:</h4>
                <ul className="space-y-1">
                  {selectedRecipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-center">
                      <span className="w-2 h-2 bg-primary-500 rounded-full mr-2"></span>
                      {ingredient}
                      {selectedRecipe.affiliate_links && selectedRecipe.affiliate_links[ingredient] && (
                        <a
                          href={selectedRecipe.affiliate_links[ingredient]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-primary-600 hover:text-primary-700"
                        >
                          <FaShoppingCart className="inline text-xs" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Instructions:</h4>
                <ol className="space-y-2">
                  {selectedRecipe.instructions.map((step, index) => (
                    <li key={index} className="text-sm text-gray-700 flex">
                      <span className="bg-primary-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 flex-shrink-0">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setSelectedRecipe(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Add to favorites functionality
                  toast.success('Recipe added to favorites!');
                }}
                className="btn btn-primary flex items-center space-x-2"
              >
                <FaHeart />
                <span>Add to Favorites</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fab"
      >
        <FaPlus />
      </button>

      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg flex items-center space-x-3">
            <div className="loading-spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;