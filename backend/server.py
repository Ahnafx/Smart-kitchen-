from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import os
import uuid
from dotenv import load_dotenv
import json
import requests

# Load environment variables
load_dotenv()

app = FastAPI(title="SmartKitchen API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/smartkitchen")
client = MongoClient(MONGO_URL)
db = client.smartkitchen

# Security
security = HTTPBearer()

# Pydantic models
class InventoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    barcode: Optional[str] = None
    quantity: int
    unit: str = "pieces"
    expiry_date: Optional[datetime] = None
    category: str = "other"
    added_date: datetime = Field(default_factory=datetime.utcnow)
    user_id: str = "default"

class Recipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    ingredients: List[str]
    instructions: List[str]
    prep_time: int  # in minutes
    difficulty: str = "medium"
    category: str = "main"
    affiliate_links: Optional[Dict[str, str]] = {}
    expiring_ingredients: List[str] = []
    created_date: datetime = Field(default_factory=datetime.utcnow)

class Challenge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    points: int
    type: str  # "daily", "weekly", "monthly"
    deadline: Optional[datetime] = None
    status: str = "active"
    created_date: datetime = Field(default_factory=datetime.utcnow)

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    points: int = 0
    preferences: Dict[str, Any] = {}
    created_date: datetime = Field(default_factory=datetime.utcnow)

class WasteItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_item_id: str
    item_name: str
    quantity: int
    reason: str
    date_discarded: datetime = Field(default_factory=datetime.utcnow)
    user_id: str = "default"

class Deal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    discount: str
    store_name: str
    expiry_date: Optional[datetime] = None
    sponsored: bool = False
    image_url: Optional[str] = None
    created_date: datetime = Field(default_factory=datetime.utcnow)

class BarcodeProduct(BaseModel):
    barcode: str
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None

# Helper functions
def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def convert_to_json(data):
    """Convert MongoDB document to JSON-serializable format"""
    if isinstance(data, list):
        return [convert_to_json(item) for item in data]
    elif isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if key == '_id':
                continue
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = convert_to_json(value)
            elif isinstance(value, list):
                result[key] = convert_to_json(value)
            else:
                result[key] = value
        return result
    else:
        return data

