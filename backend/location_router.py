
import httpx

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(
    prefix="/locations",
    tags=["Healthcare Locations"]
)

# Multiple public Overpass servers for better availability
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
]


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

    result = None
    last_error = None

    # Try each server until one responds successfully
    for url in OVERPASS_URLS:
        try:
            async with httpx.AsyncClient(
                timeout=45.0,
                headers={"User-Agent": "CareBridgeAI/1.0"}
            ) as client:
                response = await client.post(
                    url,
                    data={"data": query}
                )
                response.raise_for_status()
                result = response.json()
                break

        except (
            httpx.RequestError,
            httpx.HTTPStatusError,
            ValueError
        ) as error:
            last_error = error
            print(f"Overpass server failed ({url}): {error}")

    if result is None:
        if isinstance(last_error, httpx.RequestError):
            raise HTTPException(
                status_code=503,
                detail="Healthcare location services are temporarily unreachable. Please try again later."
            )

        raise HTTPException(
            status_code=502,
            detail="Healthcare location services returned an invalid response or an error."
        )

    places = []

    for item in result.get("elements", []):
        tags = item.get("tags", {})

        latitude = item.get("lat")
        longitude = item.get("lon")

        if "center" in item:
            latitude = item["center"].get("lat")
            longitude = item["center"].get("lon")

        if latitude is None or longitude is None:
            continue

        places.append({
            "id": f"{item['type']}-{item['id']}",
            "name": tags.get(
                "name",
                "Unnamed healthcare facility"
            ),
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
