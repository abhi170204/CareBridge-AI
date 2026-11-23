
import httpx

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(
    prefix="/locations",
    tags=["Healthcare Locations"]
)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


@router.get("/nearby")
async def nearby_locations(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius: int = Query(5000, ge=500, le=10000)
):
    query = f"""
    [out:json][timeout:25];
    (
      node(around:{radius},{lat},{lon})["amenity"~"hospital|clinic|pharmacy"];
      way(around:{radius},{lat},{lon})["amenity"~"hospital|clinic|pharmacy"];
      relation(around:{radius},{lat},{lon})["amenity"~"hospital|clinic|pharmacy"];
    );
    out center tags;
    """

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            response = await client.post(
                OVERPASS_URL,
                data={"data": query},
                headers={
                    "User-Agent": "CareBridgeAI/1.0"
                }
            )

            response.raise_for_status()
            result = response.json()

        places = []

        for item in result.get("elements", []):
            tags = item.get("tags", {})

            latitude = item.get("lat")
            longitude = item.get("lon")

            if "center" in item:
                latitude = item["center"]["lat"]
                longitude = item["center"]["lon"]

            if latitude is None or longitude is None:
                continue

            name = tags.get("name", "Unnamed healthcare facility")

            places.append({
                "id": f"{item['type']}-{item['id']}",
                "name": name,
                "type": tags.get("amenity", "healthcare"),
                "lat": latitude,
                "lon": longitude,
                "address": ", ".join(
                    value for value in [
                        tags.get("addr:street"),
                        tags.get("addr:city"),
                        tags.get("addr:postcode")
                    ] if value
                )
            })

        return {
            "count": len(places),
            "places": places
        }

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Healthcare location service is temporarily unavailable."
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the location service."
        )

    except ValueError:
        raise HTTPException(
            status_code=502,
            detail="Invalid location data received."
        )