# Routes
@app.get("/")
async def root():
    return {"message": "SmartKitchen API is running!"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Inventory endpoints
@app.get("/api/inventory")
async def get_inventory():
    """Get all inventory items"""
    try:
        items = list(db.inventory.find())
        return convert_to_json(items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inventory")
async def add_inventory_item(item: InventoryItem):
    """Add new inventory item"""
    try:
        item_dict = item.dict()
        result = db.inventory.insert_one(item_dict)
        return {"message": "Item added successfully", "id": item.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/inventory/{item_id}")
async def update_inventory_item(item_id: str, item: InventoryItem):
    """Update inventory item"""
    try:
        item_dict = item.dict()
        result = db.inventory.update_one({"id": item_id}, {"$set": item_dict})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"message": "Item updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/inventory/{item_id}")
async def delete_inventory_item(item_id: str):
    """Delete inventory item"""
    try:
        result = db.inventory.delete_one({"id": item_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"message": "Item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Barcode lookup endpoint
@app.get("/api/barcode/{barcode}")
async def lookup_barcode(barcode: str):
    """Look up product information by barcode"""
    try:
        # First check if we have this product in our local database
        existing_product = db.products.find_one({"barcode": barcode})
        if existing_product:
            return convert_to_json(existing_product)
        
        # If not found locally, try to fetch from external API (example)
        # This is a mock implementation - in real app, you'd use a barcode API
        mock_products = {
            "123456789": {"name": "Milk", "brand": "Fresh Farm", "category": "dairy"},
            "987654321": {"name": "Bread", "brand": "Bakery Fresh", "category": "bakery"},
            "456789123": {"name": "Bananas", "brand": "Tropical", "category": "fruits"},
        }
        
        if barcode in mock_products:
            product_data = mock_products[barcode]
            product_data["barcode"] = barcode
            
            # Save to local database for future use
            db.products.insert_one(product_data)
            return product_data
        
        # If not found anywhere, return generic product info
        return {
            "barcode": barcode,
            "name": f"Product {barcode}",
            "brand": "Unknown",
            "category": "other"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Recipe endpoints
@app.get("/api/recipes")
async def get_recipes():
    """Get all recipes"""
    try:
        recipes = list(db.recipes.find())
        return convert_to_json(recipes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recipes/expiring")
async def get_expiring_recipes():
    """Get recipes that use expiring ingredients"""
    try:
        # Get inventory items expiring in next 3 days
        expiring_date = datetime.utcnow() + timedelta(days=3)
        expiring_items = list(db.inventory.find({
            "expiry_date": {"$lte": expiring_date.isoformat()},
            "quantity": {"$gt": 0}
        }))
        
        if not expiring_items:
            return []
        
        expiring_names = [item["name"].lower() for item in expiring_items]
        
        # Find recipes that contain these ingredients
        recipes = list(db.recipes.find({
            "ingredients": {"$in": expiring_names}
        }))
        
        return convert_to_json(recipes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recipes")
async def add_recipe(recipe: Recipe):
    """Add new recipe"""
    try:
        recipe_dict = recipe.dict()
        result = db.recipes.insert_one(recipe_dict)
        return {"message": "Recipe added successfully", "id": recipe.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Challenge endpoints
@app.get("/api/challenges")
async def get_challenges():
    """Get all active challenges"""
    try:
        challenges = list(db.challenges.find({"status": "active"}))
        return convert_to_json(challenges)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/challenges")
async def add_challenge(challenge: Challenge):
    """Add new challenge"""
    try:
        challenge_dict = challenge.dict()
        result = db.challenges.insert_one(challenge_dict)
        return {"message": "Challenge added successfully", "id": challenge.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Waste tracking endpoints
@app.get("/api/waste")
async def get_waste_items():
    """Get all waste items"""
    try:
        waste_items = list(db.waste.find())
        return convert_to_json(waste_items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/waste")
async def add_waste_item(waste_item: WasteItem):
    """Add new waste item"""
    try:
        waste_dict = waste_item.dict()
        result = db.waste.insert_one(waste_dict)
        return {"message": "Waste item added successfully", "id": waste_item.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Deals endpoints
@app.get("/api/deals")
async def get_deals():
    """Get all active deals"""
    try:
        deals = list(db.deals.find())
        return convert_to_json(deals)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/deals")
async def add_deal(deal: Deal):
    """Add new deal"""
    try:
        deal_dict = deal.dict()
        result = db.deals.insert_one(deal_dict)
        return {"message": "Deal added successfully", "id": deal.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# User endpoints
@app.get("/api/users")
async def get_users():
    """Get all users"""
    try:
        users = list(db.users.find())
        return convert_to_json(users)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users")
async def add_user(user: User):
    """Add new user"""
    try:
        user_dict = user.dict()
        result = db.users.insert_one(user_dict)
        return {"message": "User added successfully", "id": user.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Expiry notifications endpoint
@app.get("/api/notifications/expiring")
async def get_expiring_notifications():
    """Get items expiring soon for notifications"""
    try:
        # Items expiring in next 3 days
        expiring_date = datetime.utcnow() + timedelta(days=3)
        expiring_items = list(db.inventory.find({
            "expiry_date": {"$lte": expiring_date.isoformat()},
            "quantity": {"$gt": 0}
        }))
        
        notifications = []
        for item in expiring_items:
            expiry_date = datetime.fromisoformat(item["expiry_date"])
            days_left = (expiry_date - datetime.utcnow()).days
            
            if days_left <= 0:
                message = f"⚠️ {item['name']} has expired!"
                urgency = "high"
            elif days_left == 1:
                message = f"🔥 {item['name']} expires tomorrow!"
                urgency = "high"
            else:
                message = f"⏰ {item['name']} expires in {days_left} days"
                urgency = "medium"
            
            notifications.append({
                "id": item["id"],
                "message": message,
                "urgency": urgency,
                "item_name": item["name"],
                "expiry_date": item["expiry_date"],
                "days_left": days_left
            })
        
        return notifications
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)