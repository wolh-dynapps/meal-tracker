#!/usr/bin/env python3
"""
Génère des données de démonstration pour meal-tracker (1 an de repas)
"""

import json
import random
from datetime import datetime, timedelta

# Aliments courants avec leurs données nutritionnelles (basé sur Ciqual)
FOODS = {
    # Petit-déjeuner
    "breakfast": [
        {"code": "7501", "name": "Pain blanc (baguette)", "kcal_100g": 274, "protein": 8.4, "fat": 1.3, "carbs": 55.4, "sugars": 3.2, "fiber": 2.9, "sodium": 615, "portions": [50, 80, 100]},
        {"code": "19304", "name": "Croissant", "kcal_100g": 406, "protein": 8.2, "fat": 21, "carbs": 45.8, "sugars": 7.5, "fiber": 2.3, "sodium": 410, "portions": [45, 60]},
        {"code": "22007", "name": "Café sans sucre", "kcal_100g": 2, "protein": 0.1, "fat": 0, "carbs": 0, "sugars": 0, "fiber": 0, "sodium": 2, "portions": [200, 250]},
        {"code": "19020", "name": "Lait demi-écrémé", "kcal_100g": 46, "protein": 3.2, "fat": 1.6, "carbs": 4.8, "sugars": 4.8, "fiber": 0, "sodium": 44, "portions": [150, 200, 250]},
        {"code": "17714", "name": "Yaourt nature", "kcal_100g": 46, "protein": 4, "fat": 1, "carbs": 5.4, "sugars": 4.3, "fiber": 0, "sodium": 52, "portions": [125]},
        {"code": "24087", "name": "Oeuf dur", "kcal_100g": 134, "protein": 13, "fat": 8.6, "carbs": 0.9, "sugars": 0.5, "fiber": 0, "sodium": 373, "portions": [50, 100]},
        {"code": "13039", "name": "Banane", "kcal_100g": 93, "protein": 1.2, "fat": 0.3, "carbs": 20.5, "sugars": 16.1, "fiber": 2.7, "sodium": 1, "portions": [100, 120, 150]},
        {"code": "13109", "name": "Pomme", "kcal_100g": 53, "protein": 0.3, "fat": 0.2, "carbs": 11.6, "sugars": 9.3, "fiber": 1.9, "sodium": 0, "portions": [150, 180]},
        {"code": "19005", "name": "Beurre", "kcal_100g": 745, "protein": 0.8, "fat": 82.5, "carbs": 0.5, "sugars": 0.5, "fiber": 0, "sodium": 8, "portions": [10, 15, 20]},
        {"code": "31029", "name": "Confiture", "kcal_100g": 262, "protein": 0.4, "fat": 0.1, "carbs": 62.7, "sugars": 49, "fiber": 1.3, "sodium": 20, "portions": [20, 30]},
        {"code": "31014", "name": "Miel", "kcal_100g": 327, "protein": 0.4, "fat": 0, "carbs": 81.1, "sugars": 79.5, "fiber": 0, "sodium": 5, "portions": [15, 20]},
        {"code": "19045", "name": "Fromage blanc 0%", "kcal_100g": 47, "protein": 8.3, "fat": 0.2, "carbs": 3.8, "sugars": 3.8, "fiber": 0, "sodium": 36, "portions": [100, 150]},
    ],
    # Déjeuner
    "lunch": [
        {"code": "37746", "name": "Poulet rôti", "kcal_100g": 197, "protein": 26.3, "fat": 10.1, "carbs": 0, "sugars": 0, "fiber": 0, "sodium": 82, "portions": [100, 150, 200]},
        {"code": "36014", "name": "Steak haché 15%", "kcal_100g": 230, "protein": 24, "fat": 15, "carbs": 0, "sugars": 0, "fiber": 0, "sodium": 75, "portions": [100, 125]},
        {"code": "36020", "name": "Boeuf bourguignon", "kcal_100g": 144, "protein": 16.5, "fat": 6.8, "carbs": 4, "sugars": 2.1, "fiber": 0.8, "sodium": 400, "portions": [200, 250, 300]},
        {"code": "9820", "name": "Riz blanc cuit", "kcal_100g": 127, "protein": 2.6, "fat": 0.3, "carbs": 28.2, "sugars": 0.1, "fiber": 0.4, "sodium": 2, "portions": [150, 200, 250]},
        {"code": "9017", "name": "Pâtes cuites", "kcal_100g": 127, "protein": 4.9, "fat": 0.7, "carbs": 25, "sugars": 0.6, "fiber": 1.4, "sodium": 1, "portions": [150, 200, 250]},
        {"code": "20047", "name": "Salade verte", "kcal_100g": 13, "protein": 1.3, "fat": 0.2, "carbs": 1.1, "sugars": 0.5, "fiber": 1.5, "sodium": 5, "portions": [80, 100, 150]},
        {"code": "20293", "name": "Tomate", "kcal_100g": 16, "protein": 0.8, "fat": 0.1, "carbs": 2.4, "sugars": 2.4, "fiber": 1, "sodium": 3, "portions": [100, 150]},
        {"code": "20196", "name": "Haricots verts", "kcal_100g": 28, "protein": 1.9, "fat": 0.2, "carbs": 4.1, "sugars": 1.5, "fiber": 3.4, "sodium": 3, "portions": [100, 150, 200]},
        {"code": "20089", "name": "Carottes cuites", "kcal_100g": 19, "protein": 0.5, "fat": 0.2, "carbs": 3.4, "sugars": 3.2, "fiber": 2, "sodium": 34, "portions": [100, 150]},
        {"code": "25030", "name": "Saumon cuit", "kcal_100g": 189, "protein": 23.5, "fat": 10.5, "carbs": 0, "sugars": 0, "fiber": 0, "sodium": 64, "portions": [100, 125, 150]},
        {"code": "7901", "name": "Pain complet", "kcal_100g": 247, "protein": 9.7, "fat": 2.5, "carbs": 44.3, "sugars": 3.5, "fiber": 6.9, "sodium": 500, "portions": [40, 60, 80]},
        {"code": "12556", "name": "Fromage emmental", "kcal_100g": 368, "protein": 27.4, "fat": 28.5, "carbs": 0.5, "sugars": 0.5, "fiber": 0, "sodium": 270, "portions": [30, 40]},
        {"code": "27541", "name": "Poulet au curry", "kcal_100g": 140, "protein": 11.5, "fat": 8.2, "carbs": 5.8, "sugars": 2.3, "fiber": 0.8, "sodium": 420, "portions": [250, 300, 350]},
    ],
    # Dîner
    "dinner": [
        {"code": "27649", "name": "Poulet basquaise", "kcal_100g": 115, "protein": 11.8, "fat": 5.2, "carbs": 4.8, "sugars": 2.5, "fiber": 1.2, "sodium": 380, "portions": [250, 300]},
        {"code": "27003", "name": "Gratin dauphinois", "kcal_100g": 135, "protein": 3.8, "fat": 8.2, "carbs": 11.8, "sugars": 1.5, "fiber": 1.3, "sodium": 260, "portions": [200, 250]},
        {"code": "27201", "name": "Quiche lorraine", "kcal_100g": 276, "protein": 10.5, "fat": 18.8, "carbs": 16.5, "sugars": 2.1, "fiber": 0.8, "sodium": 580, "portions": [150, 200]},
        {"code": "27004", "name": "Lasagnes", "kcal_100g": 132, "protein": 7.8, "fat": 5.6, "carbs": 13.2, "sugars": 2.8, "fiber": 1.1, "sodium": 450, "portions": [250, 300, 350]},
        {"code": "20232", "name": "Courgettes cuites", "kcal_100g": 19, "protein": 1.3, "fat": 0.4, "carbs": 2.3, "sugars": 1.9, "fiber": 1.3, "sodium": 3, "portions": [150, 200]},
        {"code": "26210", "name": "Soupe de légumes", "kcal_100g": 35, "protein": 1, "fat": 1, "carbs": 5.2, "sugars": 2.5, "fiber": 1.5, "sodium": 380, "portions": [250, 300]},
        {"code": "25039", "name": "Thon en conserve", "kcal_100g": 116, "protein": 25.5, "fat": 1, "carbs": 0, "sugars": 0, "fiber": 0, "sodium": 320, "portions": [80, 100, 130]},
        {"code": "27087", "name": "Pizza margherita", "kcal_100g": 234, "protein": 9.5, "fat": 8.8, "carbs": 28.5, "sugars": 3.2, "fiber": 2.1, "sodium": 620, "portions": [200, 250, 300]},
        {"code": "24087", "name": "Omelette", "kcal_100g": 154, "protein": 10.6, "fat": 11.8, "carbs": 1.1, "sugars": 0.6, "fiber": 0, "sodium": 380, "portions": [100, 150, 200]},
        {"code": "20054", "name": "Champignons", "kcal_100g": 25, "protein": 2.2, "fat": 0.5, "carbs": 1.4, "sugars": 0.2, "fiber": 2.1, "sodium": 6, "portions": [100, 150]},
        {"code": "20261", "name": "Poivron", "kcal_100g": 21, "protein": 0.9, "fat": 0.2, "carbs": 3.5, "sugars": 2.9, "fiber": 1.4, "sodium": 2, "portions": [80, 100]},
    ],
    # Snacks/goûter
    "snack": [
        {"code": "13039", "name": "Banane", "kcal_100g": 93, "protein": 1.2, "fat": 0.3, "carbs": 20.5, "sugars": 16.1, "fiber": 2.7, "sodium": 1, "portions": [100, 120]},
        {"code": "13109", "name": "Pomme", "kcal_100g": 53, "protein": 0.3, "fat": 0.2, "carbs": 11.6, "sugars": 9.3, "fiber": 1.9, "sodium": 0, "portions": [150, 180]},
        {"code": "13012", "name": "Orange", "kcal_100g": 46, "protein": 0.9, "fat": 0.2, "carbs": 9.3, "sugars": 8.5, "fiber": 2.7, "sodium": 1, "portions": [150, 180]},
        {"code": "15008", "name": "Amandes", "kcal_100g": 634, "protein": 25.4, "fat": 53.4, "carbs": 7.9, "sugars": 4.6, "fiber": 12.6, "sodium": 4, "portions": [20, 30]},
        {"code": "15063", "name": "Noix", "kcal_100g": 698, "protein": 14.7, "fat": 67.3, "carbs": 5.6, "sugars": 2.6, "fiber": 5.8, "sodium": 3, "portions": [20, 30]},
        {"code": "31001", "name": "Chocolat noir", "kcal_100g": 572, "protein": 6.1, "fat": 41.9, "carbs": 39.1, "sugars": 35.8, "fiber": 9.8, "sodium": 9, "portions": [20, 30, 40]},
        {"code": "31011", "name": "Biscuit sec", "kcal_100g": 435, "protein": 7.3, "fat": 13.2, "carbs": 70.6, "sugars": 20.1, "fiber": 2.5, "sodium": 350, "portions": [25, 40]},
        {"code": "17714", "name": "Yaourt aux fruits", "kcal_100g": 92, "protein": 3.6, "fat": 2.5, "carbs": 13.5, "sugars": 12.8, "fiber": 0.2, "sodium": 48, "portions": [125]},
        {"code": "31032", "name": "Compote de pomme", "kcal_100g": 72, "protein": 0.3, "fat": 0.2, "carbs": 16.6, "sugars": 14.5, "fiber": 1.6, "sodium": 3, "portions": [100, 130]},
        {"code": "19304", "name": "Pain au chocolat", "kcal_100g": 414, "protein": 7.5, "fat": 20.8, "carbs": 49.2, "sugars": 14.2, "fiber": 2.8, "sodium": 380, "portions": [60, 70]},
    ]
}

