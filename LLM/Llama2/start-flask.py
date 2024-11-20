from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import time

# Flask-App initialisieren
app = Flask(__name__)

# Absoluter Pfad zum Modell
MODEL_PATH = "D:/Development/SupportBotDiscord/LLM/Llama2/Modell/models--meta-llama--Llama-2-7b-hf/snapshots/01c7f73d771dfac7d292323805ebc428287df4f9"

# Modell und Tokenizer laden
print("Lade das Modell...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    torch_dtype=torch.float16,
    device_map="auto"
)

@app.route('/generate', methods=['POST'])
def generate():
    """Route zur Textgenerierung mit dem Modell."""
    print("Prompt erhalten")
    print(torch.cuda.is_available())
    start_time = time.perf_counter()
    try:
        # Eingabedaten abrufen
        data = request.json
        prompt = data.get("prompt", "")
        max_length = data.get("max_length", 150)
        temperature = data.get("temperature", 0.7)

        # Eingabe tokenisieren und Antwort generieren
        inputs = tokenizer(prompt, return_tensors="pt").to("cuda" if torch.cuda.is_available() else "cpu")
        outputs = model.generate(
            inputs.input_ids,
            max_length=max_length,
            temperature=temperature
        )
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        end_time = time.perf_counter

        print("Time to get the response:" + str(start_time - end_time))
        # Antwort zurückgeben
        return jsonify({"response": response})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Flask-Server starten
    app.run(host="0.0.0.0", port=5000)
