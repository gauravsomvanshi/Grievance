import sys
import os

# Add parent directory to path to import nlp_engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from nlp_engine import parse_grievance

def test_theft_classification():
    text = "Mera black Hero Splendor motorcycle Hazratganj se kal raat chori ho gaya."
    result = parse_grievance(text)
    
    assert result["category"] == "Theft/Robbery"
    assert result["district"] == "Lucknow"
    assert result["assigned_station"] == "Hazratganj"
    assert result["language"] == "Hinglish"
    assert result["is_spam"] is False
    assert result["urgency_score"] >= 5

def test_women_safety_classification():
    text = "एक लड़का कल्याणपुर में कोचिंग से घर आते वक्त लड़कियों का पीछा करता है और बदतमीजी करता है।"
    result = parse_grievance(text)
    
    assert result["category"] == "Women Safety"
    assert result["district"] == "Kanpur"
    assert result["assigned_station"] == "Kalyanpur"
    assert result["language"] == "Hindi"
    assert result["is_spam"] is False
    assert result["urgency_score"] >= 8

def test_cyber_fraud_classification():
    text = "Someone sent me an OTP and debited 50000 rupees from my bank account."
    result = parse_grievance(text)
    
    assert result["category"] == "Cyber Fraud"
    assert result["language"] == "English"
    assert result["is_spam"] is False
    assert result["urgency_score"] >= 6

def test_spam_filtering():
    text = "FREE LOTTERY WIN CASH PRIZE CLICK HERE SCAM www.win-gold-casino.com free cash prize"
    result = parse_grievance(text)
    
    assert result["is_spam"] is True

if __name__ == "__main__":
    print("Running tests...")
    try:
        test_theft_classification()
        print("✓ test_theft_classification passed.")
        test_women_safety_classification()
        print("✓ test_women_safety_classification passed.")
        test_cyber_fraud_classification()
        print("✓ test_cyber_fraud_classification passed.")
        test_spam_filtering()
        print("✓ test_spam_filtering passed.")
        print("\nAll tests passed successfully!")
    except AssertionError as e:
        print(f"Test failed: {e}")
        sys.exit(1)
