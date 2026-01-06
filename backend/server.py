from fastapi import FastAPI, APIRouter, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
import uuid

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="FundEd API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import routes
from routes.auth import router as auth_router
from routes.campaigns import router as campaigns_router
from routes.donations import router as donations_router
from routes.admin import router as admin_router
from routes.static_data import router as static_data_router

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(campaigns_router)
api_router.include_router(donations_router)
api_router.include_router(admin_router)
api_router.include_router(static_data_router)


# Health check endpoint
@api_router.get("/")
async def root():
    return {"message": "FundEd API is running", "version": "1.0.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# Stripe webhook endpoint
@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks."""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        return {"error": "Stripe not configured"}
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Process webhook event
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            
            # Update transaction status
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"success": True}
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        return {"error": str(e)}


# Include the router in the main app
app.include_router(api_router)

# Store db reference in app state for access in routes
@app.on_event("startup")
async def startup_event():
    app.state.db = db
    await seed_admin_account()


async def seed_admin_account():
    """Seed default admin account on startup."""
    admin_email = "admin@funded.com"
    
    existing_admin = await db.users.find_one({"email": admin_email}, {"_id": 0})
    
    if not existing_admin:
        admin_user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "FundEd Admin",
            "picture": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logging.info("Admin account seeded: admin@funded.com")
    else:
        logging.info("Admin account already exists")


# CORS middleware - must allow specific origin when credentials are included
frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
cors_origins = [
    frontend_url,
    "http://localhost:3000",
    "https://funded.preview.emergentagent.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
