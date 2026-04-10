"""
Apartments.com Scraper
======================
Requires: pip install camoufox && python -m camoufox fetch

Input parameters (passed as JSON via sys.argv[1]):
  - location     (str, required)  : City/state or zip, e.g. "Austin, TX" or "78701"
  - max_results  (int, optional)  : Max listings to return. Default: 20
  - min_price    (int, optional)  : Minimum monthly rent filter
  - max_price    (int, optional)  : Maximum monthly rent filter
  - beds         (str, optional)  : "1", "2", "3", "4+" or blank for any

Run directly:
  python apartments_com.py "{\"location\": \"Austin, TX\", \"max_results\": 5}"
"""

import sys
import json
import re
import time
import urllib.parse


def slug_location(location):
    slug = location.lower().strip()
    slug = re.sub(r"[,\s]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


def build_url(location, beds=None, min_price=None, max_price=None, page=1):
    base = f"https://www.apartments.com/{slug_location(location)}/"
    if page > 1:
        base += f"{page}/"
    params = {}
    if beds and beds in ("1", "2", "3", "4+"):
        params["bb"] = beds
    if min_price:
        params["mr"] = str(int(min_price))
    if max_price:
        params["xr"] = str(int(max_price))
    return base + ("?" + urllib.parse.urlencode(params) if params else "")


def parse_price(text):
    """Extract min integer from price strings like '$965+' or '$1,200 - $2,500'."""
    nums = [int(n.replace(",", "")) for n in re.findall(r"[\d,]+", text)]
    if not nums:
        return None
    return nums[0]


def scrape_page(page_obj):
    """Extract all listing cards from a loaded Playwright page."""
    listings = []
    cards = page_obj.locator("article.placard, li[data-listingid]").all()

    for card in cards:
        try:
            title = card.locator(".js-placardTitle, .property-title").first.inner_text().strip()
        except Exception:
            title = ""

        try:
            address = card.locator(".property-address").first.inner_text().strip()
        except Exception:
            address = ""

        try:
            url = card.locator("a.property-link").first.get_attribute("href") or ""
        except Exception:
            url = ""

        # Price & Beds — apartments.com uses .priceTextBox / .bedTextBox
        price_min = None
        price_max = None
        price_str = ""
        beds_str  = ""
        try:
            price_texts = card.locator(".priceTextBox").all_text_contents()
            bed_texts   = card.locator(".bedTextBox").all_text_contents()
            prices = [parse_price(p) for p in price_texts if parse_price(p)]
            if prices:
                price_min = min(prices)
                price_max = max(prices)
                price_str = (
                    f"${price_min:,}/mo" if price_min == price_max
                    else f"${price_min:,} - ${price_max:,}/mo"
                )
            beds_clean = [b.strip() for b in bed_texts if b.strip()]
            if beds_clean:
                beds_str = beds_clean[0] if len(beds_clean) == 1 else f"{beds_clean[0]} - {beds_clean[-1]}"
        except Exception:
            pass

        # Amenities
        amenities = []
        try:
            tags = card.locator(".property-amenities span").all_text_contents()
            amenities = [t.strip() for t in tags if t.strip()]
        except Exception:
            pass

        # Phone
        phone = ""
        try:
            phone = card.locator(".phone-link, .js-phone").first.inner_text().strip()
        except Exception:
            pass

        if title or address:
            listings.append({
                "title":     title,
                "address":   address,
                "price":     price_str,
                "price_min": price_min,
                "price_max": price_max,
                "beds":      beds_str,
                "baths":     "",
                "sqft":      "",
                "phone":     phone,
                "url":       url,
                "amenities": amenities,
                "available": "",
            })

    return listings


def scrape(params):
    location    = params.get("location", "").strip()
    max_results = int(params.get("max_results", 20))
    min_price   = params.get("min_price")
    max_price   = params.get("max_price")
    beds        = str(params.get("beds", "")).strip()

    if not location:
        return {"error": "location parameter is required"}

    try:
        from camoufox.sync_api import Camoufox
    except ImportError:
        return {
            "error": (
                "camoufox is required. "
                "Install: pip install camoufox && python -m camoufox fetch"
            )
        }

    all_listings = []
    max_pages = max(1, (max_results // 20) + 1)

    with Camoufox(headless=True) as browser:
        page = browser.new_page()

        # ── Warm up: hit homepage to get Akamai session cookie ──
        try:
            page.goto("https://www.apartments.com/", timeout=20000)
            time.sleep(2)
        except Exception:
            pass

        # ── Scrape pages ────────────────────────────────────────
        for pg in range(1, max_pages + 1):
            if len(all_listings) >= max_results:
                break

            url = build_url(location, beds or None, min_price, max_price, pg)
            try:
                page.goto(url, timeout=30000)
                time.sleep(2)
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception as e:
                if pg == 1:
                    return {"error": f"Failed to load page: {e}"}
                break

            # Check for block page
            if "Access Denied" in page.title() and pg == 1:
                return {"error": "apartments.com blocked the request (Access Denied)"}

            page_listings = scrape_page(page)
            if not page_listings:
                break

            all_listings.extend(page_listings)
            if pg < max_pages:
                time.sleep(1.5)

    # Client-side price filter
    if min_price:
        all_listings = [
            l for l in all_listings
            if l["price_max"] is None or l["price_max"] >= int(min_price)
        ]
    if max_price:
        all_listings = [
            l for l in all_listings
            if l["price_min"] is None or l["price_min"] <= int(max_price)
        ]

    trimmed = all_listings[:max_results]
    return {
        "listings":    trimmed,
        "location":    location,
        "total_found": len(all_listings),
        "returned":    len(trimmed),
    }


if __name__ == "__main__":
    raw = sys.argv[1] if len(sys.argv) > 1 else "{}"
    try:
        params = json.loads(raw)
    except json.JSONDecodeError:
        params = {}
    print(json.dumps(scrape(params)))