# Nombre de repas par catégorie par jour (min, max)
MEALS_PER_DAY = {
    "breakfast": (1, 3),
    "lunch": (2, 4),
    "dinner": (2, 4),
    "snack": (0, 2)
}

def generate_meal(food, date, category, meal_id):
    """Génère un repas à partir d'un aliment"""
    grams = random.choice(food["portions"])
    ratio = grams / 100

    kcal = round(food["kcal_100g"] * ratio)

    nutrients = {
        "328": round(food["kcal_100g"] * ratio, 1),  # energy_kcal
        "25000": round(food["protein"] * ratio, 2),  # protein_g
        "40000": round(food["fat"] * ratio, 2),      # fat_g
        "31000": round(food["carbs"] * ratio, 2),    # carbs_g
        "32000": round(food["sugars"] * ratio, 2),   # sugars_g
        "34100": round(food["fiber"] * ratio, 2),    # fiber_g
        "10110": round(food["sodium"] * ratio, 2)    # sodium_mg
    }

    return {
        "id": meal_id,
        "name": f"{food['name']} — {grams} g",
        "foodCode": food["code"],
        "foodName": food["name"],
        "calories": kcal,
        "grams": grams,
        "date": date.strftime("%Y-%m-%d"),
        "category": category,
        "notes": "",
        "timestamp": date.isoformat() + "Z",
        "nutrients": nutrients
    }

