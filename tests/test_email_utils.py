import pytest

from backend.email_utils import format_price, humanize_booking_status, humanize_payment_status


def test_format_price_handles_free_amount():
    assert format_price(0) == "Gratuit"
    assert format_price("0") == "Gratuit"


def test_format_price_formats_decimal_with_french_separator():
    assert format_price(17) == "17,00 €"
    assert format_price(12.5) == "12,50 €"


def test_humanize_booking_status_defaults_to_capitalized_string():
    assert humanize_booking_status("pending") == "En attente de paiement"
    assert humanize_booking_status("custom") == "Custom"


def test_humanize_payment_status_covers_known_values():
    assert humanize_payment_status("paid") == "Payé"
    assert humanize_payment_status(None) == "Inconnu"