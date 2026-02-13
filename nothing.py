import requests

url = "https://api.jdoodle.com/v1/execute"

data = {
    "clientId": "3794db0188300d79082006cf54a5aef",
    "clientSecret": "1bf8131ca9d7fdaeb4ec25c7442733c716f76cab9b5243712a626a8d33d2806b",
    "script": "#include <stdio.h>\nint main() { printf(\"Hello JDoodle!\\n\"); return 0; }",
    "language": "c",
    "versionIndex": "5"
}

response = requests.post(url, json=data)
print(response.json())