def generate_demo_data(days=365):
    """Génère les données de démonstration"""
    meals = []
    meal_id = 1609459200000  # Base ID

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    current_date = start_date

    while current_date <= end_date:
        # Variation du week-end (plus de snacks, repas plus copieux)
        is_weekend = current_date.weekday() >= 5

        for category in ["breakfast", "lunch", "dinner", "snack"]:
            min_meals, max_meals = MEALS_PER_DAY[category]

            # Plus de snacks le week-end
            if is_weekend and category == "snack":
                max_meals += 1

            # Parfois on saute un repas (réaliste)
            if random.random() < 0.05 and category != "lunch":
                continue

            num_meals = random.randint(min_meals, max_meals)

            for _ in range(num_meals):
                food = random.choice(FOODS[category])

                # Définir l'heure selon la catégorie
                if category == "breakfast":
                    hour = random.randint(7, 9)
                elif category == "lunch":
                    hour = random.randint(12, 14)
                elif category == "dinner":
                    hour = random.randint(19, 21)
                else:  # snack
                    hour = random.choice([10, 11, 16, 17, 22])

                meal_datetime = current_date.replace(
                    hour=hour,
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                )

                meal = generate_meal(food, meal_datetime, category, meal_id)
                meals.append(meal)
                meal_id += random.randint(1000, 10000)

        current_date += timedelta(days=1)

    return {
        "meals": meals,
        "dailyGoal": 2000,
        "macroGoals": {"protein": 70, "fat": 70, "carbs": 250},
        "mealCategoryGoals": {
            "breakfast": 400,
            "lunch": 700,
            "dinner": 650,
            "snack": 250
        },
        "favorites": [],
        "recipes": []
    }

if __name__ == "__main__":
    print("Génération des données de démonstration (1 an)...")
    data = generate_demo_data(365)

    output_path = "demo_data_1year.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ {len(data['meals'])} repas générés")
    print(f"📁 Fichier: {output_path}")
    print(f"📊 Période: {data['meals'][0]['date']} → {data['meals'][-1]['date']}")

    # Statistiques
    total_kcal = sum(m['calories'] for m in data['meals'])
    avg_daily = total_kcal / 365
    print(f"🔥 Calories totales: {total_kcal:,} kcal")
    print(f"📈 Moyenne journalière: {avg_daily:.0f} kcal")
