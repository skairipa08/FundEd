from fastapi import APIRouter

router = APIRouter(tags=["Static Data"])

# Static data matching frontend mockData.js
CATEGORIES = [
    {"id": "tuition", "name": "Tuition", "icon": "GraduationCap"},
    {"id": "books", "name": "Books & Materials", "icon": "BookOpen"},
    {"id": "laptop", "name": "Laptop & Equipment", "icon": "Laptop"},
    {"id": "housing", "name": "Housing", "icon": "Home"},
    {"id": "travel", "name": "Travel", "icon": "Plane"},
    {"id": "emergency", "name": "Emergency", "icon": "AlertCircle"}
]

COUNTRIES = [
    "United States", "United Kingdom", "Canada", "India", "Australia",
    "Germany", "France", "Nigeria", "Kenya", "Brazil", "Mexico"
]

FIELDS_OF_STUDY = [
    "Computer Science", "Engineering", "Medicine", "Business", "Arts",
    "Mathematics", "Physics", "Biology", "Economics", "Psychology"
]


@router.get("/categories")
async def get_categories():
    """Get all campaign categories."""
    return {
        "success": True,
        "data": CATEGORIES
    }


@router.get("/countries")
async def get_countries():
    """Get supported countries."""
    return {
        "success": True,
        "data": COUNTRIES
    }


@router.get("/fields-of-study")
async def get_fields_of_study():
    """Get fields of study."""
    return {
        "success": True,
        "data": FIELDS_OF_STUDY
    }
