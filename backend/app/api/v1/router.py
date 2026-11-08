from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.profile import router as profile_router
from app.api.v1.activities import router as activities_router
from app.api.v1.footprint import router as footprint_router
from app.api.v1.catalog import router as catalog_router
from app.api.v1.simulations import router as simulations_router
from app.api.v1.goals import router as goals_router
from app.api.v1.impact import router as impact_router
from app.api.v1.rewards import router as rewards_router
from app.api.v1.privacy import router as privacy_router
from app.api.v1.integrations import router as integrations_router

v1_router = APIRouter()

v1_router.include_router(health_router)
v1_router.include_router(auth_router)
v1_router.include_router(profile_router)
v1_router.include_router(activities_router)
v1_router.include_router(footprint_router)
v1_router.include_router(catalog_router)
v1_router.include_router(simulations_router)
v1_router.include_router(goals_router)
v1_router.include_router(impact_router)
v1_router.include_router(rewards_router)
v1_router.include_router(privacy_router)
v1_router.include_router(integrations_router)
