from transformers import AutoTokenizer, AutoModelForCausalLM

# Lokaler Pfad für das Modell
model_name_or_path = "D:\Development\LLM\Llama2\Modell"

# Lade Tokenizer und Modell
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-2-7b-hf", cache_dir=model_name_or_path)
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b-hf", cache_dir=model_name_or_path, torch_dtype="float16", device_map="auto")

print("Modell erfolgreich lokal gespeichert!")