"""
Test direct de la récupération des schedules pour trouver le '19h00' phantom
"""
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from datetime import datetime, timezone, date, timedelta
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def main():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("="*60)
    print("TEST DE RÉCUPÉRATION DES SCHEDULES")
    print("="*60)
    
    # Simuler ce que fait /api/weekly-schedule
    now = datetime.now(timezone.utc)
    today = now.date()
    
    print(f"\n📅 Aujourd'hui: {today}")
    
    # Calculer la semaine
    days_since_monday = today.weekday()
    week_start = today - timedelta(days=days_since_monday)
    week_end = week_start + timedelta(days=6)
    
    print(f"📅 Semaine: {week_start} à {week_end}\n")
    
    # Récupérer movie_schedules
    movie_schedules = await db.movie_schedules.find({
        "is_active": True,
        "date": {
            "$gte": week_start.isoformat(),
            "$lte": week_end.isoformat()
        }
    }).to_list(1000)
    
    print(f"📊 Movie schedules trouvés: {len(movie_schedules)}\n")
    
    for i, schedule in enumerate(movie_schedules, 1):
        print(f"{i}. Date: {schedule['date']}")
        print(f"   Time_slot: '{schedule['time_slot']}'")
        print(f"   Type: {type(schedule['time_slot'])}")
        print(f"   Movie_ID: {schedule['movie_id'][:20]}...")
        print(f"   Capacity: {schedule['capacity']}")
        
        # Vérifier si c'est un créneau valide
        if schedule['time_slot'] not in ['21h15', '23h45', '01h30']:
            print(f"   ❌❌❌ INVALID TIME_SLOT TROUVÉ ! '{schedule['time_slot']}'")
        else:
            print(f"   ✅ Valide")
        print()
    
    # Chercher TOUS les schedules sans filtre de date
    print("\n" + "="*60)
    print("RECHERCHE SANS FILTRE DE DATE")
    print("="*60 + "\n")
    
    all_schedules = await db.movie_schedules.find({}).to_list(10000)
    print(f"Total schedules (actifs + inactifs): {len(all_schedules)}\n")
    
    for schedule in all_schedules:
        if schedule.get('time_slot') not in ['21h15', '23h45', '01h30']:
            print(f"❌ INVALID FOUND:")
            print(f"   Date: {schedule.get('date')}")
            print(f"   Time_slot: '{schedule.get('time_slot')}'")
            print(f"   Active: {schedule.get('is_active')}")
            print()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
