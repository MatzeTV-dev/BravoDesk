import requests

# URL des Flask-Servers
FLASK_SERVER_URL = "http://localhost:5000/generate"

# Beispiel-Prompt für den Test
test_prompt = {
    "prompt": "How old is the earth?",
    "max_length": 100,
    "temperature": 0.7
}

def test_flask_server():
    try:
        print("Sende Testanfrage an den Flask-Server...")
        
        # Anfrage an den Flask-Server senden
        response = requests.post(FLASK_SERVER_URL, json=test_prompt)
        
        # Antwort prüfen
        if response.status_code == 200:
            data = response.json()
            print("Erfolgreiche Antwort vom Server:")
            print("Prompt:", test_prompt["prompt"])
            print("Antwort:", data.get("response", "Keine Antwort erhalten."))
        else:
            print(f"Fehler! HTTP-Statuscode: {response.status_code}")
            print("Details:", response.text)
    
    except Exception as e:
        print(f"Ein Fehler ist aufgetreten: {e}")

if __name__ == "__main__":
    test_flask_server()
