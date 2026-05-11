import razorpay
from app.config import settings

client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def create_order(amount_inr: float, receipt: str, currency: str = "INR") -> dict:
    """Create Razorpay order. amount_inr in rupees, returns paise."""
    return client.order.create({
        "amount": int(amount_inr * 100),
        "currency": currency,
        "receipt": receipt,
        "payment_capture": 1,
    })


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except Exception:
        return False


def fetch_payment_details(payment_id: str) -> dict:
    return client.payment.fetch(payment_id)
