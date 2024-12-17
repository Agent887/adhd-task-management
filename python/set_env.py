import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set required environment variables
required_vars = {
    "GOOGLE_GEMINI_API_KEY": "YOUR_API_KEY_HERE",  # Replace with your actual API key
    "GOOGLE_CLOUD_PROJECT": "done365",
    "GOOGLE_CLOUD_LOCATION": "us-central1"
}

# Check and set environment variables
for var, default in required_vars.items():
    if var not in os.environ:
        print(f"Warning: {var} not found in environment")
        if var == "GOOGLE_GEMINI_API_KEY":
            print("Please set your Gemini API key in the .env file")
        else:
            os.environ[var] = default
            print(f"Set default value for {var}: {default}")

print("\nEnvironment setup complete. Current configuration:")
for var in required_vars:
    value = os.environ.get(var, "Not set")
    if var == "GOOGLE_GEMINI_API_KEY" and value != "Not set":
        print(f"{var}: [HIDDEN]")
    else:
        print(f"{var}: {value}")
