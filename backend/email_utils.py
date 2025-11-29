"""
Email utility functions for Drivin And Chill
Provides formatting and humanization functions for email templates
"""

def format_price(price):
    """
    Format price for display in emails
    
    Args:
        price: Price value (int, float, or string)
        
    Returns:
        str: Formatted price string
    """
    if price == 0 or price == "0":
        return "Gratuit"
    
    try:
        price_float = float(price)
        return f"{price_float:,.2f} €".replace(".", ",")
    except (ValueError, TypeError):
        return str(price)


def humanize_booking_status(status):
    """
    Convert booking status to human-readable French text
    
    Args:
        status: Booking status string
        
    Returns:
        str: Human-readable status
    """
    status_map = {
        "pending": "En attente de paiement",
        "confirmed": "Confirmée",
        "cancelled": "Annulée",
        "completed": "Terminée"
    }
    
    return status_map.get(status, status.capitalize() if status else "Inconnu")


def humanize_payment_status(status):
    """
    Convert payment status to human-readable French text
    
    Args:
        status: Payment status string
        
    Returns:
        str: Human-readable payment status
    """
    if status is None:
        return "Inconnu"
    
    status_map = {
        "paid": "Payé",
        "pending": "En attente",
        "failed": "Échoué",
        "cancelled": "Annulé",
        "refunded": "Remboursé"
    }
    
    return status_map.get(status, status.capitalize() if status else "Inconnu")